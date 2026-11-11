param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($RunDirectory)
if([IO.Path]::GetDirectoryName($run) -ne 'C:\DATN\test-instances\phase13-3b' -or [IO.Path]::GetFileName($run) -notmatch '^mvp-mqtt-read-[0-9]+-[a-f0-9]+$'){throw 'RUN_REFUSED'}
Write-Host 'ONE read-only MQTT session, max 90 seconds. No database/backend/frontend. No ON/OFF.'
Write-Host 'Keep pump power disconnected. Do not use a PostgreSQL password. Do not run again after an error.'
$confirm=Read-Host 'Confirm pump unplugged, USB ESP32 and authorized broker observation: type READ MQTT ONLY'
if($confirm -cne 'READ MQTT ONLY'){throw 'OPERATOR_CANCELLED'}
$credential=Get-Credential -Message 'Existing MQTT read account - local entry only'
if($null -eq $credential){throw 'OPERATOR_CANCELLED'}
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mvp-mqtt-read-session.cjs" --execute "'+$run+'"'
$info.WorkingDirectory=$run
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($entry in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32';TEMP=$env:TEMP;TMP=$env:TMP}.GetEnumerator()){$info.EnvironmentVariables[$entry.Key]=$entry.Value}
$p=New-Object Diagnostics.Process
$p.StartInfo=$info
$plain=$null;$json=$null
try{
 if(-not $p.Start()){throw 'NATIVE_START_FAILED'}
 $errTask=$p.StandardError.ReadToEndAsync()
 $plain=$credential.GetNetworkCredential().Password
 $json=@{username=$credential.UserName;password=$plain;operatorConfirmed=$true}|ConvertTo-Json -Compress
 $p.StandardInput.Write($json);$p.StandardInput.Close()
 $json=$null;$plain=$null;$credential=$null
 while($null -ne ($line=$p.StandardOutput.ReadLine())){Write-Host $line}
 $p.WaitForExit();$err=$errTask.GetAwaiter().GetResult()
 if($err){Write-Host $err}
 Write-Host ('Session exit '+$p.ExitCode+'. Do not rerun. Evidence retained.')
}finally{$json=$null;$plain=$null;$credential=$null;$p.Dispose()}
