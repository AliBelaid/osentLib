$wmi = Get-CimInstance Win32_Process -Filter "ProcessId = 34768" -ErrorAction SilentlyContinue
if ($wmi) {
    Write-Host "CmdLine: $($wmi.CommandLine)"
    Write-Host "Path: $($wmi.ExecutablePath)"
}
# Also check for all node processes with angular
$nodes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*ng*' -or $_.CommandLine -like '*angular*' }
foreach ($n in $nodes) {
    Write-Host "---"
    Write-Host "PID: $($n.ProcessId)"
    Write-Host "CmdLine: $($n.CommandLine)"
}
