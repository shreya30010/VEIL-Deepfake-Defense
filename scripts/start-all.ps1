# VEIL - start all three services on Windows.
# Usage (from the repo root):  .\start.bat      or      powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function New-RandomHex([int]$bytes) {
  $buf = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  return ($buf | ForEach-Object { $_.ToString("x2") }) -join ""
}

# 1. Create .env with fresh random secrets on first run (never overwrites an existing file)
if (-not (Test-Path ".env")) {
  if (-not (Test-Path ".env.example")) { throw ".env.example is missing; cannot create .env" }
  $text = Get-Content ".env.example" -Raw
  $text = $text -replace "(?m)^SESSION_SECRET=.*$", ("SESSION_SECRET=" + (New-RandomHex 32))
  $text = $text -replace "(?m)^ERP_GATE_API_KEY=.*$", ("ERP_GATE_API_KEY=" + (New-RandomHex 24))
  Set-Content -Path ".env" -Value $text -Encoding ASCII
  Write-Host "Created .env with new random secrets (it is git-ignored)." -ForegroundColor Green
}

# 2. Free ports 3000 (web), 3001 (API), 5001 (model service) if something is already using them
foreach ($port in 3000, 3001, 5001) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    if ($procId -and $procId -ne 0) {
      $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
      Write-Host "Port $port is busy (PID $procId $name). Stopping it..." -ForegroundColor Yellow
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

# 3. Start the three services, each in its own window so logs stay visible
$py = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py" }

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='VEIL model-service :5001'; Set-Location '$root\artifacts\model-service'; $py app.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='VEIL api-server :3001'; Set-Location '$root'; `$env:PORT='3001'; npx pnpm --filter @workspace/api-server run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle='VEIL web :3000'; Set-Location '$root'; `$env:PORT='3000'; `$env:API_PORT='3001'; npx pnpm --filter @workspace/vericall run dev"

Write-Host ""
Write-Host "Started 3 windows. The first model start downloads the model (needs internet) and can take a few minutes." -ForegroundColor Cyan
Write-Host "Check them with:  .\scripts\check-services.ps1"
Write-Host "Open the app at:  http://localhost:3000"
