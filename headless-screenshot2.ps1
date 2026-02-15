# Headless Chrome screenshot approach 2
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$url = "http://localhost:4100/social-search"
$outputPath = "C:\osentLib\screen\social_search.png"

# Delete old screenshot
Remove-Item -Path $outputPath -Force -ErrorAction SilentlyContinue

# Try old headless mode with explicit user-data-dir to avoid conflicts with running Chrome
$tempProfile = "$env:TEMP\chrome-headless-profile"
Remove-Item -Recurse -Force $tempProfile -ErrorAction SilentlyContinue

& $chromePath --headless --disable-gpu --screenshot="$outputPath" --window-size=1920,1080 --user-data-dir="$tempProfile" --no-first-run --no-default-browser-check $url 2>&1

Start-Sleep -Seconds 3

if (Test-Path $outputPath) {
    $size = (Get-Item $outputPath).Length
    Write-Host "Screenshot saved: $outputPath ($size bytes)"
} else {
    # Chrome may save screenshot.png in current directory
    if (Test-Path ".\screenshot.png") {
        Move-Item ".\screenshot.png" $outputPath -Force
        Write-Host "Moved screenshot to $outputPath"
    } else {
        Write-Host "Screenshot not found - checking temp profile"
        Get-ChildItem $tempProfile -Recurse -Filter "*.png" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.FullName }
    }
}
