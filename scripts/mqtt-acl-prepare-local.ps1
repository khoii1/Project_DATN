param([Parameter(Mandatory=$true)][string]$PrivateDirectory)
$ErrorActionPreference='Stop'
$operatorSid='S-1-5-21-1432835263-483988321-3159128977-1001'
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
if($sid.Value -cne $operatorSid){throw 'OPERATOR_SID_MISMATCH'}
function Test-Identity {
 $listeners=@(Get-NetTCPConnection -State Listen -LocalPort 1883 -ErrorAction Stop | Where-Object LocalAddress -in @('0.0.0.0','::','172.20.10.2'))
 if(-not $listeners.Count -or @($listeners.OwningProcess|Select-Object -Unique).Count -ne 1 -or $listeners[0].OwningProcess -ne 6636){throw 'PID_CHANGED_OPERATOR_ADMIN_METADATA_REQUIRED'}
 $p=Get-CimInstance Win32_Process -Filter 'ProcessId=6636' -ErrorAction Stop
 if($p.Name -cne 'mosquitto.exe' -or $p.CreationDate.ToUniversalTime().ToString('o') -cne '2026-10-29T13:59:34.8647260Z'){throw 'PROCESS_START_DRIFT_OPERATOR_ADMIN_METADATA_REQUIRED'}
 foreach($item in @(@('C:\mosquitto\config\mosquitto.conf','084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F'),@('C:\mosquitto\config\acl','4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766'))){if((Get-FileHash -LiteralPath $item[0] -Algorithm SHA256).Hash -cne $item[1]){throw 'SOURCE_HASH_DRIFT_STOP'}}
}
Test-Identity
$base=Join-Path $env:LOCALAPPDATA 'SmartAgriculture'
$target=[IO.Path]::GetFullPath($PrivateDirectory)
if([IO.Path]::GetDirectoryName($target) -cne $base -or [IO.Path]::GetFileName($target) -notmatch '^mqtt-acl-plan-\d{8}-\d{6}-[a-f0-9]+$'){throw 'STAGING_PATH_REFUSED'}
$cursor=$base
while($cursor){if(-not (Test-Path -LiteralPath $cursor -PathType Container)){throw 'ANCESTOR_MISSING'};if((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'REPARSE_REFUSED'};$parent=[IO.Directory]::GetParent($cursor);if($null -eq $parent){break};$cursor=$parent.FullName}
$parentAcl=Get-Acl -LiteralPath $base
if(-not $parentAcl.AreAccessRulesProtected){throw 'PARENT_ACL_NOT_PRIVATE'}
foreach($ace in $parentAcl.Access){$a=$ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value;if($a -notin @($operatorSid,'S-1-5-18') -or $ace.AccessControlType -ne 'Allow'){throw 'PARENT_ACL_REFUSED'}}
if(Test-Path -LiteralPath $target){throw 'CREATE_NEW_STAGING_ONLY'}
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
$rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.AddAccessRule($rule)
$di=New-Object IO.DirectoryInfo($target);$di.Create($acl)
$actual=Get-Acl -LiteralPath $target
if($actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or -not $actual.AreAccessRulesProtected -or $actual.Access.Count -ne 1 -or (Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'STAGING_ACL_VERIFY_FAILED'}
$ace=$actual.Access[0]
if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or $ace.AccessControlType -ne 'Allow' -or $ace.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or $ace.IsInherited){throw 'STAGING_ACL_VERIFY_FAILED'}
Write-Host 'PREPARE ONLY. No MQTT connection, no broker changes. This prompt asks for USERNAME only, never a password.'
Write-Host 'Username stays in memory via an anonymous pipe; no username handoff file will be created.'
$same=Read-Host 'To attest this is the SAME account used in the observer, type SAME SUBSCRIBER'
if($same -cne 'SAME SUBSCRIBER'){throw 'SUBSCRIBER_IDENTITY_NOT_CONFIRMED'}
$username=Read-Host 'Existing MQTT subscriber USERNAME (hidden, NOT a password)' -AsSecureString
$usage=Read-Host 'Is this account dedicated to observation? Type DEDICATED or SHARED (shared/unknown stops candidate generation)'
$dedicated=$usage -ceq 'DEDICATED'
Test-Identity
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName='C:\Program Files\nodejs\node.exe'
$info.Arguments='"C:\DATN\Project_datn\scripts\mqtt-acl-prepare.cjs"'
$info.WorkingDirectory=$target;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';LOCALAPPDATA=$env:LOCALAPPDATA;TEMP=$env:TEMP;TMP=$env:TMP}.GetEnumerator()){$info.EnvironmentVariables[$kv.Key]=$kv.Value}
$p=New-Object Diagnostics.Process;$p.StartInfo=$info;$ptr=[IntPtr]::Zero;$plain=$null;$json=$null
try{
 if(-not $p.Start()){throw 'NATIVE_START_FAILED'}
 $err=$p.StandardError.ReadToEndAsync();$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($username)
 $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $json=@{directory=$target;username=$plain;dedicated=$dedicated}|ConvertTo-Json -Compress
 $p.StandardInput.Write($json);$p.StandardInput.Close();$json=$null;$plain=$null
 while($null -ne ($line=$p.StandardOutput.ReadLine())){Write-Host $line}
 $p.WaitForExit();$safeError=$err.GetAwaiter().GetResult();if($safeError){Write-Host $safeError}
 if($p.ExitCode -ne 0){throw 'PREPARATION_CHILD_FAILED_NO_RETRY'}
 foreach($f in (Get-ChildItem -LiteralPath $target -File)){
  $fa=Get-Acl -LiteralPath $f.FullName
  if($fa.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid){throw 'FILE_OWNER_VERIFY_FAILED'}
  foreach($a in $fa.Access){if($a.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $operatorSid -or $a.AccessControlType -ne 'Allow'){throw 'FILE_ACL_VERIFY_FAILED'}}
 }
 Write-Host 'Preparation ended. No broker changes. No username handoff file to delete. Do not rerun automatically.'
}finally{
 if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $username.Dispose();$plain=$null;$json=$null;$p.Dispose()
}
