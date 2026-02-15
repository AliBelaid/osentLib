Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WH5 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

# Open Chrome
Start-Process "chrome.exe" "http://localhost:4100/cyber/attack-map"
Start-Sleep -Seconds 4

# Find Chrome window and bring to front
for ($i = 0; $i -lt 5; $i++) {
    $chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($chrome) {
        Write-Host "Found Chrome: PID=$($chrome.Id) Title=$($chrome.MainWindowTitle)"
        [WH5]::ShowWindow($chrome.MainWindowHandle, 5) | Out-Null
        Start-Sleep -Milliseconds 200
        [WH5]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null
        Start-Sleep -Milliseconds 200
        [WH5]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
        [WH5]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null
        break
    }
    Write-Host "Waiting for Chrome window... attempt $($i+1)"
    Start-Sleep -Seconds 2
}

# Wait for page to fully load (Leaflet tiles, GeoJSON, attack simulation)
Start-Sleep -Seconds 8

# Ensure Chrome is still in front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [WH5]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    [WH5]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null
}
Start-Sleep -Seconds 1

# Take screenshot
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("C:\osentLib\screen\attack_map.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved"
