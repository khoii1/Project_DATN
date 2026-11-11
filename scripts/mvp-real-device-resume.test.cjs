const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PIN,SENSORS,registrationMode,assertDevUrl,validateMapping,resumeExistingDevice}=require('./mvp-real-device-resume.cjs');
const url='postgresql://sa_mvp_dev_app:SYNTHETIC_ONLY@127.0.0.1:55433/smart_agriculture_mvp_dev?schema=public';
const fixture=()=>({farm:{id:PIN.farmId,ownerId:PIN.ownerId,status:'ACTIVE'},zone:{id:PIN.zoneId,farmId:PIN.farmId,status:'ACTIVE'},devices:[{id:PIN.deviceId,deviceCode:PIN.deviceCode,zoneId:PIN.zoneId,status:'ACTIVE',type:'CONTROLLER',hardwareModel:'ESP32 DevKit V1',connectionStatus:'OFFLINE'}],sensors:SENSORS.map(([id,sensorCode,type])=>({id,sensorCode,type,status:'ACTIVE',deviceId:PIN.deviceId})),actuators:[{id:PIN.actuatorId,deviceId:PIN.deviceId,actuatorCode:'PUMP_01',type:'PUMP',hardwareChannel:'GPIO26',status:'ACTIVE',currentState:'UNKNOWN'}]});
test('exact eight records hydrate registration without mutating historical presence/state',()=>{
 const f=fixture(),before=structuredClone(f),r=validateMapping(f);assert.equal(r.sensors.length,4);assert.equal(r.deviceId,PIN.deviceId);assert.deepEqual(f,before);
});
const mutations={
 missingFarm:s=>s.farm=null,wrongFarm:s=>s.farm.id='other',wrongOwner:s=>s.farm.ownerId='other',inactiveFarm:s=>s.farm.status='INACTIVE',
 missingZone:s=>s.zone=null,wrongZone:s=>s.zone.id='other',wrongFarmRelation:s=>s.zone.farmId='other',inactiveZone:s=>s.zone.status='INACTIVE',
 missingDevice:s=>s.devices=[],extraDevice:s=>s.devices.push({...s.devices[0]}),wrongDeviceId:s=>s.devices[0].id='other',wrongCode:s=>s.devices[0].deviceCode='other',wrongZoneRelation:s=>s.devices[0].zoneId='other',wrongBoard:s=>s.devices[0].hardwareModel='other',wrongDeviceType:s=>s.devices[0].type='GATEWAY',inactiveDevice:s=>s.devices[0].status='MAINTENANCE',
 missingSensor:s=>s.sensors.pop(),extraSensor:s=>s.sensors.push({...s.sensors[0]}),duplicateSensor:s=>s.sensors[1]={...s.sensors[0]},wrongSensorId:s=>s.sensors[0].id='other',wrongSensorType:s=>s.sensors[0].type='LIGHT',wrongSensorCode:s=>s.sensors[0].sensorCode='other',wrongSensorDevice:s=>s.sensors[0].deviceId='other',inactiveSensor:s=>s.sensors[0].status='INACTIVE',
 missingPump:s=>s.actuators=[],extraPump:s=>s.actuators.push({...s.actuators[0]}),wrongPumpId:s=>s.actuators[0].id='other',wrongPumpCode:s=>s.actuators[0].actuatorCode='other',wrongPumpDevice:s=>s.actuators[0].deviceId='other',wrongPumpType:s=>s.actuators[0].type='VALVE',wrongGPIO:s=>s.actuators[0].hardwareChannel='GPIO27',inactivePump:s=>s.actuators[0].status='INACTIVE'
};
for(const [name,change] of Object.entries(mutations))test('resume refuses '+name,()=>{const f=fixture();change(f);assert.throws(()=>validateMapping(f));});
test('registration modes explicit; no silent default or unknown mode',()=>{for(const m of ['REGISTER_NEW','RESUME_EXISTING_DEVICE'])assert.equal(registrationMode(m),m);for(const m of [null,undefined,'resume','ACTIVE',''])assert.throws(()=>registrationMode(m));});
for(const [name,bad] of Object.entries({productionPort:url.replace(':55433',':5432'),productionDatabase:url.replace('_mvp_dev',''),wrongRole:url.replace('sa_mvp_dev_app','postgres'),wrongHost:url.replace('127.0.0.1','localhost'),wrongSchema:url.replace('schema=public','schema=other'),extraOptions:url+'&host=127.0.0.1:5432',missing:undefined}))test('no fallback: '+name,async()=>{let accessed=false;await assert.rejects(resumeExistingDevice({$transaction(){accessed=true;}},bad));assert.equal(accessed,false);});
function fake(f=fixture(),identity={db:PIN.database,role:PIN.role,port:PIN.port}){
 const calls=[];let mutated=0;const fail=()=>{mutated++;throw Error('WRITE_FORBIDDEN');};
 const tx={$executeRawUnsafe:async q=>{assert.equal(q,'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');calls.push('readonly');},$queryRawUnsafe:async()=>[identity]};
 for(const [model,key,method] of [['farm','farm','findUnique'],['zone','zone','findUnique'],['device','devices','findMany'],['sensor','sensors','findMany'],['actuator','actuators','findMany']])tx[model]={[method]:async args=>{calls.push({model,args});return f[key];},create:fail,upsert:fail,update:fail,delete:fail};
 return{calls,writes:()=>mutated,db:{$transaction:async(fn,opts)=>{assert.deepEqual(opts,{maxWait:5000,timeout:10000});return fn(tx);}}};
}
test('resume query path uses bounded repeatable-read READ ONLY, selects exact records and never writes',async()=>{const f=fake();const r=await resumeExistingDevice(f.db,url);assert.equal(r.deviceId,PIN.deviceId);assert.equal(f.calls[0],'readonly');assert.deepEqual(f.calls.find(x=>x.model==='sensor').args.where.OR[1].id.in,SENSORS.map(s=>s[0]));assert.equal(f.writes(),0);});
test('SQL identity mismatch stops before record reads and no registration fallback',async()=>{const f=fake(fixture(),{db:'smart_agriculture',role:'postgres',port:5432});await assert.rejects(resumeExistingDevice(f.db,url),/RESUME_SQL_IDENTITY/);assert.equal(f.calls.length,1);assert.equal(f.writes(),0);});
test('mapping mismatch stops with zero writes, no repair/recreate',async()=>{const s=fixture();s.actuators[0].hardwareChannel='RELAY_1';const f=fake(s);await assert.rejects(resumeExistingDevice(f.db,url),/RESUME_ACTUATOR_MAPPING/);assert.equal(f.writes(),0);});
test('runner integration keeps explicit resume branch, versioned plans, fresh approval and existing safety barriers',()=>{
 const s=fs.readFileSync(path.join(__dirname,'mvp-real-esp32-session.cjs'),'utf8');
 const branch=s.slice(s.indexOf("if(plan.registrationMode==='RESUME_EXISTING_DEVICE')"),s.indexOf("stage='BACKEND_MQTT'"));
 assert.match(branch,/resumeExistingDevice\(db,appUrl\)/);const resume=branch.split('}else{')[0];assert.doesNotMatch(resume,/\.create\(|\.update\(|\.upsert\(|\.delete\(/);
 assert.match(branch,/EXISTING_DEVICE_REQUIRES_REVIEW/);assert.match(s,/NEW_VERSIONED_PLAN_REQUIRED/);assert.match(s,/REGISTRATION_MODE_MISMATCH/);assert.match(s,/RETIRED_APPROVAL_REFUSED/);
 for(const key of ["MQTT_COMMANDS_ENABLED:'false'","MQTT_AUTOMATION_COMMANDS_ENABLED:'false'","MQTT_PUMP_TEST_MODE:'true'","MQTT_PUMP_MAX_RUN_SECONDS:'1'","PORT:'55001'","http:\/\/127.0.0.1:55173"])assert.ok(s.includes(key));
 assert.match(s,/assertDevUrl\(appUrl\)/);assert.match(s,/assert\.equal\(summary.before.pending,0\)/);
 assertDevUrl(url);
});
