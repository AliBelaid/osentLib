$conn = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess
    Write-Host "PID: $($proc.Id), Name: $($proc.ProcessName), Path: $($proc.Path)"
} else {
    Write-Host "No process on port 4200"
}
