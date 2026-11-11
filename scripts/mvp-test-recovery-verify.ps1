# Continue only the UNUSED native authentication step on the already-running TEST server.
param([Parameter(Mandatory=$true)][int]$ExpectedPostmasterPid,[Parameter(Mandatory=$true)][string]$SqlSHA256)
$ErrorActionPreference='Stop'
$run='C:\DATN\test-instances\phase13-3b\test-auth-recovery-1793189718289-2f71e8'
$data='C:\DATN\test-instances\phase13-3b\data';$bin='C:\Program Files\PostgreSQL\17\bin'
$sql='C:\DATN\Project_datn\scripts\mvp-test-recovery-verify.sql'
$psql=Join-Path $bin 'psql.exe'
if((Get-FileHash -LiteralPath $sql).Hash -cne $SqlSHA256){throw 'READ_ONLY_SQL_HASH_DRIFT'}
if((Get-FileHash -LiteralPath $psql).Hash -cne '462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A'){throw 'PSQL_HASH_DRIFT'}
if([Console]::IsInputRedirected){throw 'NATIVE_CONSOLE_REQUIRED'}
$lines=[IO.File]::ReadAllLines((Join-Path $data 'postmaster.pid'))
if([int]$lines[0] -ne $ExpectedPostmasterPid -or [IO.Path]::GetFullPath($lines[1]) -ine $data -or [int]$lines[3] -ne 55433){throw 'POSTMASTER_IDENTITY_CHANGED'}
$server=Get-Process -Id $ExpectedPostmasterPid -ErrorAction Stop
if($server.ProcessName -cne 'postgres'){throw 'WRONG_SERVER_PROCESS'}
$control=& (Join-Path $bin 'pg_controldata.exe') $data
if($LASTEXITCODE -ne 0 -or -not ($control -match '^Database system identifier:\s+7698826681383327460$')){throw 'TEST_SYSTEM_ID_MISMATCH'}
$reset=Get-Content -LiteralPath (Join-Path $run 'password-reset.result.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($reset.exitCode -ne 0 -or $reset.signal -or $reset.error){throw 'RESET_NATIVE_OUTCOME_NOT_SUCCESSFUL'}
if(-not ([IO.File]::ReadAllText((Join-Path $run 'password-reset.stdout.log')).Contains('MVP_RESET_COMMITTED:'))){throw 'RESET_COMMIT_PROOF_ABSENT'}
foreach($f in @((Join-Path $env:USERPROFILE 'AppData\Roaming\postgresql\pgpass.conf'),(Join-Path $env:USERPROFILE '.pgpass'))){if(Test-Path -LiteralPath $f){throw 'STORED_AUTH_FALLBACK_REFUSED'}}
$marker=Join-Path $run 'verification-auth.attempt.json'
$stream=[IO.File]::Open($marker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$bytes=[Text.Encoding]::UTF8.GetBytes((@{at=[DateTimeOffset]::UtcNow.ToString('o');role='phase13_test_admin';port=55433;maxAttempts=1;method='NATIVE_PSQL_CONIN_PROMPT';continuation='EXISTING_SERVER_NO_RESET_OR_START';postmasterPid=$ExpectedPostmasterPid}|ConvertTo-Json));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Host 'TEST verification ONLY. Enter the SAME NEW TEST password at the PostgreSQL prompt.'
Write-Host 'No reset or server startup will run. Do not use production password or share it in chat.'
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName=$psql
$info.Arguments='-X -W -q -t -A --host=127.0.0.1 --port=55433 --username=phase13_test_admin --dbname=postgres --set=ON_ERROR_STOP=1 --file="'+$sql+'"'
$info.WorkingDirectory=$run;$info.UseShellExecute=$false;$info.CreateNoWindow=$false
$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$info.EnvironmentVariables.Clear()
foreach($key in @('SystemRoot','WINDIR','TEMP','TMP')){if([Environment]::GetEnvironmentVariable($key)){$info.EnvironmentVariables[$key]=[Environment]::GetEnvironmentVariable($key)}}
$info.EnvironmentVariables['PATH']='C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0'
$info.EnvironmentVariables['PGCONNECT_TIMEOUT']='3';$info.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
$info.EnvironmentVariables['PGOPTIONS']='-c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000'
$info.EnvironmentVariables['PGAPPNAME']='mvp-test-recovery-single-readonly-verification'
$p=New-Object Diagnostics.Process;$p.StartInfo=$info
if(-not $p.Start()){throw 'PSQL_NOT_STARTED_NO_RETRY'}
$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync()
if(-not $p.WaitForExit(180000)){throw 'AUTH_DEADLINE_UNKNOWN_DO_NOT_RETRY_OR_KILL'}
$stdout=$out.GetAwaiter().GetResult();$stderr=$err.GetAwaiter().GetResult()
function Write-NewPrivate([string]$Name,[string]$Text){$s=[IO.File]::Open((Join-Path $run $Name),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$b=[Text.Encoding]::UTF8.GetBytes($Text);$s.Write($b,0,$b.Length)}finally{$s.Dispose()}}
Write-NewPrivate 'verification-psql-native.stdout.log' $stdout
Write-NewPrivate 'verification-psql-native.stderr.log' $stderr
Write-NewPrivate 'verification-psql-native.result.json' (@{at=[DateTimeOffset]::UtcNow.ToString('o');pid=$p.Id;exitCode=$p.ExitCode;authenticationAttempts=1;postmasterPid=$ExpectedPostmasterPid}|ConvertTo-Json)
if($p.ExitCode -ne 0){Write-Host $stderr -ForegroundColor Red;throw 'NATIVE_AUTH_FAILED_STOP_NO_RETRY'}
$result=$stdout.Trim()|ConvertFrom-Json
if($result.user -cne 'phase13_test_admin' -or $result.database -cne 'postgres' -or $result.port -ne 55433 -or $result.systemId -cne '7698826681383327460' -or $result.version -cne '170002' -or [IO.Path]::GetFullPath($result.pgdata) -ine $data -or $result.readOnly -cne 'on'){throw 'AUTH_SQL_IDENTITY_MISMATCH'}
foreach($key in @('canLogin','superuser','createDB','createRole')){if($result.$key -ne $true){throw 'ROLE_ATTRIBUTE_MISMATCH'}}
Write-NewPrivate 'verification-auth-result.json' ($result|ConvertTo-Json)
Write-Host 'TEST_DBA_ACCESS_RECOVERED. Native psql exit0; READ ONLY identity and role checks PASS.'
Write-Host 'Verification finished. Agent will smart-stop only this TEST cluster. Do not run commands again.'
