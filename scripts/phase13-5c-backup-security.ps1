# Functions only. Dot-sourcing does not create directories, change ACLs or open a DB.
$script:Phase135cOperatorSid='S-1-5-21-1432835263-483988321-3159128977-1001'
function Assert-Phase135cOperator {
  if ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value -ne $script:Phase135cOperatorSid) { throw 'OPERATOR_SID_MISMATCH' }
}
function Get-Phase135cBackupRoot {
  $base=[IO.Path]::GetFullPath([Environment]::GetFolderPath('LocalApplicationData'))
  if ($base -ine 'C:\Users\Acer Swift3\AppData\Local') { throw 'LOCAL_APPDATA_MISMATCH' }
  return (Join-Path $base 'SmartAgriculturePostgresBackups\production')
}
function Assert-Phase135cNoReparse([string]$Path) {
  $cursor=[IO.Path]::GetFullPath($Path)
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) { if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'REPARSE_PATH_REFUSED' } }
    $parent=[IO.Directory]::GetParent($cursor); if (-not $parent) { break }; $cursor=$parent.FullName
  }
}
function Assert-Phase135cOutsideKnownSync([string]$Path) {
  $target=[IO.Path]::GetFullPath($Path).TrimEnd('\')
  $repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
  if ($target -ieq $repo -or $target.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'BACKUP_INSIDE_REPOSITORY_REFUSED' }
  foreach ($name in @('OneDrive','OneDriveConsumer','OneDriveCommercial','Dropbox')) {
    $value=[Environment]::GetEnvironmentVariable($name)
    if ($value) { $cloud=[IO.Path]::GetFullPath($value).TrimEnd('\'); if ($target -ieq $cloud -or $target.StartsWith($cloud+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'KNOWN_SYNC_ROOT_REFUSED' } }
  }
}
function Get-Phase135cSecurity {
  $acl=New-Object Security.AccessControl.DirectorySecurity
  $acl.SetOwner((New-Object Security.Principal.SecurityIdentifier $script:Phase135cOperatorSid)); $acl.SetAccessRuleProtection($true,$false)
  foreach ($sid in @($script:Phase135cOperatorSid,'S-1-5-18')) {
    $rule=New-Object Security.AccessControl.FileSystemAccessRule ((New-Object Security.Principal.SecurityIdentifier $sid),[Security.AccessControl.FileSystemRights]::FullControl,([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit),[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($rule)
  }
  return $acl
}
function Assert-Phase135cPrivateDirectory([string]$Path) {
  Assert-Phase135cNoReparse $Path
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { throw 'PRIVATE_DIRECTORY_REQUIRED' }
  $acl=Get-Acl -LiteralPath $Path; $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $script:Phase135cOperatorSid -or $rules.Count -ne 2) { throw 'PRIVATE_ACL_OWNER_OR_INHERITANCE_MISMATCH' }
  foreach ($r in $rules) {
    if ($r.IsInherited -or $r.IdentityReference.Value -notin @($script:Phase135cOperatorSid,'S-1-5-18') -or $r.AccessControlType -ne 'Allow' -or $r.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or $r.InheritanceFlags -ne ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit) -or $r.PropagationFlags -ne 'None') { throw 'PRIVATE_ACL_ACE_MISMATCH' }
  }
}
function New-Phase135cPrivateDirectory([string]$Path) {
  Assert-Phase135cOperator; Assert-Phase135cNoReparse $Path
  if (Test-Path -LiteralPath $Path) { throw 'TARGET_ALREADY_EXISTS_NO_ACL_REPAIR' }
  if (-not ('Phase135cDirectory' -as [type])) {
    Add-Type -TypeDefinition @'
using System; using System.ComponentModel; using System.Runtime.InteropServices;
public static class Phase135cDirectory {
 [StructLayout(LayoutKind.Sequential)] struct SA { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectoryW(string path,ref SA attributes);
 public static void Create(string path,byte[] descriptor) {
  IntPtr memory=Marshal.AllocHGlobal(descriptor.Length);
  try { Marshal.Copy(descriptor,0,memory,descriptor.Length); SA a=new SA {length=Marshal.SizeOf(typeof(SA)),descriptor=memory,inherit=false}; if(!CreateDirectoryW(path,ref a)) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  finally { Marshal.FreeHGlobal(memory); }
 }
}
'@
  }
  [Phase135cDirectory]::Create($Path,(Get-Phase135cSecurity).GetSecurityDescriptorBinaryForm())
  Assert-Phase135cPrivateDirectory $Path
}
