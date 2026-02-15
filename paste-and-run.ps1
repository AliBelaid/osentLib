Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinHelper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Bring Chrome to front
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    [WinHelper]::SetForegroundWindow($chrome.MainWindowHandle)
}
Start-Sleep -Milliseconds 500

# Read JS from file and copy to clipboard using clip.exe
$js = Get-Content "C:\osentLib\js-cmd.txt" -Raw
Write-Output "JS to paste: $js"

# Use .NET clipboard with explicit threading
$sta = {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Clipboard]::SetText("document.querySelector('.login-btn').click()")
}
$runspace = [runspacefactory]::CreateRunspace()
$runspace.ApartmentState = "STA"
$runspace.Open()
$pipeline = $runspace.CreatePipeline()
$pipeline.Commands.AddScript($sta.ToString())
$pipeline.Invoke()
$runspace.Close()

Start-Sleep -Milliseconds 300

# Paste with Ctrl+V and execute with Enter
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 2

# Close DevTools
[System.Windows.Forms.SendKeys]::SendWait("{F12}")

Write-Output "Done"
