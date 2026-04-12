# Spustí Aider s oficiálním DeepSeek API (viz .aider.conf.yml).
# LiteLLM očekává OPENAI_API_KEY + OPENAI_API_BASE i pro DeepSeek endpoint.
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$envFile = Join-Path $repoRoot ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if ($val.Length -ge 2 -and $val.StartsWith('"') -and $val.EndsWith('"')) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    if ($val.Length -ge 2 -and $val.StartsWith("'") -and $val.EndsWith("'")) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $val, "Process")
  }
}

$env:OPENAI_API_BASE = "https://api.deepseek.com/v1"
if ($env:DEEPSEEK_API_KEY -and -not $env:OPENAI_API_KEY) {
  $env:OPENAI_API_KEY = $env:DEEPSEEK_API_KEY
}

if (-not $env:OPENAI_API_KEY) {
  Write-Error "Chybí DEEPSEEK_API_KEY nebo OPENAI_API_KEY v .env (kořen projektu)."
  exit 1
}

& aider @args
