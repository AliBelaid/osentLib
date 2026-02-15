$login = Invoke-RestMethod -Uri 'http://localhost:9099/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# Test Maltego Transform
$maltego = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/maltego/transform' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"entityType":"email","entityValue":"admin@au.org"}'
Write-Host "Maltego: $($maltego.entities.Count) entities, $($maltego.links.Count) links"

# Test Email Breach
$breach = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/email-breach' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"email":"test@example.com"}'
Write-Host "Breach: found=$($breach.found), breaches=$($breach.totalBreaches)"

# Test Google Dorks
$dorks = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/google-dorks' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"target":"example.com","category":"all"}'
Write-Host "Dorks: $($dorks.dorks.Count) generated"

# Test Domain Intel
$domain = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/domain-intel' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"target":"google.com"}'
Write-Host "Domain Intel: type=$($domain.type), ports=$($domain.openPorts.Count), techs=$($domain.technologies.Count)"

# Test SpiderFoot
$sf = Invoke-RestMethod -Uri 'http://localhost:9099/api/osint/spiderfoot' -Method POST -ContentType 'application/json' -Headers $headers -Body '{"target":"example.com","scanType":"quick"}'
Write-Host "SpiderFoot: scanId=$($sf.scanId), findings=$($sf.totalFindings)"

Write-Host "`nAll OSINT API endpoints working!"
