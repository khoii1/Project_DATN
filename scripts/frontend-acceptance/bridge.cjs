'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const P=require('./policy.cjs');
const {validateSnapshot}=require('../mvp-ui-only-supervisor.cjs');
const {validatePreFrontendEvidence}=require('../mvp-ui-only-api.cjs');
const {assertCoverage}=require('../mvp-ui-only-readonly.cjs');
const C=require('./contract.cjs');
const receipts=new WeakMap();
function closed(n){return !!n&&n.handlesVerified===true&&n.ownerVerified===true&&n.workerExited===true&&n.edgeExited===true&&Number.isInteger(n.workerExitCode)&&Number.isInteger(n.edgeExitCode)&&n.osExitTimeStatus==='VALID'&&n.remaining===0&&n.foreignTargeted===0;}
function validateEvidence(e){
 assert.equal(e?.mode,'HISTORICAL_NOT_LIVE');assert.equal(e?.operatorAttestationCreated,false);
 assert.ok(Array.isArray(e.matrix)&&e.matrix.length===95);const expected=new Set(C.matrix().map(x=>x.route+':'+x.width));
 for(const row of e.matrix){assert.ok(expected.delete(row.route+':'+row.width),'DUPLICATE_OR_FOREIGN_MATRIX_CELL');for(const status of Object.values(row.checks))assert.ok(['PASS','FAIL','NOT_VERIFIED','NOT_APPLICABLE'].includes(status));}
 assert.equal(expected.size,0);assert.ok(Array.isArray(e.screenshots)&&e.screenshots.length<=10);
 const images=new Set();for(const s of e.screenshots){assert.ok(C.SHOTS.some(n=>n+'.png'===s.name)&&!images.has(s.name));images.add(s.name);}
 if(e.status==='PASS'){assert.ok(e.screenshots.length>=3);assert.ok(e.matrix.every(r=>['render','route','layout','visualClipping'].every(k=>r.checks[k]==='PASS')));}
 return true;
}
function bindReady(input,live,now){
 validateSnapshot(input.before);assertCoverage(input.api.readonlyCoverage);validatePreFrontendEvidence(input.gate,input.api.pid);
 assert.equal(input.api.owned,true);assert.equal(input.frontend.owned,true);
 assert.deepEqual(input.api.policy,{commands:false,automation:false,mqtt:'disabled',maxRunSeconds:1,testMode:true,audit:'DEV_MEMORY_ONLY',data:'HISTORICAL_PHASE_Y'});
 assert.equal(live.supervisorPid,process.pid);assert.equal(live.apiPid,input.api.pid);assert.equal(live.frontendPid,input.frontend.pid);
 assert.equal(live.nativeChildHandles,true);assert.equal(live.listenersMatch,true);assert.equal(live.sourcePinsVerified,true);assert.equal(live.activeManifestSha256,P.MANIFEST);
 assert.equal(live.systemId,'7698826681383327460');assert.equal(live.pgdata,'C:\\DATN\\test-instances\\phase13-3b\\data');
 assert.ok(now-live.checkedAt>=0&&now-live.checkedAt<5000,'STALE_NATIVE_BINDING');
 const expectedRecords={farm:{id:input.before.mapping.farm.id,name:input.before.mapping.farm.name},zone:{id:input.before.mapping.zone.id,name:input.before.mapping.zone.name},device:{id:input.before.mapping.devices[0].id,deviceCode:input.before.mapping.devices[0].deviceCode},pump:{id:input.before.mapping.actuators[0].id,code:'PUMP_01'},reportCounts:{'Trang trại':1,'Khu vực':1,'Thiết bị':1,'Cảm biến':4,'Readings':input.before.readings.length,'Lệnh tưới':0,'Rule tự động':0}};
 const session=Object.freeze({websiteUrl:P.UI,apiOrigin:P.API,manifestSha256:P.MANIFEST,mode:'HISTORICAL_NOT_LIVE',maxBrowserLaunches:1,mqtt:false,commands:false,automation:false,effectiveMaxRunSeconds:1,supervisorPid:live.supervisorPid,apiPid:live.apiPid,frontendPid:live.frontendPid,runId:live.runId,readyAt:now,deadline:now+input.seconds*1000,browserCloseBarrier:true,expectedRecords});
 assert.ok(Number.isInteger(input.seconds)&&input.seconds>=45&&input.seconds<=600);
 receipts.set(session,{binding:live,nonce:crypto.randomBytes(32).toString('hex')});return session;
}
function verifyIssued(session){return receipts.has(session);}
function createBridge(d){
 assert.equal(typeof d.verifyExecutionApproval,'function');assert.equal(typeof d.inspectRuntime,'function');assert.equal(typeof d.runWorker,'function');
 let used=false,barrier=Object.freeze({state:'NOT_STARTED',verified:true}),pending=null;
 async function inspect(input){
  assert.ok(!used,'BROWSER_APPROVAL_ALREADY_CONSUMED');
  await d.verifyExecutionApproval(input.plan); // genuine new plan + hashes, never smoke approval.
  const live=await d.inspectRuntime(input);const session=bindReady(input,live,d.now());
  used=true;barrier=Object.freeze({state:'UNKNOWN',verified:false});
  const permit=receipts.get(session);let result;
  // The provider owns the host/worker/Edge even before context creation; this
  // promise resolves only after held-handle completion and reconciliation.
  pending=d.runWorker({session,nonce:permit.nonce,plan:input.plan});
  try{
   result=await pending;
   assert.equal(result.nonce,permit.nonce,'WORKER_CHANNEL_MISMATCH');
   const n=result.native;barrier=Object.freeze({state:closed(n)?'CLOSED':'UNKNOWN',verified:closed(n),runId:session.runId});
   const evidence=result.evidence;
   validateEvidence(evidence);
   const complete=evidence.status==='PASS'&&n.workerExitCode===0&&n.edgeExitCode===0&&barrier.state==='CLOSED';
   return {version:1,kind:'AUTOMATED_BROWSER_EVIDENCE',status:complete?'PASS':barrier.state==='CLOSED'?'PARTIAL':'BLOCKED',barrier,evidence,session:{runId:session.runId,readyAt:session.readyAt,deadline:session.deadline},native:{...n},operatorAttestationCreated:false};
  }catch{
   // Do not accept an arbitrary JSON CLOSED flag or fabricate a missing native
   // receipt after crash. The supervisor must leave services for operator review.
   if(barrier.state!=='CLOSED')barrier=Object.freeze({state:'UNKNOWN',verified:false,runId:session.runId});
   return {version:1,kind:'AUTOMATED_BROWSER_EVIDENCE',status:'BLOCKED',barrier,operatorAttestationCreated:false};
  }finally{pending=null;receipts.delete(session);}
 }
 return {inspect,closeBarrier:()=>barrier,verifyIssued,isUsed:()=>used};
}
module.exports={createBridge,bindReady,verifyIssued,closed,validateEvidence};
