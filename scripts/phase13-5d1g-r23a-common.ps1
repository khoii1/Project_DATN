function Save-A([string]$Name,$Value){
 $file=Join-Path $script:run $Name;$b=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 16 -Compress));$f=[IO.File]::Open(($file+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$f.Write($b,0,$b.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($file+'.pending'),$file)
}
function Initialize-A([string]$Directory,[string]$Hash){
 $script:run=[IO.Path]::GetFullPath($Directory);$base=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r23a'))
 if([IO.Path]::GetDirectoryName($script:run) -ine $base -or [IO.Path]::GetFileName($script:run) -notmatch '^r23a-[a-z0-9-]+$' -or $Hash -cnotmatch '^[A-F0-9]{64}$'){throw 'OFFLINE_SCOPE_REFUSED'}
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName='C:\Program Files\nodejs\node.exe';$info.Arguments='"'+(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-offline.cjs')+'" verify "'+$run+'" '+$Hash;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear();$info.EnvironmentVariables['SystemRoot']='C:\Windows';$info.EnvironmentVariables['WINDIR']='C:\Windows';$p=New-Object Diagnostics.Process;$p.StartInfo=$info
 if(-not $p.Start()){throw 'VERIFY_START_FAILED'};$o=$p.StandardOutput.ReadToEndAsync();$e=$p.StandardError.ReadToEndAsync();if(-not $p.WaitForExit(10000) -or $p.ExitCode -ne 0 -or $e.Result.Length){throw 'VERIFY_UNKNOWN_OR_DRIFT'}
 $script:m=$o.Result|ConvertFrom-Json
 Add-Type -Path @((Join-Path $PSScriptRoot 'phase13-5d1g-r22-native.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23-native.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-disposition.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-native.cs'))
}
function Members-A{ $a=New-Object uint32[] 64;$count=[R22Native]::GetConsoleProcessList($a,64);if($count -gt 64){throw 'CONSOLE_COUNT_OVERFLOW'};if($count -eq 0){return @()};return @($a[0..($count-1)]) }
function Snapshot-A([string]$Stage,$Expected,[string]$Reason){
 $members=@(Members-A);$known=@();foreach($member in $members){$p=$null;try{$p=[R22Native]::Observe([uint32]$member);$known+=@{pid=$p.pid;startFileTime=$p.startFileTime.ToString();image=$p.image;owner=[R23ADisposition]::Owner($p.handle);verified=$true}}catch{$known+=@{pid=$member;verified=$false}}finally{if($p){[R22Native]::CloseHandle($p.handle)|Out-Null}}}
 $suspendedObserved=$null;if($script:started -and -not $script:resumed){$suspendedObserved=[R23ADisposition]::Suspended($script:started.process.pid)}
 $value=@{stage=$Stage;at=[DateTimeOffset]::UtcNow.ToString('o');hostPid=$PID;hostStartFileTime=$script:self.startFileTime.ToString();childPid=$(if($script:started){$script:started.process.pid}else{$null});childStartFileTime=$(if($script:started){$script:started.process.startFileTime.ToString()}else{$null});observerPid=$script:observerPid;observerStartFileTime=$script:observerStart;count=$members.Count;members=$members;identities=$known;expected=$Expected;reason=$Reason;childResumed=$script:resumed;childSuspendedByExecutor= -not $script:resumed;childSuspendedObserved=$suspendedObserved;visible=[R23Native]::Visible()}
 Save-A ('gate-'+$Stage+'.json') $value;return $value
}
function Cleanup-A($Owned,[string]$Label){
 if(-not $Owned){return}
 $p=$Owned.process
 if(-not [R22Native]::Exited($p,0)){
  if($m.mode -cne 'SYNTHETIC_ONLY' -or $p.image -ine (Join-Path $run 'fixture.exe')){throw 'CLEANUP_SCOPE_REFUSED'}
  $hash=$script:fixtureImageHash;if($hash -cnotmatch '^[A-F0-9]{64}$'){throw 'RECORDED_FIXTURE_HASH_MISSING'}
  Save-A ($Label+'-attempt.json') @{classification='ABNORMAL_FIXTURE_DISPOSITION';pid=$p.pid;startFileTime=$p.startFileTime.ToString();image=$p.image;imageHash=$hash;nonce=$m.nonce;graceful=$false}
  $exit=[R23ADisposition]::TerminateOwnedFixture($p.pid,$p.startFileTime.ToString(),$p.image,$hash)
  Save-A ($Label+'.json') @{classification='ABNORMAL_FIXTURE_DISPOSITION';pid=$p.pid;startFileTime=$p.startFileTime.ToString();exitCode=$exit;exitAt=[R22Native]::ExitAt($p);graceful=$false;nativeHandleObserved=$true;jobActive=[R23Native]::JobActive($Owned.job)}
 }
}
function Close-A($Owned){if($Owned){if($Owned.process.thread -ne [IntPtr]::Zero){[R22Native]::CloseHandle($Owned.process.thread)|Out-Null};[R22Native]::CloseHandle($Owned.process.handle)|Out-Null;[R22Native]::CloseHandle($Owned.job)|Out-Null}}
