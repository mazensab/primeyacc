# ============================================================
# PrimeyAcc WhatsApp Gateway Startup Launcher
# ------------------------------------------------------------
# Runs the persistent WhatsApp Session Gateway.
# Keeps WhatsApp auth files in whatsapp_session_gateway/storage/sessions.
# Do not delete storage/sessions unless you want to relink WhatsApp.
# ============================================================
$ErrorActionPreference = "Stop"
$Root = "C:\Users\MHAMCLOUD\Documents\GitHub\primeyacc"
$Gateway = "$Root\whatsapp_session_gateway"
$LogDir = "$Gateway\logs"
$LogFile = "$LogDir\gateway.log"
$PidFile = "$LogDir\gateway.pid"
$HealthUrl = "http://127.0.0.1:3100/health"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
function Write-GatewayLog {
  param([string] $Message)
  $Now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$Now] $Message" | Add-Content -Path $LogFile -Encoding UTF8
}
try {
  Write-GatewayLog "PrimeyAcc WhatsApp Gateway launcher started."
  try {
    $Health = Invoke-RestMethod -Method Get -Uri $HealthUrl -TimeoutSec 3
    if ($Health.success -eq $true) {
      Write-GatewayLog "Gateway already running. Launcher exit."
      exit 0
    }
  } catch {
    Write-GatewayLog "Gateway health not available; starting node server."
  }
  $Node = (Get-Command node -ErrorAction Stop).Source
  Set-Location $Gateway
  $env:HOST = "127.0.0.1"
  $env:PORT = "3100"
  $env:LOG_LEVEL = "info"
  $CurrentPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
  Set-Content -Path $PidFile -Value $CurrentPid -Encoding UTF8
  Write-GatewayLog "Starting gateway with node: $Node"
  & $Node "$Gateway\src\server.mjs" *>> $LogFile
}
catch {
  Write-GatewayLog "ERROR: $($_.Exception.Message)"
  throw
}
finally {
  Write-GatewayLog "PrimeyAcc WhatsApp Gateway launcher stopped."
}
