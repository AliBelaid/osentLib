Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinFocus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Bring Chrome to front
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [WinFocus]::SetForegroundWindow($chrome.MainWindowHandle)
}
Start-Sleep -Milliseconds 500

# Copy JavaScript to clipboard
$js = "document.querySelector('.login-btn').click()"
[System.Windows.Forms.Clipboard]::SetText($js)
Start-Sleep -Milliseconds 200

# Click on the Console tab area to make sure it's focused
# The console input should be at the bottom of the DevTools
# Use Ctrl+V to paste, then Enter to execute
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 500

# Close DevTools
[System.Windows.Forms.SendKeys]::SendWait("{F12}")

Write-Output "Pasted and executed JS in console"
