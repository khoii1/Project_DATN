param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference='Stop'
$root='C:\DATN\Project_datn';$base='C:\DATN\test-instances\phase13-3b';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
if($sid.Value -cne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'OPERATOR_REFUSED'}
function Check-Private($path){
 for($p=[IO.Path]::GetFullPath($path);$p;$p=[IO.Path]::GetDirectoryName($p)){if((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'}}
 $a=Get-Acl -LiteralPath $path
 if(-not $a.AreAccessRulesProtected -or $a.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid.Value -or $a.Access.Count -ne 1){throw 'PRIVATE_ACL_REFUSED'}
 foreach($ace in $a.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $sid.Value -or $ace.AccessControlType -ne 'Allow' -or $ace.FileSystemRights -ne 'FullControl'){throw 'PRIVATE_ACE_REFUSED'}}
}
Check-Private $PlanFile;Check-Private ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($PlanFile)));Check-Private $base
$json=[IO.File]::ReadAllText([IO.Path]::GetFullPath($PlanFile));$plan=$json|ConvertFrom-Json
if(@(Compare-Object @($plan.PSObject.Properties.Name|Sort-Object) @('version','scope','approved','maxAttempts','noRetry','operatorSid','expiresAt','manifestSha256','sourcePinSetFile','sourcePinSetSha256','userApprovalFile','userApprovalSha256'|Sort-Object)).Count){throw 'APPROVAL_FIELDS_REFUSED'}
$expectedPins=Join-Path $root 'docs\PHASE_AJ_NATIVE_DIAGNOSTIC_SOURCE_PINS.json'
if($plan.approved -isnot [bool] -or $plan.noRetry -isnot [bool] -or $plan.version -ne 1 -or $plan.scope -cne 'ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC' -or $plan.approved -ne $true -or $plan.maxAttempts -ne 1 -or $plan.noRetry -ne $true -or $plan.operatorSid -cne $sid.Value -or $plan.manifestSha256 -cne 'b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56' -or $plan.sourcePinSetFile -cne $expectedPins){throw 'APPROVAL_SCHEMA_REFUSED'}
$expiry=[DateTimeOffset]::Parse($plan.expiresAt);if($expiry -le [DateTimeOffset]::UtcNow -or $expiry -gt [DateTimeOffset]::UtcNow.AddHours(24)){throw 'APPROVAL_EXPIRY_REFUSED'}
if($plan.userApprovalFile -match 'd7beea37-4806-492f-9250-659741611ee7|861dfdf1-fc4c-4f92-9801-65ae856061c5|4e2baaa3-45e2-43c5-bec4-6e4a90b80059|1b0509d8-0f42-444e-9b47-ffd602a187bd'){throw 'FRESH_APPROVAL_REQUIRED'}
foreach($entry in @(@{file=$plan.userApprovalFile;hash=$plan.userApprovalSha256},@{file=$expectedPins;hash=$plan.sourcePinSetSha256},@{file=(Join-Path $root 'docs\PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json');hash=$plan.manifestSha256})){
 if($entry.hash -cnotmatch '^[a-f0-9]{64}$'){throw 'INVALID_PIN'}
 for($p=[IO.Path]::GetFullPath($entry.file);$p;$p=[IO.Path]::GetDirectoryName($p)){if((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'}}
 if((Get-FileHash -LiteralPath $entry.file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $entry.hash){throw 'APPROVAL_SOURCE_DRIFT'}
}
$pins=[IO.File]::ReadAllText($expectedPins)|ConvertFrom-Json
if($pins.purpose -cne 'AJ_SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL' -or $pins.manifestSha256 -cne $plan.manifestSha256){throw 'PIN_SET_REFUSED'}
$members=@('mvp-hash-diagnostic-policy.cjs','mvp-hash-only-target.cjs','mvp-hash-diagnostic-observer.cjs','mvp-hash-diagnostic-outer.ps1','mvp-hash-diagnostic-once.ps1','mvp-ui-native-boundary.cjs')|ForEach-Object{'scripts/'+$_}
if(@(Compare-Object @($pins.sources.PSObject.Properties.Name|Sort-Object) @($members|Sort-Object)).Count){throw 'SOURCE_SET_REFUSED'}
function Check-Canonical($file){for($part=[IO.Path]::GetFullPath($file);$part;$part=[IO.Path]::GetDirectoryName($part)){if((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'SOURCE_OR_EXECUTABLE_REPARSE_REFUSED'}}}
foreach($property in $pins.sources.PSObject.Properties){$file=Join-Path $root $property.Name;Check-Canonical $file;if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $property.Value){throw 'SOURCE_DRIFT'}}
$expectedBinaries=@{'C:\Program Files\nodejs\node.exe'='fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d';'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'='60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f'}
if(@($pins.executionBinaries.PSObject.Properties).Count -ne 2){throw 'BINARY_SET_REFUSED'}
foreach($file in $expectedBinaries.Keys){Check-Canonical $file;if($pins.executionBinaries.$file -cne $expectedBinaries[$file] -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedBinaries[$file]){throw 'EXECUTABLE_DRIFT'}}
$run=Join-Path $base ('hash-only-native-'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+'-'+[guid]::NewGuid().ToString('N').Substring(0,12))
function New-Json($file,$text){$s=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);$b=[Text.Encoding]::UTF8.GetBytes($text);try{$s.Write($b,0,$b.Length)}finally{$s.Dispose()}}
New-Json (Join-Path $base ('hash-only-approved-'+$plan.userApprovalSha256+'.attempt.json')) (@{run=$run;approvalSha256=$plan.userApprovalSha256;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Compress)
if(Test-Path -LiteralPath $run){throw 'CREATE_NEW_REFUSED'}
$acl=New-Object Security.AccessControl.DirectorySecurity;$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false);$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
$null=[IO.Directory]::CreateDirectory($run,$acl);Check-Private $run
New-Json (Join-Path $run 'approval.json') $json
New-Json (Join-Path $run 'launcher-receipt.json') (@{launcherPid=$PID;operatorSid=$sid.Value;privateAclVerified=$true;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Compress)
$p=New-Object Diagnostics.Process;$p.StartInfo.FileName='C:\Program Files\nodejs\node.exe';$p.StartInfo.Arguments='"'+(Join-Path $root 'scripts\mvp-hash-diagnostic-observer.cjs')+'" --approved-run "'+$run+'"';$p.StartInfo.WorkingDirectory=$run;$p.StartInfo.UseShellExecute=$false;$p.StartInfo.CreateNoWindow=$true;$p.StartInfo.RedirectStandardOutput=$true;$p.StartInfo.RedirectStandardError=$true;$p.StartInfo.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32';TEMP=$run;TMP=$run}.GetEnumerator()){$p.StartInfo.EnvironmentVariables[$kv.Key]=$kv.Value}
$code=3;$row=@{parentPid=$PID;pid=$null;code=$null;signal=$null;error=$null;timeout=$false;independentNativeExit=$false;startedAt=[DateTime]::UtcNow.ToString('o')}
try{if(-not $p.Start()){throw 'START_FAILED'};$row.pid=$p.Id;$row.processStartUTC=$p.StartTime.ToUniversalTime().ToString('o');$stdout=$p.StandardOutput.ReadToEndAsync();$stderr=$p.StandardError.ReadToEndAsync();if(-not $p.WaitForExit(45000)){$row.timeout=$true;$code=4}else{$row.code=$p.ExitCode;$row.independentNativeExit=$true;$code=$p.ExitCode}}catch{$row.error='OBSERVER_START_OR_WAIT_FAILED'}finally{$row.endedAt=[DateTime]::UtcNow.ToString('o');New-Json (Join-Path $run 'observer-native-exit.json') ($row|ConvertTo-Json -Compress);$p.Dispose()}
Write-Host ('HASH_ONLY_DIAGNOSTIC_COMPLETE '+$run+'; inspect independent exits before classification; no retry.')
exit $code
