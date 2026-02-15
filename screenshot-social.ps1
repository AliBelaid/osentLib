Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSS {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
"@

# Open Chrome to social search page
Start-Process "chrome.exe" "http://localhost:4100/social-search"
Start-Sleep -Seconds 6

# Find Chrome and bring to front
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [WinSS]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null
    [WinSS]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null
    [WinSS]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    Start-Sleep -Seconds 3

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
