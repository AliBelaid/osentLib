$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

try {
    $result = Invoke-RestMethod -Uri 'http://localhost:9099/api/stats/summary?period=7d' -Method GET -Headers $headers
    Write-Host "Success: articles=$($result.totalArticles), alerts=$($result.totalAlerts)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response: $body"
    } catch {
        Write-Host "Could not read response body"
    }
}
