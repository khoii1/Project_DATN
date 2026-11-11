// AE: all lifecycle actions are fake. No real PostgreSQL/HTTP/browser/MQTT.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {supervise,PIN,VALUES,RECEIVED,validateSnapshot}=require('../mvp-ui-only-supervisor.cjs');
const {READING_IDS,SENSOR_IDS}=require('../mvp-ui-only-historical.cjs');
const {SENSORS}=require('../mvp-real-device-resume.cjs'),{MIGRATIONS}=require('../phase13-5d1d-contracts.cjs');
const {readTransaction,readonlyPrisma}=require('../mvp-ui-only-readonly.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function rawSnapshot(){return{identity:{db:PIN.database,role:PIN.role,port:55433,schema:'public',readonly:'on'},migrations:MIGRATIONS.map(([migration_name,checksum])=>({migration_name,checksum,finished_at:'SYNTHETIC_FINISHED',rolled_back_at:null})),mapping:{farm:{id:PIN.farmId,ownerId:PIN.ownerId,status:'ACTIVE'},zone:{id:PIN.zoneId,farmId:PIN.farmId,status:'ACTIVE'},devices:[{id:PIN.deviceId,zoneId:PIN.zoneId,deviceCode:PIN.deviceCode,type:'CONTROLLER',hardwareModel:'ESP32 DevKit V1',status:'ACTIVE'}],sensors:SENSORS.map(([id,sensorCode,type])=>({id,sensorCode,type,deviceId:PIN.deviceId,status:'ACTIVE'})),actuators:[{id:PIN.actuatorId,deviceId:PIN.deviceId,actuatorCode:'PUMP_01',type:'PUMP',hardwareChannel:'GPIO26',status:'ACTIVE'}]},readings:READING_IDS.map((id,i)=>({id,sensorId:SENSOR_IDS[i%4],source:'MQTT',value:VALUES[i],recordedAt:['2026-11-02T12:11:18.853Z','2026-11-02T12:11:33.853Z','2026-11-02T12:11:48.853Z'][Math.floor(i/4)],receivedAt:RECEIVED[Math.floor(i/4)]})),counts:{commands:0,pending:0,enabledAutomation:0,actuatorOn:0,allReadings:45,persistedActivityLog:7}};}
function snapshot(){const s=rawSnapshot();s.measurementUnits=require('../mvp-ui-only-historical.cjs').deriveMeasurementUnits(s.readings,s.mapping.sensors,require('../mvp-ui-only-historical.cjs').EXPECTED_UNITS);return s;}
function goodGate(pid=111){const pre={attempted:true,statusCode:204,expectedOriginMatched:true,allowedMethodMatched:true,allowedHeadersMatched:true,varyMatched:true,bodyEmpty:true,credentialsAbsent:true,cacheAbsent:true,passed:true};return{version:1,apiPid:pid,apiReady:true,corsLoginPreflight:{...pre},corsReadPreflight:{...pre},directDevLogin:{attempted:true,statusCode:200,success:true,authenticatedIdentityMatched:true,tokenReturned:true,responseOriginMatched:true,memoryAuditVerified:true,passed:true},preflightTransactionsUnchanged:true,preflightAuditUnchanged:true,policyVerified:true,requests:{loginOptions:1,readOptions:1,login:1},completed:true,passed:true,failureReason:null};}
function coverage(){return{version:1,complete:true,paths:['single','concurrent','batch','callback','nested','repository'].map(name=>{const connections=Array.from({length:name==='concurrent'?2:1},()=>({pid:123,db:PIN.database,role:PIN.role,port:55433,schema:'public',readonly:'on'}));return{name,transactions:connections.length,connections};})};}
function fixture(){
 const actions=[],files=new Map();let consumed=false,worker=false,queries=0;
 const plan={scope:'ONE_DEV_UI_ONLY_HISTORICAL_SESSION',approved:true,maxSessions:1,manualSeconds:30,expiresAt:new Date(120000).toISOString(),userApprovalFile:'SYNTHETIC_NEW_APPROVAL',userApprovalSha256:hash('SYNTHETIC_APPROVAL'),allowExistingDevCredentialDecrypt:true,sourceHashes:{'synthetic-source':hash('SYNTHETIC_SOURCE')},runtimeHashes:{synthetic:'PIN'}};
 const child=(name,pid)=>({name,pid,owned:true});
 const d={now:()=>100000,read:()=>Buffer.from('SYNTHETIC_APPROVAL'),readSource:()=>Buffer.from('SYNTHETIC_SOURCE'),requiredSources:()=>['synthetic-source'],verifyRuntime:p=>assert.deepEqual(p,{synthetic:'PIN'}),
 consumeApproval:async()=>{if(consumed)throw Error('NO_REUSE');consumed=true;},prepareRun:async()=>{actions.push('prepare');return'SYNTHETIC_PRIVATE_RUN_NOT_CREATED';},write:(n,v)=>{if(files.has(n))throw Error('EEXIST');files.set(n,structuredClone(v));},
 preflight:async()=>{actions.push('preflight');return{pgdata:PIN.pgdata,systemId:PIN.systemId,state:'shut down',nativeVerified:true,ntfs:{operator:'S-1-5-21-1432835263-483988321-3159128977-1001',owner:'S-1-5-21-1432835263-483988321-3159128977-1001',protected:true,ports:0}};},
 startCluster:async()=>{actions.push('cluster-start');return{owned:true,code:0};},liveProof:async()=>({scope:plan.scope}),
 verifyDatabase:async()=>{actions.push('snapshot');worker=true;queries++;return snapshot();},
 startAPI:async()=>{actions.push('api-start');return{...child('api',111),readonlyCoverage:coverage(),policy:{commands:false,automation:false,mqtt:'disabled',testMode:true,maxRunSeconds:1}};},readyAPI:async()=>{actions.push('api-ready');},
 verifyPreFrontend:async()=>{actions.push('cors-auth-gate');return goodGate();},
 startFrontend:async()=>{actions.push('frontend-start');return child('frontend',222);},readyFrontend:async()=>{actions.push('frontend-ready');},manualInspection:async()=>{actions.push('manual');return{accepted:true,evidenceType:'SYNTHETIC_OPERATOR_ATTESTATION'};},
 stopChild:async c=>{actions.push('stop-'+c.name);if(c.name==='api')worker=false;return{code:0};},hasVerificationWorker:async()=>worker,stopVerifier:async()=>{actions.push('stop-verifier');worker=false;return{code:0};},noOtherClients:async()=>true,stopCluster:async()=>{actions.push('cluster-stop');return{code:0};},portsReleased:async()=>true};
 return{plan,d,actions,files,queries:()=>queries};
}

module.exports={snapshot,goodGate,coverage,fixture,hash};
