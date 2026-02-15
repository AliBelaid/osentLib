param([string]$Page = "dashboard")

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI12 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# Minimize ALL windows
$shell = New-Object -ComObject Shell.Application
$shell.MinimizeAll()
Start-Sleep -Seconds 1

# Find ALL chrome windows (not the temp profile one)
$chromeWindows = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($w in $chromeWindows) {
    Write-Host "Chrome: $($w.MainWindowTitle)"
}

# Prefer the one that was showing AU Sentinel before (has AU Sentinel in title or use first one)
$target = $chromeWindows | Where-Object { $_.MainWindowTitle -match 'AU Sentinel' -and $_.MainWindowTitle -notmatch 'welcome' } | Select-Object -First 1
if (-not $target) {
    $target = $chromeWindows | Select-Object -First 1
}

if ($target) {
    Write-Host "Using: $($target.MainWindowTitle)"
    [WinAPI12]::ShowWindow($target.MainWindowHandle, 3) | Out-Null
    Start-Sleep -Milliseconds 500
    [WinAPI12]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 1

    # Navigate to the requested page
    [System.Windows.Forms.SendKeys]::SendWait("^l")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("http://localhost:4100/$Page{ENTER}")
    Start-Sleep -Seconds 5
}

# Take screenshot
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("C:\osentLib\screen\${Page}_screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved: ${Page}_screenshot.png"
