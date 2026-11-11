// No browser process, listener, DB, credentials or MQTT. VM injects mock dependencies
// into the unchanged real UI helper; the classifier never launches anything.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {classifyEvidence}=require('./mvp-browser-startup-diagnosis.cjs');
const sourcePath=path.join(__dirname,'mvp-ui-browser.cjs'),bytes=fs.readFileSync(sourcePath);
function fixture({launchError,browserClosed=false,contextClosed=false}={}){
 const calls=[],files=[],summary={checks:[]};let connected=!browserClosed,closed=contextClosed;
 const context={route:async()=>{},on:()=>{},pages:()=>[],close:async()=>{calls.push('context-close');closed=true;},newPage:async()=>{calls.push('page');if(closed)throw Error('CONTEXT_CLOSED');return{};}};
 const browser={newContext:async()=>{calls.push('context');if(!connected)throw Error('BROWSER_CLOSED');return context;},close:async()=>{calls.push('browser-close');connected=false;}};
 const chromium={launch:async options=>{calls.push('launch');assert.deepEqual(JSON.parse(JSON.stringify(options)),{executablePath:'SYNTHETIC_EDGE_NOT_EXECUTED',headless:true});if(launchError)throw launchError;return browser;}};
 const exports={};
 const sandbox={module:{exports},exports,URL,Date,Intl,setTimeout,require(name){
  if(name==='playwright-core')return{chromium};
  if(name==='./mvp-dev-acceptance.cjs')return{edgeExecutable:()=> 'SYNTHETIC_EDGE_NOT_EXECUTED'};
  if(name==='node:fs')return{writeFileSync:(file,data,opts)=>files.push({file,data,opts})};
  if(name==='node:path')return path;
  if(name==='node:assert/strict')return assert;
  throw Error('SYNTHETIC_DEPENDENCY_REFUSED');
 }};
 vm.runInNewContext(bytes.toString('utf8'),sandbox,{filename:sourcePath});
 return{calls,files,summary,create:()=>sandbox.module.exports.create({run:'SYNTHETIC_RUN_NOT_CREATED',summary,check:async()=>{},clean:()=> '[REDACTED]',redact:value=>value})};
}
test('actual helper: launch then context then page, graceful owned cleanup once; no retry',async()=>{
 const x=fixture(),h=await x.create(),ctx=await h.helpers.context();await ctx.newPage();await h.close();
 assert.deepEqual(x.calls,['launch','context','page','context-close','browser-close']);assert.equal(x.files.length,1);assert.equal(x.files[0].opts.flag,'wx');assert.equal(x.summary.browser.closed,true);
});
test('actual helper: launch rejection propagates before context/page; no orchestrator retry',async()=>{
 const x=fixture({launchError:Error('SYNTHETIC_LAUNCH_FAILED')});await assert.rejects(x.create(),/SYNTHETIC_LAUNCH_FAILED/);assert.deepEqual(x.calls,['launch']);assert.equal(x.files.length,0);
});
test('actual helper: browser closes before context, no page/navigation; cleanup remains possible',async()=>{
 const x=fixture({browserClosed:true}),h=await x.create();await assert.rejects(h.helpers.context(),/BROWSER_CLOSED/);await h.close();assert.deepEqual(x.calls,['launch','context','browser-close']);
});
test('actual helper: context closes before page; no navigation or retry',async()=>{
 const x=fixture({contextClosed:true}),h=await x.create(),ctx=await h.helpers.context();await assert.rejects(ctx.newPage(),/CONTEXT_CLOSED/);await h.close();assert.deepEqual(x.calls,['launch','context','page','context-close','browser-close']);
});
test('premature orchestrator cleanup fixture is distinguishable and does not fabricate root cause',async()=>{
 const x=fixture(),h=await x.create();await h.close();await assert.rejects(h.helpers.context(),/BROWSER_CLOSED/);
 const r=classifyEvidence({phase:'context',failed:true,cleanupAt:10,failureAt:20});assert.equal(r.finding,'ORCHESTRATOR_CLEANUP_PRECEDES_FAILURE');assert.equal(r.rootCauseConfirmed,false);
});
test('timeout is propagated once, not replaced by PASS or forced native exit',async()=>{
 const error=Error('SYNTHETIC_TIMEOUT');error.name='TimeoutError';const x=fixture({launchError:error});await assert.rejects(x.create(),{name:'TimeoutError'});assert.equal(x.calls.length,1);
 const r=classifyEvidence({phase:'launch',timeout:true,failed:true});assert.equal(r.finding,'BROWSER_TIMEOUT');assert.equal(r.nativeExit,null);
});
test('fake abnormal native process exit is retained without inferring fault module',()=>{
 const r=classifyEvidence({phase:'launch',pid:123,nativeExit:-1073741819,failed:true});assert.equal(r.finding,'BROWSER_NATIVE_EXIT_ABNORMAL');assert.equal(r.nativeExit,-1073741819);assert.equal(r.rootCauseConfirmed,false);
});
test('fake native signal never becomes successful lifecycle',()=>{
 assert.equal(classifyEvidence({phase:'launch',nativeSignal:true,success:true}).finding,'BROWSER_NATIVE_EXIT_ABNORMAL');
});
test('child ownership mismatch blocks classification even with native0; no process action',()=>{
 const r=classifyEvidence({phase:'launch',pid:123,parentPid:2,expectedParentPid:1,nativeExit:0,success:true,pageCreated:true,closedGracefully:true});assert.equal(r.finding,'OWNERSHIP_MISMATCH_BLOCKED');assert.equal(r.realBrowserVerified,false);
});
test('synthetic successful lifecycle requires owned native completion, never real browser verification',()=>{
 const r=classifyEvidence({phase:'page',pid:123,parentPid:1,expectedParentPid:1,nativeExit:0,success:true,pageCreated:true,closedGracefully:true});assert.equal(r.finding,'SYNTHETIC_LIFECYCLE_COMPLETE');assert.equal(r.realBrowserVerified,false);
});
test('classifier whitelists metadata; raw logs/argv/password/token/env never reflected',()=>{
 const secret='SYNTHETIC_PRIVATE_MARKER';const r=classifyEvidence({phase:'launch',failed:true,password:secret,logs:secret,argv:secret,environment:{MQTT_PASSWORD:secret},token:secret,pid:secret,nativeExit:secret});assert.ok(!JSON.stringify(r).includes(secret));assert.equal(r.pid,null);assert.equal(r.nativeExit,null);assert.equal(r.finding,'LAUNCH_FAILED_NATIVE_CAUSE_UNDETERMINED');
});
test('actual helper source unchanged and no real runtime dependency imported by diagnosis',()=>{
 assert.ok(bytes.equals(fs.readFileSync(sourcePath)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'a386c6b10c2ac28177ec40e86cb60dc7b2259ee2a0650ebfd1b125e107c637ac');
 const source=fs.readFileSync(path.join(__dirname,'mvp-browser-startup-diagnosis.cjs'),'utf8');assert.doesNotMatch(source,/require\(|spawn\(|\.launch\(|\.connect\(|process\.env|writeFile/);
});
