# Diagnostic only: no startup/restart, firmware or command gateway mutations.
function Assert-Phase135c4Evidence($Evidence) {
 if ($Evidence.ListenerBefore -ne $Evidence.ListenerAfter -or $Evidence.ListenerBefore -ne $Evidence.StatePid -or $Evidence.StatePid -ne $Evidence.Runtime.pid) {throw 'BACKEND_PID_CHANGED_OR_MISMATCH'}
 if ($Evidence.ProcessStartBefore -cne $Evidence.ProcessStartAfter) {throw 'BACKEND_PROCESS_REPLACED'}
 if ($Evidence.Runtime.commandsEnabled -cne $false -or $Evidence.Runtime.automationEnabled -cne $false -or $Evidence.Runtime.testMode -cne $true -or $Evidence.Runtime.effectiveMaxRunSeconds -ne 1) {throw 'UNSAFE_STARTUP_ATTESTATION'}
 if ($Evidence.Api.health.database -cne 'connected' -or $Evidence.Api.health.mqtt -cne 'connected' -or $Evidence.Api.runtime.commandsEnabled -cne $false -or $Evidence.Api.runtime.automationEnabled -cne $false -or $Evidence.Api.runtime.pumpTestMode -cne $true -or $Evidence.Api.gatewayMode -cne 'DISABLED' -or $Evidence.Api.controlEnabled -cne $false) {throw 'UNSAFE_OR_UNAVAILABLE_PROTECTED_RUNTIME'}
}
function Get-Phase135c4Listener {
 $ids=@(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)
 if($ids.Count -ne 1){throw 'EXACTLY_ONE_BACKEND_LISTENER_REQUIRED'}
 $process=Get-Process -Id $ids[0] -ErrorAction Stop
 if($process.ProcessName -ne 'node'){throw 'UNEXPECTED_BACKEND_PROCESS'}
 [pscustomobject]@{Pid=$ids[0];Started=$process.StartTime.ToUniversalTime().ToString('o')}
}
function Get-Phase135c4Runtime([string]$Repo) {
 $before=Get-Phase135c4Listener
 $build=Join-Path $Repo 'build'
 $states=@(Get-ChildItem -LiteralPath $build -Filter '*.state.json' -File | ForEach-Object {
  try {$s=Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json;if($s.pid -eq $before.Pid){[pscustomobject]@{File=$_.FullName;State=$s}}}catch{}
 })
 if($states.Count -ne 1){throw 'EXACT_CURRENT_STARTUP_STATE_REQUIRED'}
 $state=$states[0].State;$stem=$states[0].File.Substring(0,$states[0].File.Length-'.state.json'.Length)
 $attemptPath=$stem+'.attempt.json';$stdout=$stem+'.stdout.log';$exitPath=$stem+'.exit.json'
 if ($state.state -cne 'RUNNING' -or $state.command -cne '--import tsx src/server.ts' -or $state.stdout -ine $stdout -or $state.exitEvidence -ine $exitPath -or (Test-Path -LiteralPath $exitPath)) {throw 'INVALID_CURRENT_STARTUP_STATE'}
 if(-not(Test-Path -LiteralPath $attemptPath -PathType Leaf)){throw 'CURRENT_STARTUP_ATTEMPT_REQUIRED'}
 $attempt=Get-Content -LiteralPath $attemptPath -Raw -Encoding UTF8 | ConvertFrom-Json
 if($attempt.RunId -cne $state.runId -or $attempt.StartedAt -cne $state.startedAt -or $attempt.Attempts -ne 1){throw 'STARTUP_ATTEMPT_STATE_MISMATCH'}
 if([Math]::Abs(([DateTimeOffset]::Parse($state.startedAt)-[DateTimeOffset]::Parse($before.Started)).TotalSeconds) -gt 10){throw 'STARTUP_STATE_PROCESS_TIME_MISMATCH'}
 foreach($p in @($states[0].File,$attemptPath,$stdout)){Assert-Phase135cNoReparse $p}
 $runtime=$null;$deadline=[DateTimeOffset]::UtcNow.AddSeconds(10)
 do {
  $current=Get-Phase135c4Listener
  if($current.Pid -ne $before.Pid -or $current.Started -cne $before.Started){throw 'BACKEND_CHANGED_DURING_LOG_WAIT'}
  $log=Get-Content -LiteralPath $stdout -Raw -Encoding UTF8
  $matches=@([regex]::Matches([string]$log,'MQTT pump safety runtime:\s*(\{[^\r\n]+\})'))
  if($matches.Count -gt 1){throw 'AMBIGUOUS_STARTUP_ATTESTATION'}
  if($matches.Count -eq 1){$runtime=$matches[0].Groups[1].Value|ConvertFrom-Json;break}
  Start-Sleep -Milliseconds 300
 } while([DateTimeOffset]::UtcNow -lt $deadline)
 if(-not $runtime){throw 'CURRENT_LOG_NOT_FLUSHED_WITHIN_BOUND_NOT_VERIFIED'}
 if([DateTimeOffset]::Parse($runtime.startedAt) -lt [DateTimeOffset]::Parse($state.startedAt) -or ([DateTimeOffset]::Parse($runtime.startedAt)-[DateTimeOffset]::Parse($state.startedAt)).TotalSeconds -gt 120){throw 'STARTUP_ATTESTATION_TIME_MISMATCH'}
 # Capture both native streams, never expose token/login response or raw error.
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName=(Get-Command node.exe).Source;$info.Arguments='"'+(Join-Path $Repo 'backend\scripts\phase13-5c4-runtime-api.cjs')+'"'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $child=New-Object Diagnostics.Process;$child.StartInfo=$info
 try {
  if(-not $child.Start()){throw 'RUNTIME_API_PROBE_NOT_STARTED'}
  $out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync()
  if(-not $child.WaitForExit(45000)){$child.Kill();$child.WaitForExit();throw 'RUNTIME_API_PROBE_TIMEOUT'}
  if($child.ExitCode -ne 0){throw 'PROTECTED_RUNTIME_PROBE_FAILED'}
  $api=$out.GetAwaiter().GetResult()|ConvertFrom-Json
  $null=$err.GetAwaiter().GetResult()
 } finally {$child.Dispose()}
 $after=Get-Phase135c4Listener
 $e=[pscustomobject]@{ListenerBefore=$before.Pid;ListenerAfter=$after.Pid;ProcessStartBefore=$before.Started;ProcessStartAfter=$after.Started;StatePid=$state.pid;StateFile=$states[0].File;AttemptFile=$attemptPath;StdoutFile=$stdout;Runtime=$runtime;Api=$api;CheckedAt=[DateTimeOffset]::UtcNow.ToString('o')}
 Assert-Phase135c4Evidence $e
 return $e
}
