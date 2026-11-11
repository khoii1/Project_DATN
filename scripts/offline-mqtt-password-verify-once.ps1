# PREPARED ONLY. Requires a separately approved private one-shot directory; do not run now.
param([Parameter(Mandatory=$true)][string]$ApprovalDirectory)
$ErrorActionPreference='Stop'
$credential=$null;$plain=$null;$bytes=$null;$p=$null
$resultCode=3
function Assert-OfflineVerifierSources($Plan){
 $expected=@('offline-mqtt-password-verifier.cjs','offline-mqtt-password-file.cjs','offline-mqtt-password-verify-cli.cjs','offline-mqtt-password-verify-once.ps1','offline-mqtt-password-network-guard.cjs')
 $names=@($Plan.sourceHashes.PSObject.Properties.Name)
 if($names.Count -ne $expected.Count){throw 'SOURCE_MANIFEST_REQUIRED'}
 foreach($name in $expected){if($name -cnotin $names -or (Get-FileHash -LiteralPath (Join-Path 'C:\DATN\Project_datn\scripts' $name) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Plan.sourceHashes.$name){throw 'SOURCE_DRIFT'}}
}
function New-OfflineVerifierStartInfo([string]$Arguments){
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName='C:\Program Files\nodejs\node.exe'
 $info.Arguments=$Arguments
 $info.WorkingDirectory='C:\DATN\Project_datn';$info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear()
 foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32';TEMP='C:\Windows\Temp';TMP='C:\Windows\Temp'}.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
 return $info
}
function Test-OfflineVerifierGuard([string]$GuardPath,[string]$CliPath){
 # No credential or auth-store access: probe validates preload and exits with empty stdout.
 $probe=New-Object Diagnostics.Process
 $probe.StartInfo=New-OfflineVerifierStartInfo -Arguments ('--require "'+$GuardPath+'" "'+$CliPath+'" --guard-check')
 try{
  if(-not $probe.Start()){throw 'GUARD_PROBE_START_FAILED'}
  $out=$probe.StandardOutput.ReadToEndAsync();$err=$probe.StandardError.ReadToEndAsync();$probe.StandardInput.Close()
  if(-not $probe.WaitForExit(5000)){throw 'GUARD_PROBE_TIMEOUT_NO_RETRY_NO_KILL'}
  if($probe.ExitCode -ne 0 -or $out.GetAwaiter().GetResult().Length -ne 0 -or $err.GetAwaiter().GetResult().Length -ne 0){throw 'GUARD_PROBE_FAILED'}
  return $true
 }finally{$probe.Dispose()}
}
try{
 $dir=[IO.Path]::GetFullPath($ApprovalDirectory)
 if([IO.Path]::GetDirectoryName($dir) -cne 'C:\DATN\test-instances\phase13-3b' -or [IO.Path]::GetFileName($dir) -notmatch '^mqtt-password-verification-\d+-[a-f0-9]+$'){throw 'APPROVAL_REQUIRED'}
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 if($sid -cne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'OPERATOR_REFUSED'}
 for($current=$dir;$current;$current=[IO.Path]::GetDirectoryName($current)){if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'}}
 foreach($file in @($dir,(Join-Path $dir 'approval.json'))){
  if((Get-Item -LiteralPath $file -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'}
  $acl=Get-Acl -LiteralPath $file
  if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid){throw 'OWNER_REFUSED'}
  foreach($ace in $acl.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $sid){throw 'ACL_REFUSED'}}
 }
 $plan=Get-Content -LiteralPath (Join-Path $dir 'approval.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if($plan.scope -cne 'ONE_OFFLINE_BACKEND_PASSWORD_VERIFICATION' -or $plan.username -cne 'smartagri_backend' -or $plan.passwordFile -cne 'C:\mosquitto\config\passwords' -or $plan.realVerificationApproved -ne $true -or $plan.maxAttempts -ne 1){throw 'APPROVAL_REQUIRED'}
 if((Get-FileHash -LiteralPath $plan.userApprovalFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $plan.userApprovalSha256){throw 'APPROVAL_DRIFT'}
 Assert-OfflineVerifierSources -Plan $plan
 if(Test-Path -LiteralPath (Join-Path $dir 'attempt.json')){throw 'NO_RETRY'}
 $guardPath=Join-Path $PSScriptRoot 'offline-mqtt-password-network-guard.cjs'
 $cliPath=Join-Path $PSScriptRoot 'offline-mqtt-password-verify-cli.cjs'
 $null=Test-OfflineVerifierGuard -GuardPath $guardPath -CliPath $cliPath
 $credential=Get-Credential -UserName 'smartagri_backend' -Message 'OFFLINE verification only. Existing MQTT backend password; not PostgreSQL.'
 if($null -eq $credential -or $credential.UserName -cne 'smartagri_backend'){throw 'CANCELLED'}
 $info=New-OfflineVerifierStartInfo -Arguments ('--require "'+$guardPath+'" "'+$cliPath+'" --approved-real-once "'+$dir+'"')
 $p=New-Object Diagnostics.Process;$p.StartInfo=$info
 if(-not $p.Start()){throw 'NATIVE_START_FAILED'}
 $out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync()
 $plain=$credential.GetNetworkCredential().Password;$bytes=[Text.Encoding]::UTF8.GetBytes($plain)
 $p.StandardInput.BaseStream.Write($bytes,0,$bytes.Length);$p.StandardInput.BaseStream.Flush();$p.StandardInput.Close()
 [Array]::Clear($bytes,0,$bytes.Length);$bytes=$null;$plain=$null;$credential=$null
 if(-not $p.WaitForExit(15000)){throw 'OUTCOME_UNKNOWN_NO_RETRY_NO_KILL'}
 $result=$out.GetAwaiter().GetResult().TrimEnd("`r","`n");$stderr=$err.GetAwaiter().GetResult()
 $codes=@{MATCH=0;NO_MATCH=1;FORMAT_UNSUPPORTED=2;VERIFICATION_ERROR=3}
 if(-not $codes.ContainsKey($result) -or $codes[$result] -ne $p.ExitCode -or $stderr.Length){throw 'NATIVE_RESULT_REFUSED'}
 [Console]::Out.WriteLine($result)
 $resultCode=$p.ExitCode
}catch{[Console]::Out.WriteLine('VERIFICATION_ERROR')}
finally{if($null -ne $bytes){[Array]::Clear($bytes,0,$bytes.Length)};$plain=$null;$credential=$null;if($null -ne $p){$p.Dispose()}}
exit $resultCode
