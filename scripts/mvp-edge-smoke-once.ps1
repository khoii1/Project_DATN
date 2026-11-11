# Prepared only. A NEW reviewed approval/private run is required before execution.
param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($RunDirectory)
$base='C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke'
if([IO.Path]::GetDirectoryName($run) -cne $base -or [IO.Path]::GetFileName($run) -notmatch '^edge-smoke-\d+-[a-f0-9]+$'){throw 'SMOKE_PATH_REFUSED'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
if($sid -cne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'SMOKE_OPERATOR_REFUSED'}
$targets=@($base,$run,(Join-Path $run 'approval.json'),(Join-Path $run 'tmp'),(Join-Path $run 'profile'),(Join-Path $run 'profile\roaming'),(Join-Path $run 'profile\local'))
foreach($target in $targets){
 for($cur=$target;$cur;$cur=[IO.Path]::GetDirectoryName($cur)){if((Get-Item -LiteralPath $cur -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'SMOKE_REPARSE_REFUSED'}}
 $a=Get-Acl -LiteralPath $target
 if(-not $a.AreAccessRulesProtected -or $a.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid){throw 'SMOKE_ACL_REFUSED'}
 if($a.Access.Count -ne 1){throw 'SMOKE_ACE_COUNT_REFUSED'}
 foreach($ace in $a.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $sid -or $ace.AccessControlType -ne 'Allow' -or $ace.FileSystemRights -ne 'FullControl'){throw 'SMOKE_ACE_REFUSED'}}
}
foreach($name in @('attempt.json','outcome.json','launcher-receipt.json','launcher-exit.json')){if(Test-Path -LiteralPath (Join-Path $run $name)){throw 'SMOKE_NO_RETRY'}}
foreach($folder in @('tmp','profile\roaming','profile\local')){if(@(Get-ChildItem -LiteralPath (Join-Path $run $folder) -Force).Count){throw 'SMOKE_PROFILE_NOT_EMPTY'}}
function Write-New($name,$value){
 $s=[IO.File]::Open((Join-Path $run $name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 $bytes=[Text.Encoding]::UTF8.GetBytes(($value|ConvertTo-Json -Compress -Depth 5))
 try{$s.Write($bytes,0,$bytes.Length)}finally{$s.Dispose()}
}
Write-New 'launcher-receipt.json' @{pid=$PID;at=[DateTime]::UtcNow.ToString('o');operatorSid=$sid;privateAclVerified=$true}
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mvp-edge-smoke-observer.cjs" --execute "'+$run+'"'
$info.WorkingDirectory=$run;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32';TEMP=(Join-Path $run 'tmp');TMP=(Join-Path $run 'tmp')}.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
function Invoke-SmokeNativeObserver($Process,[int]$DeadlineMs=30000){
$p=$Process;$resultCode=3
try{
 if(-not $p.Start()){throw 'SMOKE_NODE_START_FAILED'}
 $out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync()
 if(-not $p.WaitForExit($DeadlineMs)){
  Write-New 'launcher-exit.json' @{nodePid=$p.Id;nativeExit=$null;timeout=$true;at=[DateTime]::UtcNow.ToString('o');noKill=$true}
  Write-Host 'OUTCOME UNKNOWN. No retry or force kill.'
  $resultCode=4
 }else{
  Write-New 'launcher-exit.json' @{nodePid=$p.Id;nativeExit=$p.ExitCode;timeout=$false;stdoutEmpty=($out.GetAwaiter().GetResult().Length -eq 0);stderrEmpty=($err.GetAwaiter().GetResult().Length -eq 0);at=[DateTime]::UtcNow.ToString('o')}
  Write-Host ('Observer native exit: '+$p.ExitCode+'. STOP; inspect private metadata, do not retry.')
  $resultCode=$p.ExitCode
 }
}catch{
 if(-not (Test-Path -LiteralPath (Join-Path $run 'launcher-exit.json'))){Write-New 'launcher-exit.json' @{nativeExit=$null;startupOrOrchestrationFailed=$true;at=[DateTime]::UtcNow.ToString('o');noKill=$true}}
 Write-Host 'Observer startup/orchestration failed. STOP; no retry.'
}finally{$p.Dispose()}
return $resultCode
}
$p=New-Object Diagnostics.Process;$p.StartInfo=$info
$resultCode=Invoke-SmokeNativeObserver -Process $p
exit $resultCode
