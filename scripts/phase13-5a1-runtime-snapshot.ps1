$ErrorActionPreference = 'Stop'
$phase13Root = 'C:\DATN\Project_datn'
$phase13Connections = @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5000,5432,55433,1883 -or $_.RemotePort -eq 1883 } | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess)
$phase13Processes = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'node.exe','mosquitto.exe','postgres.exe' } | Select-Object ProcessId,ParentProcessId,Name,CreationDate)
$phase13Events = @()
$phase13EventStatus = 'READ_OK'
try {
    $phase13Records = @(Get-WinEvent -FilterHashtable @{LogName='Application';Id=1000,1001;StartTime=(Get-Date).AddDays(-1)} -ErrorAction Stop)
    foreach ($phase13Record in $phase13Records) {
        if ($phase13Record.Message -match '\bnode\.exe\b') {
            # Never write arbitrary event messages or command lines to report.
            $phase13Events += [pscustomobject]@{id=$phase13Record.Id;provider=$phase13Record.ProviderName;at=$phase13Record.TimeCreated.ToUniversalTime().ToString('o');nodeMentioned=$true}
        }
    }
} catch {
    $phase13EventStatus = if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { 'NO_MATCHING_APPLICATION_ERROR_EVENTS' } else { 'EVENT_LOG_NOT_VERIFIED' }
}
$phase13Snapshot = [pscustomobject]@{
    checkedAt=(Get-Date).ToUniversalTime().ToString('o')
    connections=$phase13Connections
    processes=$phase13Processes
    wifi=@(Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -eq 'Wi-Fi' | Select-Object InterfaceAlias,IPAddress,AddressState)
    applicationErrorQuery=$phase13EventStatus
    nodeErrorEvents=$phase13Events
    backend5000Listening=[bool]($phase13Connections | Where-Object { $_.LocalPort -eq 5000 -and $_.State -eq 2 })
    test55433Listening=[bool]($phase13Connections | Where-Object { $_.LocalPort -eq 55433 -and $_.State -eq 2 })
    clockEndpoint='NOT_AVAILABLE_WITHOUT_BACKEND'
}
$phase13Snapshot | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath "$phase13Root\report\phase13-5a1-process-network.json" -Encoding UTF8
$phase13Snapshot | ConvertTo-Json -Depth 6
