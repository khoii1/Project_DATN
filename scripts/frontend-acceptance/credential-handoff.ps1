# PREPARATION ONLY: function declarations. Dot-sourcing never prompts or starts a process.
function Send-AcceptanceWebsiteCredential {
 param([Parameter(Mandatory=$true)][Diagnostics.Process]$BrowserWorker,
       [scriptblock]$Prompt={Get-Credential -UserName 'owner-a@mvp.invalid' -Message 'Existing DEV Website credential only; no PostgreSQL or MQTT credential.'})
 $credential=$null;$network=$null;$payload=$null;$buffer=$null
 try {
  $credential=& $Prompt
  if($null -eq $credential -or $credential -isnot [Management.Automation.PSCredential] -or $credential.UserName -cne 'owner-a@mvp.invalid' -or $credential.Password.Length -lt 1 -or $credential.Password.Length -gt 1024){throw 'WEBSITE_CREDENTIAL_REFUSED'}
  $network=$credential.GetNetworkCredential()
  $payload=@{email=$credential.UserName;password=$network.Password}|ConvertTo-Json -Compress
  $buffer=[Text.Encoding]::UTF8.GetBytes($payload)
  $BrowserWorker.StandardInput.BaseStream.Write($buffer,0,$buffer.Length)
  $BrowserWorker.StandardInput.BaseStream.Flush();$BrowserWorker.StandardInput.Close()
 }catch{throw 'WEBSITE_CREDENTIAL_HANDOFF_FAILED'}
 finally{if($buffer){[Array]::Clear($buffer,0,$buffer.Length)};if($network){$network.Password=''};if($credential){$credential.Password.Dispose()};$payload=$null;$network=$null;$credential=$null}
}
