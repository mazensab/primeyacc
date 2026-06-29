# ============================================================
# Mhamcloud WhatsApp Gateway Launcher
# Path: scripts/start-Mhamcloud-whatsapp-gateway.ps1
# Purpose: Keep Gateway process alive. WhatsApp session may reconnect by QR later.
# ============================================================
$ErrorActionPreference = "Stop"
$Root = "C:\Users\MHAMCLOUD\Documents\GitHub\Mhamcloud"
$Gateway = Join-Path $Root "whatsapp_session_gateway"
$LogDir = Join-Path $Gateway "logs"
$LauncherLog = Join-Path $LogDir "launcher.log"
$NodeOutLog = Join-Path $LogDir "node.out.log"
$NodeErrLog = Join-Path $LogDir "node.err.log"
$HealthUrl = "http://127.0.0.1:3100/health"
$Node = "C:\Program Files\nodejs\node.exe"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
function Write-LauncherLog {
  param([string]$Message)
  try {
    $Line = "[{0}] {1}{2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message, [Environment]::NewLine
    [System.IO.File]::AppendAllText($LauncherLog, $Line, [System.Text.Encoding]::UTF8)
  } catch {
    Write-Host "[Mhamcloud Gateway Launcher] log warning: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}
function Get-GatewayHealth {
  try {
    return Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 5
  } catch {
    return $null
  }
}
function Get-PortListener {
  try {
    return Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
  } catch {
    return $null
  }
}
function Stop-PortListener {
  $Listeners = Get-PortListener
  foreach ($Listener in $Listeners) {
    $PidToStop = $Listener.OwningProcess
    if ($PidToStop) {
      Write-LauncherLog "Stopping stale gateway listener PID: $PidToStop"
      Stop-Process -Id $PidToStop -Force -ErrorAction SilentlyContinue
    }
  }
}
function Wait-GatewayHealth {
  param([int]$Seconds = 20)
  $Deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $Deadline) {
    $Health = Get-GatewayHealth
    if ($Health -and $Health.success -eq $true) {
      Write-LauncherLog "Gateway process is healthy on port 3100."
      return $true
    }
    Start-Sleep -Seconds 2
  }
  return $false
}
Write-LauncherLog "Mhamcloud WhatsApp Gateway launcher started."
$Health = Get-GatewayHealth
if ($Health -and $Health.success -eq $true) {
  Write-LauncherLog "Gateway already running. Session status does not block process startup."
  exit 0
}
$Listeners = Get-PortListener
if ($Listeners) {
  Write-LauncherLog "Port 3100 has listener but health failed. Restarting stale listener."
  Stop-PortListener
  Start-Sleep -Seconds 3
}
if (!(Test-Path $Node)) {
  $NodeCommand = Get-Command node -ErrorAction Stop
  $Node = $NodeCommand.Source
}
Set-Location $Gateway
$Env:WHATSAPP_SESSION_GATEWAY_HOST = "127.0.0.1"
$Env:WHATSAPP_SESSION_GATEWAY_PORT = "3100"
Write-LauncherLog "Starting gateway process with node: $Node"
$Process = Start-Process `
  -FilePath $Node `
  -ArgumentList "`"$Gateway\src\server.mjs`"" `
  -WorkingDirectory $Gateway `
  -WindowStyle Hidden `
  -RedirectStandardOutput $NodeOutLog `
  -RedirectStandardError $NodeErrLog `
  -PassThru
Write-LauncherLog "Gateway process started with PID: $($Process.Id)"
if (Wait-GatewayHealth -Seconds 25) {
  exit 0
}
Write-LauncherLog "Gateway health failed after process start."
throw "Mhamcloud WhatsApp Gateway process did not become healthy on port 3100."
