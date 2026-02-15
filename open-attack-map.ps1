Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Open Chrome with attack map URL
Start-Process "chrome.exe" "http://localhost:4100/cyber/attack-map" -WindowStyle Maximized
Start-Sleep -Seconds 8

# Take screenshot
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("C:\osentLib\screen\attack_map.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved"
