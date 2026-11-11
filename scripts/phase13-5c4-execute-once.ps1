# Interactive secure local prompt only. No transcript; no credential in CLI/log/report.
$ErrorActionPreference='Stop'
$root='C:\DATN\Project_datn'
$hashes=@{
 'scripts\phase13-5c-production-backup.ps1'='7E9D0F596FA7321C76BE7046139C091F87EE4A962AF2746AA7B32D273A8EF223'
 'scripts\phase13-5c4-runtime-gate.ps1'='5B63796FFA5D24C9FDA928767F27D4D1184CEFC3400DED979CB51F099F3471F0'
 'backend\scripts\phase13-5c4-runtime-api.cjs'='764E0171B599496647E4977686BF91F409A1ED47F0FFB1BF6782364FD6499FC4'
 'scripts\phase13-5c-backup-security.ps1'='EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F'
}
foreach($item in $hashes.GetEnumerator()){if((Get-FileHash -LiteralPath (Join-Path $root $item.Key)).Hash -cne $item.Value){throw 'REVIEWED_SCRIPT_HASH_MISMATCH'}}
$marker=Join-Path $root 'build\phase13-5c4-interactive-once.attempt.json'
$outcome=Join-Path $root 'report\phase13-5c4-interactive-outcome.json'
$stream=[IO.File]::Open($marker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$bytes=[Text.Encoding]::UTF8.GetBytes((@{State='SECURE_LOCAL_PROMPT_SESSION';StartedAt=[DateTimeOffset]::UtcNow.ToString('o');Pid=$PID;BackupApprovalId='phase13-5c3-backup-20261022-01';NoRetry=$true}|ConvertTo-Json));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Host 'Smart Agriculture: ONE approved local production backup. No migration/restore/pump commands.'
Write-Host 'Enter PostgreSQL password ONLY in this window when prompted. Never send it in chat.'
try{
 & (Join-Path $root 'scripts\phase13-5c-production-backup.ps1') -ExecuteApproved -StorageApprovalId phase13-5c3-storage-20261022-01 -BackupApprovalId phase13-5c3-backup-20261022-01 -Confirm:$false
 @{State='BACKUP_SCRIPT_COMPLETED';EndedAt=[DateTimeOffset]::UtcNow.ToString('o');ExitCode=0;ProductionRestorePerformed=$false;MigrationPerformed=$false}|ConvertTo-Json|Set-Content -LiteralPath $outcome -Encoding UTF8
 Write-Host 'Backup script completed. Agent will independently verify private manifest and runtime.'
}catch{
 @{State='STOPPED_NO_RETRY';EndedAt=[DateTimeOffset]::UtcNow.ToString('o');ExitCode=1;Reason='BACKUP_OR_GATE_FAILED_REVIEW_PRIVATE_EVIDENCE';ProductionRestorePerformed=$false;MigrationPerformed=$false}|ConvertTo-Json|Set-Content -LiteralPath $outcome -Encoding UTF8
 Write-Host 'STOPPED. No automatic retry. Keep this session and existing artifacts for review.'
 exit 1
}
