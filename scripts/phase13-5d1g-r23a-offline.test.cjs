'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const api=require('./phase13-5d1g-r23a-offline.cjs'),inspect=require('./phase13-5d1g-r22-root-state.cjs').inspectRoot;
const read=(dir,n)=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
test('R23A fixture disposition and phased console gate offline acceptance',async t=>{
 const before=inspect(),results=[];let abort=false;
 await t.test('real initdb denied; no arbitrary executable or scenario transport',()=>{assert.throws(()=>api.executeInitdb(),/NOT_AUTHORIZED/);assert.throws(()=>api.prepare('initdb'),/SCENARIO_REQUIRED/);assert.throws(()=>api.verify('C:\\other','0'.repeat(64)),/REFUSED/);});
 await t.test('stage-specific contract refuses absent, additional, observer and false identity',()=>{
  const base={stage:'PRE_SUSPENDED',members:[100],hostPid:100,childPid:200,observerPid:300,nativeIdentityVerified:true,observerReady:true};assert(api.validateGate(base));assert(api.validateGate({...base,stage:'POST_ATTACHED',members:[100,200]}));
  for(const x of [{members:[]},{members:[100,200]},{members:[100,300]},{members:[100,999]},{members:[100,100]},{nativeIdentityVerified:false},{observerReady:false},{stage:'UNKNOWN'}])assert.equal(api.validateGate({...base,...x}),false);
  for(const members of [[100],[100,200,300],[100,999],[200,300]])assert.equal(api.validateGate({...base,stage:'POST_ATTACHED',members}),false);
 });
 await t.test('disposition of old fixtures is abnormal, with exact recorded native exit, evidence preserved',()=>{
  const dir=path.resolve(__dirname,'../build/phase13-5d1g-r23a/disposition-1793119234535-0cca9aa9');
  for(const id of ['r23-1793118266854-70cd449e','r23-1793118269698-1d1437b5']){const r=read(dir,id+'-disposition-result.json');assert.equal(r.status,'ABNORMAL_FIXTURE_DISPOSITION');assert.equal(r.nativeExitCode,238);assert(r.nativeHandleObserved);assert.equal(r.graceful,false);assert.equal(api.hash(path.resolve(__dirname,'../build/phase13-5d1g-r23',id,'outcome.json')),r.originalOutcomeSha256);}
 });
 const negatives={diagnostic:'FINAL_CONSOLE_MEMBERS_REFUSED','missing-member':'POST_RESUME_CHILD_MEMBERSHIP_MISSING','unexpected-member':'FINAL_CONSOLE_MEMBERS_REFUSED','observer-shared':'FINAL_CONSOLE_MEMBERS_REFUSED','suspended-gate-error':'INJECTED_SUSPENDED_GATE_ERROR','wrong-pid':'NATIVE_IDENTITY_REFUSED','wrong-start':'NATIVE_IDENTITY_REFUSED','pid-reuse':'NATIVE_IDENTITY_REFUSED','handle-mismatch':'NATIVE_IDENTITY_REFUSED','host-exit':'HOST_EXIT_BEFORE_RESUME','observer-exit':'OBSERVER_EXITED_BEFORE_RESUME',exit7:'NATIVE_NONZERO'};
 for(const scenario of api.SCENARIOS){
  if(abort)break;
  await t.test('actual synthetic external lifecycle: '+scenario,async()=>{
   try{
    const r=await api.run(scenario);results.push(r);assert.deepEqual(r.wrapperExit,{code:0,signal:null});assert.equal(r.outcome.status,scenario==='success'?'SYNTHETIC_PASS':'BLOCKED');assert.equal(r.outcome.retry,false);assert.equal(r.outcome.realInitdbEnabled,false);assert.equal(r.census.matchingRemaining,0);assert.equal(r.observer.unknown,false);assert.equal(r.observer.jobActive,0);assert.equal(r.observer.jobFlags,0);
    const pre=read(r.directory,'gate-pre-resume.json');assert.equal(pre.childResumed,false);assert.equal(pre.childSuspendedObserved,true);assert.equal(pre.hostPid,r.identity.hostPid);assert.equal(pre.childStartFileTime,r.identity.startFileTime);
    if(scenario==='success'||scenario==='exit7'){
     assert.deepEqual(pre.members,[r.identity.hostPid]);const post=read(r.directory,'gate-post-resume.json');assert.deepEqual(new Set(post.members),new Set([r.identity.hostPid,r.identity.pid]));assert.equal(post.count,2);assert.equal(post.childResumed,true);assert.equal(r.observer.exitCode,scenario==='success'?0:7);assert.equal(r.observer.independentNativeHandle,true);assert.equal(r.disposition,null);assert.equal(read(r.directory,'pre-resume-accepted.json').realInitdbSafe,false);assert.equal(read(r.directory,'console-interval.json').realInitdbSafe,false);
    }else{
     if(scenario==='missing-member'&&r.outcome.reason==='POST_RESUME_CONSOLE_MEMBERS_REFUSED'){const refusal=read(r.directory,'gate-monitor-refusal.json');assert.equal(refusal.reason,'ATTACHED_MEMBERSHIP_LOST');assert.deepEqual(refusal.members,[r.identity.hostPid]);}
     else assert.equal(r.outcome.reason,negatives[scenario]);
     assert.equal(r.observer.exitCode,238);assert.equal(r.disposition.classification,'ABNORMAL_FIXTURE_DISPOSITION');assert.equal(r.disposition.graceful,false);
    }
    if(scenario==='diagnostic'){assert.deepEqual(pre.members,[r.identity.hostPid]);assert.equal(pre.count,1);assert.equal(pre.expected.length,2);assert.equal(r.outcome.resumed,false);}
    if(scenario==='observer-shared'){const ob=read(r.directory,'observer-ready.json');assert(pre.members.includes(ob.observerPid));assert.equal(r.outcome.resumed,false);}
    if(scenario==='unexpected-member'){const guest=read(r.directory,'guest-identity.json');assert(pre.members.includes(guest.pid));assert.equal(read(r.directory,'guest-disposition.json').exitCode,238);assert.equal(r.census.checked,4);}
    if(scenario==='host-exit'){assert.equal(r.observer.hostLost,true);assert.equal(r.observer.hostExitCode,0);assert.equal(r.outcome.resumed,false);}
    if(scenario==='observer-exit'){assert.equal(read(r.directory,'observer-exit-native.json').exitCode,7);assert.equal(r.observer.independentNativeHandle,false);assert.equal(r.outcome.resumed,false);}
    if(['wrong-pid','wrong-start','pid-reuse','handle-mismatch','suspended-gate-error'].includes(scenario))assert.equal(r.outcome.resumed,false);
   }catch(e){abort=true;throw e;}
  });
 }
 await t.test('all required scenarios actually executed; otherwise cannot claim suite success',()=>{assert.equal(results.length,api.SCENARIOS.length);});
 await t.test('duplicate attempt refuses launch and preserves metadata',async()=>{const r=results.find(x=>x.scenario==='success');assert(r);const f=path.join(r.directory,'host-attempt.json'),hash=api.hash(f);await assert.rejects(api.resume({directory:r.directory,manifestHash:r.manifestHash}),/DUPLICATE_ATTEMPT_REFUSED/);assert.equal(api.hash(f),hash);});
 await t.test('source/hash mismatch refuses before launch',()=>{const r=results[0];assert.throws(()=>api.verify(r.directory,'0'.repeat(64)),/REFUSED/);});
 await t.test('PowerShell AST parses without executing scripts',()=>{for(const name of ['common','host','observer']){const f=path.join(__dirname,'phase13-5d1g-r23a-'+name+'.ps1');const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',`$e=$null;$t=$null;[Management.Automation.Language.Parser]::ParseFile('${f}',[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 2}`],{encoding:'utf8',timeout:6000,windowsHide:true});assert.ifError(r.error);assert.equal(r.status,0,r.stderr);}});
 const after=inspect();await t.test('historical root hashes/ACL unchanged; no PGDATA, initdb marker or listener',()=>{assert.deepEqual(after.files,before.files);assert.deepEqual(after.acl,before.acl);assert(after.pgdataAbsent);assert.equal(after.acl.initdbProcesses,0);});
 const file=path.join(api.BASE,'tests-'+Date.now()+'.json');fs.writeFileSync(file,JSON.stringify({before,after,results,actualInitdbAttempts:0,sqlConnections:0,productionSideEffectsPerformed:false},null,2),{flag:'wx'});console.log('R23A_EVIDENCE '+file);
});
