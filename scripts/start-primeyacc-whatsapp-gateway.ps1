# ============================================================
# PrimeyAcc WhatsApp Gateway Launcher
# Path: scripts/start-primeyacc-whatsapp-gateway.ps1
# Purpose: Start/reconnect persistent WhatsApp Session Gateway for local dev.
# ============================================================
$ErrorActionPreference = "Stop"
$Root = "C:\Users\MHAMCLOUD\Documents\GitHub\primeyacc"
$Gateway = Join-Path $Root "whatsapp_session_gateway"
$LogDir = Join-Path $Gateway "logs"
$LauncherLog = Join-Path $LogDir "launcher.log"
$NodeOutLog = Join-Path $LogDir "node.out.log"
$NodeErrLog = Join-Path $LogDir "node.err.log"
$HealthUrl = "http://127.0.0.1:3100/health"
$SessionStatusUrl = "http://127.0.0.1:3100/session/status"
$SessionName = "primeyacc-system-session"
$Node = "C:\Program Files\nodejs\node.exe"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
function Write-LauncherLog {
  param([string]$Message)
  try {
    $Line = "[{0}] {1}{2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message, [Environment]::NewLine
    [System.IO.File]::AppendAllText($LauncherLog, $Line, [System.Text.Encoding]::UTF8)
  } catch {
    Write-Host "[PrimeyAcc Gateway Launcher] log warning: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}
function Get-GatewayHealth {
  try {
    return Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 5
  } catch {
    return $null
  }
}
function Test-GatewaySessionConnected {
  param($Health)
  if ($null -eq $Health) {
    return $false
  }
  if ($Health.success -ne $true) {
    return $false
  }
  if ($null -eq $Health.sessions) {
    return $false
  }
  foreach ($Session in $Health.sessions) {
    if ($Session.session_name -eq $SessionName -and $Session.connected -eq $true) {
      return $true
    }
  }
  return $false
}
function Invoke-GatewaySessionStatus {
  try {
    $Payload = @{ session_name = $SessionName } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $SessionStatusUrl -Method Post -ContentType "application/json" -Body $Payload -TimeoutSec 10 | Out-Null
    Write-LauncherLog "Session status warm-up request sent."
  } catch {
    Write-LauncherLog "Session status warm-up failed: $($_.Exception.Message)"
  }
}
function Wait-GatewaySession {
  param([int]$Seconds = 45)
  $Deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $Deadline) {
    $Health = Get-GatewayHealth
    if (Test-GatewaySessionConnected -Health $Health) {
      Write-LauncherLog "Gateway session is connected."
      return $true
    }
    if ($Health -and $Health.success -eq $true) {
      Invoke-GatewaySessionStatus
    }
    Start-Sleep -Seconds 3
  }
  return $false
}
function Stop-GatewayPortListener {
  try {
    $Listeners = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
    foreach ($Listener in $Listeners) {
      $PidToStop = $Listener.OwningProcess
      if ($PidToStop) {
        Write-LauncherLog "Stopping existing gateway listener PID: $PidToStop"
        Stop-Process -Id $PidToStop -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    Write-LauncherLog "Could not stop gateway listener: $($_.Exception.Message)"
  }
}
Write-LauncherLog "PrimeyAcc WhatsApp Gateway launcher started."
$Health = Get-GatewayHealth
if ($Health -and $Health.success -eq $true) {
  if (Test-GatewaySessionConnected -Health $Health) {
    Write-LauncherLog "Gateway already healthy and connected; no new process started."
    exit 0
  }
  Write-LauncherLog "Gateway is running but session is not connected. Trying warm-up."
  Invoke-GatewaySessionStatus
  if (Wait-GatewaySession -Seconds 20) {
    exit 0
  }
  Write-LauncherLog "Gateway session still disconnected. Restarting gateway process."
  Stop-GatewayPortListener
  Start-Sleep -Seconds 4
}
if (!(Test-Path $Node)) {
  $NodeCommand = Get-Command node -ErrorAction Stop
  $Node = $NodeCommand.Source
}
Set-Location $Gateway
$Env:WHATSAPP_SESSION_GATEWAY_HOST = "127.0.0.1"
$Env:WHATSAPP_SESSION_GATEWAY_PORT = "3100"
Write-LauncherLog "Starting gateway with node: $Node"
Start-Process `
  -FilePath $Node `
  -ArgumentList "`"$Gateway\src\server.mjs`"" `
  -WorkingDirectory $Gateway `
  -WindowStyle Hidden `
  -RedirectStandardOutput $NodeOutLog `
  -RedirectStandardError $NodeErrLog
Start-Sleep -Seconds 8
if (Wait-GatewaySession -Seconds 60) {
  exit 0
}
$Health = Get-GatewayHealth
if ($Health -and $Health.success -eq $true) {
  Write-LauncherLog "Gateway process is healthy but WhatsApp session is not connected yet."
  exit 0
}
Write-LauncherLog "Gateway health failed after start."
throw "PrimeyAcc WhatsApp Gateway failed to start."
