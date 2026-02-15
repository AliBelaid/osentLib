# Kill all Chrome instances first
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$url = "http://localhost:4100/social-search"
$tempProfile = "$env:TEMP\chrome-headless-ss"

# Clean temp profile
Remove-Item -Recurse -Force $tempProfile -ErrorAction SilentlyContinue

# Change to output directory so screenshot.png lands there
Set-Location "C:\osentLib\screen"

# Remove old file
Remove-Item -Path "C:\osentLib\screen\screenshot.png" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\osentLib\screen\social_search.png" -Force -ErrorAction SilentlyContinue

# Run headless Chrome with screenshot
# --virtual-time-budget waits for JS execution
$process = Start-Process -FilePath $chromePath -ArgumentList @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--screenshot",
    "--window-size=1920,1080",
    "--virtual-time-budget=10000",
    "--user-data-dir=$tempProfile",
    "--no-first-run",
    "--no-default-browser-check",
    "--run-all-compositor-stages-before-draw",
    "--disable-features=TranslateUI",
    $url
) -Wait -NoNewWindow -PassThru

Start-Sleep -Seconds 2

# Check for output
$files = Get-ChildItem "C:\osentLib\screen" -Filter "*.png" -ErrorAction SilentlyContinue
foreach ($f in $files) {
    Write-Host "Found: $($f.FullName) ($($f.Length) bytes)"
}

# Also check common locations
if (Test-Path "screenshot.png") {
    $size = (Get-Item "screenshot.png").Length
    Rename-Item "screenshot.png" "social_search.png" -Force
    Write-Host "Renamed screenshot.png -> social_search.png ($size bytes)"
}

# Restart Chrome normally
Start-Process $chromePath "http://localhost:4100/social-search"
