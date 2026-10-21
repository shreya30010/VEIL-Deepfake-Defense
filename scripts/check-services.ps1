# Confirms that all three VEIL services respond.
function Test-Url($name, $url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    Write-Host ("[ OK ] {0,-14} {1}  (HTTP {2})" -f $name, $url, $r.StatusCode) -ForegroundColor Green
  } catch {
    Write-Host ("[FAIL] {0,-14} {1}  ({2})" -f $name, $url, $_.Exception.Message) -ForegroundColor Red
  }
}
Test-Url "web app"       "http://localhost:3000/"
Test-Url "api-server"    "http://localhost:3001/api/healthz"
Test-Url "model-service" "http://127.0.0.1:5001/health"
