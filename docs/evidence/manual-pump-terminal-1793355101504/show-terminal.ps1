$ErrorActionPreference='Stop'
$Host.UI.RawUI.WindowTitle='Smart Agriculture MQTT Evidence 1793355101504'
$Host.UI.RawUI.BackgroundColor='Black'
$Host.UI.RawUI.ForegroundColor='White'
try {
 $Host.UI.RawUI.WindowSize=New-Object Management.Automation.Host.Size(110,35)
 $Host.UI.RawUI.BufferSize=New-Object Management.Automation.Host.Size(110,100)
} catch {}
Clear-Host
Write-Host 'Executing read-only evidence script (no MQTT connection):' -ForegroundColor Cyan
Write-Host 'node scripts\capture-manual-pump-evidence.cjs <evidence-directory>'
& 'C:\Program Files\nodejs\node.exe' 'C:\DATN\Project_datn\scripts\capture-manual-pump-evidence.cjs' 'C:\DATN\Project_datn\docs\evidence\manual-pump-terminal-1793355101504'
if($LASTEXITCODE -ne 0){Write-Host 'EVIDENCE QUERY FAILED - DO NOT RETRY' -ForegroundColor Red}
Read-Host 'Press Enter to close this read-only evidence window'