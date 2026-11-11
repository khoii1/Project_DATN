const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const policy=require('./mvp-hash-diagnostic-policy.cjs'),{classifyChain,makeObserver}=require('./mvp-hash-diagnostic-observer.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function hashFixture(change=()=>{}){
 const root=policy.ROOT,files=new Map(),imports=[];let reads=0;
 const names=['C:\\Program Files\\nodejs\\node.exe',...['pg_ctl.exe','pg_controldata.exe','postgres.exe'].map(n=>'C:\\Program Files\\PostgreSQL\\17\\bin\\'+n)];
 const bins=Object.fromEntries(names.map(n=>{const b=Buffer.from('SYNTHETIC_BINARY:'+n);files.set(n,b);return[n,sha(b)];}));
 const runtime="const SCRIPTS=['mvp-ui-only-runtime.cjs'];\nconst RUNTIME={\n "+String.raw`'C:\\Program Files\\nodejs\\node.exe':'`+bins[names[0]]+"',\n"+['pg_ctl.exe','pg_controldata.exe','postgres.exe'].map((n,i)=>" [path.join(BIN,'"+n+"')]:'"+bins[names[i+1]]+"'").join(',\n')+'};';
 const back=Array.from({length:124},(_,i)=>'b'+i+'.ts'),front=Array.from({length:121},(_,i)=>'f'+i+'.ts');
 const members=['scripts/mvp-ui-only-runtime.cjs',...back.map(n=>'backend/src/'+n),...front.map(n=>'frontend/src/'+n),'backend/prisma/schema.prisma','package-lock.json','backend/package-lock.json','frontend/package-lock.json'];
 for(const n of members)files.set(path.join(root,n),Buffer.from(n==='scripts/mvp-ui-only-runtime.cjs'?runtime:'SYNTHETIC_SOURCE:'+n));
 const m={revision:4,purpose:'SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL',previousManifestFile:'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev3.json',previousManifestSha256:'9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a',sourceHashes:Object.fromEntries(members.map(n=>[n,sha(files.get(path.join(root,n)))])),runtimeHashes:bins};
 const prior=Buffer.from('{"revision":3}');files.set(path.join(root,'docs',m.previousManifestFile),prior);change(m,files);
 const manifest=Buffer.from(JSON.stringify(m));files.set(path.join(root,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json'),manifest);
 const hash=b=>b.equals(prior)?'9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a':sha(b);
 const mod={exports:{}};const modules={'node:fs':{},'node:path':path,'node:assert/strict':assert,'./mvp-hash-diagnostic-policy.cjs':{ROOT:root,MANIFEST:sha(manifest),sha:hash,canonical:f=>f,checkRun:()=>{throw Error('REAL_RUN_FORBIDDEN');}}};
 const source=fs.readFileSync(path.join(__dirname,'mvp-hash-only-target.cjs'),'utf8');
 vm.runInNewContext(source,{require:n=>{imports.push(n);assert.ok(Object.hasOwn(modules,n),'SIDE_EFFECT_IMPORT');return modules[n];},module:mod,process:{argv:[]},console:{log:()=>{throw Error('REAL_TARGET_EXECUTION');},error:()=>{throw Error('REAL_TARGET_EXECUTION');}},__dirname},{timeout:1000});
 const d={read:f=>{reads++;assert.ok(files.has(f),'UNEXPECTED_FILE_READ');return files.get(f);},canonical:f=>f,readdir:f=>f.endsWith(path.join('backend','src'))?back:front,stat:()=>({isDirectory:()=>false})};
 return{run:()=>mod.exports.hashOnly(d),files,imports,reads:()=>reads,d};
}
test('target import graph has no process/network/application imports and no IO on import',()=>{const f=hashFixture();assert.equal(f.reads(),0);assert.deepEqual(f.imports,['node:fs','node:path','node:assert/strict','./mvp-hash-diagnostic-policy.cjs']);});
test('actual target code validates 250 synthetic sources and four synthetic binaries only',()=>{const f=hashFixture(),r=f.run();assert.equal(r.sourceCount,250);assert.equal(r.runtimeCount,4);assert.equal(r.status,'HASH_CHECKS_PASS');});
for(const [name,change]of [
 ['revision',m=>m.revision=5],['source hash',m=>m.sourceHashes['package-lock.json']='0'.repeat(64)],['invalid pin',m=>m.runtimeHashes[policy.NODE]='f'.repeat(65)],['traversal',m=>{delete m.sourceHashes['package-lock.json'];m.sourceHashes['../package-lock.json']='0'.repeat(64);}]
])test('fake-only target rejects '+name,()=>{assert.throws(()=>hashFixture(change).run());});
test('fake target rejects canonical/reparse mismatch',()=>{const f=hashFixture();f.d.canonical=n=>n.includes('backend')?'OUTSIDE':n;assert.throws(f.run);});
function planFixture(){
 const files=new Map(),nodeBytes=Buffer.from('SYNTHETIC_NODE'),psBytes=Buffer.from('SYNTHETIC_PS'),manifestBytes=Buffer.from('SYNTHETIC_MANIFEST');
 const fakeHash={createHash:()=>{let b;return{update:x=>{b=Buffer.from(x);return{digest:()=>b.equals(nodeBytes)?'fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d':b.equals(psBytes)?'60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f':b.equals(manifestBytes)?policy.MANIFEST:sha(b)};}};}};
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync('scripts/mvp-hash-diagnostic-policy.cjs','utf8'),{require:n=>({'node:fs':{},'node:path':path,'node:crypto':fakeHash,'node:assert/strict':assert})[n],module:mod,__dirname},{timeout:1000});const p=mod.exports;
 const pins={purpose:'AJ_SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL',manifestSha256:p.MANIFEST,sources:{},executionBinaries:{[p.NODE]:'fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d',[p.PS]:'60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f'}};
 for(const n of p.MEMBERS){const b=Buffer.from('SYNTHETIC_SOURCE:'+n);files.set(path.join(p.ROOT,n),b);pins.sources[n]=sha(b);}
 const pinBytes=Buffer.from(JSON.stringify(pins));files.set(p.PINFILE,pinBytes);files.set(p.NODE,nodeBytes);files.set(p.PS,psBytes);files.set(path.join(p.ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json'),manifestBytes);
 files.set('SYNTHETIC_NEW_APPROVAL',Buffer.from('SYNTHETIC_APPROVAL'));
 const plan={version:1,scope:'ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC',approved:true,maxAttempts:1,noRetry:true,operatorSid:p.SID,expiresAt:new Date(100000).toISOString(),manifestSha256:p.MANIFEST,sourcePinSetFile:p.PINFILE,sourcePinSetSha256:sha(pinBytes),userApprovalFile:'SYNTHETIC_NEW_APPROVAL',userApprovalSha256:sha(files.get('SYNTHETIC_NEW_APPROVAL'))};
 return{p,plan,files,io:{read:f=>{assert.ok(files.has(f));return files.get(f);},canonical:f=>f,now:()=>0}};
}
test('fake approval and source pins accepted without IO/native startup',()=>{const f=planFixture();f.p.checkPlan(f.plan,f.io);});
for(const [name,mutate]of [
 ['scope',f=>f.plan.scope='OLD_UI_ONLY'],['unapproved',f=>f.plan.approved=false],['attempt count',f=>f.plan.maxAttempts=2],['retry flag',f=>f.plan.noRetry=false],['owner',f=>f.plan.operatorSid='OTHER'],['expiry',f=>f.plan.expiresAt=new Date(0).toISOString()],['secret extra field',f=>f.plan.password='SYNTHETIC_SECRET'],['source drift',f=>f.files.set(path.join(f.p.ROOT,f.p.MEMBERS[0]),Buffer.from('CHANGED'))],['pinset drift',f=>f.plan.sourcePinSetSha256='0'.repeat(64)],['manifest pin',f=>f.plan.manifestSha256='0'.repeat(64)],['old AH approval',f=>f.plan.userApprovalFile='d7beea37-4806-492f-9250-659741611ee7/Pasted text.txt']
])test('approval gate rejects '+name,()=>{const f=planFixture();mutate(f);assert.throws(()=>f.p.checkPlan(f.plan,f.io));});
const row=(pid,parentPid,code=0)=>({pid,parentPid,code,independentNativeExit:true,signal:null,error:null,timeout:false});
const chain=()=>({launcherPid:10,observer:row(20,10),outer:row(30,20),target:row(40,30),tool:{code:0,linked:true}});
for(const [name,mutate,want]of [
 ['all zero',()=>{},'ALL_OBSERVED_NATIVE_EXITS_ZERO'],['target exit3',c=>c.target.code=3,'NODE_TARGET_NATIVE_FAILURE_CONFIRMED'],['outer abnormal',c=>c.outer.code=-1073741819,'POWERSHELL_OUTER_NATIVE_FAILURE_CONFIRMED'],['observer abnormal',c=>c.observer.code=-1073741819,'OBSERVER_NATIVE_FAILURE_CONFIRMED'],['tool differs',c=>c.tool.code=-1073741819,'TOOL_HOST_FAILURE_CONFIRMED'],['missing target PID',c=>delete c.target.pid,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['parent mismatch',c=>c.target.parentPid=99,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['no independent observer exit',c=>c.observer.independentNativeExit=false,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['timeout',c=>{c.target.code=null;c.target.timeout=true;},'NATIVE_FAILURE_BOUNDARY_UNDETERMINED']
])test('chain classification: '+name,()=>{const c=chain();mutate(c);assert.equal(classifyChain(c),want);});
function observerFixture(outcome={code:0,nativeExitObserved:true}){
 const files=new Map();let calls=0;const d={pid:20,parentPid:10,now:()=>new Date(0).toISOString(),checkRun:()=>({receipt:{launcherPid:10}}),write:(_run,n,v)=>{if(files.has(n))throw Error('DUPLICATE_ATTEMPT');files.set(n,v);},observe:async o=>{calls++;if(outcome.throw)throw Error('SYNTHETIC_SECRET');if(!outcome.error)o.onSpawn(30);return{pid:30,...outcome,password:'SYNTHETIC_SECRET',stdout:'SYNTHETIC_SECRET'};},readTarget:()=>row(40,30)};
 return{run:makeObserver(d),files,calls:()=>calls,d};
}
test('observer launches once, preserves direct identities and awaits independent own exit',async()=>{const f=observerFixture();assert.equal(await f.run('SYNTHETIC_RUN'),0);assert.equal(f.calls(),1);assert.equal(f.files.get('observer-outcome.json').observerNativeExit,'AWAITING_LAUNCHER_HANDLE');await assert.rejects(f.run('SYNTHETIC_RUN'),/NO_RETRY/);assert.equal(f.calls(),1);assert.ok(!JSON.stringify([...f.files]).includes('SECRET'));});
for(const [name,outcome,code]of [['nonzero',{code:3,nativeExitObserved:true},3],['launch failure',{code:null,error:'ENOENT'},3],['timeout',{code:null,unknown:true},4]])test('fake observer propagation '+name,async()=>{const f=observerFixture(outcome);assert.equal(await f.run('SYNTHETIC_RUN'),code);assert.equal(f.calls(),1);});
test('duplicate persisted attempt refuses before spawning outer',async()=>{const f=observerFixture();f.files.set('observer-attempt.json',{});await assert.rejects(f.run('SYNTHETIC_RUN'),/DUPLICATE_ATTEMPT/);assert.equal(f.calls(),0);});
test('private-run validation failure prevents attempt and spawn',async()=>{const f=observerFixture();f.d.checkRun=()=>{throw Error('INVALID_PRIVATE_APPROVAL');};await assert.rejects(f.run('SYNTHETIC_RUN'),/INVALID_PRIVATE_APPROVAL/);assert.equal(f.files.size,0);assert.equal(f.calls(),0);});
test('missing independent tool completion cannot be classified full PASS',()=>{const c=chain();delete c.tool;assert.equal(classifyChain(c),'NATIVE_FAILURE_BOUNDARY_UNDETERMINED');});
test('malformed observer/outer PID cannot confirm a reported child failure',()=>{const c=chain();c.observer.pid=-1;c.outer.parentPid=-1;c.target.code=3;assert.equal(classifyChain(c),'NATIVE_FAILURE_BOUNDARY_UNDETERMINED');});
test('target timeout plus wrapper policy exit4 stays unknown, not outer fault confirmation',()=>{const c=chain();c.target={...c.target,code:null,timeout:true,independentNativeExit:false};c.outer.code=4;c.observer.code=4;assert.equal(classifyChain(c),'NATIVE_FAILURE_BOUNDARY_UNDETERMINED');});
function nativeFixture(){
 const {EventEmitter}=require('node:events'),child=new EventEmitter();child.pid=30;child.stdout=new EventEmitter();child.stderr=new EventEmitter();let calls=0;
 const modules={'node:fs':{},'node:path':path,'node:assert/strict':assert,'./mvp-hash-diagnostic-policy.cjs':policy,'./mvp-native-exit.cjs':{},'./mvp-ui-native-boundary.cjs':require('./mvp-ui-native-boundary.cjs'),'node:child_process':{spawn:()=>{calls++;return child;}}};
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync('scripts/mvp-hash-diagnostic-observer.cjs','utf8'),{require:n=>{assert.ok(Object.hasOwn(modules,n));return modules[n];},module:mod,setTimeout,clearTimeout,__dirname,process:{argv:[]}},{timeout:1000});
 return{child,observe:mod.exports.observeOuter,calls:()=>calls};
}
test('actual native adapter with fake handle observes spawn/exit and does not use stdout for native success',async()=>{const f=nativeFixture();let pid;const pending=f.observe({onSpawn:p=>pid=p,deadline:100});f.child.emit('spawn');f.child.stdout.emit('data',Buffer.from('SYNTHETIC_NOT_A_VERDICT'));f.child.emit('exit',3,null);const r=await pending;assert.equal(pid,30);assert.equal(r.code,3);assert.equal(r.nativeExitObserved,true);assert.equal(f.calls(),1);});
test('actual native adapter fake timeout remains unknown after late exit, no retry/kill',async()=>{const f=nativeFixture();const pending=f.observe({onSpawn:()=>{},deadline:5});f.child.emit('spawn');const r=await pending;assert.equal(r.code,null);assert.equal(r.unknown,true);f.child.emit('exit',0,null);assert.equal(r.code,null);assert.equal(f.calls(),1);assert.equal(f.child.kill,undefined);});
test('actual native adapter fake launch error records error without inventing native exit',async()=>{const f=nativeFixture();const pending=f.observe({onSpawn:()=>{throw Error('NO_SPAWN_EXPECTED');},deadline:100});f.child.emit('error',Object.assign(Error('SYNTHETIC_SECRET'),{code:'ENOENT'}));const r=await pending;assert.equal(r.code,null);assert.equal(r.error,'ENOENT');assert.ok(!r.nativeExitObserved);assert.ok(!JSON.stringify(r).includes('SECRET'));});
test('PowerShell AST and fake injected handle native exits; never execute target/outer/launcher main',()=>{
 const outer=path.join(__dirname,'mvp-hash-diagnostic-outer.ps1'),launcher=path.join(__dirname,'mvp-hash-diagnostic-once.ps1');
 const ps=String.raw`
$ErrorActionPreference='Stop';$t=$null;$e=$null
$ast=[Management.Automation.Language.Parser]::ParseFile('${outer}',[ref]$t,[ref]$e);if($e.Count){exit 11}
$null=[Management.Automation.Language.Parser]::ParseFile('${launcher}',[ref]$t,[ref]$e);if($e.Count){exit 12}
$f=$ast.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Invoke-HashTargetHandle'},$true)
Invoke-Expression $f[0].Extent.Text
foreach($case in @('zero','three','timeout','launchFailure','wrongPID','badJSON','abnormal')){
 $stream=[pscustomobject]@{};$stream|Add-Member ScriptMethod ReadToEndAsync { [System.Threading.Tasks.Task]::FromResult([string]$script:output) }
 $script:output=(@{pid=111;parentPid=$PID;status='HASH_CHECKS_PASS';sourceCount=250;runtimeCount=4;revision=4}|ConvertTo-Json -Compress)
 if($case -eq 'wrongPID'){$script:output=$script:output.Replace('111','999')};if($case -eq 'badJSON'){$script:output='INVALID_SYNTHETIC_JSON'}
 $empty=[pscustomobject]@{};$empty|Add-Member ScriptMethod ReadToEndAsync {[System.Threading.Tasks.Task]::FromResult('')}
 $script:mode=$case;$script:started=0;$script:disposed=0
 $p=[pscustomobject]@{Id=111;StartTime=[DateTime]::UtcNow;ExitCode=0;StandardOutput=$stream;StandardError=$empty};if($case -eq 'three'){$p.ExitCode=3}
 if($case -eq 'abnormal'){$p.ExitCode=-1073741819}
 $p|Add-Member ScriptMethod Start {$script:started++;if($script:mode -eq 'launchFailure'){throw 'SYNTHETIC'};return $true}
 $p|Add-Member ScriptMethod WaitForExit {param($ms)return $script:mode -ne 'timeout'}
 $p|Add-Member ScriptMethod Dispose {$script:disposed++}
 $script:saved=$null;$r=Invoke-HashTargetHandle $p -Write {param($v)$script:saved=$v} -DeadlineMs 1
 if($script:started -ne 1 -or $script:disposed -ne 1){exit 13}
 if($case -eq 'zero' -and ($r.code -ne 0 -or -not $r.independentNativeExit -or $r.error)){exit 14}
 if($case -eq 'three' -and $r.code -ne 3){exit 15}
 if($case -eq 'timeout' -and (-not $r.timeout -or $r.independentNativeExit)){exit 16}
 if($case -eq 'launchFailure' -and (-not $r.error -or $r.pid)){exit 17}
 if($case -in @('wrongPID','badJSON') -and ($r.code -ne 0 -or $r.error -cne 'TARGET_RESULT_INVALID')){exit 18}
 if($case -eq 'abnormal' -and $r.code -ne -1073741819){exit 19}
}
'FAKE_NATIVE_HANDLE_AND_AST_PASS'
`;
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'FAKE_NATIVE_HANDLE_AND_AST_PASS');
});
test('source contracts contain no kill/retry/service startup or stdin source transport',()=>{for(const name of ['mvp-hash-diagnostic-observer.cjs','mvp-hash-diagnostic-outer.ps1','mvp-hash-diagnostic-once.ps1']){const s=fs.readFileSync(path.join(__dirname,name),'utf8');assert.doesNotMatch(s,/taskkill|Stop-Process|\.kill\(|pg_ctl.*start|--node-preflight|\|\s*node/);}const launcher=fs.readFileSync('scripts/mvp-hash-diagnostic-once.ps1','utf8');assert.match(launcher,/\$row\.code=\$p\.ExitCode/);assert.match(launcher,/WaitForExit\(45000\)/);assert.match(launcher,/CreateNew/);assert.match(launcher,/hash-only-approved-/);});
test('separate diagnostic pins match source bytes; UI-only manifest stays exact rev4; no real target execution',()=>{
 const pins=JSON.parse(fs.readFileSync(policy.PINFILE,'utf8'));assert.equal(pins.purpose,'AJ_SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL');assert.equal(pins.approved,undefined);assert.deepEqual(Object.keys(pins.sources).sort(),policy.MEMBERS.slice().sort());
 for(const[f,h]of Object.entries(pins.sources))assert.equal(sha(fs.readFileSync(path.join(policy.ROOT,f))),h);
 assert.equal(sha(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json')),policy.MANIFEST);
 assert.equal(sha(fs.readFileSync('scripts/mvp-hash-diagnostic.test.cjs')),pins.offlineTestHashes['scripts/mvp-hash-diagnostic.test.cjs']);
});
