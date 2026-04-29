# UMPSAHLLM Master Orchestrator (FIXED)
# Use: powershell -ExecutionPolicy Bypass -File run_umpsahllm.ps1

Write-Host "INITIALIZING UMPSAHLLM ECOSYSTEM (PicoClaw Framework)" -ForegroundColor Cyan

# 0. Set local Ollama environment if folder exists
$localOllama = Join-Path $PSScriptRoot "..\.ollama\models"
if (Test-Path $localOllama) {
    Write-Host "Using local Ollama models from: $localOllama" -ForegroundColor Green
    $env:OLLAMA_MODELS = $localOllama
}

# 1. Start Ollama Brains
Write-Host "Loading AI Brain: llama3.1:8b..." -ForegroundColor Yellow
$llamaCheck = & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list | Select-String "llama3.1:8b"
if (-not $llamaCheck) {
    Write-Host "Model not found. Downloading llama3.1:8b..." -ForegroundColor Magenta
    & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull llama3.1:8b
}

Write-Host "Loading AI Brain: qwen3.5:latest..." -ForegroundColor Yellow
$qwenCheck = & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list | Select-String "qwen3.5:latest"
if (-not $qwenCheck) {
    Write-Host "Model not found. Downloading qwen3.5:latest..." -ForegroundColor Magenta
    & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull qwen3.5:latest
}

# 2. Start Backend (Express + PicoClaw Bridge)
Write-Host "Starting PicoClaw Bridge (Backend)..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process cmd.exe -ArgumentList "/c cd /d ""$backendPath"" && npm start" -WindowStyle Hidden

# 3. Start Frontend (Enterprise OS UI)
Write-Host "Starting UMPSAHLLM UI (Frontend)..." -ForegroundColor Blue
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process cmd.exe -ArgumentList "/c cd /d ""$frontendPath"" && npm run dev" -WindowStyle Hidden

# 4. Integrate OpenSpace
$openSpacePath = Join-Path $PSScriptRoot "openspace-core"
if (Test-Path $openSpacePath) {
    Write-Host "Launching OpenSpace Visual Terminal..." -ForegroundColor White
    Start-Process cmd.exe -ArgumentList "/c cd /d ""$openSpacePath"" && npm install && npm start" -WindowStyle Hidden
}

Write-Host "`nUMPSAHLLM is now fully operational!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Layer: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Brain: Ollama (llama3.1:8b, qwen3.5:latest)" -ForegroundColor Cyan
