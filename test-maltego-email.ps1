# Login
$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

# Test Maltego transform with an email
Write-Host "Testing Maltego transform for test@example.com..."
try {
    $body = '{"entityType":"Email","entityValue":"test@example.com","transformType":"expand"}'
    $result = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/maltego/transform' -Method POST -ContentType 'application/json' -Headers $headers -Body $body
    Write-Host "Entities: $($result.entities.Count)"
    foreach ($e in $result.entities) {
        $props = ""
        if ($e.properties) {
            $propList = @()
            $e.properties.PSObject.Properties | ForEach-Object { $propList += "$($_.Name)=$($_.Value)" }
            $props = " {$($propList -join ', ')}"
        }
        Write-Host "  [$($e.type)] $($e.label)$props"
    }
    Write-Host "Links: $($result.links.Count)"
} catch {
    Write-Host "Error: $_"
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response: $body"
    } catch {}
}
