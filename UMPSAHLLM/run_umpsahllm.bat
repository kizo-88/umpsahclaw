@echo off
SETLOCAL EnableDelayedExpansion

echo 🚀 INITIALIZING UMPSAHLLM ECOSYSTEM (PicoClaw Framework)

:: 1. Start Ollama Brain
echo 🧠 Loading AI Brain: llama3.1:8b...
start /min ollama run llama3.1:8b

:: 2. Start Backend
echo 🔗 Starting PicoClaw Bridge (Backend)...
cd /d "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\backend"
start /min npm start

:: 3. Start Frontend
echo 🖥️ Starting UMPSAHLLM UI (Frontend)...
cd /d "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\frontend"
start /min npm run dev

:: 4. Start OpenSpace
echo 🌌 Launching OpenSpace...
cd /d "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\openspace-core"
if exist "package.json" (
    start /min npm start
)

echo ✅ UMPSAHLLM is now fully operational!
echo 👉 Dashboard: http://localhost:5173
echo 👉 API Layer: http://localhost:3001
echo 👉 Brain: Ollama (llama3.1:8b)
pause
