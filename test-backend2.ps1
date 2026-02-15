$procs = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" | Where-Object { $_.CommandLine -like '*AUSentinel*' -or $_.CommandLine -like '*9099*' }
if ($procs) {
    Write-Host "Backend process found: PID $($procs[0].ProcessId)"
} else {
    Write-Host "No backend process found, starting..."
    Start-Process -FilePath "dotnet" -ArgumentList "run","--urls=http://0.0.0.0:9099" -WorkingDirectory "C:\osentLib\backend\api" -WindowStyle Hidden
}
Start-Sleep -Seconds 20
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
    Write-Host "Backend OK: token=$($r.token.Substring(0,20))..."
} catch {
    Write-Host "Still not ready, waiting more..."
    Start-Sleep -Seconds 15
    try {
        $r = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
        Write-Host "Backend OK: token=$($r.token.Substring(0,20))..."
    } catch {
        Write-Host "Error: $_"
    }
}
