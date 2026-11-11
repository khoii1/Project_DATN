$ErrorActionPreference = 'Stop'
$phase13Connections = @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5000,5432,55433,1883,5173 -or $_.RemotePort -eq 1883 } | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess)
$phase13Processes = @(Get-CimInstance Win32_Process | Where-Object Name -in 'node.exe','mosquitto.exe','postgres.exe' | Select-Object ProcessId,Name,ParentProcessId,CreationDate)
$phase13Services = @(Get-CimInstance Win32_Service | Where-Object { $_.Name -match 'node|pm2|smart.?agri' -or $_.DisplayName -match 'Smart.?Agriculture' } | Select-Object Name,State,StartMode)
$phase13TasksStatus = 'READ_OK'
$phase13Tasks = @()
try {
    $phase13Tasks = @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.TaskName -match 'smart.?agri|pm2|backend' -or ($_.Actions | Where-Object { $_.Execute -match '(node|pm2|npm)(\.exe|\.cmd)?$' }) } | Select-Object TaskName,TaskPath,State)
} catch { $phase13TasksStatus = 'NOT_VERIFIED' }
$phase13EventsStatus = 'READ_OK'
$phase13Events = @()
try {
    $phase13Records = @(Get-WinEvent -FilterHashtable @{LogName='Application';Id=1000,1001;StartTime=(Get-Date).AddDays(-2)} -ErrorAction Stop)
    foreach ($phase13Record in $phase13Records) {
        if ($phase13Record.Message -match '\bnode\.exe\b') {
            $phase13Events += [pscustomobject]@{ id=$phase13Record.Id; at=$phase13Record.TimeCreated.ToUniversalTime().ToString('o'); provider=$phase13Record.ProviderName }
        }
    }
} catch { $phase13EventsStatus = if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { 'NO_MATCHING_EVENTS' } else { 'NOT_VERIFIED' } }
$phase13Evidence = [pscustomobject]@{
    checkedAt=(Get-Date).ToUniversalTime().ToString('o')
    connections=$phase13Connections
    processes=$phase13Processes
    possibleSupervisorServices=$phase13Services
    taskQuery=$phase13TasksStatus
    possibleSupervisorTasks=$phase13Tasks
    eventQuery=$phase13EventsStatus
    nodeApplicationErrorEvents=$phase13Events
    backendListening=[bool]($phase13Connections | Where-Object { $_.LocalPort -eq 5000 -and $_.State -eq 2 })
    testClusterListening=[bool]($phase13Connections | Where-Object { $_.LocalPort -eq 55433 -and $_.State -eq 2 })
    wifi=@(Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -eq 'Wi-Fi' | Select-Object IPAddress,AddressState)
    operations='READ_ONLY_NO_START_OR_RESTART'
}
$phase13Evidence | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath 'C:\DATN\Project_datn\report\phase13-5a2-runtime.json' -Encoding UTF8
$phase13Evidence | ConvertTo-Json -Depth 7
