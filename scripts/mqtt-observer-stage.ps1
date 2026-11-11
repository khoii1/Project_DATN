param([Parameter(Mandatory=$true)][string]$PrivateDirectory)
$ErrorActionPreference='Stop'
$operatorSid='S-1-5-21-1432835263-483988321-3159128977-1001'
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
if($sid.Value -cne $operatorSid){throw 'OPERATOR_SID_STOP'}
$listeners=@(Get-NetTCPConnection -State Listen -LocalPort 1883|Where-Object LocalAddress -in @('0.0.0.0','::','172.20.10.2'))
if(-not $listeners.Count -or @($listeners.OwningProcess|Select-Object -Unique).Count -ne 1 -or $listeners[0].OwningProcess -ne 6636){throw 'PROCESS_DRIFT_STOP'}
$p=Get-CimInstance Win32_Process -Filter 'ProcessId=6636'
if($p.Name -cne 'mosquitto.exe' -or $p.CreationDate.ToUniversalTime().ToString('o') -cne '2026-10-29T13:59:34.8647260Z'){throw 'PROCESS_START_DRIFT_STOP'}
foreach($pair in @(@('C:\mosquitto\config\mosquitto.conf','084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F'),@('C:\mosquitto\config\acl','4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766'))){if((Get-FileHash -LiteralPath $pair[0] -Algorithm SHA256).Hash -cne $pair[1]){throw 'SOURCE_DRIFT_STOP'}}
$base=Join-Path $env:LOCALAPPDATA 'SmartAgriculture'
$target=[IO.Path]::GetFullPath($PrivateDirectory)
if([IO.Path]::GetDirectoryName($target) -cne $base -or [IO.Path]::GetFileName($target) -notmatch '^mqtt-observer-candidate-\d{8}-\d{6}-[a-f0-9]+$'){throw 'TARGET_REFUSED'}
$config=[IO.File]::ReadAllLines('C:\mosquitto\config\mosquitto.conf')
$passLines=@($config|Where-Object {$_ -match '^password_file '})
if($passLines.Count -ne 1){throw 'PASSWORD_SCOPE_STOP'}
$passwordPath=$passLines[0].Substring(14).Trim()
foreach($start in @($base,'C:\mosquitto\config\mosquitto.conf','C:\mosquitto\config\acl',$passwordPath)){
 $cursor=$start
 while($cursor){$item=Get-Item -LiteralPath $cursor -Force -ErrorAction Stop;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_STOP'};$parent=[IO.Directory]::GetParent($cursor);if($null -eq $parent){break};$cursor=$parent.FullName}
}
$parentAcl=Get-Acl -LiteralPath $base
if(-not $parentAcl.AreAccessRulesProtected){throw 'PARENT_NOT_PRIVATE'}
foreach($ace in $parentAcl.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($operatorSid,'S-1-5-18') -or $ace.AccessControlType -ne 'Allow'){throw 'PARENT_ACL_STOP'}}
if(Test-Path -LiteralPath $target){throw 'CREATE_NEW_ONLY'}
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
$di=New-Object IO.DirectoryInfo($target);$di.Create($acl)
$a=Get-Acl -LiteralPath $target
if($a.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or -not $a.AreAccessRulesProtected -or $a.Access.Count -ne 1){throw 'STAGING_ACL_STOP'}
$ace=$a.Access[0]
if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or $ace.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or $ace.AccessControlType -ne 'Allow' -or $ace.IsInherited){throw 'STAGING_ACE_STOP'}
& 'C:\Program Files\nodejs\node.exe' 'C:\DATN\Project_datn\scripts\mqtt-observer-candidate.cjs' --prepare $target
if($LASTEXITCODE -ne 0){throw 'CANDIDATE_PREPARATION_FAILED_STOP'}
foreach($file in (Get-ChildItem -LiteralPath $target -File)){
 $f=Get-Acl -LiteralPath $file.FullName
 if($f.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid){throw 'FILE_OWNER_STOP'}
 foreach($ace in $f.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or $ace.AccessControlType -ne 'Allow'){throw 'FILE_ACL_STOP'}}
}
'PRIVATE_STAGING_ACL_VERIFIED_NO_BROKER_CHANGE'
