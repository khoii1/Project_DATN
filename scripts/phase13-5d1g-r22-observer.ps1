[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunDirectory,[Parameter(Mandatory=$true)][string]$NativeHash)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($RunDirectory);$allowed=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r22-offline'))+'\'
if(-not $run.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'OFFLINE_ROOT_REQUIRED'}
function Publish([string]$Name,$Value){$dest=Join-Path $run $Name;$bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 5 -Compress));$f=[IO.File]::Open(($dest+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($dest+'.pending'),$dest)}
$source=Join-Path $PSScriptRoot 'phase13-5d1g-r22-native.cs';if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $NativeHash){throw 'NATIVE_SOURCE_MISMATCH'}
Add-Type -Path $source
$p=$null
try{
 $id=Get-Content -LiteralPath (Join-Path $run 'identity.json') -Raw|ConvertFrom-Json;$exe=Join-Path $run 'fake-initdb.exe'
 if($id.image -ine $exe -or (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -cne $id.imageHash){throw 'EXECUTABLE_IDENTITY_UNKNOWN'}
 $p=[R22Native]::Observe([uint32]$id.pid)
 if($p.startFileTime.ToString() -cne $id.startFileTime -or $p.image -ine $exe){throw 'PROCESS_IDENTITY_UNKNOWN'}
 $self=[R22Native]::Observe([uint32]$PID)
 Publish 'observer-ready.json' @{pid=$p.pid;startFileTime=$p.startFileTime.ToString();nonce=$id.nonce;observerPid=$PID;observerStartFileTime=$self.startFileTime.ToString()}
 [R22Native]::CloseHandle($self.handle)|Out-Null
 if(-not [R22Native]::Exited($p,6500)){Publish 'observer-unknown.json' @{reason='NATIVE_EXIT_NOT_OBSERVED';manualInterventionRequired=$true;forceKillUsed=$false};exit 2}
 Publish 'observer-native-exit.json' @{pid=$p.pid;startFileTime=$p.startFileTime.ToString();nonce=$id.nonce;exitCode=[R22Native]::ExitCode($p);exitAt=[R22Native]::ExitAt($p);independentNativeHandle=$true;forceKillUsed=$false}
}catch{Publish 'observer-unknown.json' @{reason='NATIVE_IDENTITY_OR_EXIT_UNKNOWN';type=$_.Exception.GetType().Name;manualInterventionRequired=$true};exit 2}
finally{if($p){[R22Native]::CloseHandle($p.handle)|Out-Null}}
