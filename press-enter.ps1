Add-Type -AssemblyName System.Windows.Forms

# Click on the password field first to make sure the browser is focused
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseOps {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@

# Click on password field
[MouseOps]::Click(855, 694)
Start-Sleep -Milliseconds 500

# Press Enter to submit
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Write-Output "Pressed Enter"
