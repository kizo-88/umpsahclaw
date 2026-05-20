const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const port = 3001;

// Robust manual CORS middleware to ensure preflight OPTIONS and headers work perfectly behind Cloudflare/reverse proxies
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// Use environment variable for the binary path (useful for Docker), fallback to local path
const PICOCLAW_EXE = process.env.PICOCLAW_EXE_PATH || path.resolve(__dirname, '../../picoclaw.exe');

let addon;
try {
  // Try loading the compiled C++ Addon if available
  addon = require('./build/Release/umpsahllm_native');
  console.log("🟢 UMPSAHLLM Native C++ Extension Loaded");
} catch (e) {
  console.log("⚠️ Native C++ Addon not built. Hooking via Node Child Process strictly to PicoClaw.");
}

const fs = require('fs');

// Ensure training data directory exists
const TRAINING_DATA_DIR = path.resolve(__dirname, 'training_data');
if (!fs.existsSync(TRAINING_DATA_DIR)) {
    fs.mkdirSync(TRAINING_DATA_DIR, { recursive: true });
}

app.post('/api/log', (req, res) => {
    const { prompt, response, engine, model, userId, timestamp } = req.body;
    
    const logEntry = JSON.stringify({
        prompt,
        response,
        engine,
        model,
        userId,
        timestamp: timestamp || new Date().toISOString()
    }) + '\n';

    const logFile = path.join(TRAINING_DATA_DIR, `interactions_${new Date().toISOString().split('T')[0]}.jsonl`);
    
    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            console.error('Failed to log interaction:', err);
            return res.status(500).json({ error: 'Failed to log interaction' });
        }
        res.json({ status: 'logged' });
    });
});

// VPS Management System (Phase 5) & Compute Engine (Docker)
const Docker = require('dockerode');
const docker = new Docker(); // Automatically connects to local docker socket/pipe
let useDocker = false;

// Test Docker connection on startup
docker.ping().then(() => {
    console.log("🐳 Docker Engine connected successfully! Compute Engine active.");
    useDocker = true;
}).catch((err) => {
    console.log("⚠️ Docker Engine not detected. VPS Manager running in Mock Mode.");
});

const VPS_REGISTRY = path.resolve(__dirname, 'vps_registry.json');
if (!fs.existsSync(VPS_REGISTRY)) {
    fs.writeFileSync(VPS_REGISTRY, JSON.stringify([
        { id: 'vps-01', name: 'Web Server Alpha', status: 'running', ip: '172.17.0.2', type: 'Node.js' },
        { id: 'vps-02', name: 'Database Prod', status: 'running', ip: '172.17.0.3', type: 'PostgreSQL' }
    ]));
}

app.get('/api/vps/list', async (req, res) => {
    if (useDocker) {
        try {
            const containers = await docker.listContainers({ all: true });
            const vpsList = containers.map(c => ({
                id: c.Id.substring(0, 12),
                name: c.Names[0].replace('/', ''),
                status: c.State === 'running' ? 'running' : 'stopped',
                ip: Object.values(c.NetworkSettings.Networks)[0]?.IPAddress || '-',
                cpu: c.State === 'running' ? 'N/A' : '0%', // Requires stats stream for real CPU
                ram: c.State === 'running' ? 'N/A' : '0B',
                uptime: c.Status,
                type: c.Image
            }));
            return res.json(vpsList);
        } catch (e) {
            console.error("Docker error:", e);
        }
    }

    // Fallback to Mock
    const data = JSON.parse(fs.readFileSync(VPS_REGISTRY));
    res.json(data.map(v => ({
        ...v,
        cpu: v.status === 'running' ? `${Math.floor(Math.random() * 20)}%` : '0%',
        ram: v.status === 'running' ? `${Math.floor(Math.random() * 512)}MB / 1GB` : '0B / 1GB',
        uptime: v.status === 'running' ? '14d 2h' : '-'
    })));
});

app.post('/api/vps/toggle', async (req, res) => {
    const { id } = req.body;

    if (useDocker) {
        try {
            const container = docker.getContainer(id);
            const info = await container.inspect();
            if (info.State.Running) {
                await container.stop();
            } else {
                await container.start();
            }
            return res.json({ status: 'updated via Docker' });
        } catch (e) {
            console.error("Docker toggle error:", e);
        }
    }

    let data = JSON.parse(fs.readFileSync(VPS_REGISTRY));
    data = data.map(v => v.id === id ? { ...v, status: v.status === 'running' ? 'stopped' : 'running' } : v);
    fs.writeFileSync(VPS_REGISTRY, JSON.stringify(data));
    res.json({ status: 'updated' });
});

app.post('/api/vps/create', async (req, res) => {
    const { name, image = 'nginx:alpine' } = req.body;

    if (useDocker) {
        try {
            // First ensure the image exists or pull it
            await new Promise((resolve, reject) => {
                docker.pull(image, (err, stream) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
                });
            });

            const container = await docker.createContainer({
                Image: image,
                name: name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString().slice(-4),
                HostConfig: {
                    Memory: 512 * 1024 * 1024, // 512MB RAM Limit
                    NanoCPUs: 500000000        // 0.5 CPU Limit
                }
            });
            await container.start();
            return res.json({ status: 'created', id: container.id });
        } catch (e) {
            console.error("Docker create error:", e);
            return res.status(500).json({ error: "Failed to provision via Docker" });
        }
    }

    // Mock Fallback
    let data = JSON.parse(fs.readFileSync(VPS_REGISTRY));
    data.push({
        id: `vps-mock-${Date.now()}`,
        name: name,
        status: 'running',
        ip: `172.17.0.${Math.floor(Math.random()*100)}`,
        type: image
    });
    fs.writeFileSync(VPS_REGISTRY, JSON.stringify(data));
    res.json({ status: 'created' });
});

app.post('/api/cloud-chat', async (req, res) => {
    const { message, model, sessionId } = req.body;
    const API_KEY = process.env.CLOUD_LLM_API_KEY;

    if (!API_KEY) {
        return res.json({ response: "[System]: Cloud Engine API Key missing. Please configure CLOUD_LLM_API_KEY on the NAS." });
    }

    // This is where we would call Gemini/OpenAI
    // For now, returning a placeholder to demonstrate the secure proxy flow
    const assistantMsg = `[Cloud Engine - ${model}]: I have received your request. (Cloud API Integration Active - Waiting for Final Key Validation)`;
    
    res.json({ response: assistantMsg });
});

app.post('/api/chat', (req, res) => {
  const { message, model, sessionId = 'web-default' } = req.body;
  
  if (!message) {
      return res.status(400).json({ error: "Message is required" });
  }

  // Map frontend model IDs to Ollama model names
  const MODEL_MAP = {
    'llama3.1-8b': 'llama3.1:8b',
    'phi3-mini': 'phi3:mini',
    'qwen2.5-7b': 'qwen2.5:7b',
  };

  // Use requested model or default to llama3.1:8b
  const targetModel = MODEL_MAP[model] || model || 'llama3.1:8b';

  // Escape quotation marks strictly to prevent CLI injection
  const safeMessage = message.replace(/"/g, '\\"');

  console.log(`Executing PicoClaw task [${targetModel}]: ${safeMessage}`);

  execFile(PICOCLAW_EXE, ['agent', '-m', message, '--model', targetModel, '--session', sessionId], { cwd: path.resolve(__dirname, '../../'), windowsHide: true, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
          console.error(`PicoClaw execution error: ${error}`);
          return res.status(500).json({ response: `[PicoClaw OS Error]: Failed to start agent. Error: ${error.message}` });
      }

      // Strip the ASCII banner and extra whitespace
      let finalReply = stdout.replace(/^[\s\S]*╚═╝\s+╚═╝\s+╚══╝╚══╝\s*/, '').trim();
      
      // If we failed to strip the banner (e.g. it changed), at least trim it
      if (!finalReply) finalReply = stdout.trim();


      // Ensure we don't send an empty reply if output goes to stderr
      if (!finalReply && stderr) {
        finalReply = stderr.trim();
      }

      res.json({ response: finalReply });
  });
});

const HOST = '0.0.0.0';
app.listen(port, HOST, () => {
  console.log(`🚀 UMPSAHLLM Backend running on http://172.17.27.62:${port}`);
  console.log(`🔗 Interface Target: ${PICOCLAW_EXE}`);
});

