const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {EDGE,browserEnvironment,assertHashes,createNativeObserver,installSpawnBoundary,smoke}=require('./mvp-edge-smoke-observer.cjs');
const run=path.resolve(__dirname,'SYNTHETIC_RUN_NOT_CREATED');
function fixture(mode='success'){
 const env=browserEnvironment(run),artifacts=new Map(),counts={spawn:0,launch:0,context:0,page:0,route:0,abort:0,goto:0,close:0};
 const child=new EventEmitter();child.pid=mode==='missingPid'?undefined:321;
 const trace=createNativeObserver({environment:env,tempRoot:env.TEMP,parentPid:101,expectedParentPid:mode==='ownership'?102:101,spawn(){counts.spawn++;if(mode==='spawnFailure')throw Object.assign(Error('SYNTHETIC_SECRET'),{code:'EACCES'});return child;}});
 const args=['--user-data-dir='+path.join(env.TEMP,'playwright_chromiumdev_profile-synthetic'),'--remote-debugging-pipe','--no-startup-window'];
 const browser={newContext:async()=>{counts.context++;if(mode==='contextFailure')throw Error('SYNTHETIC_SECRET');return{route:async(_filter,fn)=>{counts.route++;await fn({abort:()=>{counts.abort++;}});},newPage:async()=>{counts.page++;if(mode==='pageFailure')throw Error('SYNTHETIC_SECRET');return{goto:async target=>{counts.goto++;assert.equal(target,'about:blank');}};}};},close:async()=>{counts.close++;child.emit('exit',mode==='abnormal'?-1073741819:0,null);}};
 const chromium={launch:async opts=>{counts.launch++;assert.equal(opts.chromiumSandbox,true);assert.equal(opts.executablePath,EDGE);assert.deepEqual(opts.env,env);trace.spawn(EDGE,args,{env});if(mode==='timeout'||mode==='lateTimeout'){
  return new Promise(resolve=>{if(mode==='lateTimeout')setTimeout(()=>resolve(browser),30);});
 }return browser;}};
 const write=(name,data)=>{if(artifacts.has(name))throw Error('EEXIST');artifacts.set(name,structuredClone(data));};
 return{trace,child,counts,artifacts,args,env,write,chromium,execute:()=>smoke({chromium,trace,run,write,timeoutMs:mode.includes('Timeout')||mode==='timeout'?10:100})};
}
test('one successful launch/context/page/about:blank, route abort, graceful close and real-shaped native exit',async()=>{
 const x=fixture(),r=await x.execute();assert.equal(r.status,'SMOKE_PASS');assert.equal(r.native.code,0);assert.deepEqual(x.counts,{spawn:1,launch:1,context:1,page:1,route:1,abort:1,goto:1,close:1});assert.equal(r.spawnAttempts,1);assert.equal(r.closeCalls,1);assert.equal(r.events.find(e=>e.kind==='native-handle').parentPid,101);
});
for(const mode of ['spawnFailure','abnormal','missingPid','ownership','contextFailure','pageFailure'])test('mock failure remains blocked/no retry: '+mode,async()=>{
 const x=fixture(mode),r=await x.execute();assert.equal(r.status,'SMOKE_BLOCKED');assert.ok(x.counts.spawn<=1);assert.equal(x.counts.launch,1);assert.ok(x.counts.close<=1);
 if(mode==='missingPid'||mode==='ownership')assert.equal(x.counts.context,0);
 if(mode==='abnormal')assert.equal(r.native.code,-1073741819);
 assert.ok(!JSON.stringify([...x.artifacts]).includes('SYNTHETIC_SECRET'));
});
test('timeout writes unknown native outcome, no force kill, no context and no retry',async()=>{
 const x=fixture('timeout'),r=await x.execute();assert.equal(r.status,'TIMEOUT_OUTCOME_UNKNOWN');assert.equal(r.native,null);assert.equal(r.closeCalls,0);assert.equal(x.counts.context,0);assert.throws(()=>x.child.kill(),/FORCE_KILL_FORBIDDEN/);
});
test('late launch resolution after timeout cannot proceed to context/page',async()=>{
 const x=fixture('lateTimeout');await x.execute();await new Promise(r=>setTimeout(r,40));assert.equal(x.counts.context,0);assert.equal(x.counts.page,0);assert.equal(x.counts.close,0);
});
test('duplicate native spawn including Playwright fallback is refused before second OS call',()=>{
 const x=fixture();x.trace.spawn(EDGE,x.args,{env:x.env});assert.throws(()=>x.trace.spawn(EDGE,x.args,{env:x.env}),/DUPLICATE_SPAWN/);assert.equal(x.counts.spawn,1);assert.equal(x.trace.events.at(-1).kind,'duplicate-spawn-blocked');
});
test('taskkill, other executable, shell and unsafe sandbox/profile/env are denied before OS spawn',()=>{
 const x=fixture();for(const [exe,args,opts]of [['taskkill',[],{env:x.env}],[EDGE,[...x.args,'--no-sandbox'],{env:x.env}],[EDGE,x.args,{env:{...x.env,MQTT_PASSWORD:'SYNTHETIC_SECRET'}}],[EDGE,x.args,{env:x.env,shell:true}],[EDGE,['--user-data-dir=C:\\personal-profile'],{env:x.env}]])assert.throws(()=>x.trace.spawn(exe,args,opts),/SPAWN_REFUSED/);assert.equal(x.counts.spawn,0);
});
test('native child-process boundary blocks spawnSync/exec/fork paths and permits only observed spawn',()=>{
 const x=fixture();let unsafe=0;const cp={spawn:()=>{unsafe++;},spawnSync:()=>{unsafe++;},exec:()=>{unsafe++;},execSync:()=>{unsafe++;},execFile:()=>{unsafe++;},execFileSync:()=>{unsafe++;},fork:()=>{unsafe++;}};
 const restore=installSpawnBoundary(cp,x.trace);try{for(const key of ['spawnSync','exec','execSync','execFile','execFileSync','fork'])assert.throws(()=>cp[key]('taskkill'),/FORCE_KILL_FORBIDDEN/);cp.spawn(EDGE,x.args,{env:x.env});assert.equal(unsafe,0);}finally{restore();}
});
test('create-new attempt artifact prohibits reexecution before another launch',async()=>{
 const x=fixture();await x.execute();await assert.rejects(x.execute(),/EEXIST/);assert.equal(x.counts.launch,1);assert.equal(x.artifacts.get('attempt.json').maximumLaunches,1);
});
test('graceful-close timeout remains unknown, records one close and does not call kill/retry',async()=>{
 const x=fixture();const original=x.chromium.launch;
 x.chromium.launch=async options=>{const browser=await original(options);browser.close=()=>{x.counts.close++;return new Promise(()=>{});};return browser;};
 const r=await smoke({chromium:x.chromium,trace:x.trace,run,write:x.write,timeoutMs:10});
 assert.equal(r.status,'TIMEOUT_OUTCOME_UNKNOWN');assert.equal(r.closeCalls,1);assert.equal(r.gracefulCloseCompleted,false);assert.equal(r.native,null);assert.equal(x.counts.launch,1);
});
test('CLI without a valid approved private target fails before Playwright load or Edge spawn',()=>{
 const r=spawnSync(process.execPath,[path.join(__dirname,'mvp-edge-smoke-observer.cjs'),'--execute',path.join(__dirname,'SYNTHETIC_NOT_APPROVED')],{encoding:'utf8',windowsHide:true,timeout:5000});
 assert.equal(r.status,3);assert.equal(r.stdout,'');assert.equal(r.stderr.trim(),'SMOKE_SECURITY_GATE_BLOCKED_NO_RETRY');
});
test('immutable source pins checked before spawn; mismatch never updates expected value',()=>{
 const bytes=Buffer.from('SYNTHETIC_SOURCE'),pin=crypto.createHash('sha256').update(bytes).digest('hex');const pins=Object.freeze({'synthetic-file':pin});assertHashes(pins,()=>bytes);assert.throws(()=>assertHashes(pins,()=>Buffer.from('changed')),/SOURCE_DRIFT/);assert.equal(pins['synthetic-file'],pin);
});
test('explicit allowlist environment contains no inherited credentials, URL, debug or selenium fallback',()=>{
 const env=browserEnvironment(run);assert.deepEqual(Object.keys(env).sort(),['APPDATA','LOCALAPPDATA','PATH','SystemRoot','TEMP','TMP','USERPROFILE','WINDIR'].sort());assert.ok(!JSON.stringify(env).match(/password|jwt|postgres|mqtt|SELENIUM|DEBUG/i));
});
test('fake spawn error code captured without raw stderr/message/argv or secret reflection',async()=>{
 const x=fixture('spawnFailure'),r=await x.execute();assert.equal(r.errorCode,'EACCES');assert.equal(r.events.at(-1).errorCode,'EACCES');assert.ok(!JSON.stringify(r).includes('SYNTHETIC_SECRET'));assert.ok(!Object.hasOwn(r,'stderr'));assert.ok(!Object.hasOwn(r,'args'));
});
test('PowerShell launcher AST valid; closed env, finite wait and no Force/kill or service startup',()=>{
 const file=path.join(__dirname,'mvp-edge-smoke-once.ps1');
 const script="$t=$null;$e=$null;$null=[Management.Automation.Language.Parser]::ParseFile('"+file+"',[ref]$t,[ref]$e);if($e.Count){exit 1};'AST_PASS'";
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:5000});assert.equal(r.status,0);assert.equal(r.stderr,'');assert.equal(r.stdout.trim(),'AST_PASS');
 const s=fs.readFileSync(file,'utf8');assert.match(s,/EnvironmentVariables.Clear\(\)/);assert.match(s,/WaitForExit\(\$DeadlineMs\)/);assert.match(s,/DeadlineMs=30000/);assert.doesNotMatch(s,/Stop-Process|taskkill|Start-Service|pg_ctl|MQTT_PASSWORD|Get-Credential/);
});
