param([Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference='Stop'
$root='C:\DATN\test-instances\phase13-3b'
$resolved=[IO.Path]::GetFullPath($OutputFile)
if(-not $resolved.StartsWith($root+'\mvp-dev-',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolved) -ne 'credentials.dpapi'){throw 'DEV_CREDENTIAL_PATH_REFUSED'}
Add-Type -AssemblyName System.Security
$inputText=[Console]::In.ReadToEnd()
$bytes=[Text.Encoding]::UTF8.GetBytes($inputText)
try {
 $encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,[Text.Encoding]::UTF8.GetBytes('SMART_AGRI_MVP_DEV_ONLY'),[Security.Cryptography.DataProtectionScope]::CurrentUser)
 $stream=[IO.File]::Open($resolved,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 try{$stream.Write($encrypted,0,$encrypted.Length);$stream.Flush($true)}finally{$stream.Dispose()}
} finally { [Array]::Clear($bytes,0,$bytes.Length); $inputText=$null }
Write-Output 'DEV_CREDENTIALS_DPAPI_STORED'
