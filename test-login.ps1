try {
    $body = '{"username":"admin","password":"Admin123!"}'
    $response = Invoke-WebRequest -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Host "Success: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Body: $errorBody"
}
