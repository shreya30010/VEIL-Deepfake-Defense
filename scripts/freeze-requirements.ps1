# Writes artifacts\model-service\requirements.txt with the EXACT versions installed in your current Python
# environment for the packages the model service imports. Run it once in the environment where the model works.
$root = Split-Path -Parent $PSScriptRoot
$wanted = "fastapi","uvicorn","pydantic","numpy","torch","transformers","soundfile","scipy","librosa","starlette","safetensors","huggingface-hub","tokenizers"
$frozen = pip freeze 2>$null
$lines = foreach ($line in $frozen) {
  $name = ($line -split "==")[0].ToLower()
  if ($wanted -contains $name) { $line }
}
if (-not $lines) { throw "No packages found. Activate the Python environment that runs the model service, then run this again." }
$out = Join-Path $root "artifacts\model-service\requirements.txt"
Set-Content -Path $out -Value $lines -Encoding ASCII
Write-Host "Wrote $out" -ForegroundColor Green
$lines
