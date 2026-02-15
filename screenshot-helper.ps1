Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FH9 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
}
"@

$all = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
$target = $all | Where-Object { $_.MainWindowTitle -match 'AU Sentinel' } | Select-Object -First 1

if ($target) {
    (New-Object -ComObject Shell.Application).MinimizeAll()
    Start-Sleep -Seconds 1
    [FH9]::ShowWindow($target.MainWindowHandle, 9) | Out-Null
    [FH9]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
    [FH9]::BringWindowToTop($target.MainWindowHandle) | Out-Null
    [FH9]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 2

    # Close DevTools if open (F12 toggles)
    [System.Windows.Forms.SendKeys]::SendWait("{F12}")
    Start-Sleep -Seconds 1

    # Open a NEW tab with Ctrl+T
    [System.Windows.Forms.SendKeys]::SendWait("^t")
    Start-Sleep -Seconds 1

    # New tab auto-focuses address bar, paste URL from clipboard
    [System.Windows.Forms.Clipboard]::SetText("localhost:4100/dashboard")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 5
}

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('C:\osentLib\screen\dashboard_screenshot.png', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Done"
