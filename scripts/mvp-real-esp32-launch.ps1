param(
 [Parameter(Mandatory=$true)][string]$RunDirectory,
 [Parameter(Mandatory=$true)][ValidateSet('REGISTER_NEW','RESUME_EXISTING_DEVICE')][string]$RegistrationMode
)
$ErrorActionPreference='Stop'
function Write-MvpUtf8Json {
 param([Parameter(Mandatory=$true)]$Child,[Parameter(Mandatory=$true)][string]$Json)
 $utf8Bytes=$null
 try {
  $utf8Bytes=[Text.Encoding]::UTF8.GetBytes($Json)
  $Child.StandardInput.BaseStream.Write($utf8Bytes,0,$utf8Bytes.Length)
  $Child.StandardInput.BaseStream.Flush()
  $Child.StandardInput.Close()
 } finally {
  if($null -ne $utf8Bytes){[Array]::Clear($utf8Bytes,0,$utf8Bytes.Length)}
  $utf8Bytes=$null
 }
}
$run=[IO.Path]::GetFullPath($RunDirectory)
if([IO.Path]::GetDirectoryName($run) -cne 'C:\DATN\test-instances\phase13-3b' -or [IO.Path]::GetFileName($run) -notmatch '^mvp-real-esp32-\d+-[a-f0-9]+$'){throw 'RUN_PATH_REFUSED'}
$plan=Get-Content -LiteralPath (Join-Path $run 'prepared.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($plan.version -ne 2 -or $plan.registrationMode -cne $RegistrationMode){throw 'EXPLICIT_REGISTRATION_PLAN_REQUIRED'}
if(Test-Path -LiteralPath (Join-Path $run 'attempt.json')){throw 'PREVIOUS_ATTEMPT_NO_RETRY'}
Write-Host 'ONE DEV ingestion session. Existing backend MQTT account. No observer account/ACL changes. No ON/OFF.'
$confirm=Read-Host 'Keep pump adapter unplugged, ESP32 USB only. Type PUMP UNPLUGGED USB ONLY'
if($confirm -cne 'PUMP UNPLUGGED USB ONLY'){throw 'OPERATOR_CANCELLED'}
$credential=Get-Credential -UserName 'smartagri_backend' -Message 'Existing BACKEND MQTT password only - not PostgreSQL'
if($null -eq $credential -or $credential.UserName -cne 'smartagri_backend'){throw 'BACKEND_ACCOUNT_REFUSED'}
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mvp-real-esp32-session.cjs" --execute "'+$run+'"'
$info.WorkingDirectory=$run;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0';TEMP=$env:TEMP;TMP=$env:TMP}.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
$p=New-Object Diagnostics.Process;$p.StartInfo=$info;$plain=$null;$json=$null
try{
 if(-not $p.Start()){throw 'NATIVE_START_FAILED'}
 $err=$p.StandardError.ReadToEndAsync();$plain=$credential.GetNetworkCredential().Password
 $json=@{username=$credential.UserName;password=$plain;operatorConfirmed=$true;registrationMode=$RegistrationMode}|ConvertTo-Json -Compress
 Write-MvpUtf8Json -Child $p -Json $json
 $plain=$null;$json=$null;$credential=$null
 while($null -ne ($line=$p.StandardOutput.ReadLine())){Write-Host $line}
 $p.WaitForExit();$errorText=$err.GetAwaiter().GetResult();if($errorText){Write-Host $errorText}
 Write-Host ('DEV session ended, exit '+$p.ExitCode+'. Do not rerun. Evidence retained.')
}finally{$plain=$null;$json=$null;$credential=$null;$p.Dispose()}
