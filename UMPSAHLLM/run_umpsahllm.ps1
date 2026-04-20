# UMPSAHLLM Master Orchestrator (FIXED)
# Use: powershell -File run_umpsahllm.ps1

Write-Host "🚀 INITIALIZING UMPSAHLLM ECOSYSTEM (PicoClaw Framework)" -ForegroundColor Cyan

# 1. Start Ollama Brain (llama3.1:8b)
Write-Host "🧠 Loading AI Brain: llama3.1:8b..." -ForegroundColor Yellow
$ollamaCheck = ollama list | Select-String "llama3.1:8b"
if (-not $ollamaCheck) {
    Write-Host "📥 Model not found. Downloading llama3.1:8b..." -ForegroundColor Magenta
    ollama pull llama3.1:8b
}
Start-Process ollama -ArgumentList "run llama3.1:8b" -WindowStyle Hidden

# 2. Start Backend (Express + PicoClaw Bridge)
Write-Host "🔗 Starting PicoClaw Bridge (Backend)..." -ForegroundColor Green
$backendPath = "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\backend"
Start-Process cmd.exe -ArgumentList "/c cd /d ""$backendPath"" && npm start" -WindowStyle Hidden

# 3. Start Frontend (Enterprise OS UI)
Write-Host "🖥️ Starting UMPSAHLLM UI (Frontend)..." -ForegroundColor Blue
$frontendPath = "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\frontend"
Start-Process cmd.exe -ArgumentList "/c cd /d ""$frontendPath"" && npm run dev" -WindowStyle Hidden

# 4. Integrate OpenSpace
$openSpacePath = "C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW\UMPSAHLLM\openspace-core"
if (Test-Path $openSpacePath) {
    Write-Host "🌌 Launching OpenSpace Visual Terminal..." -ForegroundColor White
    Start-Process cmd.exe -ArgumentList "/c cd /d ""$openSpacePath"" && npm install && npm start" -WindowStyle Hidden
}

Write-Host "`n✅ UMPSAHLLM is now fully operational!" -ForegroundColor Green
Write-Host "👉 Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "👉 API Layer: http://localhost:3001" -ForegroundColor Cyan
Write-Host "👉 Brain: Ollama (llama3.1:8b)" -ForegroundColor Cyan
