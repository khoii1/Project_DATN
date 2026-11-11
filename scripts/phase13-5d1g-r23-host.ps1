[CmdletBinding()]
param([ValidateSet('PLAN_ONLY','SYNTHETIC','EXECUTE')][string]$Mode='PLAN_ONLY',[string]$RunDirectory,[string]$ManifestHash)
$ErrorActionPreference='Stop'
if($Mode -eq 'PLAN_ONLY'){[Console]::WriteLine('{"mode":"PLAN_ONLY","initdbLaunched":false}');exit 0}
. (Join-Path $PSScriptRoot 'phase13-5d1g-r23-common.ps1')
$started=$null;$self=$null;$observerHandle=$null;$launched=$false;$resumed=$false;$unknown=$false
try{
 Initialize-R23 $RunDirectory $ManifestHash
 if(($Mode -eq 'EXECUTE' -and $manifest.kind -ne 'LIVE') -or ($Mode -eq 'SYNTHETIC' -and $manifest.kind -ne 'TEST')){throw 'MODE_MANIFEST_MISMATCH'}
 if(Test-Path -LiteralPath (Join-Path $run 'host-attempt.json')){throw 'HOST_ATTEMPT_EXISTS_NO_RETRY'}
 Write-R23Evidence 'host-attempt.json' @{at=[DateTimeOffset]::UtcNow.ToString('o');mode=$Mode;manifestHash=$ManifestHash;nonce=$manifest.nonce}
 if(-not [R23Native]::ConsoleReady($Mode -eq 'EXECUTE')){throw 'INTERACTIVE_CONSOLE_UNAVAILABLE'}
 $self=[R22Native]::Observe([uint32]$PID);$members=@(Get-R23Members)
 if($members.Count -ne 1 -or $members[0] -ne $PID){throw 'INITIAL_CONSOLE_MEMBERS_REFUSED'}
 Write-R23Evidence 'console-ready.json' @{supervisorPid=$PID;supervisorStartFileTime=$self.startFileTime.ToString();visible=[R23Native]::Visible();interactive=[Environment]::UserInteractive;members=$members;passwordCaptured=$false;transcriptEnabledByExecutor=$false;recordingConfirmationRequired=$Mode -eq 'EXECUTE'}
 if($Mode -eq 'EXECUTE'){
  if(-not [R23Native]::OperatorReady()){throw 'OPERATOR_NOT_READY_STOP_BEFORE_LAUNCH'}
  Write-R23Evidence 'operator-ready.json' @{operatorConfirmedVisibleReadyAndNoRecording=$true;at=[DateTimeOffset]::UtcNow.ToString('o')}
  $fresh=Invoke-R23Check 'inspect';Write-R23Evidence 'fresh-preflight.json' $fresh.preflight
  if(-not [R23Native]::Visible() -or @(Get-R23Members).Count -ne 1){throw 'FINAL_PRELAUNCH_CONSOLE_REFUSED'}
  if((Get-FileHash -LiteralPath 'C:\Program Files\PostgreSQL\17\bin\postgres.exe' -Algorithm SHA256).Hash -cne $manifest.postgresHash){throw 'BOOTSTRAP_POSTGRES_BINARY_DRIFT'}
  # Only root write before CreateProcess: new run-bound marker, exclusive create + flush, never overwrite.
  $bytes=[Text.Encoding]::UTF8.GetBytes((@{phase='13.5D.1G-R2.3';runId=$manifest.runId;approvalId=$manifest.approvalId;approvalSha256=$manifest.approvalSha256;manifestSha256=$ManifestHash;createdAt=[DateTimeOffset]::UtcNow.ToString('o');maxAttempts=1;nonce=$manifest.nonce}|ConvertTo-Json -Compress))
  $marker=[IO.File]::Open($manifest.marker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$marker.Write($bytes,0,$bytes.Length);$marker.Flush($true)}finally{$marker.Dispose()}
  $started=[R23Native]::LaunchInitdb($manifest.runId)
 }else{
  $compiler=New-Object Diagnostics.Process;$info=New-Object Diagnostics.ProcessStartInfo;$info.FileName='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
  $info.Arguments='/nologo /target:exe /out:"'+(Join-Path $run 'fixture.exe')+'" "'+(Join-Path $PSScriptRoot 'phase13-5d1g-r23-fixture.cs')+'"';$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true;$compiler.StartInfo=$info
  if(-not $compiler.Start()){throw 'FIXTURE_COMPILER_START_FAILED'};$o=$compiler.StandardOutput.ReadToEndAsync();$e=$compiler.StandardError.ReadToEndAsync()
  if(-not $compiler.WaitForExit(5000) -or $compiler.ExitCode -ne 0){throw 'FIXTURE_COMPILER_FAILED_OR_UNKNOWN'}
  $started=[R23Native]::LaunchFixture($run,$manifest.runId,$manifest.scenario -eq 'exit7')
 }
 $launched=$true;$child=$started.process
 Write-R23Evidence 'identity.json' @{pid=$child.pid;startFileTime=$child.startFileTime.ToString();image=$child.image;imageHash=(Get-FileHash -LiteralPath $child.image -Algorithm SHA256).Hash;nonce=$manifest.nonce;jobName=$started.jobName;supervisorPid=$PID;supervisorStartFileTime=$self.startFileTime.ToString();launchError=$started.error;createdSuspended=$true}
 if($started.error){throw 'CREATED_SUSPENDED_PROCESS_REQUIRES_MANUAL_DISPOSITION'}
 $observer=Start-Process -FilePath 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList @('-NoLogo','-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'phase13-5d1g-r23-observer.ps1'),'-RunDirectory',$run,'-ManifestHash',$ManifestHash) -WindowStyle Hidden -PassThru
 $clock=[Diagnostics.Stopwatch]::StartNew();$ready=Join-Path $run 'observer-ready.json'
 while(-not(Test-Path -LiteralPath $ready)){if($clock.ElapsedMilliseconds -gt 10000 -or $observer.HasExited -or (Test-Path -LiteralPath (Join-Path $run 'observer-error.json'))){throw 'OBSERVER_NOT_READY_SUSPENDED_UNKNOWN'};Start-Sleep -Milliseconds 30}
 $proof=Get-Content -LiteralPath $ready -Raw|ConvertFrom-Json;$observerHandle=[R22Native]::Observe([uint32]$observer.Id)
 if($proof.observerPid -ne $observer.Id -or -not(Test-R23Identity $observerHandle $observer.Id $proof.observerStartFileTime 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe') -or $proof.pid -ne $child.pid -or $proof.startFileTime -cne $child.startFileTime.ToString() -or $proof.nonce -cne $manifest.nonce -or $proof.jobActive -ne 1 -or $proof.jobFlags -ne 0){throw 'OBSERVER_READY_IDENTITY_REFUSED'}
 $members=@(Get-R23Members)
 if($members.Count -ne 2 -or $members -notcontains [uint32]$PID -or $members -notcontains $child.pid -or ($Mode -eq 'EXECUTE' -and -not [R23Native]::Visible())){throw 'FINAL_CONSOLE_MEMBERS_REFUSED'}
 $null=Invoke-R23Check 'verify-run'
 if((Get-FileHash -LiteralPath $child.image -Algorithm SHA256).Hash -cne $(if($Mode -eq 'EXECUTE'){$manifest.initdbHash}else{(Get-FileHash -LiteralPath (Join-Path $run 'fixture.exe') -Algorithm SHA256).Hash})){throw 'FINAL_BINARY_HASH_REFUSED'}
 Write-R23Evidence 'resume-gates.json' @{observerReady=$true;jobFlags=[R23Native]::JobFlags($started.job);members=$members;visible=[R23Native]::Visible();at=[DateTimeOffset]::UtcNow.ToString('o')}
 [R22Native]::Resume($child);$resumed=$true;$clock=[Diagnostics.Stopwatch]::StartNew()
 while(-not [R22Native]::Exited($child,100)){
  if($clock.ElapsedMilliseconds -gt 120000 -or [R22Native]::Exited($observerHandle,0) -or ($Mode -eq 'EXECUTE' -and -not [R23Native]::Visible())){$unknown=$true;throw 'UNKNOWN_NATIVE_OUTCOME'}
 }
 Write-R23Evidence 'host-native-exit.json' @{pid=$child.pid;startFileTime=$child.startFileTime.ToString();nonce=$manifest.nonce;exitCode=[R22Native]::ExitCode($child);exitAt=[R22Native]::ExitAt($child);durationMs=$clock.ElapsedMilliseconds;nativeHandleObserved=$true;nativeError=$null;signal=$null;timeout=$false;jobActive=[R23Native]::JobActive($started.job);jobFlags=[R23Native]::JobFlags($started.job)}
 $wait=[Diagnostics.Stopwatch]::StartNew();$exitFile=Join-Path $run 'observer-native-exit.json'
 while(-not(Test-Path -LiteralPath $exitFile)){if($wait.ElapsedMilliseconds -gt 10000 -or (Test-Path -LiteralPath (Join-Path $run 'observer-error.json')) -or (Test-Path -LiteralPath (Join-Path $run 'observer-unknown.json'))){throw 'OBSERVER_FINAL_OUTCOME_UNKNOWN'};Start-Sleep -Milliseconds 40}
 $done=Get-Content -LiteralPath $exitFile -Raw|ConvertFrom-Json
 if($done.pid -ne $child.pid -or $done.startFileTime -cne $child.startFileTime.ToString() -or $done.nonce -cne $manifest.nonce -or $done.exitCode -ne [R22Native]::ExitCode($child) -or $done.exitAt -cne [R22Native]::ExitAt($child) -or $done.jobActive -ne 0 -or $done.jobFlags -ne 0 -or $done.supervisorLost){throw 'NATIVE_OBSERVER_RESULT_CONFLICT'}
 $post=$null;$verdict='INITDB_NONZERO'
 if([R22Native]::ExitCode($child) -eq 0){if($Mode -eq 'EXECUTE'){$post=Invoke-R23Check 'postcheck';$verdict='INITDB_PASS'}else{$verdict='SYNTHETIC_PASS'}}
 Write-R23Evidence 'outcome.json' @{verdict=$verdict;runId=$manifest.runId;mode=$Mode;created=$launched;resumed=$resumed;postcheck=$post;forceKill=$false;retry=$false;at=[DateTimeOffset]::UtcNow.ToString('o')}
 [Console]::WriteLine('R2.3 result: '+$verdict+'. No server started; no retry. The agent will inspect metadata.')
}catch{
 if($run){Write-R23Evidence 'outcome.json' @{verdict=$(if($launched){'UNKNOWN_NATIVE_OUTCOME'}else{'BLOCKED_BEFORE_INITDB'});reason=$_.Exception.Message;mode=$Mode;created=$launched;resumed=$resumed;unknown=$true;forceKill=$false;retry=$false;at=[DateTimeOffset]::UtcNow.ToString('o')}}
 [Console]::WriteLine('STOP. No automatic retry or process termination. Agent will report the evidence.');exit 2
}finally{
 if($started){if($started.process.thread -ne [IntPtr]::Zero){[R22Native]::CloseHandle($started.process.thread)|Out-Null};[R22Native]::CloseHandle($started.process.handle)|Out-Null;[R22Native]::CloseHandle($started.job)|Out-Null}
 if($self){[R22Native]::CloseHandle($self.handle)|Out-Null};if($observerHandle){[R22Native]::CloseHandle($observerHandle.handle)|Out-Null}
}
