param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($RunDirectory)
if([IO.Path]::GetDirectoryName($run) -cne 'C:\DATN\test-instances\phase13-3b' -or [IO.Path]::GetFileName($run) -notmatch '^preflight-process-diagnostic-\d+-[a-f0-9]+$'){throw 'DIAGNOSTIC_PATH_REFUSED'}
function Write-NewMetadata($Name,$Value){
 $bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Compress -Depth 5))
 $file=[IO.File]::Open((Join-Path $run $Name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$file.Write($bytes,0,$bytes.Length)}finally{$file.Dispose()}
}
$self=[Diagnostics.Process]::GetCurrentProcess()
Write-NewMetadata 'outer-self.json' @{pid=$PID;processStartUTC=$self.StartTime.ToUniversalTime().ToString('o');recordedAt=[DateTime]::UtcNow.ToString('o')}
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mvp-preflight-process-diagnostic.cjs" --node-preflight "'+$run+'"'
$info.WorkingDirectory='C:\DATN\Project_datn';$info.UseShellExecute=$false;$info.CreateNoWindow=$true
$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0';TEMP='C:\Windows\Temp';TMP='C:\Windows\Temp'}.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
$p=New-Object Diagnostics.Process;$p.StartInfo=$info
try{
 if(-not $p.Start()){throw 'NODE_START_FAILED'}
 Write-NewMetadata 'node-native-start.json' @{pid=$p.Id;parentPid=$PID;processStartUTC=$p.StartTime.ToUniversalTime().ToString('o');recordedAt=[DateTime]::UtcNow.ToString('o')}
 $out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync()
 $done=$p.WaitForExit(40000)
 if(-not $done){
  Write-NewMetadata 'node-native-exit.json' @{pid=$p.Id;parentPid=$PID;exitCode=$null;timeout=$true;signal=$null;error='NODE_DEADLINE_NO_KILL';endedAt=[DateTime]::UtcNow.ToString('o')}
  if(-not (Test-Path -LiteralPath (Join-Path $run 'stop.request'))){Write-NewMetadata 'stop.request' @{reason='NODE_DEADLINE_NO_KILL'}}
  exit 1
 }
 $code=$p.ExitCode
 $stdout=$out.GetAwaiter().GetResult();$stderr=$err.GetAwaiter().GetResult()
 Write-NewMetadata 'node-native-exit.json' @{pid=$p.Id;parentPid=$PID;exitCode=$code;timeout=$false;signal=$null;error=$null;stdoutBytes=[Text.Encoding]::UTF8.GetByteCount($stdout);stderrBytes=[Text.Encoding]::UTF8.GetByteCount($stderr);endedAt=[DateTime]::UtcNow.ToString('o')}
 exit $code
}finally{$p.Dispose();$self.Dispose()}
