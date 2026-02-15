$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$body = '{"entityType":"Domain","entityValue":"google.com","transformType":"expand"}'
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/maltego/transform' -Method POST -ContentType 'application/json' -Headers $headers -Body $body -TimeoutSec 120
    $sw.Stop()
    Write-Host "Time: $($sw.ElapsedMilliseconds)ms"
    Write-Host "Entities: $($result.entities.Count), Links: $($result.links.Count)"
} catch {
    $sw.Stop()
    Write-Host "Error after $($sw.ElapsedMilliseconds)ms: $_"
}
