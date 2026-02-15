Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinHelper2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
"@

# Minimize everything first
(New-Object -ComObject Shell.Application).MinimizeAll()
Start-Sleep -Seconds 2

# Find Chrome window
$target = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($target) {
    Write-Host "Found Chrome PID: $($target.Id) Title: $($target.MainWindowTitle)"
    [WinHelper2]::ShowWindow($target.MainWindowHandle, 9) | Out-Null
    [WinHelper2]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
    [WinHelper2]::BringWindowToTop($target.MainWindowHandle) | Out-Null
    [WinHelper2]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 3

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
    Write-Host "Chrome not found - listing all windows:"
    Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | ForEach-Object {
        Write-Host "  [$($_.ProcessName)] $($_.MainWindowTitle)"
    }
}
