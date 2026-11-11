param(
    [ValidateSet('SmokeExit','SmokeSignal','Backend')][string]$Mode = 'SmokeExit',
    [string]$RunId,
    [switch]$ApprovedStartup,
    [switch]$AdapterDisconnectedConfirmed
)
$ErrorActionPreference = 'Stop'
$phase13Root = 'C:\DATN\Project_datn'
if (-not $RunId -or $RunId -notmatch '^[a-zA-Z0-9-]{1,90}$') { throw 'VALID_RUN_ID_REQUIRED' }
if ($Mode -eq 'Backend' -and (-not $ApprovedStartup -or -not $AdapterDisconnectedConfirmed)) { throw 'STARTUP_APPROVAL_AND_HARDWARE_CONFIRMATION_REQUIRED' }
$phase13Base = Join-Path $phase13Root "build\phase13-5a3-$RunId"
$phase13Out = "$phase13Base.stdout.log"
$phase13Err = "$phase13Base.stderr.log"
$phase13Exit = "$phase13Base.exit.json"
$phase13State = "$phase13Base.state.json"
foreach ($phase13File in @($phase13Out,$phase13Err,$phase13Exit,$phase13State)) {
    if (Test-Path -LiteralPath $phase13File) { throw 'RUN_ID_ALREADY_USED_NO_RETRY' }
}
$phase13Start = New-Object System.Diagnostics.ProcessStartInfo
$phase13Start.FileName = (Get-Command node.exe -ErrorAction Stop).Source
$phase13Start.WorkingDirectory = Join-Path $phase13Root 'backend'
$phase13Start.UseShellExecute = $false
$phase13Start.CreateNoWindow = $false # Shares the invoking PTY console for Ctrl+C.
$phase13Start.RedirectStandardOutput = $true
$phase13Start.RedirectStandardError = $true
if ($Mode -eq 'Backend') {
    if (@(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).Count -ne 0) { throw 'PORT5000_OCCUPIED_STOP' }
    $phase13Start.Arguments = '--import tsx src/server.ts'
    $phase13Start.EnvironmentVariables['PORT'] = '5000'
    $phase13Start.EnvironmentVariables['MQTT_ENABLED'] = 'true'
    $phase13Start.EnvironmentVariables['MQTT_BROKER_URL'] = 'mqtt://172.20.10.2:1883'
    $phase13Start.EnvironmentVariables['MQTT_COMMANDS_ENABLED'] = 'false'
    $phase13Start.EnvironmentVariables['MQTT_AUTOMATION_COMMANDS_ENABLED'] = 'false'
    $phase13Start.EnvironmentVariables['MQTT_PUMP_TEST_MODE'] = 'true'
    $phase13Start.EnvironmentVariables['MQTT_PUMP_MAX_RUN_SECONDS'] = '1'
} elseif ($Mode -eq 'SmokeSignal') {
    $phase13Start.Arguments = '--eval "process.on(''SIGINT'',()=>{console.error(''SMOKE_SIGINT_HANDLED'');process.exit(0)});console.log(''SMOKE_READY'');setInterval(()=>{},1000)"'
} else {
    $phase13Start.Arguments = '--eval "console.log(''SMOKE_STDOUT'');console.error(''SMOKE_STDERR'');process.exit(7)"'
}
$phase13Stdout = [System.IO.FileStream]::new($phase13Out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::ReadWrite,1,[System.IO.FileOptions]::Asynchronous)
$phase13Stderr = [System.IO.FileStream]::new($phase13Err,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::ReadWrite,1,[System.IO.FileOptions]::Asynchronous)
$phase13Child = New-Object System.Diagnostics.Process
$phase13Child.StartInfo = $phase13Start
$phase13Launched = $false
try {
    $phase13StartAt = (Get-Date).ToUniversalTime().ToString('o')
    if ($Mode -eq 'Backend') {
        # One authorized backend attempt for this phase, independent of run-id.
        $phase13AttemptPath = Join-Path $phase13Root 'build\phase13-5a3-startup.attempt.json'
        $phase13Attempt = [System.IO.File]::Open($phase13AttemptPath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::Read)
        try {
            $phase13AttemptBytes = [System.Text.Encoding]::UTF8.GetBytes((@{runId=$RunId;attemptedAt=$phase13StartAt;approvedBackendAttempts=1;command=$phase13Start.Arguments} | ConvertTo-Json -Compress))
            $phase13Attempt.Write($phase13AttemptBytes,0,$phase13AttemptBytes.Length)
        } finally { $phase13Attempt.Dispose() }
    }
    if (-not $phase13Child.Start()) { throw 'PROCESS_START_FAILED_NO_RETRY' }
    $phase13Launched = $true
    $phase13PumpOut = $phase13Child.StandardOutput.BaseStream.CopyToAsync($phase13Stdout)
    $phase13PumpErr = $phase13Child.StandardError.BaseStream.CopyToAsync($phase13Stderr)
    $phase13Meta = [ordered]@{mode=$Mode;runId=$RunId;pid=$phase13Child.Id;startedAt=$phase13StartAt;command=$phase13Start.Arguments;workingDirectory=$phase13Start.WorkingDirectory;state='RUNNING';stdout=$phase13Out;stderr=$phase13Err;exitEvidence=$phase13Exit}
    $phase13Meta | ConvertTo-Json | Set-Content -LiteralPath $phase13State -Encoding UTF8
    $phase13Meta | ConvertTo-Json -Compress
    while (-not $phase13Child.WaitForExit(250)) { }
} finally {
    if ($phase13Launched -and -not $phase13Child.HasExited) { $null = $phase13Child.WaitForExit(5000) }
    if ($phase13Launched -and $phase13Child.HasExited) {
        $null = $phase13PumpOut.GetAwaiter().GetResult()
        $null = $phase13PumpErr.GetAwaiter().GetResult()
        $phase13Stdout.Dispose(); $phase13Stderr.Dispose()
        [pscustomobject]@{pid=$phase13Child.Id;mode=$Mode;runId=$RunId;state='EXITED';exitCode=$phase13Child.ExitCode;endedAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $phase13Exit -Encoding UTF8
        Write-Output "PROCESS_EXITED: $($phase13Child.Id) CODE: $($phase13Child.ExitCode)"
    } elseif ($phase13Launched) {
        Write-Warning 'LOGGER_INTERRUPTED_PROCESS_EXIT_NOT_VERIFIED_NO_EXIT_CODE_WRITTEN'
    } else { $phase13Stdout.Dispose(); $phase13Stderr.Dispose() }
}
