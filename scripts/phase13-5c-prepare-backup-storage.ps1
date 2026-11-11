# Future separate storage approval only. Default PLAN creates NOTHING.
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param([switch]$ExecuteApproved,[string]$StorageApprovalId,[switch]$ConfirmDataHandling)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1')
Assert-Phase135cOperator
$target=Get-Phase135cBackupRoot; $container=[IO.Directory]::GetParent($target).FullName
Assert-Phase135cNoReparse $target; Assert-Phase135cOutsideKnownSync $target
if ((Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FileSystem -ne 'NTFS') { throw 'NTFS_REQUIRED' }
if (-not $ExecuteApproved -or $WhatIfPreference) {
  [pscustomobject]@{Mode='PLAN_ONLY';Targets=@($container,$target);Created=$false;Owner=$script:Phase135cOperatorSid;AllowedSids=@($script:Phase135cOperatorSid,'S-1-5-18');ProtectedDacl=$true;KnownCloudRootOverlap=$false;CustomSyncBackupScope='NOT_VERIFIED';EncryptionStatus='NOT_VERIFIED';ProductionDataStorageApproved=$false;ExistingParentAclChanges=$false} | ConvertTo-Json -Depth 4
  return
}
if ($StorageApprovalId -notmatch '^[A-Za-z0-9_-]{8,80}$' -or -not $ConfirmDataHandling) { throw 'SEPARATE_STORAGE_AND_DATA_HANDLING_APPROVAL_REQUIRED' }
if ((Test-Path -LiteralPath $container) -or (Test-Path -LiteralPath $target)) { throw 'NEW_TARGETS_REQUIRED_NO_EXISTING_ACL_CHANGES' }
if (-not $PSCmdlet.ShouldProcess($target,'Create two NEW protected directories; do not touch existing parents')) { return }
New-Phase135cPrivateDirectory $container; New-Phase135cPrivateDirectory $target
$attestation=[pscustomobject]@{StorageApprovalId=$StorageApprovalId;CreatedAt=[DateTimeOffset]::UtcNow.ToString('o');OperatorSid=$script:Phase135cOperatorSid;DataHandlingApproved=$true;CustomSyncBackupScope='USER_APPROVED_HANDLING_NOT_AUTOMATICALLY_VERIFIED';EncryptionStatus='USER_POLICY_REQUIRES_SEPARATE_VALIDATION';ProductionBackupPerformed=$false}
$attestation | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'storage-approval.private.json') -Encoding UTF8
Write-Output 'STORAGE_CREATED_NTFS_VERIFIED_NO_PRODUCTION_BACKUP'
