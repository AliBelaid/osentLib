Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) { [WinUtil]::SetForegroundWindow($chrome.MainWindowHandle) }
Start-Sleep -Milliseconds 300

# Navigate to dashboard
[System.Windows.Forms.SendKeys]::SendWait("^l")
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("localhost:4200/dashboard{ENTER}")
Write-Output "Navigated to dashboard"
