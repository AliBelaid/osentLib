$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

try {
    $result = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/email-breach' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"email":"admin@example.com"}'
    Write-Host "Success: found=$($result.found), breaches=$($result.totalBreaches)"
    Write-Host ($result | ConvertTo-Json -Depth 3 -Compress)
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}
