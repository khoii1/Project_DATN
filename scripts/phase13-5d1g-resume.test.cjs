'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const helper=path.join(__dirname,'phase13-5d1g-resume-root.ps1');
const powershell='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const env={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'};
test('resume PowerShell AST parses without executing filesystem mutation',()=>{
 const command="$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('"+helper.replace(/'/g,"''")+"',[ref]$t,[ref]$e);if($e.Count){exit 2};'AST_PASS'";
 const r=spawnSync(powershell,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:8000,maxBuffer:1048576,env});
 assert.equal(r.error,undefined);assert.equal(r.status,0);assert.match(r.stdout,/AST_PASS/);
});
test('resume in-memory DACL uses SID objects, exactly two ACEs, no filesystem writes',()=>{
 const r=spawnSync(powershell,['-NoProfile','-NonInteractive','-File',helper,'-Mode','TEST_DACL'],{encoding:'utf8',timeout:8000,maxBuffer:1048576,env});
 assert.equal(r.error,undefined);assert.equal(r.status,0,r.stdout);assert.equal(r.stderr,'');const out=JSON.parse(r.stdout);assert.equal(out.status,'IN_MEMORY_DACL_PASS');assert.equal(out.aceCount,2);assert.equal(out.mutated,false);
});
test('resume scope fixes test root only and preserves native bootstrap metadata',()=>{
 const s=fs.readFileSync(helper,'utf8'),runner=fs.readFileSync(path.join(__dirname,'phase13-5d1g-isolated-run.cjs'),'utf8');
 assert.equal((s.match(/Set-Acl -LiteralPath \$root/g)||[]).length,1);
 assert.doesNotMatch(s,/New-Item|Remove-Item|Start-Process|RunAs|Invoke-Expression/);
 assert.match(s,/WellKnownSidType\]::LocalSystemSid/);assert.match(s,/Get-ChildItem -LiteralPath \$root -Force/);
 assert.match(runner,/if\(resume\)acceptExistingResumeRoot\(\);else safeCreateRoot\(\)/);
 for(const field of ['nativeExitCode:r.status','nativeErrorCode:r.error','nativeSignal:r.signal','unknownOutcome:','resume-r1-outcome.json'])assert.ok(runner.includes(field));
});
