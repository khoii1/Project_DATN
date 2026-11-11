param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn';$base='C:\DATN\test-instances\phase13-3b'
$resolved=[IO.Path]::GetFullPath($RunDirectory)
if(-not $resolved.StartsWith($base+'\mvp-direct-',[StringComparison]::OrdinalIgnoreCase)){throw 'DIRECT_RUN_REFUSED'}
$plan=Get-Content -LiteralPath (Join-Path $resolved 'prepared.json') -Encoding UTF8 -Raw|ConvertFrom-Json
foreach($item in $plan.sourceHashes.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $repo ('scripts\'+$item.Name))).Hash -cne $item.Value){throw 'DIRECT_SOURCE_DRIFT'}}
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class MvpDirectConsole {
 [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr p,uint d,uint f,IntPtr t);
 [DllImport("kernel32.dll")] static extern bool GetConsoleMode(IntPtr h,out uint mode);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 public static bool NativeInputAvailable(){IntPtr h=CreateFile("CONIN$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);if(h==new IntPtr(-1))return false;try{uint mode;return GetConsoleMode(h,out mode);}finally{CloseHandle(h);}}
}
'@
if([Console]::IsInputRedirected -or [MvpDirectConsole]::GetConsoleWindow() -eq [IntPtr]::Zero -or -not [MvpDirectConsole]::NativeInputAvailable()){throw 'NATIVE_CONIN_CONSOLE_REQUIRED'}
$marker=Join-Path $resolved 'operator-direct-launch.json'
$stream=[IO.File]::Open($marker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$bytes=[Text.Encoding]::UTF8.GetBytes((@{at=[DateTimeOffset]::UtcNow.ToString('o');pid=$PID;directPsqlPrompt=$true;passwordCapturedByWrapper=$false}|ConvertTo-Json));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Host 'TEST ONLY. Native PostgreSQL psql password prompt will appear below.'
Write-Host 'Enter phase13_test_admin TEST password directly. Never production password. No transcript or recording.'
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"'+(Join-Path $repo 'scripts\mvp-dev-direct.cjs')+'" --execute "'+$resolved+'"'
$info.WorkingDirectory=$resolved;$info.UseShellExecute=$false;$info.CreateNoWindow=$false
$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($key in @('SystemRoot','WINDIR','TEMP','TMP','PATH')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
$info.EnvironmentVariables['PATH']='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0'
$process=New-Object Diagnostics.Process;$process.StartInfo=$info
if(-not $process.Start()){throw 'DIRECT_RUNNER_START_FAILED'}
$out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync()
$process.StandardInput.Close()
$process.WaitForExit()
$out.GetAwaiter().GetResult()|Set-Content -LiteralPath (Join-Path $resolved 'runner.stdout.log') -Encoding UTF8
$err.GetAwaiter().GetResult()|Set-Content -LiteralPath (Join-Path $resolved 'runner.stderr.log') -Encoding UTF8
@{at=[DateTimeOffset]::UtcNow.ToString('o');exitCode=$process.ExitCode;passwordCaptured=$false;retry=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $resolved 'native-outcome.json') -Encoding UTF8
Write-Host ('Direct TEST session ended, native exit '+$process.ExitCode+'. Do not rerun.')
