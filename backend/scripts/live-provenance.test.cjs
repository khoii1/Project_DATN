// Closed offline loader: all DB/env/MQTT/Windows boundaries are denied or mocked.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname,'../src');
const allowed = new Set(['services/live-provenance/evidence-store.ts','services/live-provenance/clock-health.ts','services/live-provenance/snapshot-assembler.ts',
  'routes/live-evidence.route.ts','middlewares/auth.middleware.ts','middlewares/validate.middleware.ts','utils/app-error.ts',
  'mqtt/mqtt-telemetry.adapter.ts','mqtt/mqtt-pump-state.adapter.ts','mqtt/mqtt-message.schema.ts','mqtt/mqtt-topic.ts','services/telemetry-ingestion.service.ts']);
function loader(mocks={}) {
  const cache=new Map();
  function load(relative) {
    if (!allowed.has(relative)) throw Error('UNAPPROVED_IMPORT '+relative);
    if(cache.has(relative))return cache.get(relative);
    const filename=path.join(root,relative),exports={};
    const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{exports,Date,URL,Buffer,structuredClone,performance,console:{log(){},warn(){},error(){}},require(name){
      if(Object.hasOwn(mocks,name))return mocks[name];
      if(['zod','node:crypto','express'].includes(name))return require(name);
      if(name==='@prisma/client')return {SensorReadingSource:{MQTT:'MQTT'},DeviceStatus:{ACTIVE:'ACTIVE'},SensorStatus:{ACTIVE:'ACTIVE'},UserStatus:{ACTIVE:'ACTIVE'}};
      if(!name.startsWith('.'))throw Error('UNAPPROVED_EXTERNAL '+name);
      return load(path.relative(root,path.resolve(path.dirname(filename),name)+'.ts').replaceAll('\\','/'));
    }},{filename});cache.set(relative,exports);return exports;
  }return load;
}
const load=loader();
const {LiveEvidenceStore}=load('services/live-provenance/evidence-store.ts');
const {ClockHealthAdapter,assessWindowsTime}=load('services/live-provenance/clock-health.ts');
const {assembleLiveObservation}=load('services/live-provenance/snapshot-assembler.ts');
const base=Date.parse('2026-10-21T03:00:00Z');
const topic='smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry';
function fixture(capacity=256) {
  let now=base;const store=new LiveEvidenceStore(()=>now,45000,capacity),started=new Date(base-1000);store.reset(1,started);
  const body={deviceCode:'ESP32-GF-A-01',recordedAt:new Date(base-100).toISOString(),readings:[{sensorCode:'SOIL_01',value:0},{sensorCode:'TEMP_01',value:30}]};
  const context={retain:false,dup:false,qos:1,receivedAt:new Date(base),observerGeneration:1,observerSessionStartedAt:started};
  const rows=()=>body.readings.map(r=>({id:'db-'+r.sensorCode,sensorCode:r.sensorCode,value:r.value,source:'MQTT',recordedAt:body.recordedAt,dbReceivedAt:new Date(base+10).toISOString()}));
  const observe=(bodyOverride=body,ctx=context,t=topic)=>store.observeTelemetry(t,Buffer.from(JSON.stringify(bodyOverride)),bodyOverride,ctx);
  const correlate=()=>{const id=observe();store.correlate(id,rows());return id;};
  const off={deviceCode:body.deviceCode,actuatorCode:'PUMP_01',state:'OFF',reason:'PERIODIC',recordedAt:body.recordedAt};
  const recordOff=(change={},ctx=context)=>store.observeCommittedOff(topic.replace('telemetry','actuator/state'),Buffer.from('OFF'),{...off,...change},ctx);
  return {store,body,context,rows,observe,correlate,recordOff,off,setNow:n=>now=n};
}
test('receipt stores exact callback time and DB correlation, zero preserved, publisher NOT_VERIFIED',()=>{
  const f=fixture();f.correlate();const e=f.store.latest(f.body.deviceCode,'SOIL_01');
  assert.equal(e.reading.id,'db-SOIL_01');assert.equal(e.value,0);assert.notEqual(e.callbackReceivedAt,e.reading.dbReceivedAt);assert.equal(e.publisherIdentityAssurance,'NOT_VERIFIED');assert.equal(e.sessionKind,'BACKEND_OBSERVER');assert.equal(e.payloadDigest.length,64);
});
for(const [name,edit] of [
  ['retained',c=>c.retain=true],['dup flag',c=>c.dup=true],['qos missing',c=>delete c.qos],['qos zero',c=>c.qos=0],
  ['callback missing',c=>delete c.receivedAt],['callback invalid',c=>c.receivedAt=new Date(NaN)],['generation mismatch',c=>c.observerGeneration=0],['session missing',c=>delete c.observerSessionStartedAt],
])test('reject receipt '+name,()=>{const f=fixture();edit(f.context);assert.equal(f.observe(),null);});
for(const badTopic of ['wrong','smart-agriculture/v1/extra/devices/ESP32-GF-A-01/telemetry','smart-agriculture/v1/devices/OTHER/telemetry'])test('reject topic '+badTopic,()=>{const f=fixture();assert.equal(f.observe(f.body,f.context,badTopic),null);});
for(const offset of [-46000,2100])test('reject stale/future timestamp '+offset,()=>{const f=fixture();f.body.recordedAt=new Date(base+offset).toISOString();assert.equal(f.observe(),null);});
test('payload duplicate and same sensor timestamp cannot gain a new receipt',()=>{
  const f=fixture();assert.ok(f.observe());assert.equal(f.observe(),null);f.body.readings[0].value=1;assert.equal(f.observe(),null);
});
test('out-of-order timestamp rejected despite changed payload',()=>{const f=fixture();f.observe();f.body.recordedAt=new Date(base-200).toISOString();assert.equal(f.observe(),null);});
test('uncorrelated receipt is never returned as a reading',()=>{const f=fixture();f.observe();assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);});
for(const [label,change] of [
  ['wrong value',r=>r[0].value=99],['wrong sensor',r=>r[0].sensorCode='OTHER'],['wrong timestamp',r=>r[0].recordedAt=new Date(base-500).toISOString()],
  ['wrong source',r=>r[0].source='MOCK'],['missing id',r=>r[0].id=''],['missing DB receipt',r=>r[0].dbReceivedAt=''],['duplicate result',r=>r.push({...r[0]})],
])test('correlation fail-closed '+label,()=>{const f=fixture(),id=f.observe(),rows=f.rows();change(rows);f.store.correlate(id,rows);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);});
test('wrong readingId / changed DB row cannot match known receipt',()=>{const f=fixture();f.correlate();assert.equal(f.store.matchDatabase({...f.rows()[0],id:'wrong'},f.body.deviceCode),null);assert.equal(f.store.matchDatabase({...f.rows()[0],value:1},f.body.deviceCode),null);assert.ok(f.store.matchDatabase(f.rows()[0],f.body.deviceCode));});
test('reconnect invalidates receipt and in-flight old-session correlation',()=>{const f=fixture(),id=f.observe();f.store.reset(2,new Date(base));f.store.correlate(id,f.rows());assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);assert.equal(f.observe(),null);});
test('expired receipt TTL removes reading and monotonic high-water prevents replay',()=>{const f=fixture();f.correlate();f.setNow(base+45001);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);assert.equal(f.observe(),null);});
test('clock rollback invalidates cache until a new observer session',()=>{const f=fixture();f.correlate();f.setNow(base-1);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);assert.equal(f.observe(),null);});
test('bounded capacity refuses unbounded sensor high-water allocation',()=>{const f=fixture(1);assert.equal(f.observe(),null);assert.equal(f.store.diagnostics().entries,0);});
test('fresh OFF records backend observation session, not an ESP32 boot session',()=>{const f=fixture();assert.equal(f.recordOff(),true);const e=f.store.off(f.body.deviceCode,'PUMP_01');assert.equal(e.reason,'PERIODIC');assert.equal(e.sessionKind,'BACKEND_OBSERVER');assert.equal(e.publisherIdentityAssurance,'NOT_VERIFIED');});
for(const [label,change,ctxChange] of [
  ['old OFF',{recordedAt:new Date(base-2000).toISOString()},{}],['ON',{state:'ON'},{}],['wrong actuator',{actuatorCode:'OTHER'},{}],['retained',{}, {retain:true}],['duplicate',{}, {dup:true}],['session mismatch',{}, {observerGeneration:0}],
])test('reject OFF '+label,()=>{const f=fixture();assert.equal(f.recordOff(change,{...f.context,...ctxChange}),false);});
test('OFF TTL and reconnect clear current evidence',()=>{const f=fixture();f.recordOff();f.setNow(base+30001);assert.equal(f.store.off(f.body.deviceCode,'PUMP_01'),null);f.store.reset(2,new Date(base+30001));assert.equal(f.store.off(f.body.deviceCode,'PUMP_01'),null);});
const timeInput=()=>({status:'Leap Indicator: 0(no warning)\nStratum: 5\nLast Sync Error: 0 (OK)\nSource: time.windows.com,0x8\nTime since Last Good Sync Time: 300.0s\n',peers:'Peer: time.windows.com,0x8\nState: Active\n',stripchart:'10:00:00, -00.0100000s\n10:00:02, +00.0120000s\n10:00:04, -00.0090000s\n'});
test('clock HEALTHY short-term evidence does not assert long-term stability',()=>{const e=assessWindowsTime(timeInput(),new Date(base).toISOString());assert.equal(e.health,'HEALTHY');assert.equal(e.offsetMs,12);assert.equal(e.longTermStability,'NOT_VERIFIED');});
for(const [label,edit,health] of [
  ['unsynchronized',i=>i.status=i.status.replace('Leap Indicator: 0','Leap Indicator: 3'),'UNHEALTHY'],
  ['stale sync',i=>i.status=i.status.replace('300.0s','4000s'),'UNKNOWN'],['wrong source',i=>i.status=i.status.replace('time.windows.com','other.example'),'UNKNOWN'],
  ['pending peer',i=>i.peers=i.peers.replace('Active','Pending'),'UNKNOWN'],['localized/unknown output',i=>i.status='Không đọc được','UNKNOWN'],
  ['missing offsets',i=>i.stripchart='timeout','UNKNOWN'],['excess offset',i=>i.stripchart=i.stripchart.replace('+00.0120000s','+03.0000000s'),'UNHEALTHY'],
  ['last sync error',i=>i.status=i.status.replace('Last Sync Error: 0','Last Sync Error: 123'),'UNHEALTHY'],
])test('clock '+label,()=>{const i=timeInput();edit(i);assert.equal(assessWindowsTime(i,new Date(base).toISOString()).health,health);});
test('another Active peer cannot mask Pending approved peer',()=>{const i=timeInput();i.peers=i.peers.replace('Active','Pending')+'Peer: other.example,0x8\nState: Active\n';assert.equal(assessWindowsTime(i,new Date(base).toISOString()).health,'UNKNOWN');});
test('clock timeout/errors return UNKNOWN instead of retaining a HEALTHY sample',async()=>{let wall=base,mono=0,fail=false;const clock=new ClockHealthAdapter(async()=>{if(fail)throw Error('timeout');return timeInput();},()=>wall,()=>mono);assert.equal((await clock.refresh()).health,'HEALTHY');wall+=31000;mono+=31000;fail=true;assert.equal((await clock.refresh()).health,'UNKNOWN');});
test('clock TTL expires using wall and monotonic evidence age',async()=>{let n=0;const clock=new ClockHealthAdapter(async()=>timeInput(),()=>base+n,()=>n);await clock.refresh();n=60001;assert.equal(clock.snapshot().health,'UNKNOWN');});
for(const step of [-1,3000])test('clock jump/rollback latches fail-closed '+step,async()=>{let w=base,m=0;const clock=new ClockHealthAdapter(async()=>timeInput(),()=>w,()=>m);await clock.refresh();w+=step;assert.equal(clock.snapshot().health,'UNKNOWN');assert.equal(clock.snapshot().clockJumpDetected,true);assert.equal((await clock.refresh()).health,'UNKNOWN');});
test('clock refresh coalesces concurrent requests into one measurement',async()=>{let calls=0,finish;const clock=new ClockHealthAdapter(()=>{calls++;return new Promise(r=>finish=r);},()=>base,()=>0);const a=clock.refresh(),b=clock.refresh();finish(timeInput());await Promise.all([a,b]);assert.equal(calls,1);});
test('assembler never manufactures missing policy/cycle/budget or publisher trust',()=>{
  const f=fixture();f.correlate();f.recordOff();const a=assembleLiveObservation({receipt:f.store.latest(f.body.deviceCode,'SOIL_01'),off:f.store.off(f.body.deviceCode,'PUMP_01'),clock:assessWindowsTime(timeInput(),new Date(base).toISOString()),presence:{connectionStatus:'ONLINE',lastSeenAt:new Date(base).toISOString()}},new Date(base).toISOString());
  assert.equal(a.source,'LIVE_OBSERVED_NOT_VERIFIED');assert.equal(a.verifiedLiveReady,false);assert.equal(a.snapshot,null);assert.equal(a.decision,null);assert.equal(a.engineCalled,false);assert.ok(a.reasons.includes('PUBLISHER_IDENTITY_NOT_VERIFIED'));assert.equal(a.cycle,null);assert.equal(a.budget,null);
});
test('offline/missing evidence assembler returns BLOCKED, no engine call',()=>{
  const a=assembleLiveObservation({receipt:null,off:null,clock:assessWindowsTime({...timeInput(),status:''},new Date(base).toISOString()),presence:{connectionStatus:'OFFLINE',lastSeenAt:null}},new Date(base).toISOString());assert.equal(a.status,'BLOCKED');assert.equal(a.commandCreated,false);
});
test('real telemetry adapter instrumentation correlates ingestion result, no new ingestion semantics',async()=>{
  const f=fixture();let calls=0,batch;
  const adapter=loader({'../config/env':{env:{mqttTopicPrefix:'smart-agriculture/v1',mqttMaxPayloadBytes:4096,mqttSideEffectMaxAgeSeconds:60}},
    '../services/live-provenance/evidence-store':{liveEvidenceStore:f.store},'../services/telemetry-ingestion.service':{telemetryIngestionService:{ingest:async b=>{calls++;batch=b;return{correlation:f.rows()};}}}})('mqtt/mqtt-telemetry.adapter.ts').mqttTelemetryAdapter;
  const body={schemaVersion:1,...f.body};assert.equal(await adapter.handle(topic,Buffer.from(JSON.stringify(body)),f.context),'accepted');assert.equal(calls,1);assert.equal(batch.source,'MQTT');assert.equal(batch.presenceSeenAt,f.context.receivedAt);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01').reading.id,'db-SOIL_01');
});
test('unproven/old-session receipt never blocks normal telemetry ingestion',async()=>{
  const f=fixture();let calls=0;
  const adapter=loader({'../config/env':{env:{mqttTopicPrefix:'smart-agriculture/v1',mqttMaxPayloadBytes:4096,mqttSideEffectMaxAgeSeconds:60}},
    '../services/live-provenance/evidence-store':{liveEvidenceStore:f.store},'../services/telemetry-ingestion.service':{telemetryIngestionService:{ingest:async()=>{calls++;return{};}}}})('mqtt/mqtt-telemetry.adapter.ts').mqttTelemetryAdapter;
  assert.equal(await adapter.handle(topic,Buffer.from(JSON.stringify({schemaVersion:1,...f.body})),{retain:true,receivedAt:new Date(base)}),'accepted');assert.equal(calls,1);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);
});
for(const operation of ['observeTelemetry','correlate'])test('instrumentation failure cannot turn accepted ingestion into an error: '+operation,async()=>{
  const f=fixture();let calls=0;
  const store={observeTelemetry:()=>operation==='observeTelemetry'?(()=>{throw Error('evidence');})():'receipt',correlate:()=>{throw Error('evidence');}};
  const adapter=loader({'../config/env':{env:{mqttTopicPrefix:'smart-agriculture/v1',mqttMaxPayloadBytes:4096,mqttSideEffectMaxAgeSeconds:60}},
    '../services/live-provenance/evidence-store':{liveEvidenceStore:store},'../services/telemetry-ingestion.service':{telemetryIngestionService:{ingest:async()=>{calls++;return{correlation:f.rows()};}}}})('mqtt/mqtt-telemetry.adapter.ts').mqttTelemetryAdapter;
  assert.equal(await adapter.handle(topic,Buffer.from(JSON.stringify({schemaVersion:1,...f.body})),f.context),'accepted');assert.equal(calls,1);
});
test('failed ingestion never produces correlated evidence',async()=>{
  const f=fixture();const adapter=loader({'../config/env':{env:{mqttTopicPrefix:'smart-agriculture/v1',mqttMaxPayloadBytes:4096,mqttSideEffectMaxAgeSeconds:60}},
    '../services/live-provenance/evidence-store':{liveEvidenceStore:f.store},'../services/telemetry-ingestion.service':{telemetryIngestionService:{ingest:async()=>{throw Error('failed ingest');}}}})('mqtt/mqtt-telemetry.adapter.ts').mqttTelemetryAdapter;
  assert.equal(await adapter.handle(topic,Buffer.from(JSON.stringify({schemaVersion:1,...f.body})),f.context),'ignored');assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);
});
test('duplicate DB insert result cannot borrow historical readingId',async()=>{
  const f=fixture();const id=f.observe();f.store.correlate(id,[]);assert.equal(f.store.latest(f.body.deviceCode,'SOIL_01'),null);
});
for(const mode of ['committed','zero rows','failed commit','reconnect during commit'])test('OFF instrumentation follows actual adapter commit boundary: '+mode,async()=>{
  const f=fixture(),observer={generation:1,ready:true,sessionStartedAt:f.context.observerSessionStartedAt,confirmOff(){}};
  const z=require('zod').z;
  const adapter=loader({
    '../config/env':{env:{mqttEnabled:true,mqttCommandsEnabled:false,mqttCommandDeviceCode:'ESP32-GF-A-01',mqttCommandActuatorCode:'PUMP_01',mqttTopicPrefix:'smart-agriculture/v1'}},
    '../config/database':{prisma:{actuator:{updateMany:async()=>{if(mode==='failed commit')throw Error('DB failure');if(mode==='reconnect during commit'){observer.generation=2;f.store.reset(2,new Date(base));}return{count:mode==='zero rows'?0:1};}}}},
    '../gateways/mqtt-device.gateway':{pumpStateSchema:z.object({schemaVersion:z.literal(1),deviceCode:z.string(),actuatorCode:z.string(),state:z.literal('OFF'),reason:z.string(),recordedAt:z.string().datetime()}).strict()},
    '../gateways/mqtt-gateway.runtime':{mqttDeviceGateway:{cancelActuator:async()=>assert.fail('disabled commands must not call gateway')}},
    './mqtt-state-observer':{mqttStateObserver:observer},'../services/live-provenance/evidence-store':{liveEvidenceStore:f.store},
  })('mqtt/mqtt-pump-state.adapter.ts');
  const run=()=>adapter.handlePumpState(topic.replace('telemetry','actuator/state'),Buffer.from(JSON.stringify({schemaVersion:1,...f.off})),f.context);
  if(mode==='failed commit')await assert.rejects(run);else await run();
  assert.equal(!!f.store.off(f.body.deviceCode,'PUMP_01'),mode==='committed');
});
test('ingestion adds exact RETURNING correlation without changing write/presence/evaluator order',async()=>{
  const at=new Date(base),receivedAt=new Date(base+20),events=[],created=[{id:'new-row',sensorId:'sensor',value:0,recordedAt:at,receivedAt}];
  const service=loader({
    '../constants/sensor-metadata':{SENSOR_TYPE_METADATA:{SOIL_MOISTURE:{min:0,max:100,unit:'%'}}},
    '../repositories/device.repository':{deviceRepository:{findTelemetryContextByCode:async()=>({status:'ACTIVE',sensors:[{id:'sensor',sensorCode:'SOIL_01',type:'SOIL_MOISTURE',status:'ACTIVE'}]})}},
    '../repositories/sensor-reading.repository':{sensorReadingRepository:{createMany:async data=>{events.push('write');assert.equal(data[0].value,0);return created;}}},
    './device-presence.service':{devicePresenceService:{markOnline:async()=>events.push('presence')}},
    './alert-evaluation.service':{alertEvaluationService:{evaluate:async rows=>{assert.equal(rows,created);events.push('alerts');}}},
    './automation-evaluation.service':{automationEvaluationService:{evaluate:async rows=>{assert.equal(rows,created);events.push('evaluator');}}},
  })('services/telemetry-ingestion.service.ts').telemetryIngestionService;
  const result=await service.ingest({deviceCode:'ESP32-GF-A-01',recordedAt:at,source:'MQTT',readings:[{sensorCode:'SOIL_01',value:0}],presenceSeenAt:at});
  assert.deepEqual(events,['write','presence','alerts','evaluator']);assert.equal(result.created,1);assert.equal(result.correlation[0].id,'new-row');assert.equal(result.correlation[0].dbReceivedAt,receivedAt.toISOString());
});
test('new modules contain no publish/command/evaluator/persistence mutation paths',()=>{
  for(const file of fs.readdirSync(path.join(root,'services/live-provenance'))){const s=fs.readFileSync(path.join(root,'services/live-provenance',file),'utf8');assert.doesNotMatch(s,/config\/database|DeviceCommand|mqttDeviceGateway|\.publish\(|automation-evaluation|prisma\.[\s\S]*?\.(?:create|update)\(/);}
  const runner=fs.readFileSync(path.join(root,'services/live-provenance/windows-time.ts'),'utf8');assert.doesNotMatch(runner,/\/resync|Set-ItemProperty|\/config|registry|exec\(/i);
});

test('scoped HTTP GET rejects trust injection; unauthorized/outsider/mutations cannot evaluate live',async()=>{
  const express=require('express'),users={owner:{id:'owner',role:'FARM_OWNER',status:'ACTIVE'},outsider:{id:'outsider',role:'FARM_OWNER',status:'ACTIVE'}};
  let reads=0;const f=fixture();f.correlate();f.recordOff();
  const routeLoad=loader({
    '../utils/jwt':{verifyAccessToken:t=>{if(!users[t])throw Error('bad token');return{userId:t};}},
    '../repositories/user.repository':{userRepository:{findPublicById:async id=>users[id]}},
    '../repositories/device.repository':{deviceRepository:{findAccessibleById:async(id,u)=>id==='device'&&u.id==='owner'?{id,deviceCode:'ESP32-GF-A-01'}:null}},
    '../config/env':{env:{mqttCommandsEnabled:false,mqttAutomationCommandsEnabled:false,mqttPumpTestMode:true}},
    '../services/live-provenance/evidence-store':{liveEvidenceStore:f.store},
    '../services/live-provenance/windows-time':{liveClockHealth:{refresh:async()=>{},snapshot:()=>assessWindowsTime(timeInput(),new Date().toISOString())}},
    '../config/database':{prisma:{$transaction:async work=>work({$executeRaw:async text=>{assert.equal(text.join(''),'SET TRANSACTION READ ONLY');},device:{findUnique:async()=>{reads++;return{connectionStatus:'ONLINE',lastSeenAt:new Date()};}},actuator:{findFirst:async()=>null},sensorReading:{findFirst:async()=>null}})}},
  });
  const app=express();app.use('/api/live-evidence',routeLoad('routes/live-evidence.route.ts').liveEvidenceRouter);app.use((e,q,s,n)=>s.status(e.statusCode||401).json({message:e.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/live-evidence?deviceId=device`;
  try{
    assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer outsider'}})).status,404);
    for(const key of ['trusted','verified','authenticated','source','cycle','snapshot','budget'])assert.equal((await fetch(url+`&${key}=true`,{headers:{Authorization:'Bearer owner'}})).status,400);
    const ok=await fetch(url,{headers:{Authorization:'Bearer owner'}});assert.equal(ok.status,200);assert.equal((await ok.json()).data.verifiedLiveReady,false);assert.equal(reads,1);
    assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer owner'}})).status,404);
  }finally{await new Promise(r=>server.close(r));}
});
