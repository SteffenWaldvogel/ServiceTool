# deploy.ps1 – Frontend bauen + Backend via PM2 neu starten
# Aufruf: .\scripts\deploy.ps1
# Auf dem Server ausfuehren nach: git pull

param(
    [string]$RootDir = "C:\ServiceTool"
)

Set-Location $RootDir
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Service Tool Deploy gestartet" -ForegroundColor Cyan
Write-Host "    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# 1. Git Pull (optional – nur wenn Script direkt vom Server aus aufgerufen wird)
# Write-Host "==> Git Pull..."
# git pull origin main

# 2. Backend-Dependencies installieren
Write-Host "==> Backend-Dependencies installieren..." -ForegroundColor Yellow
Set-Location "$RootDir\backend"
npm ci --omit=dev
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci (backend) fehlgeschlagen"; exit 1 }

# 3. Frontend bauen
Write-Host "==> Frontend bauen..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm ci --omit=dev
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend-Build fehlgeschlagen"; exit 1 }

# 4. PM2 neu starten
Write-Host "==> PM2 neu starten..." -ForegroundColor Yellow
Set-Location $RootDir
pm2 reload ecosystem.config.js --env production
if ($LASTEXITCODE -ne 0) {
    Write-Warning "PM2 reload fehlgeschlagen – versuche pm2 start..."
    pm2 start ecosystem.config.js --env production
}

Write-Host ""
Write-Host "==> Deploy abgeschlossen!" -ForegroundColor Green
Write-Host ""
pm2 status
