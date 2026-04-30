const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Point directly to the compiled PicoClaw binary located two folders up
const PICOCLAW_EXE = path.resolve(__dirname, '../../picoclaw.exe');

let addon;
try {
  // Try loading the compiled C++ Addon if available
  addon = require('./build/Release/umpsahllm_native');
  console.log("🟢 UMPSAHLLM Native C++ Extension Loaded");
} catch (e) {
  console.log("⚠️ Native C++ Addon not built. Hooking via Node Child Process strictly to PicoClaw.");
}

app.post('/api/chat', (req, res) => {
  const { message, model, sessionId = 'web-default' } = req.body;
  
  if (!message) {
      return res.status(400).json({ error: "Message is required" });
  }

  // Use requested model or default to llama3.1:8b
  const targetModel = model || 'llama3.1:8b';

  // Escape quotation marks strictly to prevent CLI injection
  const safeMessage = message.replace(/"/g, '\\"');

  console.log(`Executing PicoClaw task [${targetModel}]: ${safeMessage}`);

  execFile(PICOCLAW_EXE, ['agent', '-m', message, '--model', targetModel, '--session', sessionId], { cwd: path.resolve(__dirname, '../../') }, (error, stdout, stderr) => {
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

