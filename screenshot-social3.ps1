Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSS3 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
"@

# Find Chrome
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $chrome) {
    Write-Host "Chrome not found - opening it"
    Start-Process "chrome.exe" "http://localhost:4100/social-search"
    Start-Sleep -Seconds 8
    $chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}

if ($chrome) {
    Write-Host "Chrome PID: $($chrome.Id) Title: $($chrome.MainWindowTitle)"

    # Attach to foreground thread to steal focus
    $fgWnd = [WinSS3]::GetForegroundWindow()
    $fgThread = [WinSS3]::GetWindowThreadProcessId($fgWnd, [IntPtr]::Zero)
    $curThread = [WinSS3]::GetCurrentThreadId()
    [WinSS3]::AttachThreadInput($curThread, $fgThread, $true) | Out-Null

    # Show and bring to front
    [WinSS3]::ShowWindow($chrome.MainWindowHandle, 9) | Out-Null
    [WinSS3]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null
    [WinSS3]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    [WinSS3]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null

    [WinSS3]::AttachThreadInput($curThread, $fgThread, $false) | Out-Null
    Start-Sleep -Seconds 2

    # Navigate to social search page
    [System.Windows.Forms.SendKeys]::SendWait("{F6}")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.Clipboard]::SetText("http://localhost:4100/social-search")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 5

    # Verify Chrome is still foreground
    $fgNow = [WinSS3]::GetForegroundWindow()
    Write-Host "Foreground window handle: $fgNow, Chrome handle: $($chrome.MainWindowHandle)"

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
    Write-Host "Chrome still not found"
}
