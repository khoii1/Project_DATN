param([string]$Compiler = 'g++')
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$output = Join-Path $repo 'build\firmware-tests'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$binary = Join-Path $output 'pump_controller_test.exe'
& $Compiler -std=c++11 -Wall -Wextra -Werror -static (Join-Path $PSScriptRoot 'pump_controller_test.cpp') -o $binary
if ($LASTEXITCODE -ne 0) { throw 'Host C++ compilation failed' }
& $binary
if ($LASTEXITCODE -ne 0) { throw 'Host controller tests failed' }
$diagnosticsBinary = Join-Path $output 'firmware_diagnostics_test.exe'
& $Compiler -std=c++11 -Wall -Wextra -Werror -static (Join-Path $PSScriptRoot 'firmware_diagnostics_test.cpp') -o $diagnosticsBinary
if ($LASTEXITCODE -ne 0) { throw 'Diagnostics compilation failed' }
& $diagnosticsBinary
if ($LASTEXITCODE -ne 0) { throw 'Diagnostics tests failed' }
$previousTestExe = $env:FIRMWARE_TEST_EXE
$stateBinary = Join-Path $output 'off_state_schedule_test.exe'
& $Compiler -std=c++11 -Wall -Wextra -Werror -static (Join-Path $PSScriptRoot 'off_state_schedule_test.cpp') -o $stateBinary
if ($LASTEXITCODE -ne 0) { throw 'State schedule compilation failed' }
& $stateBinary
if ($LASTEXITCODE -ne 0) { throw 'State schedule tests failed' }
$sntpBinary = Join-Path $output 'sntp_recovery_test.exe'
& $Compiler -std=c++11 -Wall -Wextra -Werror -static (Join-Path $PSScriptRoot 'sntp_recovery_test.cpp') -o $sntpBinary
if ($LASTEXITCODE -ne 0) { throw 'SNTP recovery compilation failed' }
& $sntpBinary
if ($LASTEXITCODE -ne 0) { throw 'SNTP recovery tests failed' }
$clockBinary = Join-Path $output 'clock_snapshot_test.exe'
& $Compiler -std=c++11 -Wall -Wextra -Werror -static -pthread (Join-Path $PSScriptRoot 'clock_snapshot_test.cpp') -o $clockBinary
if ($LASTEXITCODE -ne 0) { throw 'Clock snapshot compilation failed' }
& $clockBinary
if ($LASTEXITCODE -ne 0) { throw 'Clock snapshot tests failed' }
& node --test (Join-Path $PSScriptRoot 'clock-critical-section.test.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Clock critical-section source tests failed' }
$env:FIRMWARE_TEST_EXE = $binary
try {
  & node --test (Join-Path $PSScriptRoot 'backend-contract.test.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Backend firmware contract tests failed' }
} finally {
  if ($null -eq $previousTestExe) { Remove-Item Env:\FIRMWARE_TEST_EXE -ErrorAction SilentlyContinue }
  else { $env:FIRMWARE_TEST_EXE = $previousTestExe }
}
