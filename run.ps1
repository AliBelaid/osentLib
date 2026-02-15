$ProjectRoot = $PSScriptRoot
$InfraDir = "$ProjectRoot\infra"
$FrontendDir = "$ProjectRoot\frontend"
$BackendDir = "$ProjectRoot\backend\api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AU Sentinel - Starting All Services  " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start Infrastructure (Docker)
Write-Host "[1/4] Starting infrastructure (PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO)..." -ForegroundColor Cyan
Set-Location $InfraDir
docker-compose up -d postgres redis rabbitmq opensearch opensearch-dashboards minio opensearch-init
Set-Location $ProjectRoot
Write-Host "  Infrastructure started!" -ForegroundColor Green
Write-Host ""

# Step 2: Wait for services to be healthy
Write-Host "[2/4] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "  Services ready!" -ForegroundColor Green
Write-Host ""

# Step 3: Start Backend API in new window
Write-Host "[3/4] Starting Backend API (dotnet run)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'AU Sentinel - Backend API' -ForegroundColor Yellow; cd '$BackendDir'; dotnet run"
Write-Host "  Backend started in new window!" -ForegroundColor Green
Write-Host ""

# Step 4: Start Frontend in new window
Write-Host "[4/4] Starting Frontend (Angular)..." -ForegroundColor Cyan
if (-not (Test-Path "$FrontendDir\node_modules")) {
    Write-Host "  Installing npm packages first..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm install
    Set-Location $ProjectRoot
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'AU Sentinel - Frontend' -ForegroundColor Yellow; cd '$FrontendDir'; npm start"
Write-Host "  Frontend started in new window!" -ForegroundColor Green
Write-Host ""

# Done - show URLs
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All services are running!            " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service                  URL" -ForegroundColor Cyan
Write-Host "  -------                  ---" -ForegroundColor Cyan
Write-Host "  Frontend                 http://localhost:4200"
Write-Host "  Backend API              http://localhost:5000"
Write-Host "  OpenSearch Dashboards    http://localhost:5601"
Write-Host "  RabbitMQ Management      http://localhost:15672"
Write-Host "  MinIO Console            http://localhost:9001"
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host
