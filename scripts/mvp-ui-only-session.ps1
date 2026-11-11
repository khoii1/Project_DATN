# Preparation only. Future new approval plan required. Never opens a browser.
param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference='Stop'
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
if($sid.Value -cne 'S-1-5-21-1432835263-483988321-3159128977-1001'){throw 'UI_ONLY_OPERATOR_REFUSED'}
$base='C:\DATN\test-instances\phase13-3b'
function Check-Private($path){
 for($p=[IO.Path]::GetFullPath($path);$p;$p=[IO.Path]::GetDirectoryName($p)){if((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'UI_ONLY_REPARSE_REFUSED'}}
 $a=Get-Acl -LiteralPath $path
 if(-not $a.AreAccessRulesProtected -or $a.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $sid.Value -or $a.Access.Count -ne 1){throw 'UI_ONLY_ACL_REFUSED'}
 foreach($ace in $a.Access){if($ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $sid.Value -or $ace.AccessControlType -ne 'Allow' -or $ace.FileSystemRights -ne 'FullControl'){throw 'UI_ONLY_ACE_REFUSED'}}
}
Check-Private $PlanFile;Check-Private ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($PlanFile)));Check-Private $base
$json=[IO.File]::ReadAllText([IO.Path]::GetFullPath($PlanFile))
& 'C:\Program Files\nodejs\node.exe' 'C:\DATN\Project_datn\scripts\mvp-ui-only-supervisor.cjs' --check-plan $PlanFile
if($LASTEXITCODE -ne 0){throw 'UI_ONLY_PLAN_REJECTED_BEFORE_PREPARATION'}
function Get-UIOnlyWebsiteCredential([scriptblock]$Prompt={Get-Credential -UserName 'owner-a@mvp.invalid' -Message 'Existing DEV WEBSITE login only. Do not enter PostgreSQL or MQTT credentials.'}){
 $value=& $Prompt
 if($null -eq $value -or $value -isnot [Management.Automation.PSCredential] -or $value.UserName -cne 'owner-a@mvp.invalid' -or $value.Password.Length -lt 1 -or $value.Password.Length -gt 1024){throw 'PRE_FRONTEND_AUTH_CREDENTIAL_CONTRACT_BLOCKED'}
 return $value
}
function Send-UIOnlyWebsiteCredential($Process,[Management.Automation.PSCredential]$Credential){
 $network=$null;$payload=$null;$buffer=$null
 try{$network=$Credential.GetNetworkCredential();$payload=@{email=$Credential.UserName;password=$network.Password}|ConvertTo-Json -Compress;$buffer=[Text.Encoding]::UTF8.GetBytes($payload);$Process.StandardInput.BaseStream.Write($buffer,0,$buffer.Length);$Process.StandardInput.BaseStream.Flush();$Process.StandardInput.Close()}
 catch{throw 'PRE_FRONTEND_AUTH_CREDENTIAL_HANDOFF_FAILED'}
 finally{if($buffer){[Array]::Clear($buffer,0,$buffer.Length)};$payload=$null;if($network){$network.Password='';$network=$null}}
}
# Operator prompt precedes startup/attempt; cancellation never starts a cluster.
# Only transient stdin is sent to the supervised child; never plan/env/CLI/logs.
$websiteCredential=Get-UIOnlyWebsiteCredential
$run=Join-Path $base ('ui-only-historical-'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+'-'+[guid]::NewGuid().ToString('N').Substring(0,12))
$plan=$json|ConvertFrom-Json
$consumed=Join-Path $base ('ui-only-approved-'+$plan.userApprovalSha256+'.attempt.json')
$stream=[IO.File]::Open($consumed,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
$bytes=[Text.Encoding]::UTF8.GetBytes((@{run=$run;approvalSha256=$plan.userApprovalSha256;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Compress))
try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
if(Test-Path -LiteralPath $run){throw 'UI_ONLY_CREATE_NEW_REFUSED'}
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
$null=[IO.Directory]::CreateDirectory($run,$acl);Check-Private $run
function Write-New($name,$text){$s=[IO.File]::Open((Join-Path $run $name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);$b=[Text.Encoding]::UTF8.GetBytes($text);try{$s.Write($b,0,$b.Length)}finally{$s.Dispose()}}
Write-New 'approval.json' $json
Write-New 'launcher-receipt.json' (@{pid=$PID;operatorSid=$sid.Value;privateAclVerified=$true;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Compress)
$p=New-Object Diagnostics.Process
$p.StartInfo.FileName='C:\Program Files\nodejs\node.exe';$p.StartInfo.Arguments='"C:\DATN\Project_datn\scripts\mvp-ui-only-supervisor.cjs" --execute "'+$run+'"'
$p.StartInfo.WorkingDirectory=$run;$p.StartInfo.UseShellExecute=$false;$p.StartInfo.CreateNoWindow=$true
$p.StartInfo.RedirectStandardOutput=$true;$p.StartInfo.RedirectStandardError=$true;$p.StartInfo.EnvironmentVariables.Clear()
$p.StartInfo.RedirectStandardInput=$true
foreach($kv in @{SystemRoot='C:\Windows';WINDIR='C:\Windows';PATH='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0';TEMP=$run;TMP=$run}.GetEnumerator()){$p.StartInfo.EnvironmentVariables[$kv.Key]=$kv.Value}
$code=3
try{
 if(-not $p.Start()){throw 'UI_ONLY_SUPERVISOR_START_FAILED'}
 $stdout=$p.StandardOutput.ReadToEndAsync();$stderr=$p.StandardError.ReadToEndAsync()
 Send-UIOnlyWebsiteCredential $p $websiteCredential
 $websiteCredential.Password.Dispose();$websiteCredential=$null
 Write-Host ('Private UI-only run: '+$run)
 Write-Host 'Wait for API/frontend readiness before opening browser manually. No MQTT or pump commands.'
 $until=[DateTime]::UtcNow.AddSeconds(900);$announced=$false
 while(-not $p.HasExited -and [DateTime]::UtcNow -lt $until){
  if(-not $announced -and (Test-Path -LiteralPath (Join-Path $run 'manual-checklist.json')) -and -not (Test-Path -LiteralPath (Join-Path $run 'summary.json'))){Write-Host 'UI_ONLY_READY http://127.0.0.1:55173 — open browser manually; stored history only. Use existing DEV website credentials, never send them to chat.';$announced=$true}
  Start-Sleep -Milliseconds 250
 }
 if(-not $p.HasExited){$code=4;Write-New 'supervisor-native-exit.json' (@{pid=$p.Id;exitCode=$null;unknown=$true;noKill=$true}|ConvertTo-Json -Compress)}else{$code=$p.ExitCode;Write-New 'supervisor-native-exit.json' (@{pid=$p.Id;exitCode=$code;unknown=$false;stdoutBytes=$stdout.GetAwaiter().GetResult().Length;stderrBytes=$stderr.GetAwaiter().GetResult().Length}|ConvertTo-Json -Compress)}
}finally{if($websiteCredential){$websiteCredential.Password.Dispose();$websiteCredential=$null};$p.Dispose()}
exit $code
