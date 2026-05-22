$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$escapedRoot = [regex]::Escape($Root)

$processes = Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -match $escapedRoot -and
        ($_.CommandLine -match "tsx" -or $_.CommandLine -match "src\\server\\index\.ts" -or $_.CommandLine -match "npm run dev")
    }

foreach ($process in $processes) {
    if ($process.ProcessId -ne $PID) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
