Start-Sleep -Seconds 15
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
    Write-Host "Backend OK: token=$($r.token.Substring(0,20))..."
} catch {
    Write-Host "Error: $_"
}
