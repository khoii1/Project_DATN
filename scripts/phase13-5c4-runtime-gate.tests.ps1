$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'phase13-5c4-runtime-gate.ps1')
$fixture=@{
 ListenerBefore=123;ListenerAfter=123;StatePid=123;ProcessStartBefore='2026-10-22T01:00:00Z';ProcessStartAfter='2026-10-22T01:00:00Z'
 Runtime=@{pid=123;commandsEnabled=$false;automationEnabled=$false;testMode=$true;effectiveMaxRunSeconds=1}
 Api=@{health=@{database='connected';mqtt='connected'};runtime=@{commandsEnabled=$false;automationEnabled=$false;pumpTestMode=$true};gatewayMode='DISABLED';controlEnabled=$false}
}
Assert-Phase135c4Evidence $fixture
$passed=1
$mutations=@(
 {param($e)$e.ListenerAfter=456}, {param($e)$e.StatePid=456}, {param($e)$e.Runtime.pid=456},
 {param($e)$e.ProcessStartAfter='2026-10-22T02:00:00Z'},
 {param($e)$e.Runtime.commandsEnabled=$true}, {param($e)$e.Runtime.automationEnabled=$true},
 {param($e)$e.Runtime.testMode=$false}, {param($e)$e.Runtime.effectiveMaxRunSeconds=5},
 {param($e)$e.Api.runtime.commandsEnabled=$true}, {param($e)$e.Api.runtime.automationEnabled=$true},
 {param($e)$e.Api.runtime.pumpTestMode=$false}, {param($e)$e.Api.gatewayMode='MQTT'},
 {param($e)$e.Api.controlEnabled=$true}, {param($e)$e.Api.health.mqtt='disconnected'},
 {param($e)$e.Api.health.database='unavailable'}, {param($e)$e.Runtime.commandsEnabled=$null},
 {param($e)$e.Api.runtime.commandsEnabled='false'}, {param($e)$e.Runtime.testMode='true'}
)
foreach($mutation in $mutations){
 $e=$fixture|ConvertTo-Json -Depth 8|ConvertFrom-Json
 & $mutation $e
 $rejected=$false
 try{Assert-Phase135c4Evidence $e}catch{$rejected=$true}
 if(-not $rejected){throw 'UNSAFE_FIXTURE_ACCEPTED'}
 $passed++
}
foreach($name in @('phase13-5c-production-backup.ps1','phase13-5c4-runtime-gate.ps1','phase13-5c3-attest-existing-storage.ps1')){
 $tokens=$null;$errors=$null;[void][Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $name),[ref]$tokens,[ref]$errors)
 if(@($errors).Count){throw 'AST_PARSE_FAILED'}
 $passed++
}
$backup=Get-Content (Join-Path $PSScriptRoot 'phase13-5c-production-backup.ps1') -Raw
if($backup.Contains('phase13-5a3-controlled-20261022-01.stdout.log') -or $backup.Contains('15264')){throw 'HISTORICAL_PROCESS_HARDCODE'}
$passed++
[pscustomobject]@{OfflinePassed=$passed;OfflineFailed=0;DatabaseConnections=0;CommandsSent=0} | ConvertTo-Json
