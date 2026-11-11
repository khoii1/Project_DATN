// Dedicated smoke diagnostic, never imported by application startup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT='C:\\DATN\\Project_datn',BASE='C:\\Users\\Acer Swift3\\AppData\\Local\\SmartAgricultureBrowserSmoke';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fault=code=>Object.assign(Error(code),{code});
const errorCode=e=>['ENOENT','EACCES','EPERM','ETIMEDOUT','ESRCH','SMOKE_DUPLICATE_SPAWN','SMOKE_SPAWN_REFUSED','SMOKE_TIMEOUT','SMOKE_NO_OWNED_PID','SMOKE_NATIVE_ABNORMAL','SMOKE_FORCE_KILL_FORBIDDEN'].includes(e?.code)?e.code:'UNCLASSIFIED_ERROR';
function assertHashes(pins,read=fs.readFileSync){
 for(const [file,pin]of Object.entries(pins)){if(!/^[a-f0-9]{64}$/.test(pin)||sha(read(file))!==pin)throw fault('SMOKE_SOURCE_DRIFT');}
}
function browserEnvironment(run){
 return {SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32',TEMP:path.join(run,'tmp'),TMP:path.join(run,'tmp'),USERPROFILE:path.join(run,'profile'),APPDATA:path.join(run,'profile','roaming'),LOCALAPPDATA:path.join(run,'profile','local')};
}
function createNativeObserver({spawn,environment,tempRoot,parentPid=process.pid,expectedParentPid=process.pid,verifyExecutable=()=>{},now=()=>new Date().toISOString(),onEvent=()=>{}}){
 const events=[];let attempts=0,child=null,native=null;let finish;
 const exit=new Promise(resolve=>finish=resolve);
 const record=(kind,data={})=>{const row={kind,at:now(),...data};events.push(row);onEvent(row);};
 function observedSpawn(exe,args,options){
  if(attempts){record('duplicate-spawn-blocked');throw fault('SMOKE_DUPLICATE_SPAWN');}
  if(exe!==EDGE||parentPid!==expectedParentPid||!Array.isArray(args)||options?.shell||options?.detached)throw fault('SMOKE_SPAWN_REFUSED');
  const profiles=args.filter(x=>typeof x==='string'&&x.startsWith('--user-data-dir='));
  if(profiles.length!==1||path.dirname(path.resolve(profiles[0].slice(16)))!==path.resolve(tempRoot)||args.some(x=>x==='--no-sandbox'||x.startsWith('--remote-debugging-port')||/^(?:https?|file|ftp):/i.test(x)))throw fault('SMOKE_SPAWN_REFUSED');
  if(JSON.stringify(Object.entries(options.env||{}).sort())!==JSON.stringify(Object.entries(environment).sort()))throw fault('SMOKE_SPAWN_REFUSED');
  verifyExecutable();attempts++;record('native-spawn-request',{parentPid});
  try{child=spawn(exe,args,options);}catch(e){record('native-spawn-error',{errorCode:errorCode(e)});finish(null);throw e;}
  if(!Number.isSafeInteger(child.pid)||child.pid<=0){record('native-pid-missing');}
  else record('native-handle',{pid:child.pid,parentPid,ownership:'DIRECT_CHILD_HANDLE'});
  child.once('spawn',()=>record('native-spawned',{pid:Number.isSafeInteger(child.pid)?child.pid:null,parentPid}));
  child.once('error',e=>{record('native-process-error',{errorCode:errorCode(e)});finish(null);});
  child.once('exit',(code,signal)=>{native={pid:Number.isSafeInteger(child.pid)?child.pid:null,code:Number.isInteger(code)?code:null,signal:typeof signal==='string'&&/^SIG[A-Z]+$/.test(signal)?signal:null};record('native-exit',native);finish(native);});
  child.kill=()=>{record('force-kill-blocked');throw fault('SMOKE_FORCE_KILL_FORBIDDEN');};
  return child;
 }
 return {spawn:observedSpawn,events,exit,attempts:()=>attempts,native:()=>native,isOwned:()=>!!child&&Number.isSafeInteger(child.pid)&&child.pid>0&&parentPid===expectedParentPid};
}
function installSpawnBoundary(cp,trace){
 // Install before loading Playwright. Repeated/fallback Edge, taskkill and every
 // other child-process API are denied, not silently retried or allowed to kill.
 const keys=['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'];
 const old=Object.fromEntries(keys.map(k=>[k,cp[k]]));
 const deny=()=>{throw fault('SMOKE_FORCE_KILL_FORBIDDEN');};
 cp.spawn=trace.spawn;for(const k of keys.filter(x=>x!=='spawn'))cp[k]=deny;
 require('node:module').syncBuiltinESMExports();
 return ()=>{for(const k of keys)cp[k]=old[k];require('node:module').syncBuiltinESMExports();};
}
async function smoke({chromium,trace,run,write,timeoutMs=20000,now=()=>new Date().toISOString()}){
 const facts={target:'about:blank',launchSucceeded:false,contextCreated:false,pageCreated:false,blankOpened:false,gracefulCloseCompleted:false,timeout:false,events:trace.events};
 let stage='launch',browser,closeCalled=false,expired=false;
 // Caller must verify real approval, ACL receipt and immutable hashes first.
 write('attempt.json',{at:now(),observerPid:process.pid,maximumLaunches:1,target:'about:blank'});
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;facts.timeout=true;reject(fault('SMOKE_TIMEOUT'));},timeoutMs);});
 const check=()=>{if(expired)throw fault('SMOKE_TIMEOUT');if(!trace.isOwned())throw fault('SMOKE_NO_OWNED_PID');};
 const close=async()=>{if(closeCalled)return;check();closeCalled=true;stage='close';await browser.close();facts.gracefulCloseCompleted=true;};
 const work=(async()=>{
  facts.launchStartedAt=now();
  browser=await chromium.launch({executablePath:EDGE,headless:true,chromiumSandbox:true,env:browserEnvironment(run),timeout:timeoutMs,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false});
  check();facts.launchSucceeded=true;stage='context';
  const context=await browser.newContext({serviceWorkers:'block'});check();facts.contextCreated=true;
  await context.route('**/*',route=>route.abort());check();stage='page';
  const page=await context.newPage();check();facts.pageCreated=true;stage='blank';
  await page.goto('about:blank',{timeout:timeoutMs});check();facts.blankOpened=true;
  await close();stage='native-completion';
  const native=await trace.exit;if(!native||native.code!==0||native.signal)throw fault('SMOKE_NATIVE_ABNORMAL');
  facts.status='SMOKE_PASS';
 })();
 try{await Promise.race([work,deadline]);}
 catch(e){facts.status=facts.timeout?'TIMEOUT_OUTCOME_UNKNOWN':'SMOKE_BLOCKED';facts.failureStage=stage;facts.errorCode=errorCode(e);
  // No force kill and no cleanup of unknown PID. Late launch completion is
  // fenced by check(), so cannot proceed to a context/page after deadline.
  if(browser&&trace.isOwned()&&!expired&&!closeCalled){try{await Promise.race([close(),deadline]);}catch{facts.cleanupIncomplete=true;}}
 }finally{clearTimeout(timer);if(facts.timeout)facts.status='TIMEOUT_OUTCOME_UNKNOWN';}
 facts.native=trace.native();facts.spawnAttempts=trace.attempts();facts.closeCalls=closeCalled?1:0;facts.finishedAt=now();
 if(facts.status==='SMOKE_PASS'&&(facts.spawnAttempts!==1||!facts.gracefulCloseCompleted||facts.native?.code!==0))facts.status='SMOKE_BLOCKED';
 write('outcome.json',facts);return facts;
}
async function executeApproved(run){
 assert.equal(process.platform,'win32'); // Only the reviewed Windows cleanup/spawn path.
 assert.equal(path.dirname(run),BASE);assert.match(path.basename(run),/^edge-smoke-\d+-[a-f0-9]+$/);
 for(let p=run;;p=path.dirname(p)){assert.ok(!fs.lstatSync(p).isSymbolicLink());assert.equal(fs.realpathSync.native(p).toLowerCase(),p.toLowerCase());if(path.dirname(p)===p)break;}
 const read=n=>JSON.parse(fs.readFileSync(path.join(run,n),'utf8'));
 const plan=read('approval.json'),receipt=read('launcher-receipt.json');
 assert.equal(plan.scope,'ONE_EDGE_ABOUT_BLANK_SMOKE');assert.equal(plan.approved,true);assert.equal(plan.maxLaunches,1);assert.equal(receipt.pid,process.ppid);assert.equal(receipt.privateAclVerified,true);
 assert.equal(receipt.operatorSid,'S-1-5-21-1432835263-483988321-3159128977-1001');
 assert.equal(sha(fs.readFileSync(plan.userApprovalFile)),plan.userApprovalSha256);
 const names=['mvp-edge-smoke-observer.cjs','mvp-edge-smoke-once.ps1'];
 assert.deepEqual(Object.keys(plan.sourceHashes).sort(),names.sort());
 assertHashes(Object.fromEntries(names.map(n=>[path.join(__dirname,n),plan.sourceHashes[n]])));
 const packageFile=require.resolve('playwright-core/package.json');
 assert.equal(JSON.parse(fs.readFileSync(packageFile,'utf8')).version,'1.62.1');
 assert.equal(plan.executable,EDGE);assert.equal(plan.edgeSha256,'d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b');
 assertHashes({[EDGE]:plan.edgeSha256,[packageFile]:plan.packageSha256,[path.join(path.dirname(packageFile),'lib/coreBundle.js')]:plan.bundleSha256,[process.execPath]:plan.nodeSha256});
 for(const key of Object.keys(process.env))if(!['SystemRoot','WINDIR','PATH','TEMP','TMP'].includes(key))throw fault('SMOKE_ENVIRONMENT_REFUSED');
 assert.equal(process.version,'v22.20.0');assert.ok(!require.cache[require.resolve('playwright-core')],'SMOKE_PLAYWRIGHT_PRELOADED');
 const environment=browserEnvironment(run),cp=require('node:child_process');
 const write=(name,value)=>fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2),{flag:'wx'});
 write('identity.json',{at:new Date().toISOString(),observerPid:process.pid,launcherPid:process.ppid,executable:EDGE,edgeSha256:plan.edgeSha256,nodeVersion:process.version,nodeSha256:plan.nodeSha256,playwrightVersion:'1.62.1',packageSha256:plan.packageSha256,bundleSha256:plan.bundleSha256,sourcePinsVerified:true,privateAclReceiptVerified:true,approvalSha256:plan.userApprovalSha256});
 fs.writeFileSync(path.join(run,'native-events.jsonl'),'',{flag:'wx'});
 const trace=createNativeObserver({spawn:cp.spawn,environment,tempRoot:environment.TEMP,verifyExecutable:()=>assertHashes({[EDGE]:plan.edgeSha256}),onEvent:row=>fs.appendFileSync(path.join(run,'native-events.jsonl'),JSON.stringify(row)+'\n')});
 installSpawnBoundary(cp,trace); // Keep boundary active through late cleanup; no restoration in real mode.
 const result=await smoke({chromium:require('playwright-core').chromium,trace,run,write});
 process.exitCode=result.status==='SMOKE_PASS'?0:3; // Natural exit only. Never kill or force process.exit().
}
module.exports={EDGE,BASE,browserEnvironment,assertHashes,createNativeObserver,installSpawnBoundary,smoke};
if(require.main===module){
 const [mode,run,...extra]=process.argv.slice(2);
 if(mode!=='--execute'||!run||extra.length){console.error('NEW_ONE_SHOT_APPROVAL_REQUIRED');process.exitCode=3;}
 else executeApproved(path.resolve(run)).catch(()=>{console.error('SMOKE_SECURITY_GATE_BLOCKED_NO_RETRY');process.exitCode=3;});
}
