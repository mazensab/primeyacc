# ============================================================
# PrimeyAcc WhatsApp Gateway Checker
# Path: scripts/check-primeyacc-whatsapp-gateway.ps1
# ============================================================
$ErrorActionPreference = "Continue"
$Root = "C:\Users\MHAMCLOUD\Documents\GitHub\primeyacc"
$Gateway = Join-Path $Root "whatsapp_session_gateway"
$HealthUrl = "http://127.0.0.1:3100/health"
$LauncherLog = Join-Path $Gateway "logs\launcher.log"
$NodeOutLog = Join-Path $Gateway "logs\node.out.log"
$NodeErrLog = Join-Path $Gateway "logs\node.err.log"
$LegacyLog = Join-Path $Gateway "logs\gateway.log"
Write-Host "`n===== Gateway Health =====" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 8 | ConvertTo-Json -Depth 12
} catch {
  Write-Host "Gateway health failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host "`n===== Port 3100 Listener =====" -ForegroundColor Cyan
try {
  $Listeners = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
  $Listeners | Select-Object LocalAddress, LocalPort, State, OwningProcess
  foreach ($Listener in $Listeners) {
    Get-Process -Id $Listener.OwningProcess -ErrorAction SilentlyContinue |
      Select-Object Id, ProcessName, Path
  }
} catch {
  Write-Host "Could not inspect port 3100: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host "`n===== Launcher Log =====" -ForegroundColor Cyan
if (Test-Path $LauncherLog) {
  Get-Content $LauncherLog -Tail 40
} else {
  Write-Host "No launcher log found."
}
Write-Host "`n===== Node stdout Log =====" -ForegroundColor Cyan
if (Test-Path $NodeOutLog) {
  Get-Content $NodeOutLog -Tail 30
} else {
  Write-Host "No node stdout log found."
}
Write-Host "`n===== Node stderr Log =====" -ForegroundColor Cyan
if (Test-Path $NodeErrLog) {
  Get-Content $NodeErrLog -Tail 30
} else {
  Write-Host "No node stderr log found."
}
Write-Host "`n===== Legacy Gateway Log =====" -ForegroundColor Cyan
if (Test-Path $LegacyLog) {
  Get-Content $LegacyLog -Tail 20
} else {
  Write-Host "No legacy gateway log found."
}
