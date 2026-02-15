# Stop existing backend
Get-Process -Name 'AUSentinel.Api' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start new backend
Start-Process -FilePath 'dotnet' -ArgumentList 'run', '--project', 'C:\osentLib\backend\api\AUSentinel.Api.csproj' -WorkingDirectory 'C:\osentLib\backend\api' -WindowStyle Hidden
Write-Host "Backend restarting..."

# Wait and verify
Start-Sleep -Seconds 10
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:9099/swagger' -TimeoutSec 5 -UseBasicParsing
    Write-Host "Backend is UP - Status: $($response.StatusCode)"
} catch {
    Write-Host "Still starting... waiting more"
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:9099/swagger' -TimeoutSec 5 -UseBasicParsing
        Write-Host "Backend is UP - Status: $($response.StatusCode)"
    } catch {
        Write-Host "Backend may still be starting"
    }
}
