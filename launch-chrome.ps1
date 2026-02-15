$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}
Write-Host "Using: $chromePath"
Start-Process $chromePath -ArgumentList "--remote-debugging-port=9222","--user-data-dir=C:\temp\chrome-debug","http://localhost:4100/login"
