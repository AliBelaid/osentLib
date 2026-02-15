# Headless Chrome screenshot - no window focus needed
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$url = "http://localhost:4100/social-search"
$outputPath = "C:\osentLib\screen\social_search.png"

# Create screen directory if needed
New-Item -ItemType Directory -Force -Path "C:\osentLib\screen" | Out-Null

# Use headless Chrome to take screenshot
& $chromePath --headless=new --screenshot="$outputPath" --window-size=1920,1080 --disable-gpu --no-sandbox --disable-software-rasterizer $url

Write-Host "Screenshot saved to $outputPath"
