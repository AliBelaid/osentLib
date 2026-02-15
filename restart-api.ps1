$procs = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" | Where-Object { $_.CommandLine -like '*AUSentinel*' -or $_.CommandLine -like '*9099*' }
foreach ($p in $procs) {
    Write-Host "Stopping PID $($p.ProcessId): $($p.CommandLine)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Write-Host "Starting backend..."
Start-Process -FilePath "dotnet" -ArgumentList "run","--urls=http://0.0.0.0:9099" -WorkingDirectory "C:\osentLib\backend\api" -WindowStyle Hidden
Write-Host "Backend starting..."
Start-Sleep -Seconds 12
try {
    $test = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
    Write-Host "Backend OK: token=$($test.token.Substring(0,20))..."
} catch {
    Write-Host "Backend not ready yet: $_"
}
