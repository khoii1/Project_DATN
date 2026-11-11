param([Parameter(Mandatory=$true)][string]$ExecutorSHA256)
$ErrorActionPreference='Stop'
$repo='C:\DATN\Project_datn';$run='C:\DATN\test-instances\phase13-3b\test-auth-recovery-1793189718289-2f71e8'
$executor=Join-Path $repo 'scripts\mvp-test-password-reset.cjs'
$session='console-session-'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+'-'+[Guid]::NewGuid().ToString('N').Substring(0,6)
if((Get-FileHash -LiteralPath $executor -Algorithm SHA256).Hash -cne $ExecutorSHA256){throw 'RESET_EXECUTOR_HASH_MISMATCH'}
if(Test-Path -LiteralPath (Join-Path $run 'password-reset.attempt.json')){throw 'RESET_ALREADY_ATTEMPTED_NO_RETRY'}
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class TestRecoveryConsole {
 [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr p,uint d,uint f,IntPtr t);
 [DllImport("kernel32.dll")] static extern bool GetConsoleMode(IntPtr h,out uint mode);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 public static bool Available(){IntPtr h=CreateFile("CONIN$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);if(h==new IntPtr(-1))return false;try{uint mode;return GetConsoleMode(h,out mode);}finally{CloseHandle(h);}}
}
'@
if([Console]::IsInputRedirected -or [TestRecoveryConsole]::GetConsoleWindow() -eq [IntPtr]::Zero -or -not [TestRecoveryConsole]::Available()){throw 'ATTACHED_NATIVE_CONSOLE_REQUIRED'}
$inspection=Get-Content -LiteralPath (Join-Path $run 'inspection-summary.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($inspection.status -cne 'ROLE_VALID_AWAIT_OPERATOR_RESET_CONFIRMATION' -or $inspection.role.systemId -cne '7698826681383327460'){throw 'ROLE_PROOF_REFUSED'}
Write-Host 'TEST ONLY: 127.0.0.1:55433, systemID 7698826681383327460.'
Write-Host 'Existing role verified: phase13_test_admin, LOGIN/SUPERUSER/CREATEDB/CREATEROLE. No privileges will change.'
Write-Host 'One password reset only; then one native login verification. No DEV provisioning or production access.'
Write-Host 'Do not enable transcript/recording. Do not use your production password. Keep pump power disconnected.'
$confirmation=Read-Host 'To confirm the one TEST reset, type exactly: RESET TEST phase13_test_admin ONCE'
if($confirmation -cne 'RESET TEST phase13_test_admin ONCE'){throw 'OPERATOR_DID_NOT_CONFIRM_NO_RESET'}
Write-Host 'Choose a NEW TEST password: 16-128 printable ASCII characters, no spaces. Enter twice; input is hidden.'
$first=Read-Host 'New TEST password' -AsSecureString
$second=Read-Host 'Confirm NEW TEST password' -AsSecureString
$p1=[IntPtr]::Zero;$p2=[IntPtr]::Zero;$a=$null;$b=$null;$json=$null
try{
 $p1=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($first);$p2=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
 $a=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p1);$b=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p2)
 if($a -cne $b){throw 'PASSWORD_CONFIRMATION_MISMATCH_NO_RESET'}
 if($a -cnotmatch '^[\x21-\x7e]{16,128}$'){throw 'PASSWORD_FORMAT_REFUSED_NO_RESET'}
 $json=@{confirmation=$confirmation;password=$a}|ConvertTo-Json -Compress
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName='C:\Program Files\nodejs\node.exe';$info.Arguments='"'+$executor+'" --execute-once'
 $info.WorkingDirectory=$run;$info.UseShellExecute=$false;$info.CreateNoWindow=$false
 $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.EnvironmentVariables.Clear()
 foreach($key in @('SystemRoot','WINDIR','TEMP','TMP')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
 # preflight launches powershell.exe; retain only the two required system search directories.
 $info.EnvironmentVariables['PATH']='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0'
 $process=New-Object Diagnostics.Process;$process.StartInfo=$info
 if(-not $process.Start()){throw 'RESET_RUNNER_START_FAILED'}
 $out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync()
 $process.StandardInput.WriteLine($json);$process.StandardInput.Close()
 $a=$null;$b=$null;$json=$null
 Write-Host 'Checking TEST gates. Wait for the native PostgreSQL password prompt; reset success has NOT yet been confirmed.'
 $process.WaitForExit()
 # Runner emits only redacted status, never password/verifier or SQL.
 $stdout=$out.GetAwaiter().GetResult();$stderr=$err.GetAwaiter().GetResult()
 $outcome=@{at=[DateTimeOffset]::UtcNow.ToString('o');session=$session;exitCode=$process.ExitCode;executorSha256=$ExecutorSHA256;passwordRecorded=$false}|ConvertTo-Json -Compress
 foreach($item in @(@(($session+'.stdout.log'),$stdout),@(($session+'.stderr.log'),$stderr),@(($session+'.outcome.json'),$outcome))){
  $stream=[IO.File]::Open((Join-Path $run $item[0]),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try{$bytes=[Text.Encoding]::UTF8.GetBytes($item[1]);$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
 }
 Write-Host $stdout
 if($process.ExitCode -ne 0){Write-Host $stderr -ForegroundColor Red}
 Write-Host ('Session ended. Native runner exit '+$process.ExitCode+'. Do not run again.')
}finally{
 if($p1 -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p1)}
 if($p2 -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p2)}
 $first.Dispose();$second.Dispose();$a=$null;$b=$null;$json=$null
}
