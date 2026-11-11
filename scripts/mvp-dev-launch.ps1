param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn'
$base='C:\DATN\test-instances\phase13-3b'
$resolved=[IO.Path]::GetFullPath($RunDirectory)
if(-not $resolved.StartsWith($base+'\mvp-dev-',[StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath (Join-Path $resolved 'prepared.json'))){throw 'DEV_RUN_REFUSED'}
$claim=Join-Path $resolved 'operator-launch.json'
$stream=[IO.File]::Open($claim,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$bytes=[Text.Encoding]::UTF8.GetBytes((@{at=[DateTimeOffset]::UtcNow.ToString('o');pid=$PID;kind='ONE_DEV_ACCEPTANCE_SESSION'}|ConvertTo-Json));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Host 'Smart Agriculture DEV ONLY: existing TEST cluster55433, new smart_agriculture_mvp_dev.'
Write-Host 'Enter phase13_test_admin TEST password only. No production password. No transcript/recording.'
$secure=Read-Host 'Existing TEST phase13_test_admin password' -AsSecureString
if($secure.Length -eq 0){throw 'EMPTY_TEST_PASSWORD_STOP'}
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$plain=$null
try {
 $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName='C:\Program Files\nodejs\node.exe'
 $info.Arguments='"'+(Join-Path $repo 'scripts\mvp-dev-runtime.cjs')+'" --execute "'+$resolved+'"'
 $info.WorkingDirectory=$resolved
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear()
 foreach($key in @('SystemRoot','WINDIR','TEMP','TMP','PATH')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
 $process=New-Object Diagnostics.Process;$process.StartInfo=$info
 if(-not $process.Start()){throw 'DEV_RUNNER_NOT_STARTED'}
 $out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync()
 $process.StandardInput.WriteLine((@{adminPassword=$plain}|ConvertTo-Json -Compress))
 $process.StandardInput.Close();$plain=$null
 $process.WaitForExit()
 # Runner output contains stage metadata only. Credentials never logged.
 $out.GetAwaiter().GetResult()|Set-Content -LiteralPath (Join-Path $resolved 'runner.stdout.log') -Encoding UTF8
 $err.GetAwaiter().GetResult()|Set-Content -LiteralPath (Join-Path $resolved 'runner.stderr.log') -Encoding UTF8
 @{at=[DateTimeOffset]::UtcNow.ToString('o');exitCode=$process.ExitCode;autoRetry=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $resolved 'native-outcome.json') -Encoding UTF8
 Write-Host ('DEV session ended. Native exit: '+$process.ExitCode+'. Do not rerun this session.')
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$plain=$null;$secure.Dispose() }
