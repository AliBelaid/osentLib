$loginBody = '{"username":"admin","password":"Admin123!"}'
$loginResp = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResp.token
$headers = @{ Authorization = "Bearer $token" }

Write-Output "=== IMPORTANT NEWS ==="
$news = Invoke-RestMethod -Uri 'http://localhost:5000/api/news/important?count=3' -Headers $headers
Write-Output "Found $($news.Count) important articles"
foreach ($item in $news) {
    Write-Output "  [$($item.threatLevel)] $($item.title.Substring(0, [Math]::Min(80, $item.title.Length)))..."
}

Write-Output ""
Write-Output "=== TRENDS ==="
$trends = Invoke-RestMethod -Uri 'http://localhost:5000/api/news/trends?period=7d' -Headers $headers
Write-Output "Categories: $($trends.topCategories.Count)"
foreach ($c in $trends.topCategories) {
    Write-Output "  $($c.key): $($c.count)"
}
Write-Output "Threat Distribution: $($trends.threatDistribution.Count) levels"
foreach ($t in $trends.threatDistribution) {
    Write-Output "  Level $($t.level): $($t.count) articles"
}

Write-Output ""
Write-Output "=== ACTIVE ALERTS ==="
$alerts = Invoke-RestMethod -Uri 'http://localhost:5000/api/alert?activeOnly=true' -Headers $headers
Write-Output "Found $($alerts.Count) active alerts"
foreach ($a in $alerts | Select-Object -First 5) {
    Write-Output "  [Sev $($a.severity)] $($a.title.Substring(0, [Math]::Min(80, $a.title.Length)))..."
}
