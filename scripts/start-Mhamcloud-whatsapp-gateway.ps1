# ============================================================
# 📂 scripts/start-Mhamcloud-whatsapp-gateway.ps1
# 🧠 Mhamcloud | WhatsApp Session Gateway Launcher V1.0
# ------------------------------------------------------------
# ✅ Auto-start local WhatsApp Session Gateway for dev runserver
# ✅ Safe if already running on PORT
# ✅ Uses whatsapp_session_gateway/.env when available
# ✅ Writes logs/pid without blocking Django
# ============================================================
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$GatewayRoot = Join-Path $ProjectRoot "whatsapp_session_gateway"
$GatewaySrc = Join-Path $GatewayRoot "src\server.mjs"
$LogsDir = Join-Path $GatewayRoot "logs"
$PidFile = Join-Path $GatewayRoot "gateway.pid"
$OutLog = Join-Path $LogsDir "node.out.log"
$ErrLog = Join-Path $LogsDir "node.err.log"
if (-not (Test-Path $GatewayRoot)) {
  Write-Host "[Mhamcloud] WhatsApp gateway folder not found: $GatewayRoot"
  exit 0
}
if (-not (Test-Path $GatewaySrc)) {
  Write-Host "[Mhamcloud] WhatsApp gateway server not found: $GatewaySrc"
  exit 0
}
New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
$Port = 3100
$EnvPath = Join-Path $GatewayRoot ".env"
if (Test-Path $EnvPath) {
  Get-Content $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }
    $parts = $line.Split("=", 2)
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($name) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
      if ($name -eq "PORT") {
        $parsed = 0
        if ([int]::TryParse($value, [ref]$parsed)) {
          $Port = $parsed
        }
      }
    }
  }
}
$ExistingConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1
if ($ExistingConnection) {
  Write-Host "[Mhamcloud] WhatsApp gateway already running on port $Port."
  exit 0
}
if (-not (Test-Path (Join-Path $GatewayRoot "node_modules"))) {
  Write-Host "[Mhamcloud] Installing WhatsApp gateway dependencies..."
  Push-Location $GatewayRoot
  npm install
  Pop-Location
}
Write-Host "[Mhamcloud] Starting WhatsApp gateway on port $Port..."
$Process = Start-Process `
  -FilePath "node" `
  -ArgumentList "src/server.mjs" `
  -WorkingDirectory $GatewayRoot `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru
Set-Content -Path $PidFile -Value $Process.Id -Encoding UTF8
Start-Sleep -Milliseconds 700
$StartedConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1
if ($StartedConnection) {
  Write-Host "[Mhamcloud] WhatsApp gateway started. PID=$($Process.Id), URL=http://127.0.0.1:$Port"
  exit 0
}
Write-Host "[Mhamcloud] WhatsApp gateway start requested. PID=$($Process.Id). Check logs: $OutLog / $ErrLog"
exit 0
