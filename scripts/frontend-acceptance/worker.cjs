'use strict';
// Browser-only child: no DB, MQTT, gateway or service startup imports.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {readCredentialInput}=require('../mvp-credential-input.cjs');
const {accept}=require('./adapter.cjs');
const ROOT=path.resolve(__dirname,'../..'),EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function waitReceipt(run,name,ms=5000){const until=Date.now()+ms;while(Date.now()<until){try{return JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw Error('NATIVE_RECEIPT_REFUSED');}await new Promise(r=>setTimeout(r,20));}throw Error('NATIVE_RECEIPT_UNKNOWN');}
async function execute(run){
 const read=n=>JSON.parse(fs.readFileSync(path.join(run,n),'utf8').replace(/^\uFEFF/,''));
 const pre=read('preflight.json');assert.equal(pre.scope,'ONE_AUTOMATED_HISTORICAL_BROWSER');assert.equal(pre.parentPid,process.ppid);
 for(const [f,h]of Object.entries(pre.pins))assert.equal(sha(f),h,'SOURCE_DRIFT');
 assert.equal(sha(pre.approvalFile),pre.approvalSha256,'APPROVAL_DRIFT');
 const receipt=read('environment-receipt.json');assert.equal(receipt.parentPid,process.ppid);
 assert.equal(sha(path.join(run,'environment-receipt.json')),pre.receiptSha256,'ENVIRONMENT_RECEIPT_DRIFT');
 const candidate=require('./browser-environment.cjs');
 const plan=candidate.build({receipt:receipt.knownFolders,operatorSid:receipt.operatorSid,run,inspect:p=>{const r=receipt.paths.find(r=>r.path.toLowerCase()===p.toLowerCase());assert.ok(r);return r;}});
 assert.deepEqual(Object.keys(process.env).sort(),Object.keys(plan.env).sort());for(const k of Object.keys(plan.env))assert.equal(process.env[k],plan.env[k]);
 let packet=await readCredentialInput(process.stdin);assert.deepEqual(packet.session,pre.session,'SESSION_CHANNEL_REFUSED');
 const write=(n,v)=>fs.writeFileSync(path.join(run,n),JSON.stringify(v,null,2),{flag:'wx'});
 const cp=require('node:child_process'),observer=require('../mvp-edge-smoke-observer.cjs');
 write('attempt.json',{scope:pre.scope,maxLaunches:1,workerPid:process.pid,sessionRunId:packet.session.runId});
 fs.writeFileSync(path.join(run,'native-events.jsonl'),'',{flag:'wx'});
 const trace=observer.createNativeObserver({spawn:cp.spawn,environment:plan.env,tempRoot:plan.env.TEMP,verifyExecutable:()=>assert.equal(sha(EDGE),pre.pins[EDGE]),onEvent:r=>{
  fs.appendFileSync(path.join(run,'native-events.jsonl'),JSON.stringify(r)+'\n');if(r.kind==='native-handle')write('edge-pid.json',{pid:r.pid,parentPid:r.parentPid});
 }});
 const spawn=trace.spawn;trace.spawn=(exe,args,opts)=>{candidate.checkArguments(args,plan);return spawn(exe,args,opts);};observer.installSpawnBoundary(cp,trace);
 let context,opened=false,closed=false;
 const clean=async(_owned,options={})=>{
  return closeOwnedOnce(context,()=>waitReceipt(run,'edge-native-completion.json',15000),()=>write('worker-shutdown-request.json',{version:1,workerPid:process.pid,supervisorPid:pre.supervisorPid,runId:pre.session.runId,reason:options.reason==='POLICY_STOP'?'POLICY_STOP':'SESSION_FINISHED',graceMs:30000}),{isClosed:()=>closed,markClosed:()=>{closed=true;},report:fact=>write(fact.phase==='CONTEXT_CLOSE'?'worker-close-context.json':'worker-close-native.json',fact)});
 };

 const evidence=await accept(packet.session,{verifySession:s=>s===packet.session&&pre.supervisorPid===s.supervisorPid,
  openBrowser:async()=>{assert.equal(opened,false,'NO_RETRY');opened=true;
   context=await require(path.join(ROOT,'node_modules/playwright-core')).chromium.launchPersistentContext(plan.userDataDir,candidate.launchOptions(plan,EDGE));return {context};},
  verifyOwnership:async()=>{const n=await waitReceipt(run,'edge-owner-verified.json');return n.ownerVerified===true&&n.handlesVerified===true&&(n.pid===trace.native()?.pid||n.pid===trace.events.find(e=>e.kind==='native-handle')?.pid);},
  closeAndObserve:clean,abortOpenAndObserve:clean,
  credential:async()=>{const c=packet.credential;packet.credential=null;return c;},
  screenshotSink:async(name,b)=>{assert.match(name,/^[A-Za-z0-9_]+\.png$/);fs.writeFileSync(path.join(run,name),b,{flag:'wx'});}
 });
 write('browser-result.json',{workerPid:process.pid,sessionRunId:packet.session.runId,evidence});
 if(packet.credential)packet.credential.password='';packet=null;
 process.exitCode=evidence.status==='PASS'&&evidence.native==='PASS'?0:3;
}
// Public API close only. Never spawn/kill or forge native receipts.
async function boundedOperation(fn,ms,timers={setTimeout,clearTimeout}){let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=timers.setTimeout(()=>reject(Error('CLEANUP_STEP_TIMEOUT')),ms);})]);}finally{timers.clearTimeout(timer);}}
async function closeOwnedOnce(context,waitNative,announce,{isClosed=()=>false,markClosed=()=>{},report=()=>{},now=()=>performance.now(),timers={setTimeout,clearTimeout},closeMs=10000,nativeMs=15000}={}){
 announce(); // create-new, bound to held worker/run; not a native CLOSED claim.
 const phase=async(name,fn,ms)=>{const start=now();try{const v=await boundedOperation(fn,ms,timers);report({phase:name,status:'RESOLVED',durationMs:Math.max(0,Math.min(30000,Math.round(now()-start)))});return v;}catch(e){report({phase:name,status:e.message==='CLEANUP_STEP_TIMEOUT'?'TIMEOUT':'ERROR',durationMs:Math.max(0,Math.min(30000,Math.round(now()-start)))});throw e;}};
 if(context&&!isClosed()){markClosed();await phase('CONTEXT_CLOSE',()=>context.close(),closeMs);}
 const n=await phase('NATIVE_RECEIPT',waitNative,nativeMs);
 return {owned:n.ownerVerified===true,handlesVerified:n.handlesVerified===true,exitCode:n.native.exitCode,osExitTimeStatus:n.native.osExitTimeStatus,remaining:n.remaining,foreignTargeted:0};
}
module.exports={waitReceipt,boundedOperation,closeOwnedOnce};
if(require.main===module){const [mode,run,...extra]=process.argv.slice(2);if(mode!=='--execute'||!run||extra.length)process.exitCode=3;
 else execute(path.resolve(run)).catch(()=>{process.stderr.write('AUTOMATED_BROWSER_WORKER_BLOCKED\n');process.exitCode=3;});}
