$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Kill-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 400
        Write-Host "  Cleared port $port"
    }
}

Write-Host "`nClearing ports..."
Kill-Port 8080
Kill-Port 3000

$env:MEMOS_PORT              = "8080"
$env:MEMOS_API_KEY           = "memos-local-key"
$env:MEMOS_TIER              = "hybrid"
$env:MEMOS_EMBEDDINGS        = "synthetic"
$env:MEMOS_METADATA_BACKEND  = "sqlite"
$env:MEMOS_VECTOR_BACKEND    = "sqlite"
$env:MEMOS_DB_PATH           = ""
$env:MEMOS_OLLAMA_CHAT_MODEL = "qwen2:1.5b"
$env:OLLAMA_URL              = "http://localhost:11434"
$env:NO_COLOR                = "1"

Write-Host "Starting backend  → http://localhost:8080"
$backend = Start-Process "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory "$Root\packages\memos-js" -PassThru -NoNewWindow
Write-Host "  PID $($backend.Id)"

Write-Host "Starting frontend → http://localhost:3000"
$frontend = Start-Process "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory "$Root\dashboard" -PassThru -NoNewWindow
Write-Host "  PID $($frontend.Id)"

Write-Host "`nBoth running in this window. Ctrl+C to stop.`n"
Wait-Process -Id $backend.Id,$frontend.Id
