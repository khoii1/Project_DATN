[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($RunDirectory)
$allowed=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r21-offline'))+'\'
if(-not $run.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'OFFLINE_ROOT_REQUIRED'}
function Publish([string]$Name,$Value){$dest=Join-Path $run $Name;$bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 5 -Compress));$f=[IO.File]::Open(($dest+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($dest+'.pending'),$dest)}
try {
 $id=Get-Content -LiteralPath (Join-Path $run 'identity.json') -Raw|ConvertFrom-Json
 $fixedExe=Join-Path $run 'synthetic-child.exe'
 if($id.executable -ine $fixedExe -or ((Get-Item -LiteralPath $fixedExe).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'NONFIXTURE_EXECUTABLE_REFUSED'}
 $p=Get-Process -Id $id.childPid -ErrorAction Stop
 if($p.StartTime.ToUniversalTime().Ticks.ToString() -cne $id.childStartTicks -or $p.Path -ine $id.executable -or (Get-FileHash -LiteralPath $p.Path -Algorithm SHA256).Hash -cne $id.executableHash){throw 'CHILD_IDENTITY_MISMATCH'}
 $handle=$p.Handle # Hold the verified native process handle BEFORE it can exit.
 Publish 'observer-ready.json' @{nonce=$id.nonce;pid=$p.Id;startTicks=$id.childStartTicks;observerPid=$PID;observerStartTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks.ToString()}
 $abnormal=$false
 if(-not $p.WaitForExit(9000)) {
  # OFFLINE abnormal cleanup only; never classified graceful. Exact live identity rechecked.
  $actual=Get-Process -Id $id.childPid -ErrorAction Stop
  if($actual.StartTime.ToUniversalTime().Ticks.ToString() -cne $id.childStartTicks -or $actual.Path -ine $id.executable){throw 'CLEANUP_IDENTITY_MISMATCH'}
  $abnormal=$true;Publish 'abnormal-test-cleanup.json' @{pid=$p.Id;startTicks=$id.childStartTicks;classification='ABNORMAL_TEST_CLEANUP';forceKillUsed=$true}
  $p.Kill();if(-not $p.WaitForExit(2000)){throw 'CLEANUP_NOT_CONFIRMED'}
 }
 Publish 'observer-native-exit.json' @{nonce=$id.nonce;pid=$p.Id;startTicks=$id.childStartTicks;exitCode=$p.ExitCode;abnormalTestCleanup=$abnormal;independentNativeHandle=$true}
}catch{Publish 'observer-error.json' @{reason='NATIVE_OUTCOME_UNKNOWN';type=$_.Exception.GetType().Name};exit 2}
