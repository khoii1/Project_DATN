[CmdletBinding()]
param([ValidateSet('INSPECT','DISPOSE')][string]$Mode='INSPECT')
$ErrorActionPreference='Stop'
Add-Type -Path @((Join-Path $PSScriptRoot 'phase13-5d1g-r22-native.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23-native.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23a-disposition.cs'))
$expected=@(
 @{runId='r23-1793118266854-70cd449e';pid=8580;start='134375918683355399';hash='07F002E788F2DEAFCAAF4DF74E93E6F56EC02CFCF5A626A8A843DB2A7F724F40'},
 @{runId='r23-1793118269698-1d1437b5';pid=7376;start='134375918710140004';hash='16EACEFE35DA401ED60C9308953A2C8F23EE75C5A9B4D23DDE914C5CE94E135C'}
)
$base=Join-Path $PSScriptRoot '..\build\phase13-5d1g-r23a';$run=Join-Path $base ('disposition-'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8))
if(Test-Path -LiteralPath $run){throw 'DISPOSITION_EVIDENCE_EXISTS'}
New-Item -ItemType Directory -Path $run|Out-Null
function Save([string]$Name,$Value){$file=Join-Path $run $Name;$b=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 12));$f=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($b,0,$b.Length);$f.Flush($true)}finally{$f.Dispose()}}
Save 'before-source-hashes.json' @(Get-ChildItem -LiteralPath $PSScriptRoot -File|Where-Object {$_.Name -match '^phase13-5d1g-r23[-.]'}|ForEach-Object{@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}})
foreach($e in $expected){
 $dir=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('..\build\phase13-5d1g-r23\'+$e.runId)))
 $id=Get-Content -LiteralPath (Join-Path $dir 'identity.json') -Raw|ConvertFrom-Json;$manifest=Get-Content -LiteralPath (Join-Path $dir 'manifest.json') -Raw|ConvertFrom-Json
 $exe=Join-Path $dir 'fixture.exe'
 if($manifest.kind -cne 'TEST' -or $manifest.runId -cne $e.runId -or $manifest.sources.'phase13-5d1g-r23-fixture.cs' -cne '6833147CF784F8FFF247B88FF4D48FF3CE70B4461C9DCEA3B909FCB511351F87' -or $id.pid -ne $e.pid -or $id.startFileTime -cne $e.start -or $id.image -ine $exe -or $id.imageHash -cne $e.hash -or (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -cne $e.hash){throw 'HISTORICAL_MANIFEST_OR_IDENTITY_DRIFT'}
 $p=$null;$job=[IntPtr]::Zero
 try{
  $p=[R22Native]::Observe([uint32]$e.pid)
  $owner=[R23ADisposition]::Owner($p.handle);$cim=Get-CimInstance Win32_Process -Filter ('ProcessId='+$e.pid) -ErrorAction Stop
  $suspended=[R23ADisposition]::Suspended([uint32]$e.pid);$active= -not [R22Native]::Exited($p,0)
  $jobState=@{status='NOT_QUERYABLE';active=$null;flags=$null}
  try{$job=[R23Native]::OpenJob($id.jobName);$jobState=@{status='VERIFIED';active=[R23Native]::JobActive($job);flags=[R23Native]::JobFlags($job)}}catch{}
  $proof=@{runId=$e.runId;pid=$p.pid;startFileTime=$p.startFileTime.ToString();image=$p.image;imageHash=(Get-FileHash -LiteralPath $p.image -Algorithm SHA256).Hash;ownerSid=$owner;parentPid=$cim.ParentProcessId;recordedParentPid=$id.supervisorPid;active=$active;suspended=$suspended;job=$jobState;at=[DateTimeOffset]::UtcNow.ToString('o');originalOutcomeSha256=(Get-FileHash -LiteralPath (Join-Path $dir 'outcome.json') -Algorithm SHA256).Hash}
  Save ($e.runId+'-inspection.json') $proof
  if($p.startFileTime.ToString() -cne $e.start -or $p.image -ine $exe -or $owner -cne 'S-1-5-21-1432835263-483988321-3159128977-1001' -or -not $active -or -not $suspended -or $cim.ParentProcessId -ne $id.supervisorPid){throw 'MANUAL_DISPOSITION_BLOCKED'}
  if($Mode -eq 'DISPOSE'){
   Save ($e.runId+'-disposition-attempt.json') @{approval='R2.3A-d2cf30f0-054e-4ef6-8f87-e9db517c1da7';status='ABNORMAL_FIXTURE_DISPOSITION';identity=$proof;graceful=$false;maxCalls=1}
   $exit=[R23ADisposition]::TerminateOwnedFixture([uint32]$e.pid,$e.start,$exe,$e.hash)
   if(-not [R22Native]::Exited($p,0) -or [R22Native]::ExitCode($p) -ne $exit){throw 'DISPOSITION_NATIVE_EXIT_UNKNOWN'}
   Save ($e.runId+'-disposition-result.json') @{status='ABNORMAL_FIXTURE_DISPOSITION';pid=$p.pid;startFileTime=$p.startFileTime.ToString();nativeExitCode=$exit;nativeExitAt=[R22Native]::ExitAt($p);nativeHandleObserved=$true;matchingProcessExited=$true;graceful=$false;originalOutcomeSha256=(Get-FileHash -LiteralPath (Join-Path $dir 'outcome.json') -Algorithm SHA256).Hash}
  }
 }finally{if($p){[R22Native]::CloseHandle($p.handle)|Out-Null};if($job -ne [IntPtr]::Zero){[R22Native]::CloseHandle($job)|Out-Null}}
}
[Console]::WriteLine('DISPOSITION_EVIDENCE: '+[IO.Path]::GetFullPath($run))
