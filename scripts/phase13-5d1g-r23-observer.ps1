[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunDirectory,[Parameter(Mandatory=$true)][string]$ManifestHash)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'phase13-5d1g-r23-common.ps1')
$native=$null;$job=[IntPtr]::Zero;$hostHandle=$null
try{
 Initialize-R23 $RunDirectory $ManifestHash
 $id=Get-Content -LiteralPath (Join-Path $run 'identity.json') -Raw|ConvertFrom-Json
 $expectedImage=if($manifest.kind -eq 'LIVE'){$manifest.initdb}else{Join-Path $run 'fixture.exe'}
 if($id.nonce -cne $manifest.nonce -or $id.jobName -cne ('Local\SmartAgriR23-'+$manifest.runId) -or $id.image -ine $expectedImage -or (Get-FileHash -LiteralPath $expectedImage -Algorithm SHA256).Hash -cne $id.imageHash){throw 'OBSERVER_IDENTITY_FILE_REFUSED'}
 $native=[R22Native]::Observe([uint32]$id.pid);$job=[R23Native]::OpenJob($id.jobName)
 if(-not(Test-R23Identity $native $id.pid $id.startFileTime $expectedImage) -or [R23Native]::JobActive($job) -ne 1){throw 'OBSERVER_NATIVE_IDENTITY_REFUSED'}
 $hostHandle=[R22Native]::Observe([uint32]$id.supervisorPid)
 if(-not(Test-R23Identity $hostHandle $id.supervisorPid $id.supervisorStartFileTime 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe')){throw 'OBSERVER_HOST_IDENTITY_REFUSED'}
 $self=[R22Native]::Observe([uint32]$PID)
 Write-R23Evidence 'observer-ready.json' @{pid=$native.pid;startFileTime=$native.startFileTime.ToString();nonce=$manifest.nonce;observerPid=$PID;observerStartFileTime=$self.startFileTime.ToString();jobActive=[R23Native]::JobActive($job);jobFlags=[R23Native]::JobFlags($job)}
 [R22Native]::CloseHandle($self.handle)|Out-Null
 $clock=[Diagnostics.Stopwatch]::StartNew();$hostLost=$false
 while(-not [R22Native]::Exited($native,100) -or [R23Native]::JobActive($job) -ne 0){
  if([R22Native]::Exited($hostHandle,0)){$hostLost=$true}
  if($clock.ElapsedMilliseconds -gt 130000){Write-R23Evidence 'observer-unknown.json' @{reason='UNKNOWN_NATIVE_OUTCOME';pid=$native.pid;startFileTime=$native.startFileTime.ToString();jobActive=[R23Native]::JobActive($job);forceKill=$false;retry=$false};exit 2}
 }
 Write-R23Evidence 'observer-native-exit.json' @{pid=$native.pid;startFileTime=$native.startFileTime.ToString();nonce=$manifest.nonce;exitCode=[R22Native]::ExitCode($native);exitAt=[R22Native]::ExitAt($native);jobActive=[R23Native]::JobActive($job);jobFlags=[R23Native]::JobFlags($job);supervisorLost=$hostLost;independentNativeHandle=$true;forceKill=$false}
}catch{
 if($run){Write-R23Evidence 'observer-error.json' @{reason=$_.Exception.Message;unknown=$true;forceKill=$false;retry=$false}};exit 2
}finally{
 if($native){[R22Native]::CloseHandle($native.handle)|Out-Null};if($hostHandle){[R22Native]::CloseHandle($hostHandle.handle)|Out-Null};if($job -ne [IntPtr]::Zero){[R22Native]::CloseHandle($job)|Out-Null}
}
