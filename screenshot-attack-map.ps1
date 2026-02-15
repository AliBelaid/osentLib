Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinHelper {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
"@

$target = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match 'AU Sentinel' } | Select-Object -First 1

if ($target) {
    [WinHelper]::ShowWindow($target.MainWindowHandle, 9) | Out-Null
    [WinHelper]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
    [WinHelper]::BringWindowToTop($target.MainWindowHandle) | Out-Null
    [WinHelper]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 1

    # Navigate to attack map
    [System.Windows.Forms.SendKeys]::SendWait("{F6}")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.Clipboard]::SetText("http://localhost:4100/cyber/attack-map")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 7

    # Take screenshot
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save("C:\osentLib\screen\attack_map.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Screenshot saved"
} else {
    Write-Host "Chrome AU Sentinel window not found"
}
