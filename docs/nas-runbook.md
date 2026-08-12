# NAS Deployment Runbook (UMPSAHLLM backend)

Operational notes for the production backend running on the HQ Synology NAS
behind a Cloudflare Tunnel at `api.umpsahllm.com`.

Written after a full outage on 2026-08-12. Everything here is the *verified*
procedure, not the theoretical one — several obvious-looking approaches silently
do nothing and are called out below.

---

## Architecture in one paragraph

`docker-compose.nas.yml` defines four services. The ones that matter for the API:

| Service (compose) | Container name | Role |
| --- | --- | --- |
| `backend` | `umpsah-backend` | Express API, listens on **3001** |
| `tunnel` | `umpsah-tunnel` | cloudflared, publishes `api.umpsahllm.com` |
| `ollama` | `umpsah-brain` | local LLM |

All three share the `umpsahclaw_default` Docker network. The tunnel's published
route points at `http://umpsah-backend:3001` — a **Docker DNS name that only
resolves from a connector running on the NAS itself**.

> **Port gotcha:** production is **3001**, local dev is **3002**. `PORT=3001` is
> hardcoded in the compose file because the Cloudflare route depends on it.

---

## Deploying a change

The deploy is a **DSM Task Scheduler** task named `deploy-umpsah` (runs as root).
It does, in order:

1. `curl` the **`main`** branch tarball from GitHub
2. Extract over `/volume1/UMPSAH/UMPSAHCLAW/`
3. `docker build -t umpsahclaw_backend -f UMPSAHLLM/backend/Dockerfile .`
4. `docker stop umpsah-backend; docker rm umpsah-backend; docker run -d ...`
5. Tail the resulting logs into `deploy.log`

### ⚠️ It pulls `main`, not your feature branch

Merge to `main` and push **before** running the deploy, or you will rebuild the
old code and conclude the fix didn't work.

```bash
git checkout main
git merge --ff-only origin/<your-branch>
git push origin main
```

### Running it

Control Panel → Task Scheduler → select `deploy-umpsah` → **Run**. Takes a few
minutes. Watch progress via Docker → Container → `umpsah-backend` → Log.

---

## Changing environment variables

**Docker environment variables are fixed at container creation.** They cannot be
changed on an existing container.

### ❌ What does not work

Docker → Container → Edit → Environment → change value → Apply. The DSM UI
accepts the edit, closes cleanly, and **silently discards it**. Re-opening
Details shows the old value still in place. This wastes a lot of time; don't.

### ✅ What does work

1. Edit `/volume1/UMPSAH/UMPSAHCLAW/.env` on the NAS
2. Re-run the `deploy-umpsah` task, which recreates the container

Editing `.env` without shell access: create a one-off Task Scheduler script.
File Station has no built-in text editor for arbitrary files.

```sh
ENVF=/volume1/UMPSAH/UMPSAHCLAW/.env
cp "$ENVF" "$ENVF.bak"
sed -i 's/^\(SOME_VAR=.*\)$/#\1/' "$ENVF"
```

Always `cp` a `.bak` first, and never `echo` a secret's value into a log.

---

## Known failure modes

### 1. Backend crash-loops on boot — `Node.js 20 detected without native WebSocket support`

```
Error: Node.js 20 detected without native WebSocket support.
  at createClient (/app/node_modules/@supabase/supabase-js/dist/index.cjs)
  at Object.<anonymous> (/app/ragService.js)
```

`@supabase/supabase-js` v2.45+ eagerly builds a `RealtimeClient` that needs a
global `WebSocket`. Node added that in **22**; the backend image is Node **20**.
`createClient()` therefore throws at require-time and kills the process, which
Docker restarts forever (thousands of log lines, container shows `Restarting`).

Fixed in `UMPSAHLLM/backend/ragService.js`: `createClient` is wrapped in
try/catch and passed `{ realtime: { transport: require('ws') } }` when the global
is missing, degrading to local keyword search instead of dying.

**Before bumping `@supabase/supabase-js` or any SDK, check whether it assumes a
Node 22 global.** Either keep the shim or move the image to Node 22.

### 2. `api.umpsahllm.com` returns 502 while the tunnel shows "Healthy"

A 502 with a healthy tunnel means Cloudflare delivered the request to a connector
that could not reach the origin.

**Check the connector identity first** — Zero Trust → Networks → Tunnels →
`umpsah-nas` → Overview → *Connectors*. Confirm the `Hostname` / `Platform`
columns describe the **NAS** (Linux), not some other machine.

During the 2026-08-12 outage the only connected connector was a **Windows
desktop** running `cloudflared` with the same tunnel token. It held the tunnel
open (dashboard read "Healthy"), received all traffic, and could not resolve the
Docker-internal name `umpsah-backend` → every request 502'd. The NAS's own
connector was never registered.

To stop a stray connector on Windows:

```
sc stop cloudflared
sc config cloudflared start=disabled
```

Rotate the tunnel token if you don't know how a machine obtained it.

### 3. NAS cloudflared can't reach the Cloudflare edge

```
ERR Unable to establish connection with Cloudflare edge
    error="TLS handshake with edge error: ... connection reset by peer"
```

Outbound to `198.41.192.0/24:7844` is being blocked or reset by the HQ network.
The compose command already passes `--protocol http2` (avoids QUIC/UDP), so if
this persists it is plain TCP 7844 egress filtering — a firewall change, not
something fixable in Docker.

Note cloudflared opens several edge connections; errors on a single `connIndex=`
while the dashboard stays Healthy are usually **noise**, not the outage.

### 4. Reading logs in DSM

The Docker → Container → Log tab paginates **oldest-first** and does not
auto-follow. Jump to the **last page** or you will read hours-old entries and
misdiagnose. The container's *Terminal* tab streams live output and is more
reliable for "what is happening right now".

---

## Post-deploy verification

```bash
curl -s https://api.umpsahllm.com/health
```

Expected: `{"status":"ok","uptime":...}`.

Then confirm in Docker → Container → `umpsah-backend`:

- **Status** is `Running` with a climbing uptime — not `Restarting`
- **Log** is short (~10 lines). Thousands of lines means a crash loop.
- Startup ends with:
  ```
  🚀 UMPSAHLLM Backend running on http://<ip>:3001
  Connected to SQLite Memory DB.
  ```

`[rag] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing ... falling back to
local search` is **expected and healthy** when Supabase is intentionally
disabled — it matches local dev behaviour.

---

## Environment notes

- DSM is **7.0.1**, which ships the legacy **Docker** package, *not* Container
  Manager (7.2+). Compose is **v1**: the command is `docker-compose`, and
  `docker compose` exits 1 with *"'compose' is not a docker command"*.
- The NAS is reachable from other branches only via **QuickConnect** (DSM web
  UI). QuickConnect does not tunnel SSH, so Task Scheduler is the practical way
  to run shell commands remotely.
- The NAS LAN IP is shown in DSM's System Health widget; it is not routable from
  other branch offices.

---

## Repository hygiene

**`kizo-88/umpsahclaw` is a public repo.** The backend writes runtime data into
the working tree that must never be committed:

- `UMPSAHLLM/backend/vault/*.md` — verbatim assistant conversations
- `UMPSAHLLM/backend/training_data/*.jsonl` — logged user interactions
- `UMPSAHLLM/backend/memory.sqlite` — conversation database
- `UMPSAHLLM/backend/workspace/docs/*` — uploaded documents, incl. third-party
  confidential files such as signed NDAs

None of these paths are currently in `.gitignore`, and some were committed
historically. Stage explicitly (`git add <path>`) — never `git add -A` — and run
a secret scan over the staged diff before pushing.
