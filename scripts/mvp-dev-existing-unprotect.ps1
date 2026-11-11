param([Parameter(Mandatory=$true)][string]$CredentialFile)
$ErrorActionPreference='Stop'
$expected='C:\DATN\test-instances\phase13-3b\mvp-direct-1793193356053-b27caf\credentials.dpapi'
if([IO.Path]::GetFullPath($CredentialFile) -cne $expected){throw 'EXISTING_DEV_CREDENTIAL_PATH_REFUSED'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
if($sid -ne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'DEV_OPERATOR_REFUSED'}
$acl=Get-Acl -LiteralPath $expected
if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid){throw 'CREDENTIAL_OWNER_REFUSED'}
foreach($ace in $acl.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid){throw 'CREDENTIAL_ACL_REFUSED'}}
if((Get-Item -LiteralPath $expected).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'CREDENTIAL_REPARSE_REFUSED'}
Add-Type -AssemblyName System.Security
$plain=$null
try{
 $plain=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($expected),[Text.Encoding]::UTF8.GetBytes('SMART_AGRI_MVP_DEV_ONLY'),[Security.Cryptography.DataProtectionScope]::CurrentUser)
 # Private anonymous pipe to the parent only. Never invoke directly or transcript this helper.
 [Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))
}finally{if($null -ne $plain){[Array]::Clear($plain,0,$plain.Length)}}
