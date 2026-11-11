// Real adapter: callable only from a newly approved supervisor session.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {supervise,validateApproval,PIN}=require('./mvp-ui-only-supervisor.cjs');
const {observeNativeExit}=require('./mvp-native-exit.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE='C:\\DATN\\test-instances\\phase13-3b',BIN='C:\\Program Files\\PostgreSQL\\17\\bin';
const SCRIPTS=['mvp-ui-only-supervisor.cjs','mvp-ui-only-runtime.cjs','mvp-ui-only-worker.cjs','mvp-ui-only-session.ps1','mvp-ui-only-api.cjs','mvp-ui-only-readonly.cjs','mvp-ui-only-historical.cjs','mvp-ui-only-presentation.cjs','mvp-ui-only-frontend.mjs','mvp-native-exit.cjs','mvp-real-device-resume.cjs','mvp-dev-existing-unprotect.ps1','mvp-dev-direct.cjs','mvp-preflight-process-diagnostic.cjs','mvp-preflight-outer-diagnostic.ps1','phase13-5d1d-contracts.cjs','mvp-dev-css.mjs'];
function sourceFiles(){const walk=dir=>fs.readdirSync(path.join(ROOT,dir)).flatMap(n=>{const f=path.join(dir,n),s=fs.lstatSync(path.join(ROOT,f));assert.ok(!s.isSymbolicLink());return s.isDirectory()?walk(f):[f.replaceAll('\\','/')];});return[...SCRIPTS.map(n=>'scripts/'+n),...walk('backend/src'),...walk('frontend/src'),'backend/prisma/schema.prisma','package-lock.json','backend/package-lock.json','frontend/package-lock.json'];}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const RUNTIME={
 'C:\\Program Files\\nodejs\\node.exe':'fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d',
 [path.join(BIN,'pg_ctl.exe')]:'fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8',
 [path.join(BIN,'pg_controldata.exe')]:'6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40',
 [path.join(BIN,'postgres.exe')]:'94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746'};
const CHECKS=['login','dashboard','temperature','humidity','light','soilWarning','history','charts','deviceHistoricalState','vietnamTime','staleNotice','memoryAuditNotice'];
function checkPlan(plan){return validateApproval(plan,{now:Date.now,read:f=>fs.readFileSync(f),readSource:f=>fs.readFileSync(path.join(ROOT,f)),requiredSources:sourceFiles,verifyRuntime:p=>{assert.deepEqual(p,RUNTIME);for(const [f,h]of Object.entries(RUNTIME))assert.equal(sha(f),h);}});}
function readWebsiteCredential(input,deadline=15000){
 return new Promise((resolve,reject)=>{
  let text='',done=false;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);input.off('data',data);input.off('end',end);input.off('error',bad);input.pause();text='';error?reject(Error('PRE_FRONTEND_AUTH_CREDENTIAL_CONTRACT_BLOCKED')):resolve(value);};
  const data=chunk=>{text+=chunk;if(Buffer.byteLength(text)>4096)finish(true);};
  const end=()=>{try{const value=JSON.parse(text);assert.deepEqual(Object.keys(value).sort(),['email','password']);assert.equal(value.email,'owner-a@mvp.invalid');assert.ok(typeof value.password==='string'&&value.password.length>0&&value.password.length<=1024);finish(false,value);}catch{finish(true);}};
  const bad=()=>finish(true),timer=setTimeout(()=>finish(true),deadline);input.setEncoding('utf8');input.on('data',data);input.once('end',end);input.once('error',bad);input.resume();
 });
}
async function execute(run){
 assert.equal(path.dirname(run),BASE);assert.match(path.basename(run),/^ui-only-historical-\d+-[a-f0-9]+$/);
 const plan=JSON.parse(fs.readFileSync(path.join(run,'approval.json'),'utf8'));
 const receipt=JSON.parse(fs.readFileSync(path.join(run,'launcher-receipt.json'),'utf8'));assert.equal(receipt.pid,process.ppid);assert.equal(receipt.privateAclVerified,true);
 checkPlan(plan);
 let websiteCredential=await readWebsiteCredential(process.stdin);
 let browserCredential=plan.acceptanceMode==='AUTOMATED_BROWSER'?{...websiteCredential}:null,browserBridge;
 const write=(n,v)=>fs.writeFileSync(path.join(run,n),JSON.stringify(v,null,2),{flag:'wx'});
 const closed=extra=>({SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0',TEMP:run,TMP:run,...extra});
 const native=async(exe,args,ms=20000)=>{const r=await observeNativeExit({executable:exe,args,cwd:run,environment:closed(),deadline:ms});return r;};
 const nativeOK=r=>{if(r.code!==0||r.unknown||r.signal||r.error)throw Object.assign(Error('NATIVE_FAILED'),{unknown:!!r.unknown,nativeCode:r.code});};
 let worker,front,lastStop,proof,serial=0;
 function child(file,env){const c=require('node:child_process').fork(path.join(__dirname,file),[],{cwd:run,env:closed(env),execArgv:[],stdio:['ignore','pipe','pipe','ipc']});const row={child:c,pid:c.pid,owned:true,exit:null};c.stdout.on('data',()=>{});c.stderr.on('data',()=>{});c.on('exit',(code,signal)=>row.exit={code,signal});return row;}
 function rpc(row,cmd,data={}){const id=++serial;return new Promise((resolve,reject)=>{
  const done=(err,value)=>{clearTimeout(timer);row.child.off('message',message);row.child.off('exit',exit);err?reject(err):resolve(value);};
  const message=m=>{if(m.id===id)done(m.ok?null:Object.assign(Error('WORKER_GATE_FAILED'),{nativeCode:m.nativeCode,unknown:!!m.unknown}),m.data);};
  const exit=code=>done(Object.assign(Error('WORKER_EXIT'),{nativeCode:code}));
  const timer=setTimeout(()=>done(Object.assign(Error('WORKER_UNKNOWN'),{unknown:true})),15000);row.child.on('message',message);row.child.once('exit',exit);row.child.send({id,cmd,...data});
 });}
 const wait=async(fn,ms=10000)=>{const until=Date.now()+ms;while(Date.now()<until){if(await fn())return true;await new Promise(r=>setTimeout(r,200));}throw Error('READINESS_FAILED');};
 const waitExit=async row=>{await wait(()=>row.exit,10000);return row.exit;};
 const ports=async()=>{const r=await native('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-NetTCPConnection -State Listen -ErrorAction Stop|Where-Object LocalPort -in @(55433,55001,55173)|Select-Object LocalPort,OwningProcess)|ConvertTo-Json -Compress"]);nativeOK(r);return JSON.parse(r.stdout||'[]');};
 const d={
  now:Date.now,read:f=>fs.readFileSync(f),readSource:f=>fs.readFileSync(path.join(ROOT,f)),requiredSources:sourceFiles,
  verifyRuntime:pins=>{assert.deepEqual(pins,RUNTIME);for(const [f,h]of Object.entries(RUNTIME))assert.equal(sha(f),h);},
  consumeApproval:async()=>{const consumed=JSON.parse(fs.readFileSync(path.join(BASE,'ui-only-approved-'+plan.userApprovalSha256+'.attempt.json'),'utf8'));assert.equal(consumed.run,run);assert.equal(consumed.approvalSha256,plan.userApprovalSha256);},
  prepareRun:async()=>{assert.ok(!fs.existsSync(path.join(run,'attempt.json')));return run;},write,
  preflight:async()=>{
   const diag=path.join(BASE,'preflight-process-diagnostic-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'));fs.mkdirSync(diag); // inherits operator-only TEST root ACL, no production ACL change
   const names=['mvp-dev-direct.cjs','mvp-native-exit.cjs','mvp-preflight-process-diagnostic.cjs','mvp-preflight-outer-diagnostic.ps1'];
   fs.writeFileSync(path.join(diag,'manifest.json'),JSON.stringify({version:1,preflightHash:'A23A8AA468B967BC34366A575AB29902222AF6A340F865A7FF1A09B194F4917E',approvalHash:plan.userApprovalSha256,hashes:Object.fromEntries(names.map(n=>[path.join(__dirname,n),sha(path.join(__dirname,n)).toUpperCase()]))}),{flag:'wx'});
   const r=await native(process.execPath,[path.join(__dirname,'mvp-preflight-process-diagnostic.cjs'),'--observe',diag],50000);nativeOK(r);
   const json=n=>JSON.parse(fs.readFileSync(path.join(diag,n),'utf8')),outer=json('outer-native-exit.json'),node=json('node-native-exit.json');
   const trace=fs.readFileSync(path.join(diag,'node-trace.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
   assert.equal(require('./mvp-preflight-process-diagnostic.cjs').classify({outer,node,children:trace.filter(x=>x.event==='child-end'),checksPassed:trace.some(x=>x.event==='checks-returned')}),'D_ALL_NATIVE_EXITS_ZERO');
   const facts=json('safety-facts.json');return{...facts,nativeVerified:true};
  },
  startCluster:async()=>{const r=await native(path.join(BIN,'pg_ctl.exe'),['start','-D',PIN.pgdata,'-l',path.join(run,'postgres-startup.private.log'),'-o','-h 127.0.0.1 -p 55433 -c log_statement=none -c log_min_error_statement=panic -c log_connections=off -c log_disconnections=off','-w','-t','15']);return{pid:r.pid,code:r.code,signal:r.signal,error:r.error,unknown:r.unknown,owned:r.code===0&&r.nativeExitObserved===true};},
  liveProof:async pre=>{const p=fs.readFileSync(path.join(PIN.pgdata,'postmaster.pid'),'utf8').split(/\r?\n/);assert.equal(path.resolve(p[1]),PIN.pgdata);assert.equal(Number(p[3]),55433);assert.ok(Number.isInteger(Number(p[0]))&&Number(p[0])>0&&Number.isInteger(Number(p[2]))&&Number(p[2])>0);const listeners=[await ports()].flat().filter(x=>x.LocalPort===55433);assert.ok(listeners.length&&listeners.every(x=>x.OwningProcess===Number(p[0])));proof={scope:plan.scope,approvalVerified:true,sourcePinsVerified:true,checkedAt:new Date().toISOString(),systemId:pre.systemId,pgdata:pre.pgdata,postmasterStart:Number(p[2])};return proof;},
  verifyDatabase:async p=>{if(!worker){worker=child('mvp-ui-only-worker.cjs',{MVP_UI_ONLY_WORKER:'true'});await rpc(worker,'INIT',{proof:p});}return rpc(worker,'SNAPSHOT');},
  startAPI:async()=>{const r=await rpc(worker,'START_API');assert.equal(r.pid,worker.pid);return{...worker,policy:r.policy,readonlyCoverage:r.readonlyCoverage};},
  readyAPI:async api=>wait(async()=>{if(worker.exit)throw Error('API_EXIT');const listeners=[await ports()].flat().filter(x=>x.LocalPort===55001);if(!listeners.length)return false;assert.ok(listeners.every(x=>x.OwningProcess===api.pid));const h=await(await fetch('http://127.0.0.1:55001/api/health',{signal:AbortSignal.timeout(2000)})).json();return h.data.database==='connected'&&h.data.mqtt==='disabled';}),
  verifyPreFrontend:async(api,{signal})=>{
   const {runPreFrontendGate}=require('./mvp-ui-only-api.cjs');
   try{return await runPreFrontendGate({apiPid:api.pid,signal,
    credential:async()=>{assert.ok(websiteCredential,'PRE_FRONTEND_AUTH_CREDENTIAL_CONTRACT_BLOCKED');const c=websiteCredential;websiteCredential=null;return c;},
    observe:()=>rpc(worker,'GATE_OBSERVATION'),
    request:(url,options)=>fetch(url,{...options,signal:AbortSignal.any([signal,AbortSignal.timeout(3000)])})
   });}finally{if(websiteCredential){websiteCredential.password=null;websiteCredential=null;}}
  },
  startFrontend:async()=>{const empty=path.join(run,'empty-env');fs.mkdirSync(empty);front=child('mvp-ui-only-frontend.mjs',{MVP_UI_ONLY_APPROVED:'true',VITE_API_BASE_URL:'http://127.0.0.1:55001/api',MVP_EMPTY_ENV_DIR:empty});return front;},
  readyFrontend:async f=>wait(async()=>{if(f.exit)throw Error('FRONTEND_EXIT');const listeners=await ports();if(![listeners].flat().some(x=>x.LocalPort===55173&&x.OwningProcess===f.pid))return false;return(await fetch('http://127.0.0.1:55173',{signal:AbortSignal.timeout(2000)})).ok;}),
  automatedInspection:async input=>{
   if(!browserBridge)browserBridge=require('./frontend-acceptance/live-provider.cjs').createLiveBridge({run,plan,checkPlan,
    credential:async()=>{assert.ok(browserCredential,'BROWSER_CREDENTIAL_UNAVAILABLE');const c=browserCredential;browserCredential=null;return c;},
    inspectRuntime:async({api,frontend})=>{
     checkPlan(plan);const listeners=[await ports()].flat();
     assert.ok(!worker.exit&&!front.exit&&worker.child.connected&&front.child.connected);
     assert.equal(worker.pid,api.pid);assert.equal(front.pid,frontend.pid);
     for(const [port,pid]of [[55001,api.pid],[55173,frontend.pid]])assert.ok(listeners.some(x=>x.LocalPort===port&&x.OwningProcess===pid));
     return {supervisorPid:process.pid,apiPid:api.pid,frontendPid:frontend.pid,nativeChildHandles:true,listenersMatch:true,sourcePinsVerified:true,
      activeManifestSha256:sha(path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json')),systemId:proof.systemId,pgdata:proof.pgdata,checkedAt:Date.now(),runId:path.basename(run)};
    }});
   return browserBridge.inspect(input);
  },
  browserCloseBarrier:async()=>browserBridge?browserBridge.closeBarrier():{state:'NOT_STARTED',verified:true},
  manualInspection:async seconds=>{
   write('manual-checklist.json',{mode:'HISTORICAL_NOT_LIVE',checklist:CHECKS,screenshotInstructions:'Save redacted PNGs under this private run; submit operator-acceptance.json with checks=true and redactionConfirmed=true. No credentials.'});
   console.log('UI_ONLY_READY http://127.0.0.1:55173 — operator manual browser only; no live MQTT.');
   const until=Date.now()+seconds*1000;while(Date.now()<until){const file=path.join(run,'operator-acceptance.json');if(fs.existsSync(file)){
    const a=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(a.operatorAttested,true);assert.equal(a.redactionConfirmed,true);assert.deepEqual(Object.keys(a.checks).sort(),CHECKS.slice().sort());assert.ok(CHECKS.every(k=>a.checks[k]===true));assert.ok(Array.isArray(a.screenshots)&&a.screenshots.length>=3&&a.screenshots.length<=10);
    const images=a.screenshots.map(n=>{assert.match(n,/^[a-zA-Z0-9_-]+\.png$/);const file=path.join(run,n);assert.ok(!fs.lstatSync(file).isSymbolicLink());const b=fs.readFileSync(file);assert.ok(b.length<10485760&&b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));return{name:n,sha256:crypto.createHash('sha256').update(b).digest('hex')};});return{accepted:true,evidenceType:'OPERATOR_ATTESTATION_NOT_AUTOMATED_DOM',images};
   }await new Promise(r=>setTimeout(r,500));}return{accepted:false,reason:'MANUAL_WINDOW_EXPIRED'};
  },
  stopChild:async row=>{if(row.pid===worker?.pid){lastStop=await rpc(worker,'STOP');return waitExit(worker);}row.child.send('STOP');return waitExit(row);},
  hasVerificationWorker:async()=>!!worker&&!worker.exit,
  stopVerifier:async()=>{lastStop=await rpc(worker,'STOP');return waitExit(worker);},
  noOtherClients:async()=>lastStop?.otherClients===0,
  stopCluster:async()=>{const r=await native(path.join(BIN,'pg_ctl.exe'),['stop','-D',PIN.pgdata,'-m','smart','-w','-t','15']);return{pid:r.pid,code:r.code,unknown:r.unknown,signal:r.signal,error:r.error};},
  portsReleased:async()=>{assert.equal([await ports()].flat().length,0);const r=await native(path.join(BIN,'pg_controldata.exe'),[PIN.pgdata]);nativeOK(r);assert.equal(r.stdout.match(/Database system identifier:\s+(\d+)/)?.[1],PIN.systemId);return /Database cluster state:\s+shut down/.test(r.stdout);}
 };
 try{return await supervise(plan,d);}finally{if(websiteCredential){websiteCredential.password=null;websiteCredential=null;}if(browserCredential){browserCredential.password=null;browserCredential=null;}}
}
module.exports={execute,sourceFiles,RUNTIME,CHECKS,checkPlan,readWebsiteCredential};
