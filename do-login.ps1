Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class W32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Set clipboard via clip.exe (reliable)
"document.querySelector('.login-btn').click()" | clip.exe
Start-Sleep -Milliseconds 300

# Focus Chrome
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) { [W32]::SetForegroundWindow($chrome.MainWindowHandle) }
Start-Sleep -Milliseconds 500

# Click on console input area - use Ctrl+Shift+J to ensure console is focused
# First close any existing DevTools
[System.Windows.Forms.SendKeys]::SendWait("{F12}")
Start-Sleep -Milliseconds 500

# Reopen with Ctrl+Shift+J which goes directly to Console
[System.Windows.Forms.SendKeys]::SendWait("^+j")
Start-Sleep -Milliseconds 800

# Paste from clipboard
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 500

# Execute
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 3

# Close DevTools
[System.Windows.Forms.SendKeys]::SendWait("{F12}")

Write-Output "Login executed"
