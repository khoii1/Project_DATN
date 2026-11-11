# Separate approved resume. No initdb, directory creation, PGDATA reset or old evidence overwrite.
[CmdletBinding()]
param([switch]$ExecuteApproved)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn';$bin='C:\Program Files\PostgreSQL\17\bin'
$container=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresRecovery';$root=Join-Path $container 'phase13-5c-recovery-01';$data=Join-Path $root 'data';$logs=Join-Path $root 'logs-private';$evidence=Join-Path $root 'evidence-private'
if(-not $ExecuteApproved){[pscustomobject]@{Mode='PLAN_ONLY';ExistingClusterOnly=$true;ExpectedSystemId='7699532241714573532';Port=55434;InitdbPerformed=$false;RestorePerformed=$false}|ConvertTo-Json;return}
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
. (Join-Path $PSScriptRoot 'phase13-5c4-runtime-gate.ps1')
Assert-Phase135cOperator
if($env:LOCALAPPDATA -ine 'C:\Users\Acer Swift3\AppData\Local'){throw 'LOCALAPPDATA_MISMATCH'}
foreach($dir in @($container,$root,$data,$logs,$evidence)){Assert-Phase135cPrivateDirectory $dir}
Assert-Phase135cOutsideKnownSync $root
if([string](Get-Content -LiteralPath (Join-Path $data 'PG_VERSION') -Raw).Trim() -cne '17'){throw 'PG17_REQUIRED'}
if(@(Get-NetTCPConnection -LocalPort 55434 -State Listen -ErrorAction SilentlyContinue).Count){throw 'RECOVERY_PORT_OCCUPIED_STOP'}
$control=& (Join-Path $bin 'pg_controldata.exe') $data
if($LASTEXITCODE -ne 0 -or [string]::Join("`n",$control) -notmatch 'Database system identifier:\s*7699532241714573532\b' -or [string]::Join("`n",$control) -notmatch 'Database cluster state:\s*shut down\s*(?:\r?\n|$)'){throw 'PINNED_SHUT_DOWN_CLUSTER_REQUIRED'}
if(Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')){throw 'UNEXPECTED_POSTMASTER_PID'}
foreach($file in @('restore.attempt.private.json','registered-identity.private.json','resume-01.approval.private.json','restore-result-resume-01.private.json')){if(Test-Path -LiteralPath (Join-Path $evidence $file)){throw 'UNEXPECTED_RESTORE_OR_RESUME_STATE_NO_RETRY'}}
$old=Get-Content -LiteralPath (Join-Path $evidence 'restore-result.private.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($old.restoreAttempted -cne $false -or $old.clusterStarted -cne $false -or $old.error.type -cne 'SyntaxError'){throw 'PREVIOUS_STATE_DIFFERS_STOP'}
# Offline base OIDs from a fresh PG17 initdb; actual SQL name check follows startup.
$baseDirs=@(Get-ChildItem -LiteralPath (Join-Path $data 'base') -Directory -Force | Select-Object -ExpandProperty Name | Sort-Object)
if(($baseDirs -join ',') -cne '1,4,5'){throw 'UNEXPECTED_DATABASE_STORAGE_STOP'}
$conf=Get-Content -LiteralPath (Join-Path $data 'postgresql.conf') -Raw
if($conf -notmatch "(?m)^listen_addresses = '127\.0\.0\.1'\s*$" -or $conf -notmatch '(?m)^port = 55434\s*$' -or $conf -notmatch "(?m)^password_encryption = 'scram-sha-256'\s*$"){throw 'RECOVERY_CONFIG_REVIEW_REQUIRED'}
$hba=(Get-Content -LiteralPath (Join-Path $data 'pg_hba.conf') -Raw).Trim()
if($hba -cne 'host all sa_recovery_dba 127.0.0.1/32 scram-sha-256'){throw 'RECOVERY_HBA_MISMATCH'}
$backup=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresBackups\production\20261022-220757-53a520a7936841a38d76b3af68c700f0\smart_agriculture.dump'
if((Get-FileHash -LiteralPath $backup).Hash -cne '04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640'){throw 'ARCHIVE_HASH_MISMATCH'}
$productionBefore=Get-Phase135c4Runtime $repo
function Write-NewResumeJson([string]$File,$Value){$stream=[IO.File]::Open($File,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 8));$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}}
Write-NewResumeJson (Join-Path $evidence 'production-before-resume-01.private.json') $productionBefore
Write-NewResumeJson (Join-Path $evidence 'resume-01.approval.private.json') @{reference='USER_APPROVED_CONTROLLED_RESTORE_RESUME_7699532241714573532';expectedSystemId='7699532241714573532';at=[DateTimeOffset]::UtcNow.ToString('o');NoInitdb=$true;NoReferenceDatabase=$true;MaxRestoreAttempts=1;CloudBackupScope='NOT_VERIFIED'}
Write-Host 'RESUME EXISTING RECOVERY ONLY. No initdb. Enter the RECOVERY password you chose previously, NOT production.'
$secret=Read-Host 'Existing sa_recovery_dba password (secure local input)' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)}
try{
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=(Get-Command node.exe).Source;$info.Arguments='"'+(Join-Path $repo 'backend\scripts\phase13-5c6-restore.cjs')+'" --approved-phase13-5c6-resume'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info;if(-not $child.Start()){throw 'RESUME_EXECUTOR_NOT_STARTED'}
 $out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync();$child.StandardInput.Write((@{password=$plain}|ConvertTo-Json -Compress));$child.StandardInput.Close();$plain=$null
 $child.WaitForExit();$out.GetAwaiter().GetResult();$null=$err.GetAwaiter().GetResult();$exit=$child.ExitCode;$child.Dispose()
 if($exit -ne 0){throw 'RESUME_STOPPED_NO_RETRY_KEEP_EVIDENCE'}
}finally{$plain=$null;$secret.Dispose()}
$productionAfter=Get-Phase135c4Runtime $repo
if($productionAfter.ListenerBefore -ne $productionBefore.ListenerBefore -or $productionAfter.ProcessStartBefore -cne $productionBefore.ProcessStartBefore){throw 'PRODUCTION_PROCESS_CHANGED'}
Write-NewResumeJson (Join-Path $evidence 'production-after-resume-01.private.json') $productionAfter
Write-Host 'Resume finished. Agent will verify target, archive comparison and recovery shutdown. No retry.'
