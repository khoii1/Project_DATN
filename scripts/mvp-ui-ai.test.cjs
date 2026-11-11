const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCoverageGate,assertCoverage,memoryAudit}=require('./mvp-ui-only-readonly.cjs');
const {snapshot}=require('./mvp-ui-only-worker.cjs');
const {classifyBoundary,prepareObserver}=require('./mvp-ui-native-boundary.cjs');
function pool({badPath,failRead=false,audit=9}={}){
 let ordinal=0;const events=[];
 const raw={$disconnect:async()=>{},$transaction:async(fn,options)=>{
  const pid=++ordinal;assert.deepEqual(options,{maxWait:2000,timeout:8000,isolationLevel:'RepeatableRead'});let ro=false,bounded=false;
  const tx={$executeRawUnsafe:async q=>{events.push({pid,q});if(q==='SET TRANSACTION READ ONLY')ro=true;else{assert.ok(ro);assert.equal(q,"SET LOCAL statement_timeout = '5000ms'");bounded=true;}},$queryRawUnsafe:async q=>{
   assert.ok(ro&&bounded);events.push({pid,q:'IDENTITY_OR_CATALOG'});
   return[{db:'smart_agriculture_mvp_dev',role:'sa_mvp_dev_app',port:pid===badPath?5432:55433,schema:'public',readonly:'on',pid}];
  }};
  for(const name of ['sensorReading','device','farm','zone','sensor','actuator','deviceCommand','automationRule','activityLog'])tx[name]={count:async()=>{assert.ok(ro&&bounded);events.push({pid,q:'COUNT',model:name});if(failRead)throw Error('SYNTHETIC_READ_FAILURE');return name==='activityLog'?audit:0;},findUnique:async()=>null,findMany:async()=>[]};
  return fn(tx);
 }};
 for(const name of ['sensorReading','device','farm','zone','sensor','actuator','deviceCommand','automationRule','activityLog'])raw[name]={};
 return{raw,events,connections:()=>ordinal};
}
const repository=p=>p.$transaction([p.sensorReading.findMany(),p.sensorReading.count()]);
test('six supported paths run on guarded ordered connections before serving, nested reuses transaction',async()=>{
 const p=pool(),gate=createCoverageGate(p.raw),r=await gate.verify(repository);assertCoverage(r);assert.equal(r.paths.length,6);assert.equal(p.connections(),7);assert.equal(r.paths[4].transactions,1);assert.equal(r.paths[1].transactions,2);
 for(let pid=1;pid<=p.connections();pid++){const rows=p.events.filter(x=>x.pid===pid);assert.equal(rows[0].q,'SET TRANSACTION READ ONLY');assert.equal(rows[1].q,"SET LOCAL statement_timeout = '5000ms'");assert.equal(rows[2].q,'IDENTITY_OR_CATALOG');}
 await assert.rejects(gate.verify(repository),/COVERAGE_BLOCKED/);
});
for(let ordinal=1;ordinal<=7;ordinal++)test('wrong transaction identity prevents coverage completion at connection '+ordinal,async()=>{const p=pool({badPath:ordinal});await assert.rejects(createCoverageGate(p.raw).verify(repository),/IDENTITY_REFUSED/);});
test('query failure propagates; missing repository probe blocked',async()=>{await assert.rejects(createCoverageGate(pool({failRead:true}).raw).verify(repository),/READ_FAILURE/);await assert.rejects(createCoverageGate(pool().raw).verify(),/COVERAGE_BLOCKED/);});
test('mutation and raw escapes remain refused',()=>{const {prisma}=createCoverageGate(pool().raw);for(const model of ['sensorReading','activityLog','deviceCommand','actuator'])assert.throws(()=>prisma[model].update({}),/REFUSED/);assert.throws(()=>prisma.$queryRawUnsafe,/REFUSED/);});
test('actual repository source list runs through installed proxy and batch gate without DB or TS runtime',async()=>{
 const raw=pool().raw,gate=createCoverageGate(raw),source=fs.readFileSync('backend/src/repositories/sensor-reading.repository.ts','utf8');
 // Only compile the actual list method's JS-compatible body. No source substitute
 // or production runtime import; TypeScript method signature stripped in fixture.
 const body=source.match(/async list\(sensorId: string, options: HistoryOptions\) \{([\s\S]*?)\n  \},/)[1].replace(': Prisma.SensorReadingWhereInput','');
 const list=vm.runInNewContext('(async function(sensorId,options){'+body+'})',{prisma:gate.prisma});
 const r=await gate.verify(()=>list('SYNTHETIC_SENSOR',{page:1,limit:12,sort:'asc'}));assert.equal(r.paths[5].name,'repository');
});
test('persisted ActivityLog count comes from guarded snapshot and stays independent of RAM audit',async()=>{
 const p=pool({audit:13}),s=await snapshot(p.raw);assert.equal(s.counts.persistedActivityLog,13);const a=memoryAudit();await a.recordActivity({secret:'SYNTHETIC_SECRET'});assert.equal(a.snapshot().events,1);assert.equal((await snapshot(p.raw)).counts.persistedActivityLog,13);assert.ok(p.events.some(e=>e.model==='activityLog'));
});
test('persisted audit query error blocks snapshot, never substituted with zero',async()=>{const p=pool();const original=p.raw.$transaction;p.raw.$transaction=(fn,o)=>original(tx=>{tx.activityLog.count=async()=>{throw Error('AUDIT_QUERY_REFUSED');};return fn(tx);},o);await assert.rejects(snapshot(p.raw),/AUDIT_PERSISTENCE_BASELINE_BLOCKED/);});
test('wrong snapshot database connection blocks before audit read',async()=>{const p=pool({badPath:1});await assert.rejects(snapshot(p.raw),/IDENTITY_REFUSED/);assert.ok(!p.events.some(e=>e.model==='activityLog'));});
test('coverage failure prevents API load/listen on actual library with injected datasource',async()=>{
 const {createDatasource,startUIOnly}=require('./mvp-ui-only-api.cjs'),p=pool();
 const rows=require('./mvp-ui-only-historical.cjs'),times=['2026-11-02T12:11:18.853Z','2026-11-02T12:11:33.853Z','2026-11-02T12:11:48.853Z'];
 const original=p.raw.$transaction;p.raw.$transaction=(fn,o)=>original(tx=>{tx.sensorReading.findMany=async()=>rows.READING_IDS.map((id,i)=>({id,sensorId:rows.SENSOR_IDS[i%4],value:1,source:'MQTT',recordedAt:times[Math.floor(i/4)]}));return fn(tx);},o);
 const env={DATABASE_URL:'postgresql://sa_mvp_dev_app:SYNTHETIC@127.0.0.1:55433/smart_agriculture_mvp_dev?schema=public',JWT_SECRET:'SYNTHETIC_'.repeat(5),NODE_ENV:'development',PORT:'55001',CLIENT_URL:'http://127.0.0.1:55173',MQTT_ENABLED:'false',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1'};
 const proof={scope:'ONE_DEV_UI_ONLY_HISTORICAL_SESSION',approvalVerified:true,sourcePinsVerified:true,systemId:'7698826681383327460',pgdata:'C:\\DATN\\test-instances\\phase13-3b\\data',checkedAt:new Date().toISOString()};
 const raw=createDatasource({env,proof,PrismaClient:function(){return p.raw;}});let listened=false,loaded=false;
 await assert.rejects(startUIOnly({env,proof,raw,repositoryRead:()=>{throw Error('PROBE_REFUSED');},loadApp:()=>{loaded=true;},listen:()=>{listened=true;}}),/STARTUP_BLOCKED/);assert.equal(loaded,false);assert.equal(listened,false);
});
const evidence=()=>({relationshipVerified:true,outer:{pid:100,code:0,independentNativeExit:true},node:{pid:200,parentPid:100,code:0,independentNativeExit:true},tool:{code:0,linked:true}});
for(const [name,change,want]of [
 ['all zero',()=>{},'NATIVE_COMPLETION_PASS'],['child abnormal',e=>e.node.code=-1073741819,'NATIVE_CHILD_FAILURE_CONFIRMED'],['outer abnormal',e=>e.outer.code=-1073741819,'OUTER_HOST_FAILURE_CONFIRMED'],['tool abnormal',e=>e.tool.code=-1073741819,'TOOL_HOST_FAILURE_CONFIRMED'],['missing child handle',e=>delete e.node.independentNativeExit,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['stdout success only',e=>{delete e.node;e.stdout='PASS';},'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['timeout',e=>e.node.timeout=true,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED'],['wrong relationship',e=>e.node.parentPid=999,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED']
])test('native completion classification: '+name,()=>{const e=evidence();change(e);assert.equal(classifyBoundary(e),want);});
test('injected observer records abnormal exit unchanged, redacts extras and refuses retry',async()=>{
 let calls=0,saved;const observe=prepareObserver({spawnAndObserveOuter:async()=>{calls++;return{...evidence(),outer:{...evidence().outer,code:-1073741819},password:'SYNTHETIC_SECRET',stdout:'SYNTHETIC_SECRET'};},emit:r=>saved=r});
 const r=await observe();assert.equal(r.outer.code,-1073741819);assert.equal(r.verdict,'OUTER_HOST_FAILURE_CONFIRMED');assert.ok(!JSON.stringify(saved).includes('SECRET'));await assert.rejects(observe(),/NO_RETRY/);assert.equal(calls,1);
});
test('observer deadline stays unknown without kill or retry',async()=>{let calls=0;const observe=prepareObserver({spawnAndObserveOuter:()=>{calls++;return new Promise(()=>{});},emit:()=>{},deadlineMs:5});const r=await observe();assert.equal(r.verdict,'NATIVE_FAILURE_BOUNDARY_UNDETERMINED');assert.equal(calls,1);await assert.rejects(observe(),/NO_RETRY/);});
