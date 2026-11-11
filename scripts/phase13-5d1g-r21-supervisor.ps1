[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunDirectory,[Parameter(Mandatory=$true)][string]$Scenario,[Parameter(Mandatory=$true)][string]$Nonce,[Parameter(Mandatory=$true)][string]$SourceHash)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r21-offline'))+'\'
$run=[IO.Path]::GetFullPath($RunDirectory)
if(-not $run.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'OFFLINE_ROOT_REQUIRED'}
$source=Join-Path $PSScriptRoot 'phase13-5d1g-r21-child.cs'
if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $SourceHash){throw 'SOURCE_HASH_MISMATCH'}
function New-Evidence([string]$Name,$Value){
 $bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 7 -Compress));$dest=Join-Path $run $Name
 $f=[IO.File]::Open(($dest+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($dest+'.pending'),$dest)
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class R21HostConsole {
 [DllImport("kernel32.dll")]public static extern bool FreeConsole();
 [DllImport("kernel32.dll")]public static extern bool AllocConsole();
 [DllImport("kernel32.dll")]public static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("kernel32.dll")]public static extern uint GetConsoleProcessList(uint[] p,uint n);
 [DllImport("kernel32.dll")]public static extern bool GenerateConsoleCtrlEvent(uint type,uint group);
 public delegate bool Handler(uint type);
 [DllImport("kernel32.dll")]public static extern bool SetConsoleCtrlHandler(Handler h,bool add);
 static Handler handler=delegate(uint type){return type==0;};
 public static bool Protect(){return SetConsoleCtrlHandler(handler,true);}
}
'@
$child=$null;$guest=$null;$decision='OBSERVING';$signalSent=$false;$cleanup=$false
try {
 $exe=Join-Path $run 'synthetic-child.exe'
 $compiler='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
 $compilerInfo=New-Object Diagnostics.ProcessStartInfo
 $compilerInfo.FileName=$compiler;$compilerInfo.Arguments='/nologo /target:exe /r:System.Web.Extensions.dll /out:"'+$exe+'" "'+$source+'"'
 $compilerInfo.UseShellExecute=$false;$compilerInfo.CreateNoWindow=$true;$compilerInfo.RedirectStandardOutput=$true;$compilerInfo.RedirectStandardError=$true
 $compilerProcess=New-Object Diagnostics.Process;$compilerProcess.StartInfo=$compilerInfo
 if(-not $compilerProcess.Start()){throw 'COMPILER_START_FAILED'}
 $compileOut=$compilerProcess.StandardOutput.ReadToEndAsync();$compileErr=$compilerProcess.StandardError.ReadToEndAsync()
 if(-not $compilerProcess.WaitForExit(5000)){$compilerProcess.Kill();New-Evidence 'compile-failure.json' @{reason='ABNORMAL_TEST_CLEANUP';forceKillUsed=$true};throw 'COMPILER_TIMEOUT'}
 New-Evidence 'compile-native.json' @{pid=$compilerProcess.Id;exitCode=$compilerProcess.ExitCode;stdoutBytes=$compileOut.Result.Length;stderrBytes=$compileErr.Result.Length}
 if($compilerProcess.ExitCode -ne 0){New-Evidence 'compile-failure.json' @{reason='SYNTHETIC_COMPILE_FAILED';messages=@($compileOut.Result,$compileErr.Result)};throw 'COMPILE_FAILED'}
 $null=[R21HostConsole]::FreeConsole()
 if(-not [R21HostConsole]::AllocConsole()){throw 'PRIVATE_CONSOLE_FAILED'}
 $null=[R21HostConsole]::ShowWindow([R21HostConsole]::GetConsoleWindow(),0)
 if(-not [R21HostConsole]::Protect()){throw 'HOST_HANDLER_FAILED'}
 $hostTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks.ToString()
 function Start-Fixture([string]$ChildScenario){
  $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=$exe;$info.Arguments='"'+$run+'" '+$ChildScenario+' '+$Nonce+' '+$PID+' '+$hostTicks
  $info.UseShellExecute=$false;$info.CreateNoWindow=$false;$info.WorkingDirectory=$run
  $info.EnvironmentVariables.Clear();$info.EnvironmentVariables['SystemRoot']='C:\Windows';$info.EnvironmentVariables['WINDIR']='C:\Windows';$info.EnvironmentVariables['TEMP']=$run;$info.EnvironmentVariables['TMP']=$run
  $p=New-Object Diagnostics.Process;$p.StartInfo=$info;if(-not $p.Start()){throw 'FIXTURE_START_FAILED'};return $p
 }
 $child=Start-Fixture $Scenario;$childTicks=$child.StartTime.ToUniversalTime().Ticks.ToString();$exeHash=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
 New-Evidence 'identity.json' @{nonce=$Nonce;hostPid=$PID;hostStartTicks=$hostTicks;childPid=$child.Id;childStartTicks=$childTicks;executable=$exe;executableHash=$exeHash}
 $clock=[Diagnostics.Stopwatch]::StartNew()
 while(-not (Test-Path -LiteralPath (Join-Path $run 'observer-ready.json')) -or -not (Test-Path -LiteralPath (Join-Path $run 'child-ready.json'))){if($child.HasExited -or $clock.ElapsedMilliseconds -gt 5000){throw 'OBSERVER_OR_CHILD_NOT_READY'};Start-Sleep -Milliseconds 20}
 $observer=Get-Content -LiteralPath (Join-Path $run 'observer-ready.json') -Raw|ConvertFrom-Json
 if($observer.nonce -cne $Nonce -or $observer.pid -ne $child.Id -or $observer.startTicks -cne $childTicks){throw 'OBSERVER_IDENTITY_MISMATCH'}
 $ready=Get-Content -LiteralPath (Join-Path $run 'child-ready.json') -Raw|ConvertFrom-Json
 $readyAge=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($ready.readyAt)).TotalMilliseconds
 if($ready.nonce -cne $Nonce -or $ready.pid -ne $child.Id -or $ready.startTicks -cne $childTicks -or $ready.hostPid -ne $PID -or $ready.hostStartTicks -cne $hostTicks -or $ready.consoleMemberCount -ne 2 -or $readyAge -lt 0 -or $readyAge -gt 5000){throw 'CHILD_READINESS_IDENTITY_MISMATCH'}
 if($Scenario -eq 'extra-member'){$guest=Start-Fixture 'guest';New-Evidence 'guest-identity.json' @{pid=$guest.Id;startTicks=$guest.StartTime.ToUniversalTime().Ticks.ToString()}}
 New-Evidence 'start.json' @{nonce=$Nonce;pid=$child.Id;startTicks=$childTicks}
 if($Scenario -eq 'supervisor-disappears'){New-Evidence 'supervisor-abandoned.json' @{hostPid=$PID;hostStartTicks=$hostTicks;reason='SYNTHETIC_SUPERVISOR_EXIT'};exit 0}
 $actionSent=$false;$stopClock=$null;$overall=[Diagnostics.Stopwatch]::StartNew()
 while(-not $child.WaitForExit(20)) {
  [IO.File]::AppendAllText((Join-Path $run 'supervisor-heartbeat.jsonl'),((@{pid=$PID;ticks=$hostTicks;at=[DateTimeOffset]::UtcNow.ToString('o')}|ConvertTo-Json -Compress)+"`n"))
  $beats=Join-Path $run 'child-heartbeat.jsonl';$pending=$false
  if(Test-Path -LiteralPath $beats){$lines=@(Get-Content -LiteralPath $beats|Select-Object -Last 2);foreach($line in $lines){try{$b=$line|ConvertFrom-Json;$age=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($b.at)).TotalMilliseconds;if($b.nonce -ceq $Nonce -and $b.pid -eq $child.Id -and $b.startTicks -ceq $childTicks -and $age -ge 0 -and $age -lt 1000){$pending=[bool]$b.pending}}catch{}}}
  if(-not $actionSent -and $pending -and $overall.ElapsedMilliseconds -gt 160 -and $Scenario -in @('operator-cancel','supervisor-cancel','timeout','ignore-cancel','wrong-pid','wrong-start','pid-reuse','extra-member')) {
   $actionSent=$true;$members=New-Object uint32[] 8;$count=[R21HostConsole]::GetConsoleProcessList($members,8)
   $actual=Get-Process -Id $child.Id -ErrorAction Stop
   $requestedPid=$child.Id;if($Scenario -eq 'wrong-pid'){$requestedPid++}
   $requestedTicks=$childTicks;if($Scenario -in @('wrong-start','pid-reuse')){$requestedTicks='639000000000000000'}
   $owned=$requestedPid -eq $child.Id -and $requestedTicks -ceq $childTicks -and $actual.StartTime.ToUniversalTime().Ticks.ToString() -ceq $childTicks -and $actual.Path -ieq $exe
   $isolated=$count -eq 2 -and $members[0..1] -contains [uint32]$PID -and $members[0..1] -contains [uint32]$child.Id
   if(-not $owned -or -not $isolated){$decision='CANCEL_REFUSED_IDENTITY_OR_MEMBERS';$cleanup=$true;New-Evidence 'signal-refused.json' @{requestedPid=$requestedPid;expectedPid=$child.Id;requestedTicks=$requestedTicks;actualTicks=$childTicks;members=@($members|Select-Object -First $count);signalSent=$false};New-Evidence 'cleanup.json' @{nonce=$Nonce;pid=$child.Id;startTicks=$childTicks}}
   else {
    if($Scenario -ne 'operator-cancel'){New-Evidence 'cancel.json' @{nonce=$Nonce;pid=$child.Id;startTicks=$childTicks}}
    if(-not [R21HostConsole]::GenerateConsoleCtrlEvent(0,0)){throw 'CTRL_C_DELIVERY_FAILED'}
    $signalSent=$true;New-Evidence 'signal.json' @{nonce=$Nonce;childPid=$child.Id;childStartTicks=$childTicks;members=@($members[0..1]);signal='CTRL_C_EVENT';sourceHash=$exeHash}
    $stopClock=[Diagnostics.Stopwatch]::StartNew()
   }
  }
  if($stopClock -and $stopClock.ElapsedMilliseconds -gt 700 -and -not $cleanup){$decision='GRACEFUL_STOP_TIMEOUT';$cleanup=$true;New-Evidence 'deadline-exceeded.json' @{reason=$decision};New-Evidence 'cleanup.json' @{nonce=$Nonce;pid=$child.Id;startTicks=$childTicks}}
  if($overall.ElapsedMilliseconds -gt 5000 -and -not $cleanup){$decision='CONSOLE_LOST_UNKNOWN';$cleanup=$true;New-Evidence 'cleanup.json' @{nonce=$Nonce;pid=$child.Id;startTicks=$childTicks}}
  if($overall.ElapsedMilliseconds -gt 6500){$decision='UNKNOWN_OWNED_CHILD_OUTCOME';break}
 }
 if($child.HasExited){New-Evidence 'supervisor-native-exit.json' @{pid=$child.Id;startTicks=$childTicks;exitCode=$child.ExitCode;decision=$decision;signalSent=$signalSent;abnormalTestCleanup=$cleanup}}
 if($guest){if(-not $guest.WaitForExit(3000)){throw 'GUEST_DID_NOT_EXIT'};New-Evidence 'guest-native-exit.json' @{pid=$guest.Id;exitCode=$guest.ExitCode}}
} catch {New-Evidence 'supervisor-error.json' @{reason='SUPERVISOR_FAILED';type=$_.Exception.GetType().Name};exit 2}
