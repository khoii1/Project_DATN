# Approved attachment 98f24106: one cluster, one restore, no reference DB.
[CmdletBinding()]
param([switch]$ExecuteApproved)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn';$bin='C:\Program Files\PostgreSQL\17\bin'
$container=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresRecovery';$root=Join-Path $container 'phase13-5c-recovery-01'
$data=Join-Path $root 'data';$logs=Join-Path $root 'logs-private';$evidence=Join-Path $root 'evidence-private'
if(-not $ExecuteApproved){[pscustomobject]@{Mode='PLAN_ONLY';Directories=@($container,$root,$data,$logs,$evidence);Port=55434;Created=$false;RestorePerformed=$false;CloudBackupScope='NOT_VERIFIED'}|ConvertTo-Json;return}
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
. (Join-Path $PSScriptRoot 'phase13-5c4-runtime-gate.ps1')
Assert-Phase135cOperator;Assert-Phase135cNoReparse $root;Assert-Phase135cOutsideKnownSync $root
if($env:LOCALAPPDATA -ine 'C:\Users\Acer Swift3\AppData\Local'){throw 'UNEXPECTED_OPERATOR_LOCALAPPDATA'}
foreach($dir in @($container,$root,$data,$logs,$evidence)){if(Test-Path -LiteralPath $dir){throw 'RECOVERY_PATH_EXISTS_STOP_NO_RETRY'}}
if(@(Get-NetTCPConnection -LocalPort 55434 -State Listen -ErrorAction SilentlyContinue).Count){throw 'RECOVERY_PORT_OCCUPIED'}
$disk=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'";if($disk.FileSystem -ne 'NTFS' -or $disk.FreeSpace -lt 2GB){throw 'RECOVERY_NTFS_OR_SPACE_GATE_FAILED'}
$backup=Join-Path $env:LOCALAPPDATA 'SmartAgriculturePostgresBackups\production\20261022-220757-53a520a7936841a38d76b3af68c700f0\smart_agriculture.dump'
if((Get-FileHash -LiteralPath $backup).Hash -cne '04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640'){throw 'BACKUP_HASH_MISMATCH'}
foreach($exe in @('initdb.exe','pg_ctl.exe','pg_controldata.exe','pg_restore.exe','psql.exe')){$v=& (Join-Path $bin $exe) --version;if($LASTEXITCODE -ne 0 -or $v -notmatch 'PostgreSQL\) 17\.'){throw 'PG17_BINARIES_REQUIRED'}}
$productionBefore=Get-Phase135c4Runtime $repo
# Create only five explicit private directories; PG internal dirs are created by initdb.
foreach($dir in @($container,$root,$data,$logs,$evidence)){New-Phase135cPrivateDirectory $dir}
foreach($dir in @($container,$root,$data,$logs,$evidence)){Assert-Phase135cPrivateDirectory $dir}
if(@(Get-ChildItem -LiteralPath $data -Force).Count){throw 'PGDATA_NOT_EMPTY'}
$productionBefore|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $evidence 'production-before.private.json') -Encoding UTF8
$initMarker=Join-Path $evidence 'initdb.attempt.private.json';$marker=[IO.File]::Open($initMarker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$b=[Text.Encoding]::UTF8.GetBytes((@{Approval='PHASE13.5C.6_USER_ATTACHMENT_98f24106';At=[DateTimeOffset]::UtcNow.ToString('o');Attempts=1}|ConvertTo-Json));$marker.Write($b,0,$b.Length)}finally{$marker.Dispose()}
# Native initdb -W reads directly from this local console with echo disabled.
# Pump only stdout/stderr to private files and console; never capture keyboard input.
Add-Type -TypeDefinition @'
using System; using System.IO; using System.Diagnostics; using System.Threading.Tasks;
public static class Phase135c6Interactive {
 static async Task Pump(StreamReader input,StreamWriter log,TextWriter console){char[] b=new char[512];int n;while((n=await input.ReadAsync(b,0,b.Length))>0){await log.WriteAsync(b,0,n);await log.FlushAsync();console.Write(b,0,n);console.Flush();}}
 public static int Run(string exe,string args,string stdout,string stderr){
  var info=new ProcessStartInfo(exe,args){UseShellExecute=false,CreateNoWindow=false,RedirectStandardOutput=true,RedirectStandardError=true};
  foreach(string key in new System.Collections.Generic.List<string>(info.EnvironmentVariables.Keys.CastStrings())){if(key.StartsWith("PG",StringComparison.OrdinalIgnoreCase)||key.Equals("DATABASE_URL",StringComparison.OrdinalIgnoreCase))info.EnvironmentVariables.Remove(key);}
  using(var p=new Process{StartInfo=info})using(var o=new StreamWriter(new FileStream(stdout,FileMode.CreateNew)))using(var e=new StreamWriter(new FileStream(stderr,FileMode.CreateNew))){if(!p.Start())throw new Exception("INITDB_NOT_STARTED");var a=Pump(p.StandardOutput,o,Console.Out);var b=Pump(p.StandardError,e,Console.Error);p.WaitForExit();Task.WaitAll(a,b);return p.ExitCode;}
 }
 static System.Collections.Generic.IEnumerable<string> CastStrings(this System.Collections.ICollection keys){foreach(object key in keys)yield return (string)key;}
}
'@
Write-Host 'RECOVERY ONLY: choose a NEW password, at least 12 characters, not production. Keep it in your password manager; never send it in chat.'
Write-Host 'initdb asks twice. After initdb, the secure prompt asks for the SAME recovery password once to complete restore.'
$initArguments='-D "'+$data+'" -U sa_recovery_dba -A scram-sha-256 -W --no-clean --encoding=UTF8 --locale-provider=libc --locale="English_United States.1252"'
# Quote both path and Windows locale; never put a password in args.
$initExit=[Phase135c6Interactive]::Run((Join-Path $bin 'initdb.exe'),$initArguments,(Join-Path $logs 'initdb.stdout.private.log'),(Join-Path $logs 'initdb.stderr.private.log'))
if($initExit -ne 0){throw 'INITDB_FAILED_NO_RETRY_KEEP_PGDATA'}
foreach($dir in @($container,$root,$data,$logs,$evidence)){Assert-Phase135cPrivateDirectory $dir}
# Dedicated recovery-only config written after initdb, before any server start.
[IO.File]::AppendAllText((Join-Path $data 'postgresql.conf'),"`r`nlisten_addresses = '127.0.0.1'`r`nport = 55434`r`npassword_encryption = 'scram-sha-256'`r`nlog_statement = 'none'`r`n",[Text.Encoding]::ASCII)
[IO.File]::WriteAllText((Join-Path $data 'pg_hba.conf'),"host all sa_recovery_dba 127.0.0.1/32 scram-sha-256`r`n",[Text.Encoding]::ASCII)
@{approval='PHASE13.5C.6_USER_ATTACHMENT_98f24106';initdbExitCode=$initExit;ntfsVerified=$true;pgdata=$data;port=55434;cloudBackupScope='NOT_VERIFIED';at=[DateTimeOffset]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $evidence 'provision.private.json') -Encoding UTF8
$secret=Read-Host 'Enter the SAME NEW recovery password to perform the one restore (NOT production password)' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try{$plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)}
try{
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=(Get-Command node.exe).Source;$info.Arguments='"'+(Join-Path $repo 'backend\scripts\phase13-5c6-restore.cjs')+'" --approved-phase13-5c6'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info
 if(-not $child.Start()){throw 'RESTORE_EXECUTOR_NOT_STARTED'}
 $out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync()
 $child.StandardInput.Write((@{password=$plain}|ConvertTo-Json -Compress));$child.StandardInput.Close();$plain=$null
 $child.WaitForExit();$out.GetAwaiter().GetResult();$null=$err.GetAwaiter().GetResult();$exit=$child.ExitCode;$child.Dispose()
 if($exit -ne 0){throw 'RESTORE_SESSION_STOPPED_NO_RETRY_CHECK_PRIVATE_EVIDENCE'}
}finally{$plain=$null;$secret.Dispose()}
$productionAfter=Get-Phase135c4Runtime $repo
if($productionAfter.ListenerBefore -ne $productionBefore.ListenerBefore -or $productionAfter.ProcessStartBefore -cne $productionBefore.ProcessStartBefore){throw 'PRODUCTION_PROCESS_CHANGED'}
$productionAfter|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $evidence 'production-after.private.json') -Encoding UTF8
Write-Host 'Recovery rehearsal ended. No migration, no pump command, no second restore. Agent will verify evidence.'
