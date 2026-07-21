require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');
const { requireAuth } = require('./auth');

const app = express();
const port = process.env.PORT || 3002;
app.set('trust proxy', 1); // behind Cloudflare / reverse proxy — needed for correct client IPs

// Security headers. CSP/CORP relaxed so the web app can call this API cross-origin.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// CORS allowlist. Set ALLOWED_ORIGINS (comma-separated) to restrict; defaults cover the
// web app + local dev. Set it to "*" to allow any origin (not recommended in production).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://umpsahllm.web.app,https://umpsahllm.firebaseapp.com,http://localhost:5173,http://localhost:3000')
  .split(',').map((s) => s.trim()).filter(Boolean);
const ALLOW_ANY_ORIGIN = ALLOWED_ORIGINS.includes('*');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOW_ANY_ORIGIN || ALLOWED_ORIGINS.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (ALLOW_ANY_ORIGIN) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Token, ngrok-skip-browser-warning');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '5mb' }));

// Rate limit the public API to blunt abuse.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MIN) || 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health check for container healthcheck / uptime monitors.
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() }));

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

const memoryService = require('./memoryService');
const composioService = require('./composioService');
const ragService = require('./ragService');
const agentService = require('./agentService');

// --- Ollama client (NAS engine) ---
const { Ollama } = require('ollama');
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

// --- Shared interaction logger (training data JSONL + Markdown vault for RAG) ---
function logInteraction({ prompt, response, engine, model, userId, timestamp } = {}) {
  try {
    const entry = JSON.stringify({
      prompt,
      response,
      engine,
      model,
      userId,
      timestamp: timestamp || new Date().toISOString(),
    }) + '\n';
    const logFile = path.join(TRAINING_DATA_DIR, `interactions_${new Date().toISOString().split('T')[0]}.jsonl`);
    fs.appendFileSync(logFile, entry);

    if (prompt && response) {
      if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
      const safeTitle = prompt.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
      const docName = `Memory_${Date.now()}_${safeTitle}.md`;
      const docContent = `# User Query\n${prompt}\n\n# AI Response\n${response}\n\n*Engine: ${engine} | Model: ${model}*`;
      fs.writeFileSync(path.join(VAULT_DIR, docName), docContent);
    }
  } catch (e) {
    console.error('[logInteraction] failed:', e.message);
  }
}

// Normalize incoming chat payloads to OpenAI-style {role, content} messages.
function normalizeMessages(body = {}) {
  if (Array.isArray(body.messages)) {
    return body.messages.map((m) => ({ role: m.role || 'user', content: m.text || m.content || '' }));
  }
  if (body.message) return [{ role: 'user', content: body.message }];
  return [];
}

// Optional admin gate for host-control (RCE-capable) endpoints. No-op unless
// ADMIN_TOKEN is set, so existing flows keep working until you opt in. To enable:
// set ADMIN_TOKEN on the NAS and send it as `X-Admin-Token` (VITE_ADMIN_TOKEN) from the UI.
function requireAdmin(req, res, next) {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return next(); // gate disabled
  const provided = req.headers['x-admin-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (provided && provided === required) return next();
  return res.status(401).json({ error: 'Unauthorized: admin token required for this endpoint.' });
}

const VPS_DATA_DIR = path.resolve(__dirname, 'vps_files');
if (!fs.existsSync(VPS_DATA_DIR)) {
    fs.mkdirSync(VPS_DATA_DIR, { recursive: true });
}

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// --- VPS Script Upload (Phase 5) ---
app.post('/api/vps/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const instanceId = req.body.instanceId;
        if (!instanceId) return res.status(400).json({ error: "Missing instance ID" });

        const instanceDir = path.join(__dirname, 'vps_files', instanceId);
        if (!fs.existsSync(instanceDir)) {
            fs.mkdirSync(instanceDir, { recursive: true });
        }

        const filePath = path.join(instanceDir, req.file.originalname);
        fs.renameSync(req.file.path, filePath);

        // Upload to NAS via vpsService
        const result = await vpsService.uploadFileToNAS(instanceId, filePath, req.file.originalname);

        res.json({ success: true, filename: req.file.originalname, nas: result });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/composio/execute', requireAuth, async (req, res) => {
  try {
    const { actionName, params } = req.body;
    if (!actionName) return res.status(400).json({ error: 'Missing actionName' });
    const result = await composioService.executeAction(actionName, params || {});
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/composio/status', async (req, res) => {
  try {
    const connections = await composioService.getConnections();
    res.json({ success: true, connections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/composio/connect', requireAuth, async (req, res) => {
  try {
    const { appName } = req.body;
    if (!appName) return res.status(400).json({ error: 'Missing appName' });
    const redirectUrl = await composioService.initiateConnection(appName);
    res.json({ success: true, redirectUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/save', requireAuth, async (req, res) => {
  try {
    const { prompt, consensus } = req.body;
    if (!prompt || !consensus) return res.status(400).json({ error: 'Missing prompt or consensus' });
    const id = await memoryService.saveToMemory(prompt, consensus);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory/list', async (req, res) => {
  try {
    const memories = await memoryService.getAllMemories();
    res.json({ success: true, memories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Server-side conversation persistence (history survives across devices) ---
app.get('/api/conversations', requireAuth, async (req, res) => {
  try {
    const userId = (req.user && req.user.uid) || req.query.userId || '';
    res.json({ success: true, conversations: await memoryService.listConversations(userId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, messages: await memoryService.getConversationMessages(req.params.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { role, content, title } = req.body;
    if (!role || !content) return res.status(400).json({ error: 'role and content are required' });
    const userId = (req.user && req.user.uid) || req.body.userId || '';
    const id = await memoryService.addMessage(req.params.id, userId, role, content, title);
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/log', (req, res) => {
    logInteraction(req.body || {});
    res.json({ status: 'logged' });
});

// VPS Management System (Phase 5) & Compute Engine (NAS SSH)
const vpsService = require('./vpsService');

app.get('/api/vps/list', async (req, res) => {
    const list = await vpsService.getVPSList();
    res.json(list);
});

app.post('/api/vps/toggle', requireAuth, async (req, res) => {
    const { id } = req.body;
    const result = await vpsService.toggleVPS(id);
    res.json(result);
});

app.post('/api/vps/create', requireAuth, async (req, res) => {
    const { name, ip, os } = req.body;
    const result = await vpsService.createVPS(name, ip, os);
    res.json(result);
});

app.delete('/api/vps/:id', requireAuth, async (req, res) => {
    const result = await vpsService.deleteVPS(req.params.id);
    res.json(result);
});

// Automation Execution Endpoint
const { exec } = require('child_process');
app.post('/api/automation/bash', requireAuth, requireAdmin, (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'No command provided' });
    
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, output: stderr || error.message });
        }
        res.json({ success: true, output: stdout || stderr });
    });
});

// NAS Engine: local Ollama inference with RAG context injection + logging.
app.post('/api/nas-chat', requireAuth, async (req, res) => {
    try {
        const { model, userId } = req.body;
        const userMsgs = normalizeMessages(req.body);
        const lastUser = [...userMsgs].reverse().find((m) => m.role === 'user');
        const vaultContext = await ragService.search(ollama, lastUser?.content || '');

        const messages = [
            { role: 'system', content: `You are UMPSAHLLM, a NAS-hosted AI assistant. Be concise and helpful.${vaultContext}` },
            ...userMsgs,
        ];

        const completion = await ollama.chat({
            model: model || process.env.NAS_MODEL || 'llama3.1:8b',
            messages,
            stream: false,
        });
        const text = completion?.message?.content || '';

        logInteraction({ prompt: lastUser?.content, response: text, engine: 'NAS Ollama', model: model || 'llama3.1:8b', userId });
        res.json({ response: text });
    } catch (e) {
        console.error('[nas-chat] error:', e.message);
        res.status(500).json({ response: `[NAS Engine error]: ${e.message}` });
    }
});

// NAS Engine (streaming): Server-Sent Events stream of Ollama tokens.
app.post('/api/nas-chat-stream', requireAuth, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();
    try {
        const { model, userId } = req.body;
        const userMsgs = normalizeMessages(req.body);
        const lastUser = [...userMsgs].reverse().find((m) => m.role === 'user');
        const vaultContext = await ragService.search(ollama, lastUser?.content || '');
        const messages = [
            { role: 'system', content: `You are UMPSAHLLM, a NAS-hosted AI assistant. Be concise and helpful.${vaultContext}` },
            ...userMsgs,
        ];
        const stream = await ollama.chat({ model: model || process.env.NAS_MODEL || 'llama3.1:8b', messages, stream: true });
        let full = '';
        for await (const part of stream) {
            const tok = part?.message?.content || '';
            if (tok) { full += tok; res.write(`data: ${JSON.stringify({ token: tok })}\n\n`); }
        }
        logInteraction({ prompt: lastUser?.content, response: full, engine: 'NAS Ollama (stream)', model: model || 'llama3.1:8b', userId });
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (e) {
        console.error('[nas-chat-stream] error:', e.message);
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
    }
});

// Cloud Engine: secure server-side proxy to an OpenAI-compatible API.
app.post('/api/cloud-chat', requireAuth, async (req, res) => {
    const API_KEY = process.env.CLOUD_LLM_API_KEY;
    if (!API_KEY) {
        return res.json({ response: '[System]: Cloud Engine API Key missing. Please configure CLOUD_LLM_API_KEY on the NAS.' });
    }
    try {
        const { model, userId } = req.body;
        const userMsgs = normalizeMessages(req.body);
        const lastUser = [...userMsgs].reverse().find((m) => m.role === 'user');
        const vaultContext = await ragService.search(ollama, lastUser?.content || '');
        const baseURL = process.env.CLOUD_LLM_BASE_URL || 'https://api.openai.com/v1';

        const messages = [
            { role: 'system', content: `You are UMPSAHLLM Cloud, a frontier AI assistant.${vaultContext}` },
            ...userMsgs,
        ];

        const apiRes = await axios.post(
            `${baseURL}/chat/completions`,
            { model: model || process.env.CLOUD_LLM_MODEL || 'gpt-4o-mini', messages },
            { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        const text = apiRes.data?.choices?.[0]?.message?.content || '';

        logInteraction({ prompt: lastUser?.content, response: text, engine: 'Cloud', model: model || 'gpt-4o-mini', userId });
        res.json({ response: text });
    } catch (e) {
        console.error('[cloud-chat] error:', e.response?.data || e.message);
        res.status(500).json({ response: `[Cloud Engine error]: ${e.response?.data?.error?.message || e.message}` });
    }
});

// Agent Engine: cloud LLM that can call the user's connected Composio tools.
app.post('/api/agent-chat', requireAuth, async (req, res) => {
    try {
        const userMsgs = normalizeMessages(req.body);
        const lastUser = [...userMsgs].reverse().find((m) => m.role === 'user');
        const vaultContext = await ragService.search(ollama, lastUser?.content || '');
        const messages = [
            { role: 'system', content: `You are UMPSAHLLM, an AI agent that can use the user's connected tools to complete tasks. Use tools when helpful, then give a concise final answer.${vaultContext}` },
            ...userMsgs,
        ];
        const out = await agentService.agentChat({ messages, apps: req.body.apps || [] });
        logInteraction({ prompt: lastUser?.content, response: out.response, engine: 'Cloud Agent', model: process.env.CLOUD_LLM_MODEL || 'gpt-4o-mini', userId: req.body.userId });
        res.json(out);
    } catch (e) {
        console.error('[agent-chat] error:', e.response?.data || e.message);
        res.status(500).json({ response: `[Agent error]: ${e.message}` });
    }
});

const VAULT_DIR = path.resolve(__dirname, 'vault');
if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
}

function getVaultContext() {
    let context = "";
    if (fs.existsSync(VAULT_DIR)) {
        const files = fs.readdirSync(VAULT_DIR).filter(f => f.endsWith('.md'));
        // Sort files by modified time, descending (newest first)
        files.sort((a, b) => fs.statSync(path.join(VAULT_DIR, b)).mtime.getTime() - fs.statSync(path.join(VAULT_DIR, a)).mtime.getTime());
        // Grab top 3 recent memories
        const recentFiles = files.slice(0, 3);
        if (recentFiles.length > 0) {
            context = "\n\n=== LONG TERM MEMORY (Markdown Vault) ===\nHere is recent context from your Markdown Vault. Use this to inform your answers if relevant:\n";
            for (const f of recentFiles) {
                context += `\n--- Document: ${f} ---\n`;
                context += fs.readFileSync(path.join(VAULT_DIR, f), 'utf-8');
                context += `\n-----------------------\n`;
            }
        }
    }
    return context;
}

// ==========================================
// Host / PC control routes (extracted to routes/host.js)
require('./routes/host')(app, { requireAuth, requireAdmin });

app.post('/api/rag/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });
  
  console.log(`Executing RAG Search for: ${query}`);
  try {
      const vaultContext = await ragService.search(ollama, query);
      res.json({ context: vaultContext });
  } catch (error) {
      console.error(`RAG Search error: ${error}`);
      res.status(500).json({ error: 'Failed to retrieve context' });
  }
});

// ==========================================
// AGENT BROWSER (PROXY & SCRAPER API)
// ==========================================
const axios = require('axios');
const cheerio = require('cheerio');

app.post('/api/browse', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Remove unnecessary elements
        $('script, style, noscript, iframe, img, svg, video, audio, link, meta, head').remove();

        // Get clean text formatted slightly nicely
        const cleanText = $('body').text()
            .replace(/\n\s*\n/g, '\n\n') // Remove excessive empty lines
            .replace(/[ \t]+/g, ' ')      // Condense spaces
            .trim();

        res.json({
            title: $('title').text() || url,
            text: cleanText,
            url: url
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Global variable to track the last accessed proxy origin for fallback root asset routing
global.currentProxyOrigin = '';

// Full Proxy Middleware to handle relative assets fetched by JS (e.g. Vite modules)
app.use((req, res, next) => {
    // If request is already explicitly going to /proxy/ or /api/, pass it through
    if (req.path.startsWith('/proxy/') || req.path.startsWith('/api/')) {
        return next();
    }

    // Attempt to route based on referer
    const referer = req.headers.referer;
    if (referer && referer.includes('/proxy/')) {
        try {
            const targetUrlStr = referer.substring(referer.indexOf('/proxy/') + 7);
            const targetOrigin = new URL(targetUrlStr).origin;
            return res.redirect('/proxy/' + targetOrigin + req.originalUrl);
        } catch (e) {}
    }

    // Fallback: If no referer, and we have an active proxy session, route to the active origin
    if (global.currentProxyOrigin) {
        return res.redirect('/proxy/' + global.currentProxyOrigin + req.originalUrl);
    }

    next();
});

app.get('/proxy/*', async (req, res) => {
    try {
        const targetUrl = req.params[0];
        if (!targetUrl || !targetUrl.startsWith('http')) return res.status(400).send('Valid URL required');

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000,
            responseType: 'arraybuffer',
            validateStatus: () => true // Accept all statuses to proxy them faithfully
        });

        const contentType = response.headers['content-type'];
        if (contentType) res.set('Content-Type', contentType);

        if (contentType && contentType.includes('text/html')) {
            global.currentProxyOrigin = new URL(targetUrl).origin;
            
            const html = response.data.toString('utf8');
            const $ = cheerio.load(html);
            
            // Remove crossorigin attributes as they trigger strict CORS on our proxy
            $('[crossorigin]').removeAttr('crossorigin');

            // Rewrite links to route through our proxy explicitly
            $('[href], [src]').each((_, el) => {
                const attr = $(el).attr('href') ? 'href' : 'src';
                const link = $(el).attr(attr);
                if (link && !link.startsWith('data:') && !link.startsWith('blob:')) {
                    try {
                        const absoluteUrl = new URL(link, targetUrl).href;
                        $(el).attr(attr, '/proxy/' + absoluteUrl);
                    } catch (e) {}
                }
            });

            // Inject Automation Hook Script
            const hookScript = `
                <script>
                    // Add ripple styles
                    const style = document.createElement('style');
                    style.innerHTML = \`
                        .ai-ripple {
                            position: absolute;
                            border-radius: 50%;
                            background: rgba(99, 102, 241, 0.4);
                            transform: scale(0);
                            animation: ai-ripple-anim 600ms linear;
                            pointer-events: none;
                            z-index: 999999;
                        }
                        @keyframes ai-ripple-anim {
                            to { transform: scale(4); opacity: 0; }
                        }
                    \`;
                    document.head.appendChild(style);

                    window.addEventListener("message", (event) => {
                        if (event.data && event.data.type === "AI_ACTION") {
                            const { action, amount, selector } = event.data;
                            if (action === "scroll") {
                                window.scrollBy({ top: amount || 500, behavior: "smooth" });
                            }
                            if (action === "click") {
                                const el = document.querySelector(selector);
                                if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                    
                                    setTimeout(() => {
                                        const rect = el.getBoundingClientRect();
                                        const ripple = document.createElement('div');
                                        ripple.className = 'ai-ripple';
                                        
                                        // Center the ripple on the element
                                        const size = Math.max(rect.width, rect.height);
                                        ripple.style.width = ripple.style.height = size + 'px';
                                        ripple.style.left = (rect.left + window.scrollX + rect.width/2 - size/2) + 'px';
                                        ripple.style.top = (rect.top + window.scrollY + rect.height/2 - size/2) + 'px';
                                        
                                        document.body.appendChild(ripple);
                                        
                                        setTimeout(() => {
                                            ripple.remove();
                                            el.click();
                                        }, 600);
                                    }, 500);
                                }
                            }
                            if (action === "getCoords") {
                                const el = document.querySelector(selector);
                                if (el) {
                                    const rect = el.getBoundingClientRect();
                                    window.parent.postMessage({
                                        type: "AI_COORDS_REPLY",
                                        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                                    }, "*");
                                }
                            }
                        }
                    });
                </script>
            `;
            $('body').append(hookScript);

            return res.send($.html());
        } else {
            return res.send(response.data);
        }
    } catch (e) {
        res.status(500).send(`Proxy Error: ${e.message}`);
    }
});

// --- Workspace / ONLYOFFICE Integration ---
const WORKSPACE_DIR = path.join(__dirname, 'workspace', 'docs');

const workspaceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(WORKSPACE_DIR)) {
            fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
        }
        cb(null, WORKSPACE_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const workspaceUpload = multer({ storage: workspaceStorage });

// Upload Endpoint
app.post('/api/workspace/upload', workspaceUpload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    console.log(`[Workspace] Uploaded file: ${req.file.originalname}`);
    res.json({ 
        filename: req.file.originalname, 
        fileType: path.extname(req.file.originalname).substring(1).toLowerCase() 
    });
});

// List Files Endpoint
app.get('/api/workspace/files', (req, res) => {
    try {
        if (!fs.existsSync(WORKSPACE_DIR)) {
            fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
        }
        const files = fs.readdirSync(WORKSPACE_DIR);
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: 1, message: err.message });
    }
});

// Workspace Config Endpoint (resolves LAN IP for OnlyOffice connection)
app.get('/api/workspace/config', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    let lanIp = 'localhost';
    
    // Find the first non-internal IPv4 address
    for (const devName in networkInterfaces) {
        const iface = networkInterfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                lanIp = alias.address;
                break;
            }
        }
        if (lanIp !== 'localhost') break;
    }
    res.json({ lanIp, port: port });
});

// Delete Document Endpoint
app.delete('/api/workspace/documents/:filename', (req, res) => {
    const filePath = path.join(WORKSPACE_DIR, req.params.filename);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Workspace] Deleted file: ${req.params.filename}`);
            res.json({ status: 'ok' });
        } else {
            res.status(404).send('Document not found');
        }
    } catch (err) {
        res.status(500).json({ error: 1, message: err.message });
    }
});

app.get('/api/workspace/documents/:filename', (req, res) => {
    const filePath = path.join(WORKSPACE_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Document not found');
    }

    // If client specifically requests text extraction (e.g. for offline mock editor)
    if (req.query.text === 'true' && (req.params.filename.endsWith('.docx') || req.params.filename.endsWith('.doc'))) {
        const scriptPath = path.join(__dirname, 'extract.ps1');
        execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-filePath', filePath], (error, stdout, stderr) => {
            if (error) {
                console.error(`[Workspace] Extraction error:`, error, stderr);
                return res.status(500).send('Error extracting text from document');
            }
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(stdout);
        });
    } else {
        res.sendFile(filePath);
    }
});

// Direct PUT save endpoint for local / mock editor saving
app.put('/api/workspace/documents/:filename', (req, res) => {
    const filePath = path.join(WORKSPACE_DIR, req.params.filename);
    const { content } = req.body;
    if (content !== undefined) {
        try {
            if (!fs.existsSync(WORKSPACE_DIR)) {
                fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`[Workspace] Saved file directly: ${req.params.filename}`);
            res.json({ status: 'ok' });
        } catch (err) {
            res.status(500).json({ error: 1, message: err.message });
        }
    } else {
        res.status(400).send('Missing content');
    }
});

// Mock OnlyOffice script to allow local workspace testing without real OnlyOffice container
app.get('/mock-onlyoffice/web-apps/apps/api/documents/api.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
window.DocsAPI = {
  DocEditor: function(id, config) {
    console.log("Mock OnlyOffice Editor Initialized", id, config);
    const container = document.getElementById(id);
    if (!container) return;
    
    container.innerHTML = \`
      <div style="display:flex; flex-direction:column; height:100%; min-height:450px; background:#0f111a; border:1px solid #1e293b; border-radius:12px; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:12px 20px; border-bottom:1px solid #334155;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#38bdf8; font-weight:bold; font-size:14px;">🖹</span>
            <span style="color:#e2e8f0; font-weight:bold; font-size:14px; font-family:sans-serif;">\${config.document.title}</span>
            <span style="background:#0284c7; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; font-family:sans-serif;">LOCAL MOCK EDITOR</span>
          </div>
          <button id="mock-save-btn" style="background:#4f46e5; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; font-family:sans-serif; transition:background 0.2s;">Save Document</button>
        </div>
        <textarea id="mock-editor-textarea" style="flex:1; width:100%; border:none; background:#0b0f19; color:#f8fafc; padding:20px; font-family:Consolas, Monaco, monospace; font-size:14px; outline:none; resize:none; line-height:1.6; min-height:380px;"></textarea>
      </div>
    \`;
    
    const textarea = document.getElementById('mock-editor-textarea');
    const saveBtn = document.getElementById('mock-save-btn');
    
    // Fetch document content
    fetch(config.document.url)
      .then(r => r.text())
      .then(text => {
        textarea.value = text;
      })
      .catch(err => {
        console.error("Mock Editor Fetch Error:", err);
        textarea.value = "Error loading document.";
      });
      
    saveBtn.onclick = () => {
      saveBtn.disabled = true;
      saveBtn.innerText = "Saving...";
      
      // Save content to the backend PUT endpoint
      fetch(config.document.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: textarea.value })
      })
      .then(r => {
        if (!r.ok) throw new Error("Failed to save content");
        
        // Trigger OnlyOffice callback to notify backend
        return fetch(config.editorConfig.callbackUrl + "?filename=" + encodeURIComponent(config.document.title), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 2,
            url: config.document.url
          })
        });
      })
      .then(r => r.json())
      .then(res => {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Document";
        console.log("Save callback result:", res);
        alert("Document saved successfully!");
      })
      .catch(err => {
        console.error("Mock Editor Save Error:", err);
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Document";
        alert("Save failed: " + err.message);
      });
    };
  }
};
    `);
});

app.post('/api/workspace/documents/callback', async (req, res) => {
    try {
        const body = req.body;
        const filename = req.query.filename || 'document.txt'; 
        const filePath = path.join(WORKSPACE_DIR, filename);

        if (body.status === 2 || body.status === 3) { 
            if (body.url) {
                // Fetch the updated document from ONLYOFFICE Server
                const response = await fetch(body.url);
                if (!response.ok) throw new Error(`Failed to fetch saved document`);
                const buffer = await response.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buffer));
                console.log(`[Workspace] Document ${filename} saved successfully.`);
            }
        }
        res.json({ error: 0 });
    } catch (err) {
        console.error('[Workspace] Document save error:', err);
        res.status(500).json({ error: 1, message: err.message });
    }
});

const HOST = '0.0.0.0';
app.listen(port, HOST, () => {
  console.log(`🚀 UMPSAHLLM Backend running on http://172.17.27.62:${port}`);
  console.log(`🔗 Interface Target: ${PICOCLAW_EXE}`);
});

