$proc = Get-Process -Id 34768 -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Name: $($proc.ProcessName)"
    Write-Host "Path: $($proc.Path)"
    $wmi = Get-CimInstance Win32_Process -Filter "ProcessId = 34768" -ErrorAction SilentlyContinue
    if ($wmi) {
        Write-Host "CommandLine: $($wmi.CommandLine)"
    }
}
