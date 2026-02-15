Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSS4 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
"@

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    # Use AttachThreadInput trick to steal focus
    $fgWnd = [WinSS4]::GetForegroundWindow()
    $fgThread = [WinSS4]::GetWindowThreadProcessId($fgWnd, [IntPtr]::Zero)
    $myThread = [WinSS4]::GetCurrentThreadId()

    [WinSS4]::AttachThreadInput($myThread, $fgThread, $true) | Out-Null
    [WinSS4]::ShowWindow($chrome.MainWindowHandle, 9) | Out-Null
    [WinSS4]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null
    [WinSS4]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    [WinSS4]::BringWindowToTop($chrome.MainWindowHandle) | Out-Null
    [WinSS4]::AttachThreadInput($myThread, $fgThread, $false) | Out-Null

    Start-Sleep -Seconds 1

    # Navigate
    [System.Windows.Forms.SendKeys]::SendWait("{F6}")
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.Clipboard]::SetText("http://localhost:4100/social-search")
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 5

    # Re-ensure foreground
    [WinSS4]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500

    $fg = [WinSS4]::GetForegroundWindow()
    Write-Host "Foreground: $fg Chrome: $($chrome.MainWindowHandle) Match: $($fg -eq $chrome.MainWindowHandle)"

    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save("C:\osentLib\screen\social_search.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Done"
}
