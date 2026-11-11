$ErrorActionPreference='Stop'
$target=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'SmartAgriculturePostgresBackups\production'
$paths=@('C:\DATN\backups','C:\DATN\test-instances\phase13-3b','C:\DATN\test-instances\phase13-3b\backup-restore-13-5c-20261022074504_334f3f\synthetic-rehearsal.dump')
$acls=@(foreach($path in $paths){
  if(Test-Path -LiteralPath $path){$acl=Get-Acl -LiteralPath $path;[pscustomobject]@{Path=$path;Owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value;Protected=$acl.AreAccessRulesProtected;Rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])|ForEach-Object{[pscustomobject]@{Sid=$_.IdentityReference.Value;Rights=$_.FileSystemRights.ToString();Inherited=$_.IsInherited;Type=$_.AccessControlType.ToString()}})}}
})
$encryption='NOT_VERIFIED'
try { $volume=Get-CimInstance -Namespace 'root/CIMV2/Security/MicrosoftVolumeEncryption' -ClassName Win32_EncryptableVolume -Filter "DriveLetter='C:'" -ErrorAction Stop; if($volume){$encryption=[pscustomobject]@{ProtectionStatus=$volume.ProtectionStatus;Evidence='READ_ONLY_WMI_NOT_A_RECOVERY_KEY_TEST'}} } catch { $encryption='NOT_VERIFIED_PROVIDER_OR_ACCESS_UNAVAILABLE' }
$disk=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$listeners=@(Get-NetTCPConnection -LocalPort 5000,5432,55433,1883 -State Listen -ErrorAction SilentlyContinue|Select-Object LocalAddress,LocalPort,OwningProcess)
$known=@('OneDrive','OneDriveConsumer','OneDriveCommercial','Dropbox'|ForEach-Object{[Environment]::GetEnvironmentVariable($_)}|Where-Object{$_})
$overlap=@($known|Where-Object{$target -ieq $_ -or $target.StartsWith($_.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)}).Count -gt 0
[pscustomobject]@{At=[DateTimeOffset]::UtcNow.ToString('o');OperatorSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;Proposal=$target;ProposalExists=Test-Path -LiteralPath $target;KnownSyncOverlap=$overlap;CustomSyncBackupScope='NOT_VERIFIED_NOT_INVENTORIED';Disk=@{Device='C:';Filesystem=$disk.FileSystem;FreeBytes=$disk.FreeSpace;SizeBytes=$disk.Size};Encryption=$encryption;AclInventory=$acls;Listeners=$listeners;WritesPerformed=$false;ParentAclChanges=$false} | ConvertTo-Json -Depth 7
