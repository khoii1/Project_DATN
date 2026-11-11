# Operator may run from Administrator PowerShell. Never elevates itself or prints raw CommandLine.
$ErrorActionPreference='Stop'
$ids=@(Get-NetTCPConnection -State Listen -LocalPort 1883 | Where-Object LocalAddress -in @('0.0.0.0','::') | Select-Object -ExpandProperty OwningProcess -Unique)
if($ids.Count -ne 1){throw 'LAN_INSTANCE_AMBIGUOUS_STOP'}
$p=Get-CimInstance Win32_Process -Filter "ProcessId=$($ids[0])"
if(-not $p.ExecutablePath -or -not $p.CommandLine){throw 'PROCESS_METADATA_NOT_VISIBLE_STOP'}
$configArgument=$null
if($p.CommandLine -match '(?i)(?:^|\s)-c\s+(?:"([^"]+)"|(\S+))'){
 if($Matches[1]){$configArgument=$Matches[1]}else{$configArgument=$Matches[2]}
}
[pscustomobject]@{
 PID=$p.ProcessId
 ProcessStartUTC=$p.CreationDate.ToUniversalTime().ToString('o')
 ExecutableMatchesExpected=($p.ExecutablePath -ieq 'C:\Program Files\mosquitto\mosquitto.exe')
 ConfigArgumentMatchesExpected=($null -ne $configArgument -and [IO.Path]::GetFullPath($configArgument) -ieq 'C:\mosquitto\config\mosquitto.conf')
}|ConvertTo-Json -Compress
