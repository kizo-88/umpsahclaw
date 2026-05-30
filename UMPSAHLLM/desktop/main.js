const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');

let mainWindow;
let backendProcess;
let frontendServer;

function startBackend() {
  const backendPath = path.join(__dirname, 'backend/server.js');
  
  backendProcess = spawn('node', [backendPath], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env, PORT: 3002 } // Ensure it binds to 3002
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process.', err);
  });
}

function startFrontendServer() {
  const server = express();
  const distPath = path.join(__dirname, 'frontend/dist');
  
  server.use(express.static(distPath));
  
  // SPA fallback
  server.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return new Promise((resolve) => {
    frontendServer = server.listen(3003, () => {
      console.log('Frontend static server listening on port 3003');
      resolve();
    });
  });
}

async function createWindow() {
  // Start backend
  startBackend();

  // Start frontend static server
  await startFrontendServer();

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'UMPSAHLLM',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load the local frontend server
  mainWindow.loadURL('http://localhost:3003');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendServer) {
    frontendServer.close();
  }
});
