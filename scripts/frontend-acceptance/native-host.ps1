param([Parameter(Mandatory=$true)][string]$Run,[Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($Run)
$operatorSid='S-1-5-21-1432835263-483988321-3159128977-1001'
$nodePath='C:\Program Files\nodejs\node.exe'
$edgePath='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$privateProfile=Join-Path $run 'tmp\user-data'
function Require([bool]$ok,[string]$why){if(-not $ok){throw $why}}
function Hash($file){(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()}
function Write-New($name,$value){$b=[Text.Encoding]::UTF8.GetBytes(($value|ConvertTo-Json -Depth 12));$s=[IO.File]::Open((Join-Path $run $name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$s.Write($b,0,$b.Length);$s.Flush($true)}finally{$s.Dispose()}}
Require ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value -ceq $operatorSid) 'OPERATOR_MISMATCH'
Require ([IO.Path]::GetFullPath($PlanFile) -eq $PlanFile) 'PLAN_CANONICAL_PATH'
for($ancestor=$PlanFile;$ancestor;$ancestor=[IO.Path]::GetDirectoryName($ancestor)){Require (-not((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) 'PLAN_REPARSE'}
$planAcl=Get-Acl -LiteralPath $PlanFile
Require ($planAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ceq $operatorSid -and $planAcl.Access.Count -eq 1 -and $planAcl.Access[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ceq $operatorSid) 'PLAN_ACL'
$plan=Get-Content -Raw -Encoding UTF8 -LiteralPath $PlanFile|ConvertFrom-Json
Require ($plan.scope -ceq 'ONE_AUTOMATED_HISTORICAL_BROWSER' -and $plan.executionApproved -and $plan.maxLaunches -eq 1) 'NEW_BROWSER_APPROVAL_REQUIRED'
Require ($plan.nativeRun -ieq $run) 'RUN_IDENTITY'
$workerFile=$plan.workerFile
Require ($workerFile -ieq 'C:\DATN\Project_datn\scripts\frontend-acceptance\worker.cjs') 'WORKER_PATH'
$actualParent=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$PID) -OperationTimeoutSec 2
Require ($actualParent.ParentProcessId -eq $plan.supervisorPid) 'SUPERVISOR_PARENT_MISMATCH'
Require (-not(Test-Path -LiteralPath $run)) 'NEW_RUN_REQUIRED'
Require ((Hash $plan.approvalFile) -ceq $plan.approvalSha256) 'APPROVAL_DRIFT'
foreach($pin in $plan.pins.PSObject.Properties){Require ((Hash $pin.Name) -ceq $pin.Value) 'PIN_DRIFT'}
foreach($name in @('approval-attempt.json','preflight.json','attempt.json','parent-native.json')){Require (-not(Test-Path -LiteralPath (Join-Path $run $name))) 'NO_RETRY'}
function Inspect-Path([string]$dir,[bool]$private){
 Require ([IO.Path]::IsPathRooted($dir)) 'NONABSOLUTE_PATH'
 $item=Get-Item -Force -LiteralPath $dir
 Require $item.PSIsContainer 'NOT_DIRECTORY'
 Require ([IO.Path]::GetFullPath($dir) -ieq $dir) 'NONCANONICAL_PATH'
 for($ancestor=$dir;$ancestor;$ancestor=[IO.Path]::GetDirectoryName($ancestor)){
  Require (-not((Get-Item -Force -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint)) 'REPARSE_REFUSED'
 }
 $acl=Get-Acl -LiteralPath $dir;$owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
 $only=($acl.Access.Count -eq 1 -and $acl.Access[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ceq $operatorSid -and $acl.Access[0].AccessControlType -eq 'Allow' -and $acl.Access[0].FileSystemRights -eq 'FullControl')
 if($private){Require ($owner -ceq $operatorSid -and $acl.AreAccessRulesProtected -and $only) 'PRIVATE_ACL_REFUSED'}
 return [pscustomobject]@{path=$dir;canonical=$item.FullName;directory=$true;reparse=$false;ownerSid=$owner;operatorOnly=$only;protectedDacl=$acl.AreAccessRulesProtected;ancestorsChecked=$true}
}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
Require ($run -match '^C:\\Users\\Acer Swift3\\AppData\\Local\\SmartAgricultureBrowserSmoke\\edge-remediation-run-[a-f0-9]{32}$') 'RUN_LOCATION'
Inspect-Path ([IO.Path]::GetDirectoryName($run)) $true | Out-Null
foreach($dir in @($run,(Join-Path $run 'tmp'),$privateProfile)){Require (-not(Test-Path -LiteralPath $dir)) 'PRIVATE_CREATE_NEW';[IO.Directory]::CreateDirectory($dir,$acl)|Out-Null}
$folders=[ordered]@{source='CURRENT_OPERATOR_WINDOWS_KNOWN_FOLDERS';operatorSid=$operatorSid;UserProfile=[Environment]::GetFolderPath('UserProfile');ApplicationData=[Environment]::GetFolderPath('ApplicationData');LocalApplicationData=[Environment]::GetFolderPath('LocalApplicationData');Windows=[Environment]::GetFolderPath('Windows')}
$base=Join-Path $folders.LocalApplicationData 'SmartAgricultureBrowserSmoke'
Require ([IO.Path]::GetDirectoryName($run) -ieq $base) 'RUN_LOCATION'
$pathRows=@();foreach($key in @('UserProfile','ApplicationData','LocalApplicationData','Windows')){$pathRows+=Inspect-Path $folders[$key] $false}
foreach($dir in @($base,$run,(Join-Path $run 'tmp'),$privateProfile)){$pathRows+=Inspect-Path $dir $true}
Write-New 'environment-receipt.json' ([ordered]@{operatorSid=$operatorSid;parentPid=$PID;knownFolders=$folders;paths=$pathRows;atUtc=[DateTime]::UtcNow.ToString('o')})
Write-New 'preflight.json' ([ordered]@{scope=$plan.scope;session=$plan.session;parentPid=$PID;supervisorPid=$plan.supervisorPid;approvalFile=$plan.approvalFile;approvalSha256=$plan.approvalSha256;pins=$plan.pins;receiptSha256=(Hash (Join-Path $run 'environment-receipt.json'));maxLaunches=1;observationDeadlineUtc=$plan.sessionDeadlineUtc;cleanupReservedMs=35000})
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class SmokeNative {
 [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetProcessTimes(IntPtr h,out long c,out long x,out long k,out long u);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetExitCodeProcess(IntPtr h,out uint code);
 [DllImport("kernel32.dll")] public static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool TerminateProcess(IntPtr h,uint code);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
 [DllImport("shell32.dll",SetLastError=true)] static extern IntPtr CommandLineToArgvW([MarshalAs(UnmanagedType.LPWStr)]string cmd,out int argc);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);
 public static string[] Argv(string cmd){int n;IntPtr p=CommandLineToArgvW(cmd,out n);if(p==IntPtr.Zero)throw new Exception("ARGV_UNAVAILABLE");try{var a=new string[n];for(int i=0;i<n;i++)a[i]=Marshal.PtrToStringUni(Marshal.ReadIntPtr(p,i*IntPtr.Size));return a;}finally{LocalFree(p);}}
}
'@
$held=@{};$identities=@{};$events=[Collections.Generic.List[object]]::new();$unknown=[Collections.Generic.HashSet[int]]::new()
$tree=[Collections.Generic.HashSet[int]]::new();$edgePid=0;$nodePid=0;$nodeStart=0;$edgeStart=0
function Native($h){
 $c=[long]0;$x=[long]0;$k=[long]0;$u=[long]0;$code=[uint32]0
 $times=[SmokeNative]::GetProcessTimes($h,[ref]$c,[ref]$x,[ref]$k,[ref]$u)
 $signaled=([SmokeNative]::WaitForSingleObject($h,0) -eq 0)
 $got=[SmokeNative]::GetExitCodeProcess($h,[ref]$code)
 return [pscustomobject]@{creationFileTime=$c;exitFileTime=$x;signaled=$signaled;exitCode=$(if($signaled -and $got){$code}else{$null});osExitTimeStatus=$(if($times -and $signaled -and $c -gt 0 -and $x -ge $c){'VALID'}else{'INVALID_OR_INCOMPLETE'});osExitTimeUtc=$(if($times -and $signaled -and $c -gt 0 -and $x -ge $c){[DateTime]::FromFileTimeUtc($x).ToString('o')}else{$null})}
}
function Identity([int]$id){
 $c=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$id) -OperationTimeoutSec 2
 if(-not $c){return $null}
 $o=Invoke-CimMethod -InputObject $c -MethodName GetOwnerSid -OperationTimeoutSec 2
 Require ($o.ReturnValue -eq 0 -and $c.ExecutablePath -and $c.CommandLine) 'IDENTITY_UNAVAILABLE'
 $argv=@([SmokeNative]::Argv($c.CommandLine))
 $proc=Get-Process -Id $id;try{$creation=$proc.StartTime.ToUniversalTime().ToFileTimeUtc()}finally{$proc.Dispose()}
 return [pscustomobject]@{pid=$id;parentPid=[int]$c.ParentProcessId;executable=$c.ExecutablePath;ownerSid=$o.Sid;creationFileTime=$creation;profileMatched=(@($argv|Where-Object {$_ -ieq ('--user-data-dir='+$privateProfile)}).Count -eq 1);scriptMatched=($argv -icontains $workerFile);runMatched=($argv -icontains $run)}
}
function Pin([int]$id,[string]$kind){
 if($held.ContainsKey($id)){return}
 $h=[SmokeNative]::OpenProcess(0x101001,$false,[uint32]$id)
 if($h -eq [IntPtr]::Zero){[void]$unknown.Add($id);return}
 try{
  $n=Native $h;$row=Identity $id
  Require ($null -ne $row -and $row.ownerSid -ceq $operatorSid) 'OWNER_MISMATCH'
  Require ($row.creationFileTime -eq $n.creationFileTime) 'CREATION_MISMATCH'
  $row.creationFileTime=$n.creationFileTime
  if($kind -ceq 'node'){Require ($row.executable -ieq $nodePath -and $row.parentPid -eq $PID -and $row.scriptMatched -and $row.runMatched) 'NODE_IDENTITY'}
  else{Require ($row.executable -ieq $edgePath -and $row.creationFileTime -ge $nodeStart) 'EDGE_IDENTITY';if($kind -ceq 'root'){Require ($row.parentPid -eq $nodePid -and $row.profileMatched) 'ROOT_IDENTITY'}else{Require ($tree.Contains($row.parentPid) -and $row.creationFileTime -ge $edgeStart) 'CHILD_GRAPH'}}
  $held[$id]=$h;$identities[$id]=$row;[void]$tree.Add($id);$h=[IntPtr]::Zero
 }catch{[void]$unknown.Add($id);$events.Add(@{pid=$id;action='IDENTITY_REFUSED';reason=$_.Exception.Message})}
 finally{if($h -ne [IntPtr]::Zero){[void][SmokeNative]::CloseHandle($h)}}
}
function Discover {
 $graph=@(Get-CimInstance -Query 'SELECT ProcessId,ParentProcessId FROM Win32_Process' -OperationTimeoutSec 2)
 foreach($g in $graph){$id=[int]$g.ProcessId;if($id -eq $nodePid -or $id -eq $edgePid -or $held.ContainsKey($id)){continue};if($edgePid -and $tree.Contains([int]$g.ParentProcessId)){Pin $id 'child'}}
 return $graph
}
function Stop-Owned([int]$id){
 if(-not $held.ContainsKey($id)){return};$n=Native $held[$id];if($n.signaled){return}
 $fresh=Identity $id;$saved=$identities[$id]
 if(-not $fresh){return}
 $match=($fresh.executable -ieq $saved.executable -and $fresh.parentPid -eq $saved.parentPid -and $fresh.ownerSid -ceq $saved.ownerSid -and $fresh.creationFileTime -eq $saved.creationFileTime -and $n.creationFileTime -eq $saved.creationFileTime)
 if($id -eq $edgePid){$match=$match -and $fresh.profileMatched};if($id -eq $nodePid){$match=$match -and $fresh.scriptMatched -and $fresh.runMatched}
 if(-not $match){$events.Add(@{pid=$id;action='SKIP_IDENTITY_MISMATCH'});return}
 $ok=[SmokeNative]::TerminateProcess($held[$id],1);$events.Add(@{pid=$id;action='TerminateProcess';success=$ok;creationFileTime=$saved.creationFileTime;atUtc=[DateTime]::UtcNow.ToString('o')})
 if($ok){[void][SmokeNative]::WaitForSingleObject($held[$id],1000)}
}
$existing=@(Get-CimInstance -Query 'SELECT ProcessId,ParentProcessId FROM Win32_Process' -OperationTimeoutSec 2 | Select-Object ProcessId,ParentProcessId)
Write-New 'ownership-baseline.json' @{atUtc=[DateTime]::UtcNow.ToString('o');processes=$existing;rawCommandLinesStored=$false}
$env8=[ordered]@{SystemRoot=$folders.Windows;WINDIR=$folders.Windows;PATH=(Join-Path $folders.Windows 'System32');USERPROFILE=$folders.UserProfile;APPDATA=$folders.ApplicationData;LOCALAPPDATA=$folders.LocalApplicationData;TEMP=(Join-Path $run 'tmp');TMP=(Join-Path $run 'tmp')}
$info=[Diagnostics.ProcessStartInfo]::new();$info.FileName=$nodePath;$info.Arguments='"'+$workerFile+'" --execute "'+$run+'"';$info.WorkingDirectory=$run;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true;$info.RedirectStandardInput=$true;$info.EnvironmentVariables.Clear()
foreach($kv in $env8.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
Write-New 'approval-attempt.json' @{approvalFile=$plan.approvalFile;approvalSha256=$plan.approvalSha256;maximumLaunches=1;cleanupScope='VERIFIED_OWNED_ONLY';atUtc=[DateTime]::UtcNow.ToString('o')}
$packetStream=[Console]::OpenStandardInput();$packet=[Collections.Generic.List[byte]]::new();$chunk=New-Object byte[] 4096
$inputDeadline=[DateTime]::UtcNow.AddSeconds(15)
while($true){$left=[Math]::Max(0,[int]($inputDeadline-[DateTime]::UtcNow).TotalMilliseconds);Require ($left -gt 0) 'CREDENTIAL_HANDOFF_DEADLINE';$readTask=$packetStream.ReadAsync($chunk,0,$chunk.Length);Require ($readTask.Wait($left)) 'CREDENTIAL_HANDOFF_DEADLINE';$n=$readTask.GetAwaiter().GetResult();if($n -eq 0){break};Require ($packet.Count+$n -le 8192) 'HANDOFF_TOO_LARGE';$packet.AddRange([byte[]]$chunk[0..($n-1)])}
[Array]::Clear($chunk,0,$chunk.Length)
function Test-WorkerCleanupBinding($request,[int]$nodePid,$plan){
 return $null -ne $request -and $request.version -eq 1 -and $request.workerPid -eq $nodePid -and $request.supervisorPid -eq $plan.supervisorPid -and $request.runId -ceq $plan.runId -and $request.graceMs -eq 30000 -and $request.reason -cin @('POLICY_STOP','SESSION_FINISHED')
}
function Get-WorkerCleanupDue($requestedMs,[long]$nowMs){return $null -ne $requestedMs -and ($nowMs-[long]$requestedMs) -ge 30000}
$p=[Diagnostics.Process]::new();$p.StartInfo=$info;$watch=[Diagnostics.Stopwatch]::StartNew();$failure=$null;$timeout=$false;$cleanupWatch=$null;$out=$null;$err=$null;$lastDiscover=0;$workerCleanupAt=$null;$earlyCleanup=$false
try{
 Require ($p.Start()) 'NODE_START_FAILED';$nodePid=$p.Id;$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync();$handoff=$packet.ToArray();try{$p.StandardInput.BaseStream.Write($handoff,0,$handoff.Length);$p.StandardInput.Close()}finally{[Array]::Clear($handoff,0,$handoff.Length);$packet.Clear()};Pin $nodePid 'node'
 Require ($held.ContainsKey($nodePid)) 'NODE_HANDLE_REQUIRED';$nodeStart=$identities[$nodePid].creationFileTime
 # Leave headroom for finite OS metadata calls; cleanup is a separate phase.
 while($watch.ElapsedMilliseconds -lt [Math]::Min(550000,([DateTime]::Parse($plan.sessionDeadlineUtc).ToUniversalTime()-[DateTime]::UtcNow).TotalMilliseconds+$watch.ElapsedMilliseconds-35000)){
  if(-not $edgePid -and (Test-Path -LiteralPath (Join-Path $run 'edge-pid.json'))){
   $row=$null;try{$row=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $run 'edge-pid.json')|ConvertFrom-Json}catch{}
   if($row){Require ($row.parentPid -eq $nodePid -and $row.pid -gt 0) 'ROOT_PARENT';$edgePid=[int]$row.pid;Pin $edgePid 'root';Require ($held.ContainsKey($edgePid)) 'EDGE_HANDLE_REQUIRED';$edgeStart=$identities[$edgePid].creationFileTime;Write-New 'edge-owner-verified.json' @{pid=$edgePid;ownerVerified=$true;handlesVerified=$true}}
  }
  if($edgePid -and ($watch.ElapsedMilliseconds-$lastDiscover -gt 1500)){[void](Discover);$lastDiscover=$watch.ElapsedMilliseconds}
  if($edgePid -and $held.ContainsKey($edgePid) -and -not(Test-Path -LiteralPath (Join-Path $run 'edge-native-completion.json'))){
   $n=Native $held[$edgePid]
   if($n.signaled){$g=Discover;$remainingEdge=@($g|Where-Object {$_.ParentProcessId -eq $edgePid -or $_.ProcessId -eq $edgePid});if($remainingEdge.Count -eq 0){Write-New 'edge-native-completion.json' @{ownerVerified=$true;handlesVerified=$true;native=$n;remaining=0}}}
  }
  # The child may request bounded cleanup, never confer ownership or CLOSED.
  if($null -eq $workerCleanupAt -and (Test-Path -LiteralPath (Join-Path $run 'worker-shutdown-request.json'))){
   $request=$null;try{$request=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $run 'worker-shutdown-request.json')|ConvertFrom-Json}catch{}
   if($request){Require (Test-WorkerCleanupBinding $request $nodePid $plan) 'CLEANUP_REQUEST_BINDING';Require ($held.ContainsKey($nodePid)) 'CLEANUP_WORKER_HANDLE';$workerCleanupAt=$watch.ElapsedMilliseconds}
  }
  if(Get-WorkerCleanupDue $workerCleanupAt $watch.ElapsedMilliseconds){$earlyCleanup=$true;break}
  if($p.HasExited){break};Start-Sleep -Milliseconds 15
 }
 if(-not $p.HasExited){$timeout=$true}
}catch{$failure=@{type=$_.Exception.GetType().FullName;message=$_.Exception.Message;hresult=$_.Exception.HResult}}
finally{
 $observationMs=$watch.ElapsedMilliseconds;$watch.Stop();$cleanupWatch=[Diagnostics.Stopwatch]::StartNew()
 try{
  Write-New 'native-before-cleanup.json' @{nodePid=$nodePid;edgePid=$edgePid;timeout=$timeout;failure=$failure;observationMs=$observationMs;processes=@($held.Keys|ForEach-Object {@{identity=$identities[$_];native=(Native $held[$_])}})}
  [void](Discover)
  # Flow attempts graceful context.close once. On failure stop controlling root
  # first, then individually revalidated descendants; never kill by process name.
  if($edgePid){Stop-Owned $edgePid}
  Start-Sleep -Milliseconds 300
  [void](Discover)
  foreach($id in @($held.Keys | Where-Object {$_ -ne $nodePid -and $_ -ne $edgePid})){if($cleanupWatch.ElapsedMilliseconds -ge 20000){break};Stop-Owned $id}
  if($nodePid -and $held.ContainsKey($nodePid)){[void][SmokeNative]::WaitForSingleObject($held[$nodePid],1000);if($cleanupWatch.ElapsedMilliseconds -lt 25000){Stop-Owned $nodePid}}
  $after=Discover
  $remaining=@($after|Where-Object {$tree.Contains([int]$_.ProcessId) -or $tree.Contains([int]$_.ParentProcessId)})
  $nativeRows=@($held.Keys|ForEach-Object {@{identity=$identities[$_];native=(Native $held[$_])}})
  $unknownRunning=@($after|Where-Object {$unknown.Contains([int]$_.ProcessId)})
  $cleanupPass=($remaining.Count -eq 0 -and $unknownRunning.Count -eq 0 -and @($nativeRows|Where-Object {-not $_.native.signaled -or $_.native.osExitTimeStatus -ne 'VALID'}).Count -eq 0)
  Write-New 'cleanup-journal.json' @{actions=@($events.ToArray());unknownIds=@($unknown);unknownStillRunning=$unknownRunning;remainingTree=$remaining;cleanupPass=$cleanupPass;elapsedMs=$cleanupWatch.ElapsedMilliseconds;foreignProcessesTargeted=0;native=$nativeRows}
  $logs=@();foreach($task in @($out,$err)){if($task -and $task.IsCompleted){$logs+=$task.GetAwaiter().GetResult()}}
  $text=($logs -join "`n");if($text.Length -gt 8192){$text=$text.Substring(0,8192)};[IO.File]::WriteAllText((Join-Path $run 'node-diagnostic.log'),$text)
  $nodeNative=$(if($held.ContainsKey($nodePid)){Native $held[$nodePid]}else{$null});$edgeNative=$(if($held.ContainsKey($edgePid)){Native $held[$edgePid]}else{$null})
  Write-New 'parent-native.json' @{observerPid=$PID;supervisorPid=$plan.supervisorPid;runId=$plan.runId;ownerVerified=($held.ContainsKey($nodePid) -and $held.ContainsKey($edgePid));native=$nativeRows;unknownIds=@($unknown);nodePid=$nodePid;edgePid=$edgePid;node=$nodeNative;edge=$edgeNative;timeout=$timeout;failure=$failure;observationMs=$observationMs;earlyWorkerCleanup=$earlyCleanup;workerCleanupRequestedAtMs=$workerCleanupAt;cleanupPass=$cleanupPass;cleanupMs=$cleanupWatch.ElapsedMilliseconds;observedCompletionUtc=[DateTime]::UtcNow.ToString('o');independentHandlesHeld=$held.Count;remainingTree=$remaining;foreignProcessesTargeted=0}
 }catch{Write-New 'cleanup-error.json' @{message=$_.Exception.Message;atUtc=[DateTime]::UtcNow.ToString('o')}}
 finally{foreach($h in $held.Values){[void][SmokeNative]::CloseHandle($h)};$p.Dispose();$cleanupWatch.Stop()}
}
Write-Output ('SMOKE_RUN='+$run)
if($failure -or $timeout -or -not $cleanupPass){exit 3}
if($nodeNative.exitCode -eq 0 -and $edgeNative.exitCode -eq 0){exit 0}else{exit 3}
