# Pure helper definitions; no launch at import. No credential reading or console capture.
function Write-R23Evidence([string]$Name,$Value){
 if($Name -notmatch '^[a-z0-9-]+\.json$'){throw 'EVIDENCE_NAME_REFUSED'}
 $dest=Join-Path $script:run $Name;$bytes=[Text.Encoding]::UTF8.GetBytes(($Value|ConvertTo-Json -Depth 16 -Compress))
 $f=[IO.File]::Open(($dest+'.pending'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()};[IO.File]::Move(($dest+'.pending'),$dest)
}
function Invoke-R23Check([ValidateSet('verify-run','inspect','postcheck')][string]$Check){
 $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName='C:\Program Files\nodejs\node.exe'
 $info.Arguments='"'+(Join-Path $PSScriptRoot 'phase13-5d1g-r23-executor.cjs')+'" '+$Check+' "'+$script:run+'" '+$script:ManifestHash
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear();$info.EnvironmentVariables['SystemRoot']='C:\Windows';$info.EnvironmentVariables['WINDIR']='C:\Windows';$info.EnvironmentVariables['TEMP']=$script:run;$info.EnvironmentVariables['TMP']=$script:run
 $proc=New-Object Diagnostics.Process;$proc.StartInfo=$info;if(-not $proc.Start()){throw 'NODE_INSPECTION_START_FAILED'}
 $stdout=$proc.StandardOutput.ReadToEndAsync();$stderr=$proc.StandardError.ReadToEndAsync()
 if(-not $proc.WaitForExit(15000)){throw 'NODE_INSPECTION_UNKNOWN_NO_RETRY'}
 if($proc.ExitCode -ne 0 -or $stderr.Result.Length -ne 0){throw ('NODE_GATE_FAILED_'+$Check+'_'+$stderr.Result.Trim())}
 return ($stdout.Result|ConvertFrom-Json)
}
function Initialize-R23([string]$Directory,[string]$Hash){
 $script:run=[IO.Path]::GetFullPath($Directory);$base=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\phase13-5d1g-r23'))
 if([IO.Path]::GetDirectoryName($script:run) -ine $base -or [IO.Path]::GetFileName($script:run) -notmatch '^r23-[a-z0-9-]{1,60}$' -or $Hash -cnotmatch '^[A-F0-9]{64}$'){throw 'RUN_PATH_OR_HASH_REFUSED'}
 $script:ManifestHash=$Hash;$script:manifest=(Invoke-R23Check 'verify-run').manifest
 Add-Type -Path @((Join-Path $PSScriptRoot 'phase13-5d1g-r22-native.cs'),(Join-Path $PSScriptRoot 'phase13-5d1g-r23-native.cs'))
}
function Get-R23Members{ $members=New-Object uint32[] 64;$count=[R22Native]::GetConsoleProcessList($members,64);if($count -eq 0 -or $count -gt 64){throw 'CONSOLE_MEMBERS_UNKNOWN'};return @($members[0..($count-1)]) }
function Test-R23Identity($Process,[uint32]$ExpectedPid,[string]$ExpectedStart,[string]$ExpectedImage){return $Process.pid -eq $ExpectedPid -and $Process.startFileTime.ToString() -ceq $ExpectedStart -and $Process.image -ieq $ExpectedImage}
