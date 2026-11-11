# Authorized recovery following Phase13.5C.3 preflight. No broker/DB restart or config edit.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z0-9-]{1,80}$')][string]$RunId)
$ErrorActionPreference='Stop'
$root='C:\DATN\Project_datn'
if (@(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).Count) { throw 'BACKEND_ALREADY_LISTENING_NO_SECOND_INSTANCE' }
if (-not @(Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction SilentlyContinue | Where-Object LocalAddress -in @('0.0.0.0','::','172.20.10.2')).Count) { throw 'LAN_BROKER_REQUIRED' }
$base=Join-Path $root ('build\phase13-5c3-'+$RunId)
foreach($suffix in @('.stdout.log','.stderr.log','.state.json','.exit.json','.attempt.json')) { if(Test-Path -LiteralPath ($base+$suffix)){throw 'RUN_ALREADY_EXISTS_NO_RETRY'} }
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName=(Get-Command node.exe -ErrorAction Stop).Source
$info.Arguments='--import tsx src/server.ts'
$info.WorkingDirectory=Join-Path $root 'backend'
$info.UseShellExecute=$false; $info.CreateNoWindow=$true
$info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
foreach($item in @{
 PORT='5000'; MQTT_ENABLED='true'; MQTT_BROKER_URL='mqtt://172.20.10.2:1883'
 MQTT_COMMANDS_ENABLED='false'; MQTT_AUTOMATION_COMMANDS_ENABLED='false'
 MQTT_PUMP_TEST_MODE='true'; MQTT_PUMP_MAX_RUN_SECONDS='1'
}.GetEnumerator()){ $info.EnvironmentVariables[$item.Key]=$item.Value }
$started=[DateTimeOffset]::UtcNow.ToString('o')
$attempt=[IO.File]::Open(($base+'.attempt.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try { $bytes=[Text.Encoding]::UTF8.GetBytes((@{RunId=$RunId;Approval='User: hay kiem tra va khoi phuc lai, following Phase13.5C.3';StartedAt=$started;Attempts=1}|ConvertTo-Json));$attempt.Write($bytes,0,$bytes.Length) } finally {$attempt.Dispose()}
$stdout=[IO.File]::Open(($base+'.stdout.log'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
$stderr=[IO.File]::Open(($base+'.stderr.log'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
$child=New-Object Diagnostics.Process; $child.StartInfo=$info
$launched=$false
try {
 if(-not $child.Start()){throw 'START_FAILED_NO_RETRY'}
 $launched=$true
 $outTask=$child.StandardOutput.BaseStream.CopyToAsync($stdout)
 $errTask=$child.StandardError.BaseStream.CopyToAsync($stderr)
 @{runId=$RunId;pid=$child.Id;startedAt=$started;state='RUNNING';stdout=($base+'.stdout.log');stderr=($base+'.stderr.log');exitEvidence=($base+'.exit.json');command=$info.Arguments} | ConvertTo-Json | Set-Content -LiteralPath ($base+'.state.json') -Encoding UTF8
 while(-not $child.WaitForExit(250)){}
 $outTask.GetAwaiter().GetResult(); $errTask.GetAwaiter().GetResult()
 @{pid=$child.Id;exitCode=$child.ExitCode;endedAt=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath ($base+'.exit.json') -Encoding UTF8
} finally {
 if(-not $launched -or $child.HasExited){$stdout.Dispose();$stderr.Dispose();$child.Dispose()}
}
