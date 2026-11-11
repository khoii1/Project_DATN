# Synthetic input only. Executes READ ONLY gates, never the reset branch or server startup.
param([switch]$OmitSafePath)
$ErrorActionPreference='Stop'
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mvp-test-password-reset.cjs" --offline-input-check'
$info.WorkingDirectory='C:\DATN\test-instances\phase13-3b\test-auth-recovery-1793189718289-2f71e8'
$info.UseShellExecute=$false;$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($key in @('SystemRoot','WINDIR','TEMP','TMP')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
if(-not $OmitSafePath){$info.EnvironmentVariables['PATH']='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0'}
$p=New-Object Diagnostics.Process;$p.StartInfo=$info
if(-not $p.Start()){throw 'SYNTHETIC_TRANSPORT_START_FAILED'}
$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync()
$synthetic=@{confirmation='RESET TEST phase13_test_admin ONCE';password='Public_Synthetic_Only_123!'}|ConvertTo-Json -Compress
$p.StandardInput.WriteLine($synthetic);$p.StandardInput.Close();$p.WaitForExit()
$stdout=$out.GetAwaiter().GetResult();$stderr=$err.GetAwaiter().GetResult()
if($OmitSafePath){if($p.ExitCode -ne 1 -or $stderr -notmatch 'READ_ONLY_PREFLIGHT'){throw 'MISSING_PATH_FAILURE_NOT_REPRODUCED'}}
else{if($p.ExitCode -ne 0 -or $stdout -notmatch 'OFFLINE_INPUT_AND_READ_ONLY_GATES_PASS'){throw 'FIXED_TRANSPORT_DID_NOT_PASS'}}
if($stdout.Contains('Public_Synthetic_Only_123!') -or $stderr.Contains('Public_Synthetic_Only_123!')){throw 'SYNTHETIC_INPUT_LEAK'}
@{test= $(if($OmitSafePath){'MISSING_PATH_REPRODUCED'}else{'FIXED_PATH_READ_ONLY_PIPELINE_PASS'});exitCode=$p.ExitCode;resetPerformed=$false;authenticationPerformed=$false}|ConvertTo-Json -Compress
