# ============================================================
# PrimeyAcc WhatsApp Gateway Status Checker
# ============================================================
$ErrorActionPreference = "Stop"
$Root = "C:\Users\MHAMCLOUD\Documents\GitHub\primeyacc"
$Gateway = "$Root\whatsapp_session_gateway"
$TaskName = "PrimeyAcc WhatsApp Gateway"
$HealthUrl = "http://127.0.0.1:3100/health"
Write-Host "`n===== Gateway Health =====" -ForegroundColor Cyan
Invoke-RestMethod -Method Get -Uri $HealthUrl -TimeoutSec 10 | ConvertTo-Json -Depth 12
Write-Host "`n===== Port 3100 Listener =====" -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, State, OwningProcess
Write-Host "`n===== Scheduled Task =====" -ForegroundColor Cyan
schtasks.exe /Query /TN $TaskName /V /FO LIST
Write-Host "`n===== Recent Gateway Log =====" -ForegroundColor Cyan
$LogFile = "$Gateway\logs\gateway.log"
if (Test-Path $LogFile) {
  Get-Content $LogFile -Tail 40
} else {
  Write-Host "No gateway log file yet."
}
