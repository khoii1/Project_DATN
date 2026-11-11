# Candidate native reader. The live entrypoint is unconditionally denied in D.1F.
[CmdletBinding()]
param([ValidateSet('PLAN_ONLY','OFFLINE_FIXTURE')][string]$Mode='PLAN_ONLY')
$ErrorActionPreference='Stop'
function Invoke-D1FLiveAcquisition {
 throw 'LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'
}
function Get-D1FReadOnlySpecification {
 # This scriptblock is a reviewed acquisition specification, NEVER invoked here.
 $candidate = {
  $before = Get-CimInstance -ClassName Win32_Process -OperationTimeoutSec 3 -ErrorAction Stop
  $listeners = Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @(5000,1883) }
  $owners = @($listeners.OwningProcess | Select-Object -Unique)
  $identities = foreach ($ownerId in $owners) {
   $p = Get-Process -Id $ownerId -ErrorAction Stop
   # Never export CommandLine. Cwd/entrypoint require separate identity-bound attestation.
   [pscustomobject]@{pid=$p.Id;startTicks=$p.StartTime.ToUniversalTime().Ticks.ToString();executable=$p.Path}
  }
  $after = Get-CimInstance -ClassName Win32_Process -OperationTimeoutSec 3 -ErrorAction Stop
  # A future transport must project/validate $before/$after in RAM; do not serialize raw CIM.
  # It must stop NOT_VERIFIED if a process identity, parent or listener cannot be inspected.
  $null=$before;$null=$after;$null=$identities
 }
 return [pscustomobject]@{mode='PLAN_ONLY';executionEnabled=$false;cmdlets=@('Get-CimInstance Win32_Process','Get-Process','Get-NetTCPConnection');candidate=$candidate.ToString()}
}
if($Mode -eq 'PLAN_ONLY') {
 [pscustomobject]@{phase='13.5D.1F';mode='PLAN_ONLY';executionEnabled=$false;liveAuthorized=$false}|ConvertTo-Json -Compress
 exit 0
}
try {
 # Synthetic stdin protocol: deliberately no raw process/config payload echoed to stdout.
 $chars=New-Object char[] 1024
 $text=New-Object Text.StringBuilder
 while(($count=[Console]::In.Read($chars,0,$chars.Length)) -gt 0) {
  if($text.Length+$count -gt 1048576){throw 'FIXTURE_LIMIT'}
  $null=$text.Append($chars,0,$count)
 }
 $fixture=$text.ToString()|ConvertFrom-Json -ErrorAction Stop
 if(@($fixture.PSObject.Properties.Name).Count -ne 1 -or $fixture.scenario -cne 'ACCESS_DENIED'){throw 'FIXTURE_PROTOCOL'}
 # Access denied must be NOT_VERIFIED, never guessed absent/running or PASS.
 [pscustomobject]@{status='NOT_VERIFIED';reasonCode='PROCESS_METADATA_UNAVAILABLE';liveAuthorized=$false}|ConvertTo-Json -Compress
 exit 0
} catch {
 [pscustomobject]@{status='NOT_VERIFIED';reasonCode='OFFLINE_FIXTURE_REJECTED';liveAuthorized=$false}|ConvertTo-Json -Compress
 exit 2
}
