$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$url = "http://localhost:4100/social-search"
$tempProfile = "$env:TEMP\chrome-headless-ss2"
$outputDir = "$env:TEMP"

# Clean
Remove-Item -Recurse -Force $tempProfile -ErrorAction SilentlyContinue
Remove-Item -Path "$outputDir\screenshot.png" -Force -ErrorAction SilentlyContinue

# Change to temp dir (writable)
Push-Location $outputDir

# Run headless Chrome
& $chromePath --headless=new --disable-gpu --no-sandbox --screenshot --window-size=1920,1080 --virtual-time-budget=10000 --user-data-dir="$tempProfile" --no-first-run --no-default-browser-check --run-all-compositor-stages-before-draw $url 2>&1

Pop-Location

Start-Sleep -Seconds 2

if (Test-Path "$outputDir\screenshot.png") {
    $size = (Get-Item "$outputDir\screenshot.png").Length
    Copy-Item "$outputDir\screenshot.png" "C:\osentLib\screen\social_search.png" -Force
    Write-Host "Screenshot captured: $size bytes -> C:\osentLib\screen\social_search.png"
} else {
    Write-Host "screenshot.png not found in $outputDir"
    Get-ChildItem $outputDir -Filter "screenshot*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.FullName }
}
