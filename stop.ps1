$ProjectRoot = $PSScriptRoot
$InfraDir = "$ProjectRoot\infra"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AU Sentinel - Stopping All Services  " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Frontend and Backend windows
Write-Host "[1/2] Stopping Frontend and Backend processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name dotnet -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Frontend and Backend stopped!" -ForegroundColor Green
Write-Host ""

# Step 2: Stop Docker containers
Write-Host "[2/2] Stopping Docker containers..." -ForegroundColor Yellow
Set-Location $InfraDir
docker-compose down
Set-Location $ProjectRoot
Write-Host "  Docker containers stopped!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All services stopped!                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host
