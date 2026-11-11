[CmdletBinding()]
param([switch]$AllowUnelevated)
$ErrorActionPreference='Stop'
$operatorIdentity=[Security.Principal.WindowsIdentity]::GetCurrent()
$elevated=([Security.Principal.WindowsPrincipal]$operatorIdentity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $elevated -and -not $AllowUnelevated) { throw 'ADMINISTRATOR_READ_ONLY_AUDIT_REQUIRED' }
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$bindings=@(Get-NetTCPConnection -State Listen -LocalPort 1883)
$lanPids=@($bindings | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') } | Select-Object -ExpandProperty OwningProcess -Unique)
if ($lanPids.Count -ne 1) { throw 'AMBIGUOUS_OR_MISSING_LAN_BROKER_STOP' }
$brokerPid=[int]$lanPids[0]
$broker=Get-CimInstance Win32_Process -Filter "ProcessId=$brokerPid"
if (-not $broker -or $broker.Name -ne 'mosquitto.exe') { throw 'LAN_PROCESS_NOT_MOSQUITTO' }
$owner=$null
try { $o=Invoke-CimMethod -InputObject $broker -MethodName GetOwner; if ($o.ReturnValue -eq 0) { $owner="$($o.Domain)\$($o.User)" } } catch { }
$line=[string]$broker.CommandLine
$match=[regex]::Match($line,'(?:^|\s)(?:-c|--config-file)\s+(?:"([^"]+)"|(\S+))')
$actualConfig=$null; $configSafe=@(); $passwordPath=$null; $aclPath=$null; $includes=$false
if ($match.Success) {
  $candidate=if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
  if ([IO.Path]::IsPathRooted($candidate)) {
    $actualConfig=[IO.Path]::GetFullPath($candidate)
    # Only approved structural options. Never output arbitrary config/plugin options.
    foreach ($configLine in [IO.File]::ReadAllLines($actualConfig)) {
      if ($configLine -match '^\s*(listener|bind_address|password_file|acl_file|allow_anonymous|include_dir|per_listener_settings)\s+(.+?)\s*$') {
        $key=$matches[1]; $value=$matches[2]
        $configSafe+=[pscustomobject]@{Option=$key;Value=$value}
        if ($key -eq 'password_file') { $passwordPath=$value }
        if ($key -eq 'acl_file') { $aclPath=$value }
        if ($key -eq 'include_dir') { $includes=$true }
      }
    }
  }
}
$version=$null; $helpExit=$null
if ($broker.ExecutablePath -and (Test-Path -LiteralPath $broker.ExecutablePath)) {
  $si=New-Object Diagnostics.ProcessStartInfo
  $si.FileName=$broker.ExecutablePath; $si.Arguments='-h'; $si.UseShellExecute=$false; $si.CreateNoWindow=$true
  $si.RedirectStandardOutput=$true; $si.RedirectStandardError=$true
  $p=New-Object Diagnostics.Process; $p.StartInfo=$si
  try {
    if (-not $p.Start()) { throw 'OFFLINE_VERSION_PROCESS_FAILED' }
    $outTask=$p.StandardOutput.ReadToEndAsync(); $errTask=$p.StandardError.ReadToEndAsync(); $p.WaitForExit()
    $outText=$outTask.GetAwaiter().GetResult(); $errText=$errTask.GetAwaiter().GetResult(); $helpExit=$p.ExitCode
    $vm=[regex]::Match($outText+"`n"+$errText,'mosquitto version ([0-9.]+)'); if ($vm.Success) { $version=$vm.Groups[1].Value }
  } finally { $p.Dispose() }
}
$services=@(Get-CimInstance Win32_Service | Where-Object { $_.ProcessId -eq $brokerPid -or $_.Name -like '*mosquitto*' } | Select-Object Name,State,ProcessId,StartName)
$paths=@($repo,(Join-Path $repo 'build'),(Join-Path $repo 'firmware\SmartAgricultureESP32\config.local.h'),(Join-Path $repo 'backend\.env'),'C:\mosquitto\config','C:\DATN\backups')
if ($passwordPath -and [IO.Path]::IsPathRooted($passwordPath)) { $paths+=$passwordPath } else { $paths+='C:\mosquitto\config\passwords' }
$localBase=[Environment]::GetFolderPath('LocalApplicationData')
$container=Join-Path $localBase 'SmartAgriculture'; $staging=Join-Path $container 'credential-rotation'
$paths+=@($localBase,$container,$staging)
$aclReview=@(foreach ($target in $paths | Select-Object -Unique) {
  if (Test-Path -LiteralPath $target) {
    $item=Get-Item -LiteralPath $target -Force; $acl=Get-Acl -LiteralPath $target
    [pscustomobject]@{Path=$target;Exists=$true;Reparse=[bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint);Owner=$acl.Owner;ProtectedDacl=$acl.AreAccessRulesProtected;Rules=@($acl.Access | ForEach-Object { [pscustomobject]@{Principal=[string]$_.IdentityReference;Rights=[string]$_.FileSystemRights;Type=[string]$_.AccessControlType;Inherited=$_.IsInherited} })}
  } else { [pscustomobject]@{Path=$target;Exists=$false} }
})
$pathsVerified=!!($passwordPath -and $aclPath -and [IO.Path]::IsPathRooted($passwordPath) -and [IO.Path]::IsPathRooted($aclPath) -and (Test-Path -LiteralPath $passwordPath -PathType Leaf) -and (Test-Path -LiteralPath $aclPath -PathType Leaf))
$after=Get-CimInstance Win32_Process -Filter "ProcessId=$brokerPid"
$sameProcess=!!($after -and $after.CreationDate -eq $broker.CreationDate)
$verified=!!($elevated -and $broker.ExecutablePath -and $actualConfig -and $owner -and $version -and $helpExit -eq 0 -and $pathsVerified -and -not $includes -and $sameProcess)
$result=[ordered]@{CheckedAtUtc=[DateTimeOffset]::UtcNow.ToString('o');Elevated=$elevated;BrokerExecutableConfigVerified=$verified;LanPID=$brokerPid;ParentPID=$broker.ParentProcessId;ProcessCreatedAt=$broker.CreationDate;SameProcessAtEnd=$sameProcess;ProcessOwner=$owner;Executable=$broker.ExecutablePath;CommandLineReadInMemory=[bool]$line;CommandLineSafeSummary=if($actualConfig){"<verified executable> -c `"$actualConfig`" <other arguments withheld>"}else{$null};SelectedConfigPath=$actualConfig;ConfigOptions=$configSafe;IncludesRequireReview=$includes;PasswordFilePath=$passwordPath;AclFilePath=$aclPath;PathsExistAndAbsolute=$pathsVerified;PasswordFileContentsRead=$false;ExecutableDiskVersion=$version;VersionHelpExitCode=$helpExit;Bindings=@($bindings | Select-Object LocalAddress,LocalPort,OwningProcess);Services=$services;AclReview=$aclReview;StagingPath=$staging;StagingCreated=$false;CredentialsChanged=$false;ServicesRestarted=$false}
$outDir=Join-Path $repo 'report\phase13_4h1'
[IO.Directory]::CreateDirectory($outDir) | Out-Null
$outputName=if($elevated){'broker-admin-readonly.json'}else{'broker-unelevated-readonly.json'}
$outputPath=Join-Path $outDir $outputName
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputPath -Encoding UTF8
$result | ConvertTo-Json -Depth 8
