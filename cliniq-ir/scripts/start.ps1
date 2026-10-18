param([switch]$OpenBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run scripts\setup.ps1 first.' }
$frontendPath = Join-Path $projectRoot 'frontend'
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules'))) {
    throw 'Run scripts\setup.ps1 first.'
}
foreach ($port in @(8000, 5173)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop the previous server before starting ClinIQ."
    }
}
# Background helpers are hidden. Ctrl+C in this terminal stops both owned jobs.
$apiJob = Start-Job -ArgumentList $projectRoot, $pythonPath -ScriptBlock {
    param($projectRoot, $pythonPath)
    Set-Location -LiteralPath (Join-Path $projectRoot 'backend')
    & $pythonPath -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log 2>&1 | ForEach-Object { "$_" }
}
$frontendJob = Start-Job -ArgumentList $frontendPath -ScriptBlock {
    param($frontendPath)
    Set-Location -LiteralPath $frontendPath
    npm.cmd run dev 2>&1 | ForEach-Object { "$_" }
}
try {
    $browserOpened = $false
    $startupTimer = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host 'ClinIQ: http://127.0.0.1:5173 | API docs: http://127.0.0.1:8000/docs'
    Write-Host 'Keep this terminal open. Press Ctrl+C to stop both servers.'
    while ($apiJob.State -eq 'Running' -and $frontendJob.State -eq 'Running') {
        Receive-Job -Job $apiJob, $frontendJob
        if ($OpenBrowser -and -not $browserOpened) {
            try {
                $apiReady = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 1
                $frontendReady = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1
                if ($apiReady.StatusCode -eq 200 -and $frontendReady.StatusCode -eq 200) {
                    $browserOpened = $true
                    try { Start-Process -FilePath 'http://127.0.0.1:5173' }
                    catch { Write-Warning 'Could not open the browser. Open http://127.0.0.1:5173 manually.' }
                }
            } catch {
                if ($startupTimer.Elapsed.TotalSeconds -ge 60) {
                    throw 'Services did not become ready within 60 seconds. Review the server output above.'
                }
            }
        }
        Start-Sleep -Seconds 1
    }
    Receive-Job -Job $apiJob, $frontendJob
    throw 'A ClinIQ service stopped unexpectedly. Review the server output above.'
} finally {
    Stop-Job -Job $apiJob, $frontendJob
    Remove-Job -Job $apiJob, $frontendJob -Force
}
