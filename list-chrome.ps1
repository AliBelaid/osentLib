$procs = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($p in $procs) {
    Write-Host "PID: $($p.Id) Title: $($p.MainWindowTitle)"
}
if (-not $procs) {
    Write-Host "No chrome windows found with handles"
}
