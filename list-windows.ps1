# List all windows with non-empty titles
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' }
foreach ($p in $procs) {
    Write-Host "[$($p.ProcessName)] PID: $($p.Id) Title: $($p.MainWindowTitle)"
}
