# AU Sentinel - Stop All Services Script

$ErrorActionPreference = "Stop"

# Header
Clear-Host
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║              STOPPING AU SENTINEL SERVICES                ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Red

$infraPath = "C:\osentLib\infra"

Write-Host "`nStopping Docker services..." -ForegroundColor Yellow
Set-Location $infraPath

docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker services stopped successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to stop Docker services" -ForegroundColor Red
}

Write-Host "`nNote: Backend and Frontend windows need to be closed manually (Ctrl+C)" -ForegroundColor Cyan
Write-Host "Or use Task Manager to stop 'dotnet' and 'node' processes" -ForegroundColor Cyan

Write-Host "`n✓ Done!" -ForegroundColor Green
Read-Host "`nPress Enter to exit"
