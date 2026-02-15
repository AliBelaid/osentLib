Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@

# Find AU Sentinel Chrome window
$browsers = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($b in $browsers) {
    Write-Host "Chrome window: $($b.MainWindowTitle) Handle: $($b.MainWindowHandle)"
}

$target = $browsers | Where-Object { $_.MainWindowTitle -match 'AU Sentinel' } | Select-Object -First 1
if (-not $target) {
    $target = $browsers | Select-Object -First 1
}

if ($target) {
    Write-Host "Targeting: $($target.MainWindowTitle)"
    # Maximize (SW_MAXIMIZE = 3)
    [WinAPI]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
    Start-Sleep -Milliseconds 500
    [WinAPI]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 3
    
    $fg = [WinAPI]::GetForegroundWindow()
    Write-Host "Foreground window handle: $fg"
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
