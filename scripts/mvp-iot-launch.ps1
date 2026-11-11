param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$root='C:\DATN\test-instances\phase13-3b'
$run=[IO.Path]::GetFullPath($RunDirectory)
if([IO.Path]::GetDirectoryName($run) -ne $root -or [IO.Path]::GetFileName($run) -notmatch '^mvp-iot-[0-9]+-[a-f0-9]+$'){throw 'IOT_RUN_PATH_REFUSED'}
Write-Host 'READ-ONLY MQTT observation into TEST DEV only. No ON/OFF. Keep pump adapter disconnected.'
Write-Host 'Use an EXISTING MQTT account authorized to read ESP32 telemetry/status/actuator/state. Do not use a PostgreSQL password.'
$credential=Get-Credential -Message 'Existing MQTT read credential — DEV observation only; no publishing'
if($null -eq $credential){throw 'OPERATOR_CANCELLED_NO_CONNECTION'}
$node='C:\Program Files\nodejs\node.exe'
$script='C:\DATN\Project_datn\scripts\mvp-iot-session.cjs'
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName=$node
$info.Arguments='"'+$script+'" --execute "'+$run+'"'
$info.WorkingDirectory=$run
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($entry in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0';TEMP=$env:TEMP;TMP=$env:TMP}.GetEnumerator()){$info.EnvironmentVariables[$entry.Key]=$entry.Value}
$p=New-Object Diagnostics.Process
$p.StartInfo=$info
$plain=$null;$json=$null
try{
 if(-not $p.Start()){throw 'IOT_NATIVE_START_FAILED'}
 $errorsTask=$p.StandardError.ReadToEndAsync()
 $plain=$credential.GetNetworkCredential().Password
 $json=@{username=$credential.UserName;password=$plain}|ConvertTo-Json -Compress
 $p.StandardInput.Write($json)
 $p.StandardInput.Close()
 $json=$null;$plain=$null;$credential=$null
 while($null -ne ($line=$p.StandardOutput.ReadLine())){Write-Host $line}
 $p.WaitForExit()
 $errorText=$errorsTask.GetAwaiter().GetResult()
 if($errorText){Write-Host $errorText}
 Write-Host ('IOT session native exit: '+$p.ExitCode+'. Do not rerun the script.')
}finally{$json=$null;$plain=$null;$credential=$null;$p.Dispose()}
