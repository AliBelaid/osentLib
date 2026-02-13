# AU Sentinel - Complete System Startup Script
# This script checks dependencies, starts Docker services, and launches the application

param(
    [switch]$SkipDocker,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"
$WarningPreference = "SilentlyContinue"

# Color functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Step { param($Message) Write-Host "`n═══ $Message ═══" -ForegroundColor Magenta }

# Header
Clear-Host
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                   AU SENTINEL LAUNCHER                    ║
║        News Monitoring & Emergency Alert Platform         ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Not running as Administrator. Some features may not work."
    Write-Info "To run as admin, right-click PowerShell and select 'Run as Administrator'"
}

# Set locations
$rootPath = "C:\osentLib"
$infraPath = "$rootPath\infra"
$backendPath = "$rootPath\backend\api"
$frontendPath = "$rootPath\frontend"

Write-Step "Checking Prerequisites"

# Check Docker
$dockerInstalled = $false
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $dockerInstalled = $true
        Write-Success "Docker is installed: $dockerVersion"
    }
} catch {
    Write-Warning "Docker is not installed or not in PATH"
}

if (-not $dockerInstalled -and -not $SkipDocker) {
    Write-Error "Docker Desktop is not installed!"
    Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    Write-Info "`nAfter installation:"
    Write-Info "  1. Restart your computer"
    Write-Info "  2. Start Docker Desktop"
    Write-Info "  3. Run this script again"
    Write-Info "`nOr run with -SkipDocker flag to skip Docker services"

    $response = Read-Host "`nOpen Docker Desktop download page? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process "https://www.docker.com/products/docker-desktop"
    }
    exit 1
}

# Check Docker Compose
if ($dockerInstalled) {
    try {
        $composeVersion = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose is available: $composeVersion"
        }
    } catch {
        Write-Error "Docker Compose is not available"
        exit 1
    }
}

# Check .NET SDK
$dotnetInstalled = $false
try {
    $dotnetVersion = dotnet --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $dotnetInstalled = $true
        Write-Success ".NET SDK is installed: $dotnetVersion"
    }
} catch {
    Write-Warning ".NET SDK not found"
}

if (-not $dotnetInstalled -and -not $SkipBackend) {
    Write-Error ".NET SDK is not installed!"
    Write-Info "Please install .NET 8 SDK from: https://dotnet.microsoft.com/download/dotnet/8.0"
    exit 1
}

# Check Node.js
$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $nodeInstalled = $true
        Write-Success "Node.js is installed: $nodeVersion"
    }
} catch {
    Write-Warning "Node.js not found"
}

if (-not $nodeInstalled -and -not $SkipFrontend) {
    Write-Error "Node.js is not installed!"
    Write-Info "Please install Node.js from: https://nodejs.org/"
    exit 1
}

# Check Docker Desktop is running
if ($dockerInstalled -and -not $SkipDocker) {
    Write-Step "Checking Docker Desktop Status"

    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Desktop is running"
        }
    } catch {
        Write-Error "Docker Desktop is not running!"
        Write-Info "Please start Docker Desktop and wait for it to be ready"
        Write-Info "Then run this script again"

        # Try to start Docker Desktop
        $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopPath) {
            $response = Read-Host "`nStart Docker Desktop now? (Y/N)"
            if ($response -eq 'Y' -or $response -eq 'y') {
                Write-Info "Starting Docker Desktop..."
                Start-Process $dockerDesktopPath
                Write-Info "Waiting 30 seconds for Docker Desktop to start..."
                Start-Sleep -Seconds 30

                # Check again
                try {
                    docker info 2>$null | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "Docker Desktop is now running"
                    } else {
                        Write-Warning "Docker Desktop is still starting. Please wait and run this script again."
                        exit 1
                    }
                } catch {
                    Write-Warning "Docker Desktop is still starting. Please wait and run this script again."
                    exit 1
                }
            } else {
                exit 1
            }
        } else {
            exit 1
        }
    }
}

# Start Docker services
if (-not $SkipDocker) {
    Write-Step "Starting Docker Services"

    if (-not (Test-Path "$infraPath\docker-compose.yml")) {
        Write-Error "docker-compose.yml not found at $infraPath"
        exit 1
    }

    Write-Info "Navigating to $infraPath"
    Set-Location $infraPath

    Write-Info "Stopping any existing containers..."
    docker compose down 2>$null

    Write-Info "Starting PostgreSQL, Redis, RabbitMQ, OpenSearch, and Kafka..."
    docker compose up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Docker services"
        exit 1
    }

    Write-Success "Docker services started successfully"

    Write-Info "Waiting 15 seconds for services to be ready..."
    Start-Sleep -Seconds 15

    # Check service health
    Write-Info "Checking service health..."
    docker compose ps
}

# Start Backend API
if (-not $SkipBackend) {
    Write-Step "Starting Backend API"

    if (-not (Test-Path $backendPath)) {
        Write-Error "Backend path not found: $backendPath"
        exit 1
    }

    Write-Info "Navigating to $backendPath"
    Set-Location $backendPath

    # Check if migrations need to be applied
    Write-Info "Checking database migrations..."

    # Restore packages
    Write-Info "Restoring NuGet packages..."
    dotnet restore

    # Apply migrations (if database is running)
    if (-not $SkipDocker) {
        Write-Info "Applying database migrations..."
        try {
            dotnet ef database update 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database migrations applied"
            } else {
                Write-Warning "Database migrations failed (database may not be ready yet)"
            }
        } catch {
            Write-Warning "Could not apply migrations. Will retry on application startup."
        }
    }

    # Start backend in new PowerShell window
    Write-Info "Starting backend API server (http://localhost:5000)..."

    $backendScript = @"
Set-Location '$backendPath'
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '     AU SENTINEL BACKEND API SERVER        ' -ForegroundColor Cyan
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
dotnet run
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
    Write-Success "Backend API starting in new window"

    Write-Info "Waiting 10 seconds for backend to start..."
    Start-Sleep -Seconds 10
}

# Start Frontend
if (-not $SkipFrontend) {
    Write-Step "Starting Frontend Application"

    if (-not (Test-Path $frontendPath)) {
        Write-Error "Frontend path not found: $frontendPath"
        exit 1
    }

    Write-Info "Navigating to $frontendPath"
    Set-Location $frontendPath

    # Check if node_modules exists
    if (-not (Test-Path "$frontendPath\node_modules") -or $InstallDependencies) {
        Write-Info "Installing npm dependencies (this may take a few minutes)..."
        npm install

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install npm dependencies"
            exit 1
        }
        Write-Success "npm dependencies installed"
    } else {
        Write-Info "npm dependencies already installed"
    }

    # Start frontend in new PowerShell window
    Write-Info "Starting frontend development server (http://localhost:4200)..."

    $frontendScript = @"
Set-Location '$frontendPath'
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '   AU SENTINEL FRONTEND DEV SERVER         ' -ForegroundColor Cyan
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
npm start
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
    Write-Success "Frontend starting in new window"

    Write-Info "Waiting 5 seconds for frontend to start..."
    Start-Sleep -Seconds 5
}

# Final summary
Write-Step "AU Sentinel Launch Complete!"

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                   SYSTEM STATUS                           ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

if (-not $SkipDocker) {
    Write-Host "Docker Services:" -ForegroundColor Cyan
    Write-Host "  PostgreSQL:  localhost:5432" -ForegroundColor White
    Write-Host "  Redis:       localhost:6379" -ForegroundColor White
    Write-Host "  RabbitMQ:    localhost:5672 (UI: http://localhost:15672)" -ForegroundColor White
    Write-Host "  OpenSearch:  localhost:9200" -ForegroundColor White
    Write-Host "  Kafka:       localhost:9092" -ForegroundColor White
    Write-Host ""
}

if (-not $SkipBackend) {
    Write-Host "Backend API:" -ForegroundColor Cyan
    Write-Host "  API:         http://localhost:5000" -ForegroundColor White
    Write-Host "  Swagger:     http://localhost:5000/swagger" -ForegroundColor White
    Write-Host ""
}

if (-not $SkipFrontend) {
    Write-Host "Frontend App:" -ForegroundColor Cyan
    Write-Host "  Web App:     http://localhost:4200" -ForegroundColor White
    Write-Host ""
}

Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                   NEXT STEPS                              ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow

Write-Host "1. Open your browser to http://localhost:4200" -ForegroundColor White
Write-Host "2. Login with default credentials (check backend logs for seed data)" -ForegroundColor White
Write-Host "3. Explore the AU Sentinel platform!" -ForegroundColor White
Write-Host ""

Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                   USEFUL COMMANDS                         ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

Write-Host "Stop Docker services:" -ForegroundColor Cyan
Write-Host "  cd C:\osentLib\infra" -ForegroundColor White
Write-Host "  docker compose down" -ForegroundColor White
Write-Host ""

Write-Host "View Docker logs:" -ForegroundColor Cyan
Write-Host "  docker compose logs -f [service-name]" -ForegroundColor White
Write-Host ""

Write-Host "Restart just one service:" -ForegroundColor Cyan
Write-Host "  docker compose restart [service-name]" -ForegroundColor White
Write-Host ""

Write-Host "Run this script with options:" -ForegroundColor Cyan
Write-Host "  .\Start-AUSentinel.ps1 -SkipDocker      # Skip Docker services" -ForegroundColor White
Write-Host "  .\Start-AUSentinel.ps1 -SkipBackend     # Skip backend API" -ForegroundColor White
Write-Host "  .\Start-AUSentinel.ps1 -SkipFrontend    # Skip frontend" -ForegroundColor White
Write-Host "  .\Start-AUSentinel.ps1 -InstallDependencies  # Reinstall npm packages" -ForegroundColor White
Write-Host ""

Write-Success "AU Sentinel is now running!"
Write-Info "Press Ctrl+C in the backend/frontend windows to stop those services"
Write-Info "This window can be closed safely"

# Return to root directory
Set-Location $rootPath

# Keep window open
Read-Host "`nPress Enter to close this window"
