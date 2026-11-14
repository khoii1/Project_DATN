$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
& node "scripts/start-demo.cjs"
