# LA-PULSE Startup Script
# Usage: powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  LA-PULSE - Starting All Services" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Kill any existing processes on ports 8000 and 5173
Write-Host "[*] Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "    Freed port $port" -ForegroundColor Gray
    }
}
Start-Sleep -Seconds 1

# Start Backend
Write-Host "[1/2] Starting Backend (FastAPI on port 8000)..." -ForegroundColor Green
$backendCmd = "cd '$root\backend'; python -m uvicorn main:app --reload --port 8000"
$backend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", $backendCmd -PassThru -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[2/2] Starting Frontend (Vite on port 5173)..." -ForegroundColor Green
$frontendCmd = "cd '$root\frontend'; npm run dev"
$frontend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", $frontendCmd -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  LA-PULSE is running!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  ---- Demo Credentials ----" -ForegroundColor Yellow
Write-Host "  National Admin:    admin / lapulse2026" -ForegroundColor White
Write-Host "  State Admin:       state_admin / lapulse2026" -ForegroundColor White
Write-Host "  District Officer:  dist_officer / lapulse2026" -ForegroundColor White
Write-Host "  LAO Officer:       lao_officer / lapulse2026" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C or close this window to stop." -ForegroundColor Gray
Write-Host ""

# Wait for user to close
try {
    Wait-Process -Id $backend.Id, $frontend.Id
} catch {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
