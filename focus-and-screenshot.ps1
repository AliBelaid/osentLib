Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# Find Chrome/Edge browser process
$browser = Get-Process | Where-Object { $_.MainWindowTitle -match 'localhost|AU Sentinel|Chrome|Edge|Firefox' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($browser) {
    Write-Host "Found browser: $($browser.ProcessName) - $($browser.MainWindowTitle)"
    [Win32]::ShowWindow($browser.MainWindowHandle, 9)  # SW_RESTORE
    [Win32]::SetForegroundWindow($browser.MainWindowHandle)
    Start-Sleep -Seconds 2
} else {
    Write-Host "No browser window found, listing windows..."
    Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object ProcessName, MainWindowTitle | Format-Table
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
