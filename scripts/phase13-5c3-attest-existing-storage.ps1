# Approval reference: user message "PHASE 13.5C.3 - APPROVED PRODUCTION DATABASE BACKUP", 2026-10-22.
# Existing directories only. No directory creation, ACL repair, credentials or database access.
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param([switch]$ExecuteApproved,[string]$StorageApprovalId,[string]$BackupApprovalId,[switch]$AcceptResidualRisk)
$ErrorActionPreference='Stop'
$helper=Join-Path $PSScriptRoot 'phase13-5c-backup-security.ps1'
if ((Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash -cne 'EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F') { throw 'HELPER_HASH_MISMATCH' }
. $helper
Assert-Phase135cOperator
$target=Get-Phase135cBackupRoot
Assert-Phase135cOutsideKnownSync $target
Assert-Phase135cPrivateDirectory ([IO.Directory]::GetParent($target).FullName)
Assert-Phase135cPrivateDirectory $target
$file=Join-Path $target 'storage-approval.private.json'
if (Test-Path -LiteralPath $file) { throw 'ATTESTATION_EXISTS_NO_OVERWRITE' }
if (-not $ExecuteApproved -or $WhatIfPreference) {
  [pscustomobject]@{Mode='PLAN_ONLY';ExistingDirectoriesOnly=$true;Written=$false;CloudBackupScope='NOT_VERIFIED';ProductionBackupPerformed=$false} | ConvertTo-Json
  return
}
if ($StorageApprovalId -cne 'phase13-5c3-storage-20261022-01' -or $BackupApprovalId -cne 'phase13-5c3-backup-20261022-01' -or -not $AcceptResidualRisk) { throw 'EXACT_APPROVAL_AND_RESIDUAL_RISK_REQUIRED' }
if (-not $PSCmdlet.ShouldProcess($file,'Create one attestation linked to explicit user Phase13.5C.3 approval; no backup')) { return }
$record=[ordered]@{
  StorageApprovalId=$StorageApprovalId; BackupApprovalId=$BackupApprovalId
  ApprovalReference='User message: PHASE 13.5C.3 - APPROVED PRODUCTION DATABASE BACKUP, 2026-10-22'
  Scope='ONE_LOCAL_BACKUP_SMART_AGRICULTURE_127.0.0.1_5432_NO_MIGRATION_NO_RESTORE'
  CreatedAt=[DateTimeOffset]::UtcNow.ToString('o'); OperatorSid=$script:Phase135cOperatorSid
  DataHandlingApproved=$true; ResidualRiskAccepted=$true; CloudBackupScope='NOT_VERIFIED'
  EncryptionStatus='ENCRYPTION_VERIFIED_C_USER_PROVIDED_ADMIN_EVIDENCE'
  EncryptionLimitations='Used Space Only 100%, XTS-AES128, Protection On; no admin/malware/cloud/same-disk-disaster protection claim'
  ProductionBackupPerformed=$false
}
$bytes=[Text.Encoding]::UTF8.GetBytes(($record | ConvertTo-Json -Depth 4))
$stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try { $stream.Write($bytes,0,$bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
# File inherits only the protected parent's operator/SYSTEM ACEs; do not modify existing ACLs.
$acl=Get-Acl -LiteralPath $file
$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $script:Phase135cOperatorSid -or $rules.Count -ne 2) { throw 'NEW_FILE_OWNER_OR_ACL_INVALID_STOP_NO_BACKUP' }
foreach ($rule in $rules) {
  if ($rule.IdentityReference.Value -notin @($script:Phase135cOperatorSid,'S-1-5-18') -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl) { throw 'NEW_FILE_ACE_INVALID_STOP_NO_BACKUP' }
}
Assert-Phase135cNoReparse $file
$readback=Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $readback.DataHandlingApproved -or -not $readback.ResidualRiskAccepted -or $readback.CloudBackupScope -cne 'NOT_VERIFIED' -or $readback.StorageApprovalId -cne $StorageApprovalId -or $readback.BackupApprovalId -cne $BackupApprovalId) { throw 'ATTESTATION_READBACK_FAILED_STOP_NO_BACKUP' }
[pscustomobject]@{Status='ATTESTATION_CREATED_FILE_NTFS_VERIFIED';Path=$file;SHA256=(Get-FileHash -LiteralPath $file).Hash;OwnerSid=$script:Phase135cOperatorSid;CloudBackupScope='NOT_VERIFIED';ProductionBackupPerformed=$false} | ConvertTo-Json
