[CmdletBinding()]
param([switch]$ExecuteApproved)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn';$root=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresRecovery\phase13-5c-recovery-01';$data=Join-Path $root 'data';$logs=Join-Path $root 'logs-private';$evidence=Join-Path $root 'evidence-private';$tag='verification-c7-01'
if(-not $ExecuteApproved){[pscustomobject]@{Mode='PLAN_ONLY';ExistingRestoreOnly=$true;Port=55434;InitdbPerformed=$false;RestorePerformed=$false;WritesToDatabase=$false}|ConvertTo-Json;return}
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
. (Join-Path $PSScriptRoot 'phase13-5c4-runtime-gate.ps1')
Assert-Phase135cOperator
foreach($dir in @([IO.Directory]::GetParent($root).FullName,$root,$data,$logs,$evidence)){Assert-Phase135cPrivateDirectory $dir}
Assert-Phase135cOutsideKnownSync $root
if($env:LOCALAPPDATA -ine 'C:\Users\Acer Swift3\AppData\Local' -or [IO.File]::ReadAllText((Join-Path $data 'PG_VERSION')).Trim() -cne '17'){throw 'RECOVERY_PATH_OR_VERSION_MISMATCH'}
if(@(Get-NetTCPConnection -LocalPort 55434 -State Listen -ErrorAction SilentlyContinue).Count){throw 'RECOVERY_ALREADY_LISTENING_STOP'}
$control=& 'C:\Program Files\PostgreSQL\17\bin\pg_controldata.exe' $data
if($LASTEXITCODE -ne 0 -or [string]::Join("`n",$control) -notmatch 'Database system identifier:\s*7699532241714573532\b' -or [string]::Join("`n",$control) -notmatch 'Database cluster state:\s*shut down\s*(?:\r?\n|$)'){throw 'PINNED_SHUT_DOWN_RECOVERY_REQUIRED'}
if(Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')){throw 'UNEXPECTED_POSTMASTER_PID'}
$old=Get-Content -LiteralPath (Join-Path $repo 'report\phase13-5c6-resume-01-outcome.json') -Raw -Encoding UTF8|ConvertFrom-Json
$registered=Get-Content -LiteralPath (Join-Path $evidence 'registered-identity.private.json') -Raw -Encoding UTF8|ConvertFrom-Json
$restoreMarker=Get-Content -LiteralPath (Join-Path $evidence 'restore.attempt.private.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($old.restoreExit -ne 0 -or $old.clusterStopped -cne $true -or $registered.systemId -cne '7699532241714573532' -or $restoreMarker.systemId -cne $registered.systemId -or $restoreMarker.database -cne 'smart_agriculture_recovery_13_5c_01'){throw 'EXISTING_RESTORE_IDENTITY_EVIDENCE_REQUIRED'}
foreach($file in @(($tag+'.approval.private.json'),($tag+'.private.json'))){if(Test-Path -LiteralPath (Join-Path $evidence $file)){throw 'VERIFICATION_ALREADY_ATTEMPTED_NO_RETRY'}}
if(Test-Path -LiteralPath (Join-Path $repo 'report\phase13-5c7-outcome.json')){throw 'VERIFICATION_OUTCOME_EXISTS_NO_OVERWRITE'}
$backup=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresBackups\production\20261022-220757-53a520a7936841a38d76b3af68c700f0\smart_agriculture.dump'
if((Get-FileHash -LiteralPath $backup).Hash -cne '04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640'){throw 'ARCHIVE_HASH_MISMATCH'}
function Write-NewC7Json([string]$File,$Value){$stream=[IO.File]::Open($File,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$b=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 8));$stream.Write($b,0,$b.Length);$stream.Flush($true)}finally{$stream.Dispose()}}
function Get-C7ProductionReadOnly {
 $before=Get-Phase135c4Listener
 $states=@(Get-ChildItem (Join-Path $repo 'build') -Filter '*.state.json' -File|ForEach-Object{try{$s=Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8|ConvertFrom-Json;if($s.pid -eq $before.Pid){$s}}catch{}})
 if($states.Count -ne 1 -or $states[0].state -cne 'RUNNING' -or (Test-Path -LiteralPath $states[0].exitEvidence)){throw 'SERVING_BACKEND_STATE_REQUIRED'}
 if([Math]::Abs(([DateTimeOffset]::Parse($states[0].startedAt)-[DateTimeOffset]::Parse($before.Started)).TotalSeconds) -gt 10){throw 'BACKEND_STATE_START_MISMATCH'}
 $match=[regex]::Match((Get-Content -LiteralPath $states[0].stdout -Raw),'MQTT pump safety runtime:\s*(\{[^\r\n]+\})')
 if(-not $match.Success){throw 'CURRENT_STARTUP_ATTESTATION_REQUIRED'};$runtime=$match.Groups[1].Value|ConvertFrom-Json
 if($runtime.pid -ne $before.Pid -or $runtime.commandsEnabled -cne $false -or $runtime.automationEnabled -cne $false -or $runtime.testMode -cne $true -or $runtime.effectiveMaxRunSeconds -ne 1){throw 'UNSAFE_RUNTIME'}
 $health=(Invoke-RestMethod http://127.0.0.1:5000/api/health -TimeoutSec 8).data;if($health.database -cne 'connected' -or $health.mqtt -cne 'connected'){throw 'PRODUCTION_HEALTH_FAILED'}
 $json=& (Get-Command node.exe).Source (Join-Path $repo 'backend\scripts\phase13-5c7-production-readonly.cjs');if($LASTEXITCODE -ne 0){throw 'PRODUCTION_READ_ONLY_DIAGNOSTIC_FAILED'};$sql=$json|ConvertFrom-Json;if($sql.pending -ne 0 -or $sql.commands -ne 43){throw 'PRODUCTION_COMMAND_BASELINE_CHANGED'}
 $after=Get-Phase135c4Listener;if($after.Pid -ne $before.Pid -or $after.Started -cne $before.Started){throw 'PRODUCTION_BACKEND_CHANGED'}
 [pscustomobject]@{ListenerBefore=$before.Pid;ProcessStart=$before.Started;Runtime=$runtime;Health=$health;Sql=$sql;At=[DateTimeOffset]::UtcNow.ToString('o')}
}
$productionBefore=Get-C7ProductionReadOnly
Write-NewC7Json (Join-Path $evidence ($tag+'.production-before.private.json')) $productionBefore
Write-NewC7Json (Join-Path $evidence ($tag+'.approval.private.json')) @{reference='PHASE13.5C.7_ATTACHMENT_22ba947c';systemId='7699532241714573532';DatabaseWritesAllowed=$false;AdditionalRestoreAllowed=$false;At=[DateTimeOffset]::UtcNow.ToString('o')}
Write-Host 'VERIFICATION ONLY: existing restored database. No restore, initdb or database writes.'
$secret=Read-Host 'Existing RECOVERY sa_recovery_dba password (secure local input, NOT production)' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret);try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)}
try{
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=(Get-Command node.exe).Source;$info.Arguments='"'+(Join-Path $repo 'backend\scripts\phase13-5c7-verify.cjs')+'" --approved-phase13-5c7'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info;if(-not $child.Start()){throw 'VERIFY_EXECUTOR_NOT_STARTED'}
 $out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync();$child.StandardInput.Write((@{password=$plain}|ConvertTo-Json -Compress));$child.StandardInput.Close();$plain=$null
 $child.WaitForExit();$out.GetAwaiter().GetResult();$null=$err.GetAwaiter().GetResult();$exit=$child.ExitCode;$child.Dispose()
}finally{$plain=$null;$secret.Dispose()}
# Production read-only after-check runs even if verification failed.
$productionAfter=Get-C7ProductionReadOnly
if($productionAfter.ListenerBefore -ne $productionBefore.ListenerBefore -or $productionAfter.ProcessStart -cne $productionBefore.ProcessStart -or $productionAfter.Sql.commands -ne $productionBefore.Sql.commands){throw 'PRODUCTION_CHANGED'}
Write-NewC7Json (Join-Path $evidence ($tag+'.production-after.private.json')) $productionAfter
if($exit -ne 0){throw 'VERIFY_STOPPED_NO_RETRY_KEEP_EVIDENCE'}
Write-Host 'Verification ended; recovery shutdown and production safety will be independently checked.'
