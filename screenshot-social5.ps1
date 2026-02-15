Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSS5 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

# First minimize VS Code
$vscode = Get-Process -Name 'Code' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($vscode) {
    [WinSS5]::ShowWindow($vscode.MainWindowHandle, 6) | Out-Null  # SW_MINIMIZE
    Write-Host "VS Code minimized"
}
Start-Sleep -Seconds 1

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    $fgWnd = [WinSS5]::GetForegroundWindow()
    $fgThread = [WinSS5]::GetWindowThreadProcessId($fgWnd, [IntPtr]::Zero)
    $myThread = [WinSS5]::GetCurrentThreadId()
    [WinSS5]::AttachThreadInput($myThread, $fgThread, $true) | Out-Null

    # Set Chrome as TOPMOST then restore
    $HWND_TOPMOST = [IntPtr]::new(-1)
    $HWND_NOTOPMOST = [IntPtr]::new(-2)
    [WinSS5]::SetWindowPos($chrome.MainWindowHandle, $HWND_TOPMOST, 0, 0, 0, 0, 0x0003) | Out-Null
    [WinSS5]::ShowWindow($chrome.MainWindowHandle, 3) | Out-Null  # SW_MAXIMIZE
    [WinSS5]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500
    [WinSS5]::SetWindowPos($chrome.MainWindowHandle, $HWND_NOTOPMOST, 0, 0, 0, 0, 0x0003) | Out-Null

    [WinSS5]::AttachThreadInput($myThread, $fgThread, $false) | Out-Null
    Start-Sleep -Seconds 1

    # Navigate
    [System.Windows.Forms.SendKeys]::SendWait("{F6}")
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.Clipboard]::SetText("http://localhost:4100/social-search")
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 5

    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save("C:\osentLib\screen\social_search.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Done"
}
