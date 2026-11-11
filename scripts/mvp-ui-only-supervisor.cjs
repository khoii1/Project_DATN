// One approved historical DEV session. No IO on import; all lifecycle actions
// are injected for offline tests. Real adapter is loaded only after approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PIN,validateMapping}=require('./mvp-real-device-resume.cjs');
const {READING_IDS,SENSOR_IDS,verifyReadings,verifyMeasurementUnits}=require('./mvp-ui-only-historical.cjs');
const {MIGRATIONS}=require('./phase13-5d1d-contracts.cjs');
const {assertCoverage}=require('./mvp-ui-only-readonly.cjs');
const {validatePreFrontendEvidence,sanitizePreFrontendEvidence}=require('./mvp-ui-only-api.cjs');
const VALUES=[30.2,72.5,5,100,30.2,72.3,5,100,30.2,72.4,5,100];
const RECEIVED=['2026-11-02T12:11:19.216Z','2026-11-02T12:11:34.167Z','2026-11-02T12:11:49.210Z'];
const RETIRED=['7f2119fc-e09a-4bdc-9d09-30bcb2f4c9e4','1383afd4-76eb-4294-8441-7817c9914892','482d75f8-996f-4e52-8bea-572fe5e75a47'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function validateApproval(plan,io){
 assert.equal(plan?.scope,'ONE_DEV_UI_ONLY_HISTORICAL_SESSION');assert.equal(plan.approved,true);assert.equal(plan.maxSessions,1);
 assert.ok(Number.isInteger(plan.manualSeconds)&&plan.manualSeconds>=30&&plan.manualSeconds<=600);
 assert.ok(Date.parse(plan.expiresAt)>io.now()&&Date.parse(plan.expiresAt)-io.now()<=86400000,'APPROVAL_EXPIRED_OR_UNBOUNDED');
 assert.ok(typeof plan.userApprovalFile==='string'&&!RETIRED.some(s=>plan.userApprovalFile.includes(s)),'NEW_UI_ONLY_APPROVAL_REQUIRED');
 assert.equal(hash(io.read(plan.userApprovalFile)),plan.userApprovalSha256,'APPROVAL_DRIFT');
 assert.equal(plan.allowExistingDevCredentialDecrypt,true,'DEV_CREDENTIAL_SCOPE_REQUIRED');
 assert.deepEqual(Object.keys(plan.sourceHashes).sort(),io.requiredSources().sort(),'SOURCE_MANIFEST_MISMATCH');
 for(const [file,pin]of Object.entries(plan.sourceHashes))assert.equal(hash(io.readSource(file)),pin,'SOURCE_DRIFT');
 io.verifyRuntime(plan.runtimeHashes);
 assert.ok(plan.acceptanceMode===undefined||['MANUAL','AUTOMATED_BROWSER'].includes(plan.acceptanceMode));
 if(plan.acceptanceMode==='AUTOMATED_BROWSER')require('./frontend-acceptance/source-contract.cjs').validate(plan,io);
 return true;
}
function validatePreflight(p){assert.equal(p.systemId,PIN.systemId);assert.equal(p.pgdata,PIN.pgdata);assert.equal(p.state,'shut down');assert.equal(p.ntfs.operator,'S-1-5-21-1432835263-483988321-3159128977-1001');assert.equal(p.ntfs.operator,p.ntfs.owner);assert.equal(p.ntfs.protected,true);assert.equal(p.ntfs.ports,0);assert.equal(p.nativeVerified,true);}
function validateSnapshot(s){
 assert.equal(s.identity.db,PIN.database);assert.equal(s.identity.role,PIN.role);assert.equal(s.identity.port,55433);assert.equal(s.identity.schema,'public');assert.equal(s.identity.readonly,'on');
 assert.equal(s.migrations.length,11);s.migrations.forEach((m,i)=>{assert.equal(m.migration_name,MIGRATIONS[i][0]);assert.equal(m.checksum,MIGRATIONS[i][1]);assert.ok(m.finished_at);assert.equal(m.rolled_back_at,null);});
 validateMapping(s.mapping);verifyReadings(s.readings);verifyMeasurementUnits(s.readings,s.mapping.sensors,s.measurementUnits);
 for(const row of s.readings){const i=READING_IDS.indexOf(row.id);assert.equal(row.sensorId,SENSOR_IDS[i%4]);assert.equal(row.value,VALUES[i]);assert.equal(new Date(row.receivedAt).toISOString(),RECEIVED[Math.floor(i/4)]);}
 for(const key of ['commands','pending','enabledAutomation','actuatorOn'])assert.equal(s.counts[key],0,'UNSAFE_BASELINE');
 assert.ok(Number.isInteger(s.counts.allReadings)&&s.counts.allReadings>=12,'READING_COUNT_INVALID');
 assert.ok(Number.isSafeInteger(s.counts.persistedActivityLog)&&s.counts.persistedActivityLog>=0,'AUDIT_PERSISTENCE_BASELINE_BLOCKED');
 return true;
}
function digest(s){return hash(JSON.stringify({mapping:s.mapping,readings:[...s.readings].sort((a,b)=>a.id.localeCompare(b.id)),counts:s.counts,migrations:s.migrations,measurementUnits:s.measurementUnits}));}
function nativeOK(r,stage){if(r?.unknown||r?.timeout||!Number.isInteger(r?.code))throw Object.assign(Error('NATIVE_OUTCOME_UNKNOWN'),{stage,unknown:true,nativeCode:null});if(r.code!==0||r.signal||r.error)throw Object.assign(Error('NATIVE_NONZERO'),{stage,nativeCode:r.code});}
async function supervise(plan,d){
 validateApproval(plan,d); // No directory/startup action before genuine plan/pins gate.
 await d.consumeApproval(plan);
 const run=await d.prepareRun(plan);d.write('attempt.json',{at:new Date(d.now()).toISOString(),maxSessions:1,scope:plan.scope});
 let stage='preflight',cluster,api,frontend,before,unknown=false,browserCloseKnown=true;const result={run,status:'BLOCKED',events:[],cleanup:[]};
 const step=async(name,fn,ms=20000)=>{stage=name;ms=d.deadlines?.[name]??ms;let timer;const event={stage:name,startedAt:new Date(d.now()).toISOString()};try{const value=await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Object.assign(Error('STAGE_TIMEOUT'),{unknown:true})),ms))]);event.completed=true;if(Number.isInteger(value?.pid))event.pid=value.pid;if(Number.isInteger(value?.code))event.nativeCode=value.code;return value;}catch(e){event.completed=false;event.unknown=!!e.unknown;throw e;}finally{clearTimeout(timer);event.endedAt=new Date(d.now()).toISOString();result.events.push(event);}};
 try{
  const pre=await step('preflight',()=>d.preflight());validatePreflight(pre);
  const start=await step('cluster-start',()=>d.startCluster());nativeOK(start,stage);cluster=start;assert.equal(start.owned,true);
  const proof=await d.liveProof(pre,start);
  before=await step('sql-verification',()=>d.verifyDatabase(proof));validateSnapshot(before);result.baselineDigest=digest(before);result.poolVerification=before.poolVerification;result.auditPersistence={before:before.counts.persistedActivityLog,after:null};
  api=await step('api-start',()=>d.startAPI(proof));assert.equal(api.owned,true);assert.equal(api.policy.commands,false);assert.equal(api.policy.automation,false);assert.equal(api.policy.mqtt,'disabled');assert.equal(api.policy.maxRunSeconds,1);assert.equal(api.policy.testMode,true);
  assertCoverage(api.readonlyCoverage);result.readonlyCoverage=api.readonlyCoverage;
  await step('api-readiness',()=>d.readyAPI(api));
  const gateAbort=new AbortController();
  try{
   const evidence=await step('pre-frontend-verification',()=>d.verifyPreFrontend(api,{signal:gateAbort.signal}),15000);
   result.preFrontendGate=sanitizePreFrontendEvidence(evidence,api.pid);
   try{validatePreFrontendEvidence(evidence,api.pid);}catch{
    result.preFrontendGate.passed=false;
    if(!result.preFrontendGate.failureReason)result.preFrontendGate.failureReason='ATTESTATION_INVALID';
    throw Error('PRE_FRONTEND_VERIFICATION_BLOCKED');
   } // passed=true alone never authorizes frontend
  }finally{gateAbort.abort();}
  frontend=await step('frontend-start',()=>d.startFrontend());assert.equal(frontend.owned,true);await step('frontend-readiness',()=>d.readyFrontend(frontend));
  if(plan.acceptanceMode==='AUTOMATED_BROWSER'){
   browserCloseKnown=false;
   try{result.automated=await step('automated-browser',()=>d.automatedInspection({plan,seconds:plan.manualSeconds,before,api,frontend,gate:result.preFrontendGate}),plan.manualSeconds*1000);}
   finally{const barrier=await d.browserCloseBarrier();browserCloseKnown=barrier?.verified===true&&['CLOSED','NOT_STARTED'].includes(barrier.state);result.browserBarrier=barrier;}
   if(!browserCloseKnown)throw Object.assign(Error('BROWSER_CLOSE_UNKNOWN'),{unknown:true});
  }else result.manual=await step('manual-inspection',()=>d.manualInspection(plan.manualSeconds),plan.manualSeconds*1000+1000);
  const after=await step('post-verification',()=>d.verifyDatabase(proof));validateSnapshot(after);result.auditPersistence.after=after.counts.persistedActivityLog;assert.equal(result.auditPersistence.after,result.auditPersistence.before,'AUDIT_PERSISTENCE_BASELINE_CHANGED');assert.equal(digest(after),result.baselineDigest,'DATA_CHANGED');result.finalDigest=digest(after);
  for(const [file,pin]of Object.entries(plan.sourceHashes))assert.equal(hash(d.readSource(file)),pin,'POST_SOURCE_DRIFT');d.verifyRuntime(plan.runtimeHashes);
  result.status=plan.acceptanceMode==='AUTOMATED_BROWSER'?(result.automated?.status==='PASS'?'AUTOMATED_UI_ACCEPTED_HISTORICAL_ONLY':'AUTOMATED_UI_PARTIAL'):result.manual.accepted?'MANUAL_UI_ACCEPTED_HISTORICAL_ONLY':'MANUAL_UI_NOT_VERIFIED';
 }catch(e){unknown=!!e.unknown;result.failure={stage,category:unknown?'OUTCOME_UNKNOWN':'GATE_OR_NATIVE_FAILURE',nativeCode:Number.isInteger(e.nativeCode)?e.nativeCode:null};}
 finally{
  if(!browserCloseKnown){result.status='BROWSER_CLEANUP_UNRESOLVED';result.cluster=cluster?'LEFT_RUNNING_REVIEW_REQUIRED':'NOT_STARTED';result.finishedAt=new Date(d.now()).toISOString();d.write('summary.json',result);}
  else{
  let unresolved=unknown;
  for(const [name,child]of [['frontend',frontend],['api',api]])if(child){
   if(!child.owned){unresolved=true;result.cleanup.push({name,disposition:'OWNERSHIP_UNKNOWN_NO_ACTION'});continue;}
   try{const r=await step('stop-'+name,()=>d.stopChild(child));nativeOK(r,stage);result.cleanup.push({name,code:r.code});}catch(e){unresolved=true;result.cleanup.push({name,disposition:'UNRESOLVED_NO_KILL',nativeCode:Number.isInteger(e.nativeCode)?e.nativeCode:null,unknown:!!e.unknown});}
  }
  // Also cleans a verification worker created before API serving (no listener).
  try{if(await d.hasVerificationWorker()){const r=await step('stop-verifier',()=>d.stopVerifier());nativeOK(r,stage);}}catch{unresolved=true;}
  if(cluster?.owned&&!unresolved){try{assert.equal(await d.noOtherClients(),true);const r=await step('cluster-stop',()=>d.stopCluster(cluster));nativeOK(r,stage);assert.equal(await d.portsReleased(),true);result.cluster='STOPPED_GRACEFULLY';}catch{result.cluster='UNRESOLVED_NO_KILL';}}
  else result.cluster=cluster?'LEFT_RUNNING_REVIEW_REQUIRED':unknown?'STARTUP_OUTCOME_UNKNOWN':'NOT_STARTED';
  if(result.cluster!=='STOPPED_GRACEFULLY'&&cluster)result.status='CLEANUP_UNRESOLVED';
  result.finishedAt=new Date(d.now()).toISOString();d.write('summary.json',result);
  }
 }
 return result;
}
module.exports={PIN,VALUES,RECEIVED,validateApproval,validatePreflight,validateSnapshot,digest,nativeOK,supervise};
if(require.main===module){const [mode,run,...extra]=process.argv.slice(2);if(!['--execute','--check-plan'].includes(mode)||!run||extra.length){console.error('NEW_UI_ONLY_APPROVAL_REQUIRED');process.exitCode=3;}else if(mode==='--check-plan'){try{require('./mvp-ui-only-runtime.cjs').checkPlan(JSON.parse(require('node:fs').readFileSync(run,'utf8')));}catch{console.error('UI_ONLY_APPROVAL_OR_SOURCE_BLOCKED');process.exitCode=3;}}else require('./mvp-ui-only-runtime.cjs').execute(run).then(r=>{process.exitCode=['MANUAL_UI_ACCEPTED_HISTORICAL_ONLY','AUTOMATED_UI_ACCEPTED_HISTORICAL_ONLY'].includes(r.status)?0:3;}).catch(()=>{console.error('UI_ONLY_SECURITY_GATE_BLOCKED_NO_RETRY');process.exitCode=3;});}
