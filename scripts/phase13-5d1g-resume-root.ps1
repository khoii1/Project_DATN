# Controlled existing-empty-root resume. No initdb, network connection, parent ACL change or elevation.
[CmdletBinding()]
param([ValidateSet('PLAN_ONLY','TEST_DACL','APPLY_APPROVED_RESUME')][string]$Mode='PLAN_ONLY')
$ErrorActionPreference='Stop'
$root='C:\DATN\test-instances\phase13-5d1g'
$expectedSid='S-1-5-21-1432835263-483988321-3159128977-1001'
$started=[DateTimeOffset]::UtcNow.ToString('o')
$checkpoint='MODE'
function New-ExpectedDacl {
 param([Security.Principal.SecurityIdentifier]$OperatorSid)
 $systemSid=New-Object Security.Principal.SecurityIdentifier([Security.Principal.WellKnownSidType]::LocalSystemSid,$null)
 $acl=New-Object Security.AccessControl.DirectorySecurity
 $acl.SetOwner($OperatorSid);$acl.SetAccessRuleProtection($true,$false)
 foreach($id in @($OperatorSid,$systemSid)) {
  $rule=New-Object Security.AccessControl.FileSystemAccessRule($id,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $null=$acl.AddAccessRule($rule)
 }
 return $acl
}
function Assert-Dacl {
 param($Acl)
 if(-not $Acl.AreAccessRulesProtected -or $Acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $expectedSid -or @($Acl.Access).Count -ne 2){throw 'DACL_OWNER_OR_COUNT'}
 $ids=@()
 foreach($rule in $Acl.Access) {
  $id=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
  if($id -notin @($expectedSid,'S-1-5-18') -or $rule.IsInherited -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl' -or $rule.InheritanceFlags -ne 'ContainerInherit,ObjectInherit'){throw 'DACL_RULE'}
  $ids+=$id
 }
 if(@($ids|Select-Object -Unique).Count -ne 2){throw 'DACL_DUPLICATE'}
}
function Parent-Fingerprints {
 $hash=[Security.Cryptography.SHA256]::Create()
 try { return @('C:\DATN','C:\DATN\test-instances') | ForEach-Object {
  $sddl=(Get-Acl -LiteralPath $_).GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::All)
  [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($sddl))).Replace('-','')
 } } finally {$hash.Dispose()}
}
try {
 if($Mode -eq 'PLAN_ONLY'){[pscustomobject]@{mode='PLAN_ONLY';mutated=$false;runReference='d1g-resume-r1'}|ConvertTo-Json -Compress;exit 0}
 $checkpoint='OPERATOR_IDENTITY'
 $operatorSid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 if($operatorSid.Value -cne $expectedSid){throw 'OPERATOR_MISMATCH'}
 $checkpoint='IN_MEMORY_DACL'
 $desired=New-ExpectedDacl $operatorSid;Assert-Dacl $desired
 if($Mode -eq 'TEST_DACL'){[pscustomobject]@{mode=$Mode;status='IN_MEMORY_DACL_PASS';aceCount=2;mutated=$false}|ConvertTo-Json -Compress;exit 0}
 $checkpoint='EXISTING_EMPTY_ROOT'
 if([IO.Path]::GetFullPath($root) -cne $root -or -not (Test-Path -LiteralPath $root -PathType Container)){throw 'ROOT_IDENTITY'}
 foreach($p in @('C:\','C:\DATN','C:\DATN\test-instances',$root)) {
  $i=Get-Item -LiteralPath $p -Force
  if($i.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE'}
 }
 if(@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0 -or (Test-Path -LiteralPath (Join-Path $root 'data'))){throw 'ROOT_NOT_EMPTY'}
 if((Get-Acl -LiteralPath $root).GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $expectedSid){throw 'OWNER_MISMATCH'}
 $checkpoint='PORT_AND_PROCESS_GATE'
 if(@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object LocalPort -eq 55435).Count -ne 0){throw 'PORT_CONFLICT'}
 $postgres=@(Get-CimInstance Win32_Process -Filter "name='postgres.exe'" -OperationTimeoutSec 3 -ErrorAction Stop)
 $targetProcesses=@($postgres | Where-Object {$_.CommandLine -and $_.CommandLine.IndexOf($root,[StringComparison]::OrdinalIgnoreCase) -ge 0})
 if($targetProcesses.Count -ne 0){throw 'TARGET_PROCESS'}
 # Protected unrelated process command lines may be unavailable. Empty never-initialized root,
 # absent PGDATA/markers and no target listener are independent target-instance absence evidence.
 $unknownProcessMetadata=@($postgres|Where-Object {-not $_.CommandLine}).Count
 $parentsBefore=@(Parent-Fingerprints)
 $checkpoint='APPLY_TEST_ROOT_ONLY'
 Set-Acl -LiteralPath $root -AclObject $desired
 $checkpoint='VERIFY_ACTUAL_DACL'
 Assert-Dacl (Get-Acl -LiteralPath $root)
 if((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_AFTER'}
 if(@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0){throw 'ROOT_CHANGED'}
 $parentsAfter=@(Parent-Fingerprints)
 if(($parentsBefore -join '|') -cne ($parentsAfter -join '|')){throw 'PARENT_ACL_CHANGED'}
 [pscustomobject]@{status='ROOT_NTFS_VERIFIED';runReference='d1g-resume-r1';checkpoint=$checkpoint;startedAt=$started;endedAt=[DateTimeOffset]::UtcNow.ToString('o');ownerSid=$expectedSid;protectedDacl=$true;aceSids=@($expectedSid,'S-1-5-18');empty=$true;unexpectedReparse=$false;parentAclUnchanged=$true;targetProcessMatches=0;unrelatedProcessMetadataUnavailable=$unknownProcessMetadata;unknownOutcome=$false}|ConvertTo-Json -Depth 4 -Compress
 exit 0
} catch {
 # No raw exception/command line/environment. Native capture retains this sanitized JSON.
 [pscustomobject]@{status='STOP';runReference='d1g-resume-r1';checkpoint=$checkpoint;startedAt=$started;endedAt=[DateTimeOffset]::UtcNow.ToString('o');category=$_.CategoryInfo.Category.ToString();exceptionType=$_.Exception.GetType().Name;reason='ROOT_RESUME_GATE_FAILED';unknownOutcome=($checkpoint -eq 'APPLY_TEST_ROOT_ONLY')}|ConvertTo-Json -Compress
 exit 2
}
