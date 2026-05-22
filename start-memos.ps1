$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "packages\memos-js"
$DataDir = Join-Path $Root "data"
$LogDir = Join-Path $Root "logs"
$DbPath = Join-Path $DataDir "memos.sqlite"
$Stdout = Join-Path $LogDir "memos-server.log"
$Stderr = Join-Path $LogDir "memos-server.err.log"

function Test-MemosHealth {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 3
        return [bool]$response.ok
    } catch {
        return $false
    }
}

if (Test-MemosHealth) {
    return
}

if (-not (Test-Path -LiteralPath (Join-Path $Backend "node_modules\.bin\tsx.cmd"))) {
    throw "Backend dependencies are missing. Run npm install in packages\memos-js."
}

New-Item -ItemType Directory -Force -Path $DataDir, $LogDir | Out-Null

$env:MEMOS_PORT = "8080"
$env:MEMOS_DB_PATH = $DbPath
$env:MEMOS_TIER = "hybrid"
$env:MEMOS_EMBEDDINGS = "synthetic"
$env:MEMOS_METADATA_BACKEND = "sqlite"
$env:MEMOS_VECTOR_BACKEND = "sqlite"
$env:NO_COLOR = "1"

Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $Backend `
    -WindowStyle Hidden `
    -RedirectStandardOutput $Stdout `
    -RedirectStandardError $Stderr | Out-Null

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    if (Test-MemosHealth) {
        return
    }
    Start-Sleep -Milliseconds 500
}

throw "Memos did not become healthy on http://127.0.0.1:8080/health. Check $Stdout and $Stderr."
