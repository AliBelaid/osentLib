Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSS2 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
"@

# Minimize everything
(New-Object -ComObject Shell.Application).MinimizeAll()
Start-Sleep -Seconds 2

# Find Chrome and maximize + bring to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    Write-Host "Found Chrome PID: $($chrome.Id) Title: $($chrome.MainWindowTitle)"
    [WinSS2]::ShowWindow($chrome.MainWindowHandle, 9) | Out-Null
    Start-Sleep -Milliseconds 300
    [WinSS2]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null
    Start-Sleep -Milliseconds 300
    [WinSS2]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null
    [WinSS2]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 2

    # Navigate to social search
    [System.Windows.Forms.SendKeys]::SendWait("{F6}")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.Clipboard]::SetText("http://localhost:4100/social-search")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 5

    # Take screenshot
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save("C:\osentLib\screen\social_search.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Screenshot saved"
} else {
    Write-Host "Chrome not found"
}
