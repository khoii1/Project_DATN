[CmdletBinding()]
param([ValidateSet('PLAN_ONLY','SYNTHETIC')][string]$Mode='PLAN_ONLY',[string]$RunDirectory,
 [ValidateSet('success','mismatch','missing','operator-cancel','exit7','console-loss','supervisor-loss','early-exit','wrong-pid','wrong-start','pid-reuse','timeout')][string]$Scenario='success',[string]$Nonce,[string]$NativeHash,[string]$FixtureHash)
$ErrorActionPreference='Stop'
if($Mode -eq 'PLAN_ONLY'){[Console]::WriteLine('{"mode":"PLAN_ONLY","actualInitdbEnabled":false,"futureOperatorConsoleVisible":true}');exit 0}
$run=[IO.Path]::GetFullPath($RunDirectory);$allowed=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r22-offline'))+'\'
if(-not $run.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'OFFLINE_ROOT_REQUIRED'}
function Publish([string]$Name,$Value){$dest=Join-Path $run $Name;$bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 7 -Compress));$f=[IO.File]::Open(($dest+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($dest+'.pending'),$dest)}
$nativeSource=Join-Path $PSScriptRoot 'phase13-5d1g-r22-native.cs';$fixtureSource=Join-Path $PSScriptRoot 'phase13-5d1g-r22-fake-initdb.cs'
if((Get-FileHash -LiteralPath $nativeSource -Algorithm SHA256).Hash -cne $NativeHash -or (Get-FileHash -LiteralPath $fixtureSource -Algorithm SHA256).Hash -cne $FixtureHash){throw 'SOURCE_HASH_MISMATCH'}
Add-Type -Path $nativeSource
$child=$null;$decision='OBSERVING'
try {
 $exe=Join-Path $run 'fake-initdb.exe';$info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe';$info.Arguments='/nologo /target:exe /r:System.Web.Extensions.dll /out:"'+$exe+'" "'+$fixtureSource+'"'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $compiler=New-Object Diagnostics.Process;$compiler.StartInfo=$info;if(-not $compiler.Start()){throw 'COMPILER_START_FAILED'}
 $o=$compiler.StandardOutput.ReadToEndAsync();$e=$compiler.StandardError.ReadToEndAsync()
 if(-not $compiler.WaitForExit(5000)){Publish 'compile-unknown.json' @{outcome='UNKNOWN';manualInterventionRequired=$true};throw 'COMPILE_UNKNOWN'}
 Publish 'compile-native.json' @{pid=$compiler.Id;exitCode=$compiler.ExitCode;stdoutBytes=$o.Result.Length;stderrBytes=$e.Result.Length}
 if($compiler.ExitCode -ne 0){Publish 'compile-errors.json' @{stdout=$o.Result;stderr=$e.Result};throw 'COMPILE_FAILED'}
 if(-not [R22Native]::CreatePrivateTestConsole()){throw 'CONSOLE_UNAVAILABLE'}
 $self=[R22Native]::Observe([uint32]$PID)
 $suspended=$Scenario -ne 'early-exit';$child=[R22Native]::LaunchFake($run,$Scenario,$Nonce,$suspended)
 if($Scenario -eq 'early-exit'){Start-Sleep -Milliseconds 400}
 $identity=@{pid=$child.pid;startFileTime=$child.startFileTime.ToString();image=$child.image;imageHash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash;nonce=$Nonce;supervisorPid=$PID;supervisorStartFileTime=$self.startFileTime.ToString();createdSuspended=$suspended;operatorVisibleTest=[R22Native]::Visible()}
 Publish 'identity.json' $identity
 $clock=[Diagnostics.Stopwatch]::StartNew()
 while(-not(Test-Path -LiteralPath (Join-Path $run 'observer-ready.json')) -and -not(Test-Path -LiteralPath (Join-Path $run 'observer-unknown.json'))){if($clock.ElapsedMilliseconds -gt 4500){break};Start-Sleep -Milliseconds 20}
 if($Scenario -eq 'early-exit'){$decision='EARLY_EXIT_BEFORE_OBSERVER'}
 else {
  $readyPath=Join-Path $run 'observer-ready.json';if(-not(Test-Path -LiteralPath $readyPath)){$decision='OBSERVER_NOT_READY_UNKNOWN'}
  else{$ready=Get-Content -LiteralPath $readyPath -Raw|ConvertFrom-Json;if($ready.nonce -cne $Nonce -or $ready.pid -ne $child.pid -or $ready.startFileTime -cne $child.startFileTime.ToString()){$decision='OBSERVER_IDENTITY_UNKNOWN'}}
  $requestPid=$child.pid;$requestStart=$child.startFileTime.ToString()
  if($Scenario -eq 'wrong-pid'){$requestPid++};if($Scenario -in @('wrong-start','pid-reuse')){$requestStart='1'}
  $owned=$requestPid -eq $child.pid -and $requestStart -ceq $child.startFileTime.ToString()
  if(-not $owned){$decision='REQUEST_IDENTITY_REFUSED';Publish 'request-refused.json' @{requestedPid=$requestPid;expectedPid=$child.pid;requestedStart=$requestStart;signalSent=$false}}
  # This is a fixed self-expiring TEST executable, not initdb. Resume for test cleanup on gate fault.
  # A future real initdb with an unresolved gate requires manual disposition, not this test branch.
  [R22Native]::Resume($child)
 }
 Publish 'external-start.json' @{pid=$child.pid;startFileTime=$child.startFileTime.ToString();decision=$decision;stdinPipeUsed=$false;passwordInjectedBySupervisor=$false;at=[DateTimeOffset]::UtcNow.ToString('o')}
 if($Scenario -eq 'supervisor-loss'){Publish 'supervisor-lost.json' @{intentionalTestExit=$true;noChildCancelProtocol=$true};[R22Native]::CloseHandle($self.handle)|Out-Null;exit 0}
 $elapsed=[Diagnostics.Stopwatch]::StartNew();$signalSent=$false;$deadlineRecorded=$false
 while(-not [R22Native]::Exited($child,20)){
  if($Scenario -eq 'operator-cancel' -and -not $signalSent -and $elapsed.ElapsedMilliseconds -gt 180){
   $actual=[R22Native]::Observe($child.pid);$members=New-Object uint32[] 8;$count=[R22Native]::GetConsoleProcessList($members,8)
   if($actual.startFileTime -ne $child.startFileTime -or $actual.image -ine $exe -or $count -ne 2 -or $members[0..1] -notcontains [uint32]$PID -or $members[0..1] -notcontains $child.pid){throw 'CANCEL_SCOPE_UNKNOWN'}
   [R22Native]::CloseHandle($actual.handle)|Out-Null
   if(-not [R22Native]::GenerateConsoleCtrlEvent(0,0)){throw 'OPERATOR_EVENT_FAILED'};$signalSent=$true
   Publish 'operator-event.json' @{members=@($members[0..1]);signal='CTRL_C_EVENT';pid=$child.pid;startFileTime=$child.startFileTime.ToString()}
  }
  if($Scenario -eq 'timeout' -and -not $deadlineRecorded -and $elapsed.ElapsedMilliseconds -gt 400){
   $decision='TIMEOUT_UNKNOWN_MANUAL';$deadlineRecorded=$true;Publish 'deadline.json' @{decision=$decision;forceKillUsed=$false;retry=$false;manualInterventionRequired=$true}
  }
  if($elapsed.ElapsedMilliseconds -gt 6500){$decision='NATIVE_OUTCOME_UNKNOWN_MANUAL';Publish 'host-unknown.json' @{decision=$decision;forceKillUsed=$false;manualInterventionRequired=$true};break}
 }
 if([R22Native]::Exited($child,0)){Publish 'host-native-exit.json' @{pid=$child.pid;startFileTime=$child.startFileTime.ToString();exitCode=[R22Native]::ExitCode($child);exitAt=[R22Native]::ExitAt($child);decision=$decision;nativeHandleObserved=$true;forceKillUsed=$false}}
 [R22Native]::CloseHandle($self.handle)|Out-Null
}catch{Publish 'host-error.json' @{reason='EXTERNAL_SUPERVISION_FAILED';type=$_.Exception.GetType().Name;manualInterventionRequired=$true};exit 2}
finally{if($child){if($child.thread -ne [IntPtr]::Zero){[R22Native]::CloseHandle($child.thread)|Out-Null};[R22Native]::CloseHandle($child.handle)|Out-Null}}
