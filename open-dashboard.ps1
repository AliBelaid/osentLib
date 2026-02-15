Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# Open the dashboard URL - this will open in existing Chrome or new tab
Start-Process "http://localhost:4100/dashboard"
Start-Sleep -Seconds 4

# Find Chrome window with AU Sentinel or localhost:4100
$browser = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'AU Sentinel|4100' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if (-not $browser) {
    # Try any Chrome window
    $browser = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}

if ($browser) {
    Write-Host "Focusing: $($browser.MainWindowTitle)"
    [Win32Helper]::ShowWindow($browser.MainWindowHandle, 9)
    [Win32Helper]::SetForegroundWindow($browser.MainWindowHandle)
    Start-Sleep -Seconds 2
}

# Take screenshot
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('C:\osentLib\screen\dashboard_screenshot.png', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved"
