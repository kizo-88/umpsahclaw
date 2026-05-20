# 🐳 Deploying UMPSAHLLM on Always-Free Linux VPS

This guide walks you through setting up a **100% Free, 24/7 self-healing production server** for UMPSAHLLM. 

By migrating to an **Oracle Cloud Always Free VM** (Ubuntu 22.04), you get a high-performance 4-core ARM processor and 24 GB RAM for free, which runs the Node.js API, Ollama brain, and the Cloudflare Tunnel.

---

## 🛠️ Step 1 — Provision Your Always Free Linux Server

1. **Sign Up / Log In**: Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. **Create a Compute Instance**:
   - **Name**: `umpsah-server`
   - **Image**: `Ubuntu 22.04 LTS (Canonical)`
   - **Shape**: `VM.Standard.A1.Flex` (Ampere ARM)
   - **Resources**: Set to **4 OCPUs** and **24 GB RAM** (this is fully covered by the "Always Free eligible" program!).
   - **SSH Keys**: Generate a new key pair and download both the private and public keys.
3. **Boot and Connect**: Wait for the instance to transition to `RUNNING`, copy the **Public IP Address**, and SSH in from your terminal:
   ```bash
   ssh -i /path/to/your/ssh-key ubuntu@YOUR_PUBLIC_IP
   ```

---

## 📦 Step 2 — Install Docker & Git on the Host

Once connected via SSH, run the following automated installer script to install Docker and Docker Compose on Ubuntu:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Git
sudo apt install git -y

# 3. Install Docker Engine & Docker Compose
curl -fsSL https://get.docker.com | sh

# 4. Add 'ubuntu' user to the docker group so you don't need 'sudo' for docker commands
sudo usermod -aG docker ubuntu

# 5. Apply new group membership (or log out and log back in)
newgrp docker
```

To verify Docker is running correctly:
```bash
docker --version
docker compose version
```

---

## 📂 Step 3 — Clone the Repository & Configure Secrets

Clone the repository and set up your environment credentials:

```bash
# 1. Clone the repository
git clone https://github.com/kizo-88/umpsahclaw.git
cd umpsahclaw

# 2. Create your persistent secrets file
cp .env.nas .env
```

Now open `.env` using your preferred editor (e.g. `nano`):
```bash
nano .env
```

Ensure your `.env` contains the correct values. It should look like this:
```env
# Cloudflare Tunnel Token (already set up for you!)
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiZTI4NzY4ZTBiMjZiZDdkN2Y0MmI3MjJlMDIyNmRmMmIiLCJ0IjoiM2EzNTYzMTctNzZiNy00YTkxLTgzOTYtYjdhZWEwMzE4YjVhIiwicyI6Ill6UmlaV1kzTmpndFpXTTFZaTAwTVdNMUxXSTJNbVV0T1dGbE1EWmhabUl5TldFeCJ9

# Optional Cloud Engine API Key (Gemini, OpenAI, etc.)
CLOUD_LLM_API_KEY=your-api-key-here
```
*Press `CTRL + O`, `Enter` to save, and `CTRL + X` to exit nano.*

---

## 🚀 Step 4 — Launch the Unified Stack

Build the backend container and spin up the complete self-healing microservice stack:

```bash
docker compose -f docker-compose.nas.yml up -d --build
```

Docker will automatically pull and build the required dependencies:
1. `umpsah-brain` (Ollama)
2. `umpsah-backend` (Node.js API + PicoClaw runtime, connected to host's Docker socket)
3. `umpsah-tunnel` (Cloudflare Tunnel running securely to edge servers)

To view running containers and live logs:
```bash
docker compose -f docker-compose.nas.yml ps
docker compose -f docker-compose.nas.yml logs -f
```

---

## 🧠 Step 5 — Initialize local LLM model

Once the brain is active, execute a command to pull the `llama3.1:8b` model directly into the container:

```bash
docker exec -it umpsah-brain ollama pull llama3.1:8b
```

To verify the model is active and running:
```bash
docker exec -it umpsah-brain ollama list
```

---

## 🐳 Step 6 — Try out the VPS Manager

Now that your backend is running inside the container and shares the host's `/var/run/docker.sock`, you can navigate to the VPS Manager UI on the frontend (`https://umpsahllm.web.app`).

When you create a VPS or toggle state (Start/Stop):
1. The frontend calls your Cloudflare endpoint (`https://api.umpsahllm.com/api/vps/create`).
2. The endpoint passes through the tunnel directly to the `umpsah-backend` container.
3. The Node.js app uses the shared `/var/run/docker.sock` to provision, boot, or stop physical containers natively on the host's Docker engine.
4. All actions are instantaneous, resource-constrained (512MB RAM & 0.5 CPU limit per instance), and **100% free**.

---

## 🛠️ Diagnostics & Maintenance

- **Restart the Stack**:
  ```bash
  docker compose -f docker-compose.nas.yml restart
  ```
- **Stop the Stack**:
  ```bash
  docker compose -f docker-compose.nas.yml down
  ```
- **Review API Logs**:
  ```bash
  docker logs umpsah-backend
  ```
- **Review Tunnel Status**:
  ```bash
  docker logs umpsah-tunnel
  ```
