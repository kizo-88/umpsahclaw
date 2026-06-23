# 🐳 Deploying UMPSAHLLM in Docker on your NAS

Running the UMPSAHLLM stack directly on your local NAS (Synology, QNAP, or standard Linux NAS) is the most efficient setup:
* **24/7 Uptime**: Your NAS is already designed to run continuously.
* **100% Local & Free**: Zero cloud subscription costs.
* **Native Docker Support**: Standard Linux-based NAS systems run Docker natively, meaning `/var/run/docker.sock` works perfectly for the VPS provisioning system.

Here is how to set up the stack on your NAS using the **GUI (zero-CLI)** or **SSH**.

---

## 🛠️ Option A — Deploy via Synology / QNAP GUI (Zero-CLI)

If you are using **Synology DSM 7.2+** (Container Manager) or **QNAP** (Container Station):

### 1. Upload the Project Folder
1. Connect to your NAS via SMB, or open **File Station**.
2. Navigate to your shared docker folder (e.g., `/volume1/docker/`).
3. Upload the entire `umpsahclaw` project directory here.

### 2. Configure Your Secrets (`.env`)
1. Duplicate `.env.nas` inside the project folder and rename the copy to `.env`.
2. Open `.env` in a text editor on your computer or the NAS Text Editor.
3. Set your Cloudflare Tunnel Token (get it from the Cloudflare Zero Trust dashboard — **never commit it**):
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=<your-tunnel-token-here>
   ```
   > ⚠️ A previous version of this file committed a real token in plaintext. If you used it, **rotate that token** in Cloudflare Zero Trust → Networks → Tunnels.

### 3. Deploy using Synology Container Manager
1. Open **Container Manager** on your Synology NAS.
2. Go to **Project** -> Click **Create**.
3. Fill out the details:
   - **Project Name**: `umpsahllm`
   - **Path**: Browse and select the uploaded `umpsahclaw` folder.
   - **Source**: Select **Upload docker-compose.yml** or choose **Use existing docker-compose.yml** and select `docker-compose.nas.yml`.
4. Click **Next** and complete the wizard. The NAS will automatically download the images, build the backend, and launch the stack!

---

## 💻 Option B — Deploy via NAS SSH Terminal (CLI)

If you prefer using the terminal or want to build and manage the stack manually:

### 1. Enable SSH on Your NAS
- **Synology**: Go to *Control Panel* -> *Terminal & SNMP* -> Check *Enable SSH service*.
- **QNAP**: Go to *Control Panel* -> *Network & File Services* -> *Telnet/SSH* -> Check *Allow SSH connection*.

### 2. Connect and Navigate to the Folder
SSH into your NAS from your computer:
```bash
ssh YOUR_NAS_USERNAME@YOUR_NAS_IP
```
Navigate to your docker directory (adjust the volume path depending on your NAS configuration):
```bash
cd /volume1/docker
```

### 3. Clone and Configure
```bash
# Clone the repository
git clone https://github.com/kizo-88/umpsahclaw.git
cd umpsahclaw

# Set up secrets
cp .env.nas .env
```

### 4. Launch the Stack
Run the standard docker compose command (you may need `sudo` depending on your NAS permissions):
```bash
sudo docker compose -f docker-compose.nas.yml up -d --build
```

---

## 🧠 Step 4 — Download your AI Model (Llama)

Once the containers are running, download the `llama3.1:8b` model into the Ollama container:

- **Via SSH**:
  ```bash
  sudo docker exec -it umpsah-brain ollama pull llama3.1:8b
  ```
- **Via Synology GUI**:
  1. Open **Container Manager** -> **Container**.
  2. Click on the `umpsah-brain` container and select **Action** -> **Terminal**.
  3. Click **Create** to launch a bash shell.
  4. Type: `ollama pull llama3.1:8b` and hit Enter.

---

## 🐳 Step 5 — Verify VPS Container Manager Natively

Because your backend shares the host's `/var/run/docker.sock` socket:
1. When you use the VPS Manager in the frontend (`https://umpsahllm.web.app`), it makes calls to `https://api.umpsahllm.com/api/vps/create`.
2. The request passes securely through the Cloudflare Tunnel directly to the Node.js API running inside the `umpsah-backend` container.
3. The API uses the shared Docker socket to command your NAS Docker Engine to provision, start, or stop native Linux containers!
4. All provisioned containers are managed locally, running directly on your NAS hardware with strict limits (512MB RAM and 0.5 CPU) to protect your NAS resources.
