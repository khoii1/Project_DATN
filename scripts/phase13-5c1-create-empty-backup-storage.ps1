# Phase13.5C.1: two EMPTY directories only. Never writes data-handling attestation.
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param([switch]$ExecuteApproved,[switch]$EmptyOnlyApproval)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
Assert-Phase135cOperator
$target=Get-Phase135cBackupRoot; $container=[IO.Directory]::GetParent($target).FullName
Assert-Phase135cNoReparse $target; Assert-Phase135cOutsideKnownSync $target
if ((Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FileSystem -ne 'NTFS') { throw 'NTFS_REQUIRED' }
if ((Test-Path -LiteralPath $container) -or (Test-Path -LiteralPath $target)) { throw 'NEW_EMPTY_TARGETS_REQUIRED_NO_EXISTING_ACL_CHANGES' }
if (-not $ExecuteApproved -or $WhatIfPreference) {
  [pscustomobject]@{Mode='PLAN_ONLY';Targets=@($container,$target);Created=$false;EmptyOnly=$true;ProductionDataStorageApproved=$false;AttestationWritten=$false;CloudBackupScope='NOT_VERIFIED';Encryption='NOT_VERIFIED'} | ConvertTo-Json
  return
}
if (-not $EmptyOnlyApproval) { throw 'EXPLICIT_EMPTY_DIRECTORY_APPROVAL_REQUIRED' }
if (-not $PSCmdlet.ShouldProcess($target,'Create exactly two protected empty directories; no files, no data-handling approval')) { return }
$created=@()
try {
  foreach ($path in @($container,$target)) { New-Phase135cPrivateDirectory $path; $created+=$path }
  foreach ($path in @($container,$target)) { Assert-Phase135cPrivateDirectory $path }
  $children=@(Get-ChildItem -LiteralPath $container -Force)
  if ($children.Count -ne 1 -or -not $children[0].PSIsContainer -or $children[0].FullName -ine $target -or @(Get-ChildItem -LiteralPath $target -Force).Count -ne 0) { throw 'UNEXPECTED_CONTENT_STOP_NO_DATA' }
} catch {
  [pscustomobject]@{Status='STOP';Created=$created;CleanupPerformed=$false;ProductionDataStorageApproved=$false} | ConvertTo-Json
  throw
}
[pscustomobject]@{Status='BACKUP_STORAGE_DIRECTORIES_CREATED';Ntfs='BACKUP_STORAGE_NTFS_VERIFIED';Created=$created;EmptyOnly=$true;FileCount=0;AttestationWritten=$false;ProductionDataStorageApproved=$false;CloudBackupScope='NOT_VERIFIED';Encryption='NOT_VERIFIED';ExistingParentAclChanges=$false} | ConvertTo-Json -Depth 4
