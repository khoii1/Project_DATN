# OFFLINE ONLY: owns a private Windows console and exactly one synthetic child.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$RunDirectory,
 [Parameter(Mandatory=$true)][string]$NodeExecutable,
 [Parameter(Mandatory=$true)][string]$FixtureSha256,
 [Parameter(Mandatory=$true)][ValidateSet('graceful','exit0','exit7','no-ready','ignore-stop','logs')][string]$Scenario,
 [Parameter(Mandatory=$true)][string]$Nonce
)
$ErrorActionPreference='Stop'
$fixture=Join-Path $PSScriptRoot 'phase13-5d1c-synthetic-child.cjs'
$allowedRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1c-offline'))+'\'
$run=[IO.Path]::GetFullPath($RunDirectory)
if(-not $run.StartsWith($allowedRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'OFFLINE_DIRECTORY_REQUIRED'}
if((Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash -ine $FixtureSha256){throw 'FIXTURE_HASH_MISMATCH'}
if([IO.Path]::GetFileName($NodeExecutable) -ine 'node.exe'){throw 'NODE_EXECUTABLE_REQUIRED'}
if(-not (Test-Path -LiteralPath (Join-Path $run 'attempt.json'))){throw 'ATTEMPT_REQUIRED'}
function New-Evidence([string]$Name,$Value){
 $bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 6 -Compress))
 $destination=Join-Path $run $Name
 $pending=$destination+'.pending'
 $f=[IO.File]::Open($pending,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()}
 # Atomic publication on this filesystem; File.Move refuses an existing destination.
 [IO.File]::Move($pending,$destination)
}
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
public static class OfflineConsole135D1C {
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool FreeConsole();
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool AllocConsole();
 [DllImport("kernel32.dll")] public static extern uint GetConsoleProcessList(uint[] list,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GenerateConsoleCtrlEvent(uint kind,uint group);
 [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window,int command);
 public delegate bool Handler(uint type);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool SetConsoleCtrlHandler(Handler callback,bool add);
 // Custom handler, NOT the inheritable ignore-Ctrl-C flag: child must receive SIGINT.
 private static Handler keepAlive = delegate(uint type) { return type==0; };
 public static bool ProtectHost() { return SetConsoleCtrlHandler(keepAlive,true); }
 public static async Task Capture(Stream input, string file) {
  using(var output=new FileStream(file,FileMode.CreateNew,FileAccess.Write,FileShare.Read)) {
   byte[] buffer=new byte[1024]; int count; long total=0;
   while((count=await input.ReadAsync(buffer,0,buffer.Length))>0) {
    total+=count; if(total>1048576) throw new IOException("OFFLINE_CAPTURE_LIMIT");
    await output.WriteAsync(buffer,0,count); output.Flush(true);
   }
  }
 }
}
'@
# Only detach this helper, never the caller's console. Allocate a distinct console.
$null=[OfflineConsole135D1C]::FreeConsole()
if(-not [OfflineConsole135D1C]::AllocConsole()){throw 'PRIVATE_CONSOLE_ALLOCATION_FAILED'}
$null=[OfflineConsole135D1C]::ShowWindow([OfflineConsole135D1C]::GetConsoleWindow(),0)
if(-not [OfflineConsole135D1C]::ProtectHost()){throw 'HOST_HANDLER_FAILED'}
$child=$null;$stopSent=$false;$stopAt=$null;$stopReason=$null;$requestSeen=$false
try {
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=$NodeExecutable
 $info.Arguments='"'+$fixture+'" '+$Scenario+' '+$Nonce
 $info.WorkingDirectory=$run
 $info.UseShellExecute=$false;$info.CreateNoWindow=$false
 $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info
 if(-not $child.Start()){throw 'SYNTHETIC_START_FAILED'}
 $childStart=$child.StartTime.ToUniversalTime().Ticks.ToString()
 $hostStart=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks.ToString()
 $out=[OfflineConsole135D1C]::Capture($child.StandardOutput.BaseStream,(Join-Path $run 'stdout.log'))
 $err=[OfflineConsole135D1C]::Capture($child.StandardError.BaseStream,(Join-Path $run 'stderr.log'))
 $identity=@{nonce=$Nonce;hostPid=$PID;hostStartTicks=$hostStart;childPid=$child.Id;childStartTicks=$childStart;executable=$child.MainModule.FileName;fixtureSha256=$FixtureSha256;parentPid=$PID}
 New-Evidence 'child.json' $identity
 $leaseWatch=[Diagnostics.Stopwatch]::StartNew();$lastLeaseLength=-1L
 while(-not $child.WaitForExit(50)) {
  $heartbeat=@{hostPid=$PID;childPid=$child.Id;utc=[DateTimeOffset]::UtcNow.ToString('o')}
  [IO.File]::AppendAllText((Join-Path $run 'host-heartbeat.jsonl'),(($heartbeat|ConvertTo-Json -Compress)+"`n"))
  $lease=Join-Path $run 'wrapper-heartbeat.jsonl'
  if(Test-Path -LiteralPath $lease){$length=(Get-Item -LiteralPath $lease).Length;if($length -ne $lastLeaseLength){$lastLeaseLength=$length;$leaseWatch.Restart()}}
  $request=Join-Path $run 'stop-request.json'
  $shouldStop=$false
  if(-not $requestSeen -and (Test-Path -LiteralPath $request)){
   $requestSeen=$true;$r=Get-Content -LiteralPath $request -Raw|ConvertFrom-Json
   if($r.nonce -cne $Nonce -or $r.childPid -ne $child.Id -or $r.childStartTicks -cne $childStart){New-Evidence 'stop-refused.json' @{reason='STOP_IDENTITY_MISMATCH'}}
   else{$shouldStop=$true;$stopReason='REQUESTED'}
  }
  if($leaseWatch.ElapsedMilliseconds -gt 2000){$shouldStop=$true;$stopReason='WRAPPER_HEARTBEAT_LOST'}
  if(($out.IsFaulted -or $err.IsFaulted) -and -not $stopSent){$shouldStop=$true;$stopReason='CAPTURE_FAILED'}
  if($shouldStop -and -not $stopSent){
   $actual=Get-Process -Id $child.Id -ErrorAction Stop
   $members=New-Object 'UInt32[]' 8
   $count=[OfflineConsole135D1C]::GetConsoleProcessList($members,8)
   if($actual.StartTime.ToUniversalTime().Ticks.ToString() -cne $childStart -or $count -ne 2 -or $members[0..1] -notcontains [uint32]$PID -or $members[0..1] -notcontains [uint32]$child.Id){throw 'PRIVATE_CONSOLE_IDENTITY_MISMATCH'}
   if(-not [OfflineConsole135D1C]::GenerateConsoleCtrlEvent(0,0)){throw 'CTRL_C_DELIVERY_FAILED'}
   $stopSent=$true;$stopAt=[Diagnostics.Stopwatch]::StartNew()
   New-Evidence 'signal.json' @{signal='CTRL_C_EVENT';reason=$stopReason;childPid=$child.Id;childStartTicks=$childStart;consoleMembers=@($members[0..1]);utc=[DateTimeOffset]::UtcNow.ToString('o')}
  }
  if($stopSent -and $stopAt.ElapsedMilliseconds -gt 700 -and -not (Test-Path -LiteralPath (Join-Path $run 'stop-timeout.json'))){New-Evidence 'stop-timeout.json' @{reason='GRACEFUL_STOP_TIMEOUT';forceKillUsed=$false}}
 }
 if(-not $out.Wait(1500) -or -not $err.Wait(1500)){throw 'CAPTURE_DRAIN_TIMEOUT'}
 New-Evidence 'exit.json' @{childPid=$child.Id;childStartTicks=$childStart;exitCode=$child.ExitCode;utc=[DateTimeOffset]::UtcNow.ToString('o');stopSent=$stopSent;stopReason=$stopReason;forceKillUsed=$false}
} catch {
 # No raw exception/arguments/environment printed. Never kill an unknown process.
 New-Evidence 'host-error.json' @{category='OFFLINE_HOST_FAILURE';errorType=$_.Exception.GetType().Name;forceKillUsed=$false}
 exit 2
} finally {
 if($child -and $child.HasExited){$child.Dispose()}
}
