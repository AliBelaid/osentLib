try {
    $body = '{"username":"admin","password":"Admin123!"}'
    $response = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
    Write-Host "Token: $($response.token.Substring(0,30))..."
    Write-Host "User: $($response.user | ConvertTo-Json -Compress)"
} catch {
    Write-Host "Error: $_"
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)"
}
