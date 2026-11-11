param([string]$RunDirectory)
$ErrorActionPreference='Stop'
# Process is injected in synthetic tests; this function never constructs one.
function Invoke-HashTargetHandle($Process,[scriptblock]$Write,[int]$DeadlineMs=25000){
 $row=@{pid=$null;parentPid=$PID;startedAt=[DateTime]::UtcNow.ToString('o');code=$null;signal=$null;error=$null;timeout=$false;independentNativeExit=$false;spawnObserved=$false}
 try{
  if(-not $Process.Start()){throw 'START_REFUSED'}
  $row.pid=$Process.Id;$row.spawnObserved=$true;$row.processStartUTC=$Process.StartTime.ToUniversalTime().ToString('o')
  $out=$Process.StandardOutput.ReadToEndAsync();$err=$Process.StandardError.ReadToEndAsync()
  if(-not $Process.WaitForExit($DeadlineMs)){$row.timeout=$true;$row.error='NATIVE_OUTCOME_UNKNOWN'}else{
   $row.code=$Process.ExitCode;$row.independentNativeExit=$true
   # Bounded native exit is independent of stdout JSON. Target has no children.
   if(-not $out.Wait(1000) -or -not $err.Wait(1000)){$row.error='OUTPUT_DRAIN_UNKNOWN'}else{
    $text=$out.GetAwaiter().GetResult();$errorText=$err.GetAwaiter().GetResult()
    $row.stdoutBytes=[Text.Encoding]::UTF8.GetByteCount($text);$row.stderrBytes=[Text.Encoding]::UTF8.GetByteCount($errorText)
    if($row.code -eq 0){try{$result=$text|ConvertFrom-Json;if($result.pid -ne $row.pid -or $result.parentPid -ne $PID -or $result.status -cne 'HASH_CHECKS_PASS' -or $result.sourceCount -ne 250 -or $result.runtimeCount -ne 4 -or $result.revision -ne 4){throw 'BAD_RESULT'};$row.hashChecks=@{status='HASH_CHECKS_PASS';sourceCount=250;runtimeCount=4;revision=4}}catch{$row.error='TARGET_RESULT_INVALID'}}
    if($errorText.Length){$row.error='TARGET_STDERR_PRESENT'}
   }
  }
 }catch{$row.error='NATIVE_LAUNCH_OR_CAPTURE_FAILURE'}finally{$row.endedAt=[DateTime]::UtcNow.ToString('o');& $Write $row;$Process.Dispose()}
 return $row
}
if(-not $RunDirectory){throw 'APPROVED_RUN_REQUIRED'}
$base='C:\DATN\test-instances\phase13-3b';$run=[IO.Path]::GetFullPath($RunDirectory)
if([IO.Path]::GetDirectoryName($run) -cne $base -or [IO.Path]::GetFileName($run) -notmatch '^hash-only-native-\d+-[a-f0-9]+$'){throw 'RUN_PATH_REFUSED'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
if($sid -cne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'OPERATOR_REFUSED'}
for($p=$run;$p;$p=[IO.Path]::GetDirectoryName($p)){if((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'}}
$acl=Get-Acl -LiteralPath $run
if(-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid -or $acl.Access.Count -ne 1){throw 'PRIVATE_ACL_REFUSED'}
foreach($ace in $acl.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $sid -or $ace.AccessControlType -ne 'Allow' -or $ace.FileSystemRights -ne 'FullControl'){throw 'PRIVATE_ACE_REFUSED'}}
$receipt=[IO.File]::ReadAllText((Join-Path $run 'launcher-receipt.json'))|ConvertFrom-Json
$outer=[IO.File]::ReadAllText((Join-Path $run 'outer-start.json'))|ConvertFrom-Json
if(-not $receipt.privateAclVerified -or $receipt.operatorSid -cne $sid -or $outer.pid -ne $PID -or -not $outer.spawnObserved){throw 'OUTER_IDENTITY_REFUSED'}
$plan=[IO.File]::ReadAllText((Join-Path $run 'approval.json'))|ConvertFrom-Json
if($plan.scope -cne 'ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC' -or -not $plan.approved -or $plan.maxAttempts -ne 1 -or -not $plan.noRetry -or [DateTimeOffset]::Parse($plan.expiresAt) -le [DateTimeOffset]::UtcNow){throw 'APPROVAL_REFUSED'}
$marker=[IO.File]::ReadAllText((Join-Path $base ('hash-only-approved-'+$plan.userApprovalSha256+'.attempt.json')))|ConvertFrom-Json
if($marker.run -cne $run -or $marker.approvalSha256 -cne $plan.userApprovalSha256){throw 'APPROVAL_MARKER_REFUSED'}
$target='C:\DATN\Project_datn\scripts\mvp-hash-only-target.cjs';$pins=[IO.File]::ReadAllText($plan.sourcePinSetFile)|ConvertFrom-Json
if((Get-FileHash -LiteralPath $plan.sourcePinSetFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $plan.sourcePinSetSha256 -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -cne $pins.sources.'scripts/mvp-hash-only-target.cjs'){throw 'TARGET_PIN_REFUSED'}
if((Get-FileHash -LiteralPath 'C:\Program Files\nodejs\node.exe' -Algorithm SHA256).Hash.ToLowerInvariant() -cne 'fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d'){throw 'NODE_EXECUTABLE_DRIFT'}
$process=New-Object Diagnostics.Process
$process.StartInfo.FileName='C:\Program Files\nodejs\node.exe';$process.StartInfo.Arguments='"'+$target+'" --approved-run "'+$run+'"'
$process.StartInfo.WorkingDirectory=$run;$process.StartInfo.UseShellExecute=$false;$process.StartInfo.CreateNoWindow=$true
$process.StartInfo.RedirectStandardOutput=$true;$process.StartInfo.RedirectStandardError=$true;$process.StartInfo.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32';TEMP=$run;TMP=$run}.GetEnumerator()){$process.StartInfo.EnvironmentVariables[$kv.Key]=$kv.Value}
$result=Invoke-HashTargetHandle $process -Write {param($value)$file=Join-Path $run 'target-native-exit.json';$s=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);$b=[Text.Encoding]::UTF8.GetBytes(($value|ConvertTo-Json -Depth 8));try{$s.Write($b,0,$b.Length)}finally{$s.Dispose()}}
if(-not $result.spawnObserved -and $result.error){exit 3}
if($result.timeout -or -not $result.independentNativeExit){exit 4}
if($result.code -ne 0){exit $result.code}
if($result.error){exit 3}
exit 0
