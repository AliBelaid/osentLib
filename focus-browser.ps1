Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$browser = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $browser) {
    $browser = Get-Process -Name msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}
if ($browser) {
    [Win]::SetForegroundWindow($browser.MainWindowHandle)
    Write-Output "Focused: $($browser.ProcessName)"
} else {
    Write-Output "No browser found"
}
