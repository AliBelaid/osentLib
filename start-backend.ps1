# Kill any existing backend
$procs = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" | Where-Object { $_.CommandLine -like '*AUSentinel*' -or $_.CommandLine -like '*9099*' }
foreach ($p in $procs) {
    Write-Host "Stopping PID $($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Start fresh
Write-Host "Starting backend on port 9099..."
Start-Process -FilePath "dotnet" -ArgumentList "run","--urls=http://0.0.0.0:9099" -WorkingDirectory "C:\osentLib\backend\api" -WindowStyle Hidden
Write-Host "Waiting 20 seconds for startup..."
Start-Sleep -Seconds 20

# Test
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
    Write-Host "Backend OK: token=$($r.token.Substring(0,20))..."
} catch {
    Write-Host "Not ready yet, waiting 15 more seconds..."
    Start-Sleep -Seconds 15
    try {
        $r = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
        Write-Host "Backend OK: token=$($r.token.Substring(0,20))..."
    } catch {
        Write-Host "Failed: $_"
    }
}
