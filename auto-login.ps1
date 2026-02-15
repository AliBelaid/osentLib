Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Bring Chrome to front
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [WinAPI]::SetForegroundWindow($chrome.MainWindowHandle)
}
Start-Sleep -Milliseconds 500

# Navigate to localhost:4200/login using Ctrl+L (focus address bar)
[System.Windows.Forms.SendKeys]::SendWait("^l")
Start-Sleep -Milliseconds 300

# Type the URL
[System.Windows.Forms.SendKeys]::SendWait("localhost:4200/login{ENTER}")
Start-Sleep -Seconds 3

# Open browser console with Ctrl+Shift+J
[System.Windows.Forms.SendKeys]::SendWait("^+j")
Start-Sleep -Milliseconds 800

# Type JavaScript to click the sign-in button
$js = "document.querySelector('.login-btn').click()"
[System.Windows.Forms.SendKeys]::SendWait($js)
Start-Sleep -Milliseconds 300

# Press Enter to execute
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 500

# Close the console with Ctrl+Shift+J again
[System.Windows.Forms.SendKeys]::SendWait("^+j")

Write-Output "Done - executed login click via console"
