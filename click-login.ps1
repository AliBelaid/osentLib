Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern int GetDpiForSystem();
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}
"@

# Get DPI scaling factor
$dpi = [User32]::GetDpiForSystem()
$scale = $dpi / 96.0
Write-Output "DPI: $dpi, Scale: $scale"

# Bring Chrome to front
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [User32]::SetForegroundWindow($chrome.MainWindowHandle)
    Write-Output "Chrome focused"
}
Start-Sleep -Milliseconds 500

# Use Tab key to navigate to sign-in button and press Enter
# First press F6 to focus the page content area
[System.Windows.Forms.SendKeys]::SendWait("{F6}")
Start-Sleep -Milliseconds 300

# Tab through: username field -> password field -> eye icon -> SIGN IN button
[System.Windows.Forms.SendKeys]::SendWait("{TAB}{TAB}{TAB}{TAB}{TAB}")
Start-Sleep -Milliseconds 300

# Press Enter on the focused SIGN IN button
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Write-Output "Pressed Enter on Sign In"
