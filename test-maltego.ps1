# Login
$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

# Test Maltego transform with a real domain
Write-Host "Testing Maltego transform for google.com..."
try {
    $body = '{"entityType":"Domain","entityValue":"google.com","transformType":"expand"}'
    $result = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/maltego/transform' -Method POST -ContentType 'application/json' -Headers $headers -Body $body
    Write-Host "Entities: $($result.entities.Count)"
    foreach ($e in $result.entities) {
        Write-Host "  [$($e.type)] $($e.label)"
    }
    Write-Host "Links: $($result.links.Count)"
    foreach ($l in $result.links | Select-Object -First 10) {
        Write-Host "  $($l.source) --[$($l.label)]--> $($l.target)"
    }
} catch {
    Write-Host "Error: $_"
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response: $body"
    } catch {
        Write-Host "Could not read response body"
    }
}
