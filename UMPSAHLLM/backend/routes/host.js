// Host / PC control routes: sandboxed filesystem ops (within ./workspace) + machine stats.
// Mounted from server.js:  require('./routes/host')(app, { requireAuth, requireAdmin })

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

module.exports = function registerHostRoutes(app, { requireAuth, requireAdmin }) {
  const WORKSPACE_DIR = path.resolve(__dirname, '..', 'workspace');
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  function getSafePath(targetPath) {
    const safePath = path.resolve(WORKSPACE_DIR, targetPath || '');
    if (!safePath.startsWith(WORKSPACE_DIR)) {
      throw new Error('Path traversal detected.');
    }
    return safePath;
  }

  app.post('/api/fs/list', (req, res) => {
    try {
      const { dirPath = '' } = req.body;
      const target = getSafePath(dirPath);
      if (!fs.existsSync(target)) return res.json({ files: [] });

      const items = fs.readdirSync(target, { withFileTypes: true });
      const files = items.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(dirPath, item.name).replace(/\\/g, '/'),
      }));
      res.json({ files });
    } catch (e) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post('/api/fs/read', (req, res) => {
    try {
      const { filePath } = req.body;
      const target = getSafePath(filePath);
      if (!fs.existsSync(target)) return res.status(404).json({ error: 'File not found' });

      const content = fs.readFileSync(target, 'utf-8');
      res.json({ content });
    } catch (e) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post('/api/fs/write', requireAuth, requireAdmin, (req, res) => {
    try {
      const { filePath, content } = req.body;
      const target = getSafePath(filePath);

      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(target, content, 'utf-8');
      res.json({ status: 'success' });
    } catch (e) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post('/api/fs/delete', requireAuth, requireAdmin, (req, res) => {
    try {
      const { filePath } = req.body;
      const target = getSafePath(filePath);
      if (fs.existsSync(target)) {
        if (fs.statSync(target).isDirectory()) {
          fs.rmSync(target, { recursive: true, force: true });
        } else {
          fs.unlinkSync(target);
        }
      }
      res.json({ status: 'success' });
    } catch (e) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post('/api/fs/mkdir', requireAuth, requireAdmin, (req, res) => {
    try {
      const { filePath } = req.body;
      const target = getSafePath(filePath);
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
      res.json({ status: 'success' });
    } catch (e) {
      res.status(403).json({ error: e.message });
    }
  });

  app.get('/api/pc/stats', (req, res) => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      res.json({
        cpu: os.cpus(),
        memory: { total: totalMem, used: usedMem, free: freeMem },
        uptime: os.uptime(),
        platform: os.platform(),
        release: os.release(),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/pc/processes', (req, res) => {
    exec('tasklist /FO CSV /NH', (error, stdout) => {
      if (error) return res.status(500).json({ error: error.message });

      const processes = stdout.split('\n').filter((l) => l.trim()).map((line) => {
        const parts = line.split('","');
        if (parts.length < 5) return null;
        return {
          name: parts[0].replace(/"/g, ''),
          pid: parts[1].replace(/"/g, ''),
          mem: parts[4].replace(/"/g, '').replace(' K', '').trim(),
        };
      }).filter((p) => p);

      res.json({ processes });
    });
  });

  app.post('/api/pc/kill', requireAuth, requireAdmin, (req, res) => {
    const { pid } = req.body;
    exec(`taskkill /PID ${pid} /F`, (error, stdout) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ status: 'success', output: stdout });
    });
  });
};
