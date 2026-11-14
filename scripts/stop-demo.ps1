$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
& node "scripts/stop-demo.cjs"
