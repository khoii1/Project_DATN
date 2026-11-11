// AC evidence analysis only. No real Chromium/Edge/Playwright launch or DB/MQTT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{EventEmitter}=require('node:events'),{spawnSync}=require('node:child_process');
const {smoke,createNativeObserver,browserEnvironment,EDGE}=require('./mvp-edge-smoke-observer.cjs');
const run=path.resolve(__dirname,'SYNTHETIC_AC_NOT_CREATED');
const files=['mvp-edge-smoke-observer.cjs','mvp-edge-smoke-once.ps1','mvp-ui-browser.cjs'].map(n=>path.join(__dirname,n));
const baseline=files.map(f=>fs.readFileSync(f));
function setup(reason){
 const environment=browserEnvironment(run),child=new EventEmitter();child.pid=777;let spawns=0,launches=0;const artifacts=new Map();
 const trace=createNativeObserver({environment,tempRoot:environment.TEMP,spawn:()=>{spawns++;return child;}});
 const chromium={launch:async()=>{launches++;trace.spawn(EDGE,['--user-data-dir='+path.join(environment.TEMP,'playwright_profile-synthetic')],{env:environment});child.emit('exit',0,null);const error=Error('SYNTHETIC_SECRET_NOT_FOR_OUTPUT');error.name=reason;throw error;}};
 const execute=()=>smoke({chromium,trace,run,timeoutMs:100,write:(n,v)=>{assert.ok(!artifacts.has(n));artifacts.set(n,structuredClone(v));}});
 return{execute,artifacts,spawns:()=>spawns,launches:()=>launches};
}
for(const name of ['Error','TargetClosedError'])test('native exit0 before Browser return remains failure, simulated '+name,async()=>{
 const x=setup(name),r=await x.execute();assert.equal(r.native.code,0);assert.equal(r.status,'SMOKE_BLOCKED');assert.equal(r.launchSucceeded,false);assert.equal(r.contextCreated,false);assert.equal(r.pageCreated,false);assert.equal(r.closeCalls,0);assert.equal(r.errorCode,'UNCLASSIFIED_ERROR');assert.equal(x.spawns(),1);assert.equal(x.launches(),1);assert.ok(!JSON.stringify([...x.artifacts]).includes('SYNTHETIC_SECRET_NOT_FOR_OUTPUT'));
});
test('AB sanitized evidence cannot distinguish generic launch rejection from transport-closed error',async()=>{
 const a=await setup('Error').execute(),b=await setup('TargetClosedError').execute();for(const k of ['status','failureStage','errorCode','launchSucceeded','contextCreated','pageCreated'])assert.equal(a[k],b[k]);assert.ok(!Object.hasOwn(b,'errorName'));assert.ok(!Object.hasOwn(b,'errorMessage'));
});
test('observer source maps unsuccessful smoke to native3 without rewriting Edge native code',()=>{
 const s=fs.readFileSync(files[0],'utf8');assert.match(s,/process\.exitCode=result\.status==='SMOKE_PASS'\?0:3/);assert.match(s,/facts\.native=trace\.native\(\)/);assert.doesNotMatch(s,/process\.exit\(0\)/);
});
test('AD launcher AST confirms explicit exit propagation after child evidence capture',()=>{
 const code="$t=$null;$e=$null;$a=[Management.Automation.Language.Parser]::ParseFile('"+files[1]+"',[ref]$t,[ref]$e);if($e.Count){exit 1};@{exitStatements=@($a.FindAll({param($n)$n -is [Management.Automation.Language.ExitStatementAst]},$true)).Count;parseErrors=$e.Count}|ConvertTo-Json -Compress";
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{encoding:'utf8',windowsHide:true,timeout:5000});assert.equal(r.status,0);assert.equal(r.stderr,'');assert.deepEqual(JSON.parse(r.stdout),{exitStatements:1,parseErrors:0});const source=fs.readFileSync(files[1],'utf8');assert.match(source,/nativeExit=\$p.ExitCode/);assert.match(source,/exit \$resultCode/);
});
test('synthetic aggregate verdict never uses launcher0 or Edge0 as smoke success',()=>{
 const aggregate=({outcome,observerExit,launcherExit})=>outcome.status==='SMOKE_PASS'&&outcome.native?.code===0&&outcome.gracefulCloseCompleted&&observerExit===0&&launcherExit===0?'PASS':'BLOCKED';
 assert.equal(aggregate({outcome:{status:'SMOKE_BLOCKED',native:{code:0},gracefulCloseCompleted:false},observerExit:3,launcherExit:0}),'BLOCKED');
});
test('runtime source bytes unchanged by offline analysis',()=>{files.forEach((f,i)=>assert.ok(baseline[i].equals(fs.readFileSync(f))));});
