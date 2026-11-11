param([string]$RunDirectory,[string]$ManifestHash)
$ErrorActionPreference='Stop';. (Join-Path $PSScriptRoot 'phase13-5d1g-r23a-common.ps1')
$script:started=$null;$script:resumed=$false;$guest=$null;$script:self=$null;$script:observerPid=$null;$script:observerStart=$null;$observerHandle=$null;$handoff=$false
try{
 Initialize-A $RunDirectory $ManifestHash
 Save-A 'host-attempt.json' @{mode='SYNTHETIC_ONLY';nonce=$m.nonce;at=[DateTimeOffset]::UtcNow.ToString('o')}
 if(-not [R23Native]::ConsoleReady($false)){throw 'CONSOLE_UNAVAILABLE'};$script:self=[R22Native]::Observe([uint32]$PID)
 $initial=Snapshot-A 'initial' @($PID) 'BEFORE_CREATE';if($initial.count -ne 1 -or $initial.members[0] -ne $PID){throw 'INITIAL_MEMBERS_REFUSED'}
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe';$info.Arguments='/nologo /target:exe /out:"'+(Join-Path $run 'fixture.exe')+'" "'+(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-fixture.cs')+'"';$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $compiler=New-Object Diagnostics.Process;$compiler.StartInfo=$info;if(-not $compiler.Start()){throw 'COMPILE_START_FAILED'};$o=$compiler.StandardOutput.ReadToEndAsync();$e=$compiler.StandardError.ReadToEndAsync();if(-not $compiler.WaitForExit(5000) -or $compiler.ExitCode -ne 0){throw 'COMPILE_FAILED'}
 $script:fixtureImageHash=(Get-FileHash -LiteralPath (Join-Path $run 'fixture.exe') -Algorithm SHA256).Hash
 $role=if($m.scenario -in @('exit7','missing-member')){$m.scenario}else{'success'}
 $script:started=[R23ANative]::Launch($run,$role,$true);$child=$started.process
 Save-A 'identity.json' @{pid=$child.pid;startFileTime=$child.startFileTime.ToString();image=$child.image;imageHash=(Get-FileHash -LiteralPath $child.image -Algorithm SHA256).Hash;nonce=$m.nonce;jobName=$started.jobName;hostPid=$PID;hostStart=$self.startFileTime.ToString();createdSuspended=$true}
 if($started.error){throw 'SUSPENDED_IDENTITY_UNKNOWN'}
 $null=Snapshot-A 'created-suspended' @($PID,$child.pid) 'DIAGNOSTIC_ONLY_NO_RESUME'
 $observer=Start-Process -FilePath 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList @('-NoLogo','-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-observer.ps1'),'-RunDirectory',$run,'-ManifestHash',$ManifestHash) -WindowStyle Hidden -PassThru
 $script:observerPid=$observer.Id;$clock=[Diagnostics.Stopwatch]::StartNew();$ready=Join-Path $run 'observer-ready.json'
 while(-not(Test-Path -LiteralPath $ready)){if($clock.ElapsedMilliseconds -gt 8000 -or $observer.HasExited){throw 'OBSERVER_NOT_READY'};Start-Sleep -Milliseconds 20}
 $proof=Get-Content -LiteralPath $ready -Raw|ConvertFrom-Json;$script:observerStart=$proof.observerStart
 $observerHandle=[R22Native]::Observe([uint32]$observer.Id)
 if($observerHandle.startFileTime.ToString() -cne $proof.observerStart -or $proof.pid -ne $child.pid -or $proof.startFileTime -cne $child.startFileTime.ToString() -or $proof.nonce -cne $m.nonce){throw 'OBSERVER_PROOF_REFUSED'}
 if($m.scenario -eq 'unexpected-member'){
  $guest=[R23ANative]::Launch($run,'guest',$false)
  Save-A 'guest-identity.json' @{pid=$guest.process.pid;startFileTime=$guest.process.startFileTime.ToString();image=$guest.process.image;hash=$fixtureImageHash}
  $wait=[Diagnostics.Stopwatch]::StartNew();while(@(Members-A) -notcontains $guest.process.pid){if($wait.ElapsedMilliseconds -gt 1500){throw 'GUEST_ATTACH_NOT_VERIFIED'};Start-Sleep -Milliseconds 10}
 }
 if($m.scenario -eq 'observer-exit'){Start-Sleep -Milliseconds 250}
 $expected=if($m.scenario -eq 'diagnostic'){@($PID,$child.pid)}else{@($PID)}
 $gate=Snapshot-A 'pre-resume' $expected 'STAGE_BOUND_CONSOLE_CHECK'
 if($gate.childSuspendedObserved -ne $true){throw 'SUSPENDED_STAGE_NOT_PROVED'}
 $requestPid=$child.pid;$requestStart=$child.startFileTime.ToString();$checkHandle=$child
 if($m.scenario -eq 'wrong-pid'){$requestPid++};if($m.scenario -in @('wrong-start','pid-reuse')){$requestStart='1'};if($m.scenario -eq 'handle-mismatch'){$checkHandle=$self}
 if($checkHandle.pid -ne $requestPid -or $checkHandle.startFileTime.ToString() -cne $requestStart){throw 'NATIVE_IDENTITY_REFUSED'}
 if([R22Native]::Exited($observerHandle,0)){Save-A 'observer-exit-native.json' @{pid=$observerHandle.pid;startFileTime=$observerHandle.startFileTime.ToString();exitCode=[R22Native]::ExitCode($observerHandle);exitAt=[R22Native]::ExitAt($observerHandle);nativeHandleObserved=$true};throw 'OBSERVER_EXITED_BEFORE_RESUME'}
 if($m.scenario -eq 'diagnostic'){
  if($gate.count -ne 2 -or $gate.members -notcontains [uint32]$PID -or $gate.members -notcontains $child.pid){throw 'FINAL_CONSOLE_MEMBERS_REFUSED'}
 }elseif($gate.count -ne 1 -or $gate.members[0] -ne $PID){throw 'FINAL_CONSOLE_MEMBERS_REFUSED'}
 if($m.scenario -eq 'suspended-gate-error'){throw 'INJECTED_SUSPENDED_GATE_ERROR'}
 if($m.scenario -eq 'host-exit'){
  $handoff=$true;Save-A 'outcome.json' @{status='BLOCKED';reason='HOST_EXIT_BEFORE_RESUME';resumed=$false;retry=$false;realInitdbEnabled=$false};exit 0
 }
 Save-A 'pre-resume-accepted.json' @{profile='SYNTHETIC_PHASED_ONLY';nativeIdentityVerified=$true;observerReady=$true;hostConsoleMembers=$gate.members;childConsoleMembershipNotYetVerified=$true;realInitdbSafe=$false}
 [R22Native]::Resume($child);$script:resumed=$true
 $attach=[Diagnostics.Stopwatch]::StartNew();$attached=$false
 while(-not [R22Native]::Exited($child,0)){
  $members=@(Members-A);if(@($members|Where-Object {$_ -ne $PID -and $_ -ne $child.pid}).Count -gt 0){$null=Snapshot-A 'post-resume' @($PID,$child.pid) 'UNKNOWN_MEMBER';throw 'FINAL_CONSOLE_MEMBERS_REFUSED'}
  if($members.Count -eq 2 -and $members -contains [uint32]$PID -and $members -contains $child.pid){$attached=$true;break}
  if($attach.ElapsedMilliseconds -gt 500){break};Start-Sleep -Milliseconds 10
 }
 $post=Snapshot-A 'post-resume' @($PID,$child.pid) $(if($attached){'ATTACH_OBSERVED'}else{'CHILD_MEMBERSHIP_MISSING'})
 if(-not $attached){throw 'POST_RESUME_CHILD_MEMBERSHIP_MISSING'}
 Save-A 'console-interval.json' @{unverifiedConsoleIntervalMs=$attach.ElapsedMilliseconds;profile='SYNTHETIC_ONLY';realInitdbSafe=$false}
 $clock=[Diagnostics.Stopwatch]::StartNew();while(-not [R22Native]::Exited($child,20)){
  $members=@(Members-A)
  if($members.Count -ne 2 -or $members -notcontains [uint32]$PID -or $members -notcontains $child.pid){if(-not [R22Native]::Exited($child,0)){$null=Snapshot-A 'monitor-refusal' @($PID,$child.pid) 'ATTACHED_MEMBERSHIP_LOST';throw 'POST_RESUME_CONSOLE_MEMBERS_REFUSED'}}
  if([R22Native]::Exited($observerHandle,0)){throw 'OBSERVER_EXITED_DURING_CHILD'}
  if($clock.ElapsedMilliseconds -gt 5000){throw 'NATIVE_TIMEOUT'}
 }
 Save-A 'outcome.json' @{status=$(if([R22Native]::ExitCode($child) -eq 0){'SYNTHETIC_PASS'}else{'BLOCKED'});reason=$(if([R22Native]::ExitCode($child) -eq 0){'CONFIRMED'}else{'NATIVE_NONZERO'});exitCode=[R22Native]::ExitCode($child);resumed=$resumed;retry=$false;realInitdbEnabled=$false}
}catch{
 if($started){Cleanup-A $started 'host-disposition'}
 if($guest){Cleanup-A $guest 'guest-disposition'}
 if($run){Save-A 'outcome.json' @{status='BLOCKED';reason=$_.Exception.Message;resumed=$resumed;retry=$false;realInitdbEnabled=$false}}
}finally{
 if($started -and -not $handoff -and [R22Native]::Exited($started.process,0)){Save-A 'host-native-final.json' @{pid=$started.process.pid;startFileTime=$started.process.startFileTime.ToString();exitCode=[R22Native]::ExitCode($started.process);exitAt=[R22Native]::ExitAt($started.process);nonce=$m.nonce;nativeHandleObserved=$true;independentNativeHandle=$false;unknown=$false;jobActive=[R23Native]::JobActive($started.job);jobFlags=[R23Native]::JobFlags($started.job)}}
 Close-A $guest;Close-A $started;if($self){[R22Native]::CloseHandle($self.handle)|Out-Null};if($observerHandle){[R22Native]::CloseHandle($observerHandle.handle)|Out-Null}
}
