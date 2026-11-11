# PREPARED ONLY. No dump/directory/credential prompt without separate explicit approval.
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param([switch]$ExecuteApproved,[string]$BackupApprovalId,[string]$StorageApprovalId)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
. (Join-Path $PSScriptRoot 'phase13-5c4-runtime-gate.ps1')
Assert-Phase135cOperator
$backupRoot=Get-Phase135cBackupRoot
Assert-Phase135cNoReparse $backupRoot; Assert-Phase135cOutsideKnownSync $backupRoot
if (-not $ExecuteApproved -or $WhatIfPreference) {
  [pscustomobject]@{Mode='PLAN_ONLY';Host='127.0.0.1';Port=5432;Database='smart_agriculture';Format='custom';Root=$backupRoot;ProductionBackupPerformed=$false;CredentialsRequested=$false;RequiresSeparateStorageApproval=$true;RequiresSeparateBackupApproval=$true;RestoreTarget='INDEPENDENT_SEPARATELY_APPROVED_ONLY';RolePasswordsIncluded=$false} | ConvertTo-Json
  return
}
if ($BackupApprovalId -notmatch '^[A-Za-z0-9_-]{8,80}$' -or $StorageApprovalId -notmatch '^[A-Za-z0-9_-]{8,80}$') { throw 'EXPLICIT_BACKUP_AND_STORAGE_APPROVAL_IDS_REQUIRED' }
Assert-Phase135cPrivateDirectory ([IO.Directory]::GetParent($backupRoot).FullName); Assert-Phase135cPrivateDirectory $backupRoot
$storage=Get-Content -LiteralPath (Join-Path $backupRoot 'storage-approval.private.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($storage.DataHandlingApproved -cne $true -or $storage.ResidualRiskAccepted -cne $true -or $storage.CloudBackupScope -cne 'NOT_VERIFIED' -or $storage.StorageApprovalId -cne $StorageApprovalId -or $storage.BackupApprovalId -cne $BackupApprovalId -or $storage.OperatorSid -ne $script:Phase135cOperatorSid) { throw 'STORAGE_APPROVAL_ATTESTATION_MISMATCH' }
$attemptFile=Join-Path $backupRoot ($BackupApprovalId+'.attempt.private.json')
if(Test-Path -LiteralPath $attemptFile){throw 'BACKUP_ALREADY_ATTEMPTED_NO_RETRY'}
$pgBin='C:\Program Files\PostgreSQL\17\bin'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$artifactRoot=Join-Path $repo 'backend\prisma\proposals\production\20261022_irrigation_v1_v2'
$manifest=Get-Content -LiteralPath (Join-Path $artifactRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$names=@{bootstrap='00-prerequisites.review.sql';migration='01-ledgers.review.sql';finalize='02-finalize-dba.review.sql'}
foreach ($entry in $manifest.files) { if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $artifactRoot $names[$entry.kind])).Hash.ToLowerInvariant() -cne $entry.sha256) { throw 'SQL_ARTIFACT_HASH_MISMATCH' } }
if (-not $manifest.isolatedRehearsal -or $manifest.isolatedRehearsal.failed -ne 0) { throw 'SQL_REHEARSAL_EVIDENCE_REQUIRED' }
$runtimeBefore=Get-Phase135c4Runtime $repo
if (-not $PSCmdlet.ShouldProcess($backupRoot,'READ-ONLY production pg_dump + sanitized role metadata; NO migration/restore')) { return }
$password=Read-Host 'PostgreSQL backup credential (local secure input; never send in chat)' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
$runPath=$null
$nativeEvidence=New-Object 'System.Collections.Generic.List[object]'
function Invoke-Phase135cNative([string]$Executable,[string[]]$NativeArguments) {
  $info=New-Object Diagnostics.ProcessStartInfo
  $info.FileName=Join-Path $pgBin $Executable
  $info.Arguments=($NativeArguments | ForEach-Object { '"'+$_.Replace('"','\"')+'"' }) -join ' '
  $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
  foreach ($key in @($info.EnvironmentVariables.Keys)) { if ($key -match '^PG|^DATABASE_URL$') { $info.EnvironmentVariables.Remove($key) } }
  $info.EnvironmentVariables['PGPASSWORD']=$plain; $info.EnvironmentVariables['PGHOST']='127.0.0.1'; $info.EnvironmentVariables['PGPORT']='5432'; $info.EnvironmentVariables['PGUSER']='postgres'
  $p=New-Object Diagnostics.Process; $p.StartInfo=$info; $nativeDidStart=$false; $nativeTimedOut=$false
  try {
    if (-not $p.Start()) { throw 'NATIVE_PROCESS_NOT_STARTED' }
    $nativeDidStart=$true
    $stdout=$p.StandardOutput.ReadToEndAsync(); $stderr=$p.StandardError.ReadToEndAsync()
    $nativeDeadline=[DateTimeOffset]::UtcNow.AddMinutes(5)
    while(-not $p.WaitForExit(1000)) {
      try { $serving=Get-Phase135c4Listener; if($serving.Pid -ne $runtimeBefore.ListenerBefore -or $serving.Started -cne $runtimeBefore.ProcessStartBefore){throw 'BACKEND_CHANGED'} }
      catch { $p.Kill();$p.WaitForExit();throw 'BACKEND_CHANGED_STOP_BACKUP_NO_RETRY' }
      if([DateTimeOffset]::UtcNow -gt $nativeDeadline){$nativeTimedOut=$true;$p.Kill();$p.WaitForExit();throw 'BACKUP_CLIENT_TIMEOUT_NO_RETRY'}
    }
    $nativeResult=[pscustomobject]@{ExitCode=$p.ExitCode;Stdout=$stdout.GetAwaiter().GetResult();Stderr=$stderr.GetAwaiter().GetResult()}
    if($runPath){
      $nativeLabel=('{0:D2}-{1}' -f $nativeEvidence.Count,$Executable)
      $nativeResult.Stdout | Set-Content -LiteralPath (Join-Path $runPath ($nativeLabel+'.stdout.private.log')) -Encoding UTF8
      $nativeResult.Stderr | Set-Content -LiteralPath (Join-Path $runPath ($nativeLabel+'.stderr.private.log')) -Encoding UTF8
    }
    return $nativeResult
  } finally {
    if ($nativeDidStart) { $nativeEvidence.Add([pscustomobject]@{Executable=$Executable;ExitCode=$(if($p.HasExited){$p.ExitCode}else{$null});TimedOut=$nativeTimedOut;At=[DateTimeOffset]::UtcNow.ToString('o')}) }
    if ($runPath) { ConvertTo-Json -InputObject @($nativeEvidence.ToArray()) -Depth 4 | Set-Content -LiteralPath (Join-Path $runPath 'native-exits.private.json') -Encoding UTF8 }
    $info.EnvironmentVariables.Remove('PGPASSWORD'); $p.Dispose()
  }
}
try {
  $identitySql=@'
SELECT json_build_object(
 'database',current_database(),'schema',current_schema(),'role',current_user,
 'port',inet_server_port(),'host',inet_server_addr()::text,
 'system_id',(SELECT system_identifier::text FROM pg_control_system()),
 'pgdata',current_setting('data_directory'),'version',current_setting('server_version_num'),
 'bytes',pg_database_size(current_database())::text,
 'pending',(SELECT count(*) FROM public.device_commands WHERE status='PENDING'),
 'command_count',(SELECT count(*) FROM public.device_commands),
 'ledger_count',(SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'irrigation_%'),
 'database_properties',(SELECT json_build_object('owner',pg_get_userbyid(d.datdba),
   'encoding',pg_encoding_to_char(d.encoding),'collate',d.datcollate,'ctype',d.datctype,
   'connection_limit',d.datconnlimit,'allow_connections',d.datallowconn,
   'acl',(SELECT json_agg(json_build_object('grantor',pg_get_userbyid(a.grantor),
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable))
      FROM aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a))
   FROM pg_database d WHERE d.datname=current_database()),
 'migrations',(SELECT json_agg(m ORDER BY migration_name) FROM
   (SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations) m))::text;
'@
  $check=Invoke-Phase135cNative 'psql.exe' @('-X','-w','-h','127.0.0.1','-p','5432','-U','postgres','-d','smart_agriculture','-t','-A','-v','ON_ERROR_STOP=1','-c',$identitySql)
  if ($check.ExitCode -ne 0) { throw 'READ_ONLY_IDENTITY_QUERY_FAILED_NO_DETAILS_PRINTED' }
  $identity=$check.Stdout.Trim() | ConvertFrom-Json
  if ($identity.database -ne 'smart_agriculture' -or $identity.schema -ne 'public' -or $identity.role -ne 'postgres' -or $identity.port -ne 5432 -or $identity.host -ne '127.0.0.1/32' -or $identity.system_id -ne '7472695863566132416' -or $identity.pgdata -ine 'C:/Program Files/PostgreSQL/17/data' -or [int]$identity.version -lt 170000 -or [int]$identity.version -ge 180000 -or $identity.pending -ne 0 -or $identity.ledger_count -ne 0 -or @($identity.migrations).Count -ne 11) { throw 'PRODUCTION_BACKUP_IDENTITY_OR_SAFETY_MISMATCH' }
  foreach ($m in $identity.migrations) {
    if (-not $m.finished_at -or $m.rolled_back_at -or $m.migration_name -notmatch '^[A-Za-z0-9_]+$') { throw 'PRISMA_HISTORY_INVALID' }
    $migration=Join-Path $repo ('backend\prisma\migrations\'+$m.migration_name+'\migration.sql')
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $migration).Hash.ToLowerInvariant() -cne $m.checksum) { throw 'PRISMA_CHECKSUM_MISMATCH' }
  }
  $disk=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  if ($disk.FileSystem -ne 'NTFS' -or $disk.FreeSpace -lt [Math]::Max(1GB,5*[double]$identity.bytes)) { throw 'BACKUP_SPACE_OR_FILESYSTEM_GATE_FAILED' }
  foreach ($exe in @('pg_dump.exe','pg_dumpall.exe','pg_restore.exe','psql.exe')) {
    $v=Invoke-Phase135cNative $exe @('--version'); if ($v.ExitCode -ne 0 -or $v.Stdout -notmatch 'PostgreSQL\) 17\.') { throw 'POSTGRESQL17_BINARY_REQUIRED' }
  }
  $runtimeAtDump=Get-Phase135c4Runtime $repo
  if($runtimeAtDump.ListenerBefore -ne $runtimeBefore.ListenerBefore -or $runtimeAtDump.ProcessStartBefore -cne $runtimeBefore.ProcessStartBefore){throw 'BACKEND_CHANGED_BEFORE_DUMP'}
  $runPath=Join-Path $backupRoot ((Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N'))
  New-Phase135cPrivateDirectory $runPath
  $attemptStream=[IO.File]::Open($attemptFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try{$attemptBytes=[Text.Encoding]::UTF8.GetBytes((@{BackupApprovalId=$BackupApprovalId;RunPath=$runPath;AttemptedAt=[DateTimeOffset]::UtcNow.ToString('o');MaxDumpAttempts=1}|ConvertTo-Json));$attemptStream.Write($attemptBytes,0,$attemptBytes.Length);$attemptStream.Flush($true)}finally{$attemptStream.Dispose()}
  $dumpPath=Join-Path $runPath 'smart_agriculture.dump'; $globalsPath=Join-Path $runPath 'roles-no-passwords.sql'
  $started=[DateTimeOffset]::UtcNow.ToString('o')
  $dump=Invoke-Phase135cNative 'pg_dump.exe' @('-h','127.0.0.1','-p','5432','-U','postgres','-w','-d','smart_agriculture','-Fc','--lock-wait-timeout=3s','-f',$dumpPath)
  $dump.Stderr | Set-Content -LiteralPath (Join-Path $runPath 'pg_dump.stderr.private.log') -Encoding UTF8
  if ($dump.ExitCode -ne 0) { throw ('PG_DUMP_EXIT_'+$dump.ExitCode+'_NO_RETRY') }
  if ((Get-Item -LiteralPath $dumpPath).Length -le 5) { throw 'DUMP_EMPTY_OR_TRUNCATED' }
  $dumpEnded=[DateTimeOffset]::UtcNow.ToString('o')
  $globals=Invoke-Phase135cNative 'pg_dumpall.exe' @('-h','127.0.0.1','-p','5432','-U','postgres','-w','-l','smart_agriculture','--roles-only','--no-role-passwords','-f',$globalsPath)
  if ($globals.ExitCode -ne 0) { throw ('PG_DUMPALL_EXIT_'+$globals.ExitCode+'_NO_RETRY') }
  if ((Get-Content -LiteralPath $globalsPath -Raw) -match '\bPASSWORD\s+''') { throw 'ROLE_PASSWORD_PRESENT_STOP_PRIVATE_ARTIFACTS_RETAINED' }
  $list=Invoke-Phase135cNative 'pg_restore.exe' @('--list',$dumpPath)
  if ($list.ExitCode -ne 0) { throw ('ARCHIVE_LIST_EXIT_'+$list.ExitCode) }
  $list.Stdout | Set-Content -LiteralPath (Join-Path $runPath 'archive-list.private.txt') -Encoding UTF8
  $post=Invoke-Phase135cNative 'psql.exe' @('-X','-w','-h','127.0.0.1','-p','5432','-U','postgres','-d','smart_agriculture','-t','-A','-v','ON_ERROR_STOP=1','-c',$identitySql)
  if($post.ExitCode -ne 0){throw 'POST_BACKUP_IDENTITY_QUERY_FAILED'}
  $identityAfter=$post.Stdout.Trim()|ConvertFrom-Json
  if($identityAfter.database -cne $identity.database -or $identityAfter.system_id -cne $identity.system_id -or $identityAfter.port -ne 5432 -or $identityAfter.pending -ne 0 -or $identityAfter.command_count -ne $identity.command_count){throw 'POST_BACKUP_IDENTITY_OR_COMMAND_COUNT_CHANGED'}
  $runtimeAfter=Get-Phase135c4Runtime $repo
  if($runtimeAfter.ListenerBefore -ne $runtimeBefore.ListenerBefore -or $runtimeAfter.ProcessStartBefore -cne $runtimeBefore.ProcessStartBefore){throw 'BACKEND_CHANGED_AFTER_BACKUP'}
  foreach($f in @(Get-ChildItem -LiteralPath $runPath -File -Force)){
    Assert-Phase135cNoReparse $f.FullName
    $acl=Get-Acl -LiteralPath $f.FullName;$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $script:Phase135cOperatorSid -or $rules.Count -ne 2){throw 'BACKUP_FILE_OWNER_OR_ACL_FAILED'}
    foreach($rule in $rules){if($rule.IdentityReference.Value -notin @($script:Phase135cOperatorSid,'S-1-5-18') -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'BACKUP_FILE_ACL_FAILED'}}
  }
  Assert-Phase135cPrivateDirectory $runPath
  $record=[pscustomobject]@{BackupApprovalId=$BackupApprovalId;StorageApprovalId=$StorageApprovalId;Identity=$identity;IdentityAfter=$identityAfter;RuntimeBefore=$runtimeBefore;RuntimeAfter=$runtimeAfter;StartedAt=$started;DumpEndedAt=$dumpEnded;DumpExitCode=$dump.ExitCode;GlobalsExitCode=$globals.ExitCode;ListExitCode=$list.ExitCode;DumpBytes=(Get-Item -LiteralPath $dumpPath).Length;GlobalsBytes=(Get-Item -LiteralPath $globalsPath).Length;DumpSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath).Hash;GlobalsSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $globalsPath).Hash;RestoreVerified=$false;MigrationPerformed=$false;SnapshotExactTime='UNKNOWN_WITHIN_DUMP_WINDOW';TelemetryContinues=$true;FileAclVerified=$true}
  $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $runPath 'backup-manifest.private.json') -Encoding UTF8
  Write-Output 'BACKUP_CAPTURED_HASHED_LISTED_RESTORE_NOT_VERIFIED_NO_MIGRATION'
} catch {
  if ($runPath) { [pscustomobject]@{Status='FAILED_NO_RETRY_KEEP_PARTIAL_ARTIFACTS';At=[DateTimeOffset]::UtcNow.ToString('o');RestoreVerified=$false;MigrationPerformed=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'failure.private.json') -Encoding UTF8 }
  throw 'BACKUP_STOPPED_NO_SECRET_DETAILS_NO_RETRY'
} finally { $plain=$null; if ($password) { $password.Dispose() } }
