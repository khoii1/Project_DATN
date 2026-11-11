const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const [mode,expected]of [['zero',0],['three',3],['timeout',4],['startFailure',3]])test('actual native launcher helper propagation: '+mode,()=>{
 const file=path.join(__dirname,'mvp-edge-smoke-once.ps1');
 const ps=String.raw`
$ErrorActionPreference='Stop'
$run='SYNTHETIC_NOT_CREATED'
function Write-New($name,$value){$script:saved=$value}
$t=$null;$e=$null
$a=[Management.Automation.Language.Parser]::ParseFile('${file}',[ref]$t,[ref]$e)
if($e.Count){exit 8}
$f=$a.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Invoke-SmokeNativeObserver'},$true)
Invoke-Expression $f[0].Extent.Text
$p=New-Object Diagnostics.Process
$p.StartInfo.FileName='${mode==='startFailure'?'C:\SYNTHETIC_MISSING_EXE.exe':process.execPath}'
$p.StartInfo.Arguments='-e "${mode==='timeout'?'setTimeout(()=>{},300)':'process.exit('+expected+')'}"'
$p.StartInfo.UseShellExecute=$false;$p.StartInfo.CreateNoWindow=$true
$p.StartInfo.RedirectStandardOutput=$true;$p.StartInfo.RedirectStandardError=$true
$code=Invoke-SmokeNativeObserver -Process $p -DeadlineMs ${mode==='timeout'?20:3000}
if($code -ne ${expected}){exit 9}
if('${mode}' -eq 'timeout'){
 if($script:saved.nativeExit -ne $null -or -not $script:saved.timeout){exit 10}
 try{$child=[Diagnostics.Process]::GetProcessById($script:saved.nodePid);$null=$child.WaitForExit(2000);$child.Dispose()}catch{}
}
exit $code
`;
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:8000,windowsHide:true});assert.equal(r.status,expected,r.stderr);assert.equal(r.stderr,'');
});
