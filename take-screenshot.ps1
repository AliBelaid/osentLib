Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class Win32H {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public static List<IntPtr> vscodeWindows = new List<IntPtr>();
    public static IntPtr chromeWindow = IntPtr.Zero;
    public static void FindWindows() {
        vscodeWindows.Clear();
        chromeWindow = IntPtr.Zero;
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            if (!IsWindowVisible(hWnd)) return true;
            var sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            var title = sb.ToString();
            if (title.Contains("Visual Studio Code") || title.Contains("VS Code")) vscodeWindows.Add(hWnd);
            if (title.Contains("Chrome") || title.Contains("Google Chrome")) chromeWindow = hWnd;
            return true;
        }, IntPtr.Zero);
    }
}
'@

[Win32H]::FindWindows()
foreach ($w in [Win32H]::vscodeWindows) { [Win32H]::ShowWindow($w, 6) | Out-Null }
Start-Sleep -Milliseconds 500
if ([Win32H]::chromeWindow -ne [IntPtr]::Zero) {
    [Win32H]::ShowWindow([Win32H]::chromeWindow, 3) | Out-Null
    [Win32H]::SetForegroundWindow([Win32H]::chromeWindow) | Out-Null
}
Start-Sleep -Milliseconds 1500
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$outputPath = $args[0]
if (-not $outputPath) { $outputPath = "C:\osentLib\screentl-verify.png" }
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "Screenshot saved to $outputPath"
