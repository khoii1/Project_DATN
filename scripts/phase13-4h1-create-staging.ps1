[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param([switch]$ExecuteApproved,[switch]$ConfirmOutsideCloudSync)
$ErrorActionPreference='Stop'
$expectedSid='S-1-5-21-1432835263-483988321-3159128977-1001'
$expectedBase='C:\Users\Acer Swift3\AppData\Local'
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
if ($identity.User.Value -ne $expectedSid) { throw 'OPERATOR_SID_MISMATCH_STOP' }
$localBase=[IO.Path]::GetFullPath([Environment]::GetFolderPath('LocalApplicationData'))
if ($localBase.TrimEnd('\') -ine $expectedBase) { throw 'LOCAL_APPDATA_BASE_MISMATCH_STOP' }
$container=Join-Path $localBase 'SmartAgriculture'; $stageRoot=Join-Path $container 'credential-rotation'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
if ($stageRoot.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'STAGING_INSIDE_REPOSITORY_STOP' }
function Assert-NoReparseAncestors([string]$directory) {
  $cursor=[IO.Path]::GetFullPath($directory)
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) { $item=Get-Item -LiteralPath $cursor -Force; if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'REPARSE_ANCESTOR_STOP' } }
    $parent=[IO.Directory]::GetParent($cursor); if (-not $parent) { break }; $cursor=$parent.FullName
  }
}
Assert-NoReparseAncestors $stageRoot
if ((Get-Volume -DriveLetter C).FileSystemType -ne 'NTFS') { throw 'NTFS_REQUIRED' }
foreach ($key in @('OneDrive','OneDriveConsumer','OneDriveCommercial','Dropbox')) {
  $cloud=[Environment]::GetEnvironmentVariable($key)
  if ($cloud) { $cloud=[IO.Path]::GetFullPath($cloud).TrimEnd('\'); if ($stageRoot -ieq $cloud -or $stageRoot.StartsWith($cloud+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'CLOUD_SYNC_ROOT_STOP' } }
}
if ((Test-Path -LiteralPath $container) -or (Test-Path -LiteralPath $stageRoot)) { throw 'TARGET_EXISTS_STOP_NO_EXISTING_ACL_CHANGES' }
$targets=@($container,$stageRoot)+@('inputs-private','source-enabled','source-disabled','build-enabled','build-disabled','logs-private','manifests-redacted','recovery-private' | ForEach-Object { Join-Path $stageRoot $_ })
if (-not $ExecuteApproved -or $WhatIfPreference) {
  [pscustomobject]@{Mode='PLAN_ONLY';Targets=$targets;Principals=@($expectedSid,'S-1-5-18');Rights='FullControl OI/CI';ProtectedDacl=$true;Created=$false;ExistingParentsChanged=$false;RequiresSeparateApproval=$true;RequiresCloudLocationConfirmation=$true} | ConvertTo-Json -Depth 4
  return
}
if (-not $ConfirmOutsideCloudSync) { throw 'USER_CLOUD_LOCATION_CONFIRMATION_REQUIRED' }
if (-not $PSCmdlet.ShouldProcess($stageRoot,'Create only new empty staging directories with operator+SYSTEM protected ACL')) { return }
$security=New-Object Security.AccessControl.DirectorySecurity
$operatorSid=New-Object Security.Principal.SecurityIdentifier $expectedSid
$security.SetOwner($operatorSid); $security.SetAccessRuleProtection($true,$false)
foreach ($sid in @($expectedSid,'S-1-5-18')) {
  $rule=New-Object Security.AccessControl.FileSystemAccessRule ((New-Object Security.Principal.SecurityIdentifier $sid),[Security.AccessControl.FileSystemRights]::FullControl,([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit),[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  $security.AddAccessRule($rule)
}
# Atomic create-with-security: refuses an existing directory, never edits its ACL.
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class Phase134H1Directory {
  [StructLayout(LayoutKind.Sequential)] struct SA { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectoryW(string path,ref SA attributes);
  public static void Create(string path,byte[] descriptor) {
    IntPtr memory=Marshal.AllocHGlobal(descriptor.Length);
    try { Marshal.Copy(descriptor,0,memory,descriptor.Length); SA a=new SA {length=Marshal.SizeOf(typeof(SA)),descriptor=memory,inherit=false}; if(!CreateDirectoryW(path,ref a)) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    finally { Marshal.FreeHGlobal(memory); }
  }
}
'@
$created=@()
try {
  foreach ($target in $targets) {
    Assert-NoReparseAncestors $target
    [Phase134H1Directory]::Create($target,$security.GetSecurityDescriptorBinaryForm()); $created+=$target
    $acl=Get-Acl -LiteralPath $target
    $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $expectedSid -or $rules.Count -ne 2) { throw 'STAGING_ACL_ACCEPTANCE_FAILED_STOP_NO_SECRETS' }
    foreach ($r in $rules) { if ($r.IsInherited -or $r.IdentityReference.Value -notin @($expectedSid,'S-1-5-18') -or $r.AccessControlType -ne 'Allow' -or $r.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or $r.InheritanceFlags -ne ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit) -or $r.PropagationFlags -ne 'None') { throw 'UNEXPECTED_STAGING_ACE_STOP_NO_SECRETS' } }
  }
} catch { Write-Output ([pscustomobject]@{Status='STOP_NO_CREDENTIAL_INPUT';CreatedDirectories=$created;CleanupPerformed=$false} | ConvertTo-Json -Depth 3); throw }
[pscustomobject]@{Status='STAGING_CREATED_ACL_CHECKED';Root=$stageRoot;CreatedDirectories=$created;ExistingParentsChanged=$false;CredentialsImported=$false;RequiresIndependentAcceptanceBeforeInput=$true} | ConvertTo-Json -Depth 4
