param([string]$RunDirectory,[string]$ManifestHash)
$ErrorActionPreference='Stop';. (Join-Path $PSScriptRoot 'phase13-5d1g-r23a-common.ps1')
$native=$null;$job=[IntPtr]::Zero;$hostHandle=$null;$script:started=$null;$script:resumed=$false;$script:observerPid=$null;$script:observerStart=$null
try{
 Initialize-A $RunDirectory $ManifestHash
 $id=Get-Content -LiteralPath (Join-Path $run 'identity.json') -Raw|ConvertFrom-Json
 $native=[R22Native]::Observe([uint32]$id.pid);$job=[R23Native]::OpenJob($id.jobName)
 if($native.startFileTime.ToString() -cne $id.startFileTime -or $native.image -ine (Join-Path $run 'fixture.exe') -or (Get-FileHash -LiteralPath $native.image -Algorithm SHA256).Hash -cne $id.imageHash -or $id.nonce -cne $m.nonce){throw 'OBSERVER_IDENTITY_REFUSED'}
 $script:fixtureImageHash=$id.imageHash
 $hostHandle=[R22Native]::Observe([uint32]$id.hostPid)
 if($hostHandle.startFileTime.ToString() -cne $id.hostStart){throw 'HOST_IDENTITY_REFUSED'}
 $script:self=[R22Native]::Observe([uint32]$PID)
 if($m.scenario -eq 'observer-shared'){if(-not [R23ANative]::JoinOwnedConsole([uint32]$id.hostPid,$id.hostStart)){throw 'TEST_OBSERVER_ATTACH_FAILED'}}
 elseif($m.scenario -ne 'diagnostic'){if(-not [R23Native]::ConsoleReady($false)){throw 'OBSERVER_PRIVATE_CONSOLE_FAILED'}}
 $console=@(Members-A)
 Save-A 'observer-ready.json' @{pid=$native.pid;startFileTime=$native.startFileTime.ToString();nonce=$m.nonce;observerPid=$PID;observerStart=$self.startFileTime.ToString();members=$console;jobActive=[R23Native]::JobActive($job);jobFlags=[R23Native]::JobFlags($job)}
 if($m.scenario -eq 'observer-exit'){Start-Sleep -Milliseconds 100;Save-A 'observer-exited.json' @{intentionalExit=$true;nativeHandleObserved=$false;unknown=$true};exit 7}
 $clock=[Diagnostics.Stopwatch]::StartNew();$hostLost=$false
 while(-not [R22Native]::Exited($native,50)){
  if([R22Native]::Exited($hostHandle,0)){
   $hostLost=$true;$script:started=New-Object R23Started;$script:started.process=$native;$script:started.job=$job
   Cleanup-A $started 'observer-disposition'
  }
  if($clock.ElapsedMilliseconds -gt 15000){throw 'OBSERVER_DEADLINE_UNKNOWN'}
 }
 Save-A 'observer-final.json' @{pid=$native.pid;startFileTime=$native.startFileTime.ToString();exitCode=[R22Native]::ExitCode($native);exitAt=[R22Native]::ExitAt($native);nonce=$m.nonce;jobActive=[R23Native]::JobActive($job);jobFlags=[R23Native]::JobFlags($job);hostLost=$hostLost;hostExitCode=$(if($hostLost){[R22Native]::ExitCode($hostHandle)}else{$null});hostExitAt=$(if($hostLost){[R22Native]::ExitAt($hostHandle)}else{$null});nativeHandleObserved=$true;independentNativeHandle=$true;unknown=$false}
}catch{if($run){Save-A 'observer-error.json' @{reason=$_.Exception.Message;unknown=$true}};exit 2}
finally{if($native){[R22Native]::CloseHandle($native.handle)|Out-Null};if($hostHandle){[R22Native]::CloseHandle($hostHandle.handle)|Out-Null};if($job -ne [IntPtr]::Zero){[R22Native]::CloseHandle($job)|Out-Null};if($self){[R22Native]::CloseHandle($self.handle)|Out-Null}}
