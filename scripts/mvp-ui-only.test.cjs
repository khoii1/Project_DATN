const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const {readonlyPrisma,memoryAudit,buckets}=require('./mvp-ui-only-readonly.cjs');
const {SENSOR_IDS,READING_IDS,NOTICE,verifyReadings}=require('./mvp-ui-only-historical.cjs');
const {assertConfig,routeAllowed,createDatasource,startUIOnly,installBoundary,preflightPolicy,uiOnlyHttpBoundary}=require('./mvp-ui-only-api.cjs');
const times=['2026-11-02T12:11:18.853Z','2026-11-02T12:11:33.853Z','2026-11-02T12:11:48.853Z'];
// Explicit synthetic fixture for offline mapping tests; never inserted anywhere.
const rows=READING_IDS.map((id,i)=>({id,sensorId:SENSOR_IDS[i%4],source:'MQTT',recordedAt:new Date(times[Math.floor(i/4)]),value:i%4===3?100:20+i}));
function fake(){let connections=0,reads=0,writes=0,disconnects=0,userRecord;const selected=[],overrides=new Map();const raw={$disconnect:async()=>{disconnects++;},$transaction:async fn=>{
 const connection=++connections;let ro=false;const tx={$executeRawUnsafe:async sql=>{if(sql==='SET TRANSACTION READ ONLY'){ro=true;return;}assert.ok(ro);assert.match(sql,/SET LOCAL statement_timeout/);},$queryRaw:async()=>{assert.ok(ro);return[1];},$queryRawUnsafe:async()=>{assert.ok(ro);return[{db:'smart_agriculture_mvp_dev',role:'sa_mvp_dev_app',port:55433,schema:'public',readonly:'on',pid:connection}];}};
 for(const name of ['sensorReading','deviceCommand','device','actuator','farm','zone','sensor','automationRule','activityLog','user','alert','crop'])tx[name]={findMany:async args=>{assert.ok(ro);reads++;selected.push({connection,model:name,args});return overrides.has(name+'.findMany')?overrides.get(name+'.findMany')(args):name==='sensorReading'?rows:[];},count:async args=>{assert.ok(ro);reads++;return overrides.has(name+'.count')?overrides.get(name+'.count')(args):0;},findUnique:async args=>{assert.ok(ro);reads++;return overrides.get(name+'.findUnique')?.(args)??null;},findFirst:async args=>{assert.ok(ro);reads++;return overrides.get(name+'.findFirst')?.(args)??null;},create:()=>{writes++;throw Error('FAKE_SQL_WRITE');}};
 tx.user.findUnique=async args=>{assert.ok(ro);return userRecord&&(args.where.email===userRecord.email||args.where.id===userRecord.id)?userRecord:null;};
 return fn(tx);
 }};for(const name of ['sensorReading','deviceCommand','device','actuator','farm','zone','sensor','automationRule','activityLog','user','alert','crop'])raw[name]={};return{raw,selected,setUser:r=>{userRecord=r;},setRead:(model,method,fn)=>overrides.set(model+'.'+method,fn),stats:()=>({connections,reads,writes,disconnects})};}
const env=()=>({DATABASE_URL:'postgresql://sa_mvp_dev_app:SYNTHETIC@127.0.0.1:55433/smart_agriculture_mvp_dev?schema=public',JWT_SECRET:'SYNTHETIC_ONLY_'.repeat(5),NODE_ENV:'development',PORT:'55001',CLIENT_URL:'http://127.0.0.1:55173',MQTT_ENABLED:'false',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1'});
const proof=()=>({scope:'ONE_DEV_UI_ONLY_HISTORICAL_SESSION',approvalVerified:true,sourcePinsVerified:true,checkedAt:new Date().toISOString(),systemId:'7698826681383327460',pgdata:'C:\\DATN\\test-instances\\phase13-3b\\data'});
test('every separate pool operation and array/callback path establishes READ ONLY before query',async()=>{
 const f=fake(),p=readonlyPrisma(f.raw);await Promise.all([p.sensorReading.findMany(),p.device.count(),p.$transaction([p.sensorReading.findMany(),p.device.count()]),p.$transaction(async tx=>tx.sensorReading.findMany())]);assert.equal(f.stats().connections,4);assert.equal(f.stats().writes,0);assert.ok(f.selected.every(x=>x.args.where.AND[1].id.in.length>0));
});
test('all mutation methods/models, raw SQL/extension/client escapes fail closed before DB operation',()=>{
 const f=fake(),p=readonlyPrisma(f.raw);for(const name of ['sensorReading','farm','zone','device','deviceCommand','actuator','automationRule','activityLog'])for(const op of ['create','createMany','update','updateMany','delete','deleteMany','upsert'])assert.throws(()=>p[name][op]({}),/REFUSED/);
 for(const k of ['$executeRaw','$executeRawUnsafe','$queryRawUnsafe','$extends','$connect'])assert.throws(()=>p[k],/REFUSED/);assert.equal(f.stats().connections,0);assert.equal(f.stats().writes,0);
});
test('only fixed health raw SELECT1 accepted; arbitrary SQL/tag object refused',async()=>{const p=readonlyPrisma(fake().raw);assert.deepEqual(await p.$queryRaw`SELECT 1`,[1]);assert.throws(()=>p.$queryRaw`SELECT set_config('transaction_read_only','off',true)`,/REFUSED/);assert.throws(()=>p.$queryRaw({sql:'SELECT 1'}),/REFUSED/);});
test('chart aggregation reads scoped real-shaped historical rows without raw SQL writes',async()=>{const f=fake(),p=readonlyPrisma(f.raw),points=await buckets(p,SENSOR_IDS[0],new Date(times[0]),new Date(times[2]),300);assert.ok(points.length);assert.equal(points.reduce((n,x)=>n+Number(x.count),0),12);assert.equal(f.stats().writes,0);});
test('12 row IDs retain exact sensor/time mapping and reject substituted timestamp/source/duplicates',()=>{assert.equal(verifyReadings(rows),true);for(const bad of [[...rows,rows[0]],rows.map((r,i)=>i? r:{...r,source:'SIMULATOR'}),rows.map((r,i)=>i?r:{...r,recordedAt:new Date()})])assert.throws(()=>verifyReadings(bad),/MAPPING_REFUSED/);});
test('audit adapter stores counts only, does not persist event body or bypass authentication source',async()=>{const a=memoryAudit();await a.recordActivity({password:'SYNTHETIC_SECRET'});assert.deepEqual(a.snapshot(),{policy:'DEV_MEMORY_ONLY_NO_AUDIT_PERSISTENCE',events:1});assert.ok(!JSON.stringify(a.snapshot()).includes('SECRET'));const s=fs.readFileSync('backend/src/services/auth.service.ts','utf8');assert.match(s,/comparePassword\(password, user.passwordHash\)/);});
test('configuration refuses production, commands, automation, broker credentials and stale proof',()=>{const e=env();assertConfig(e,proof());for(const patch of [{DATABASE_URL:e.DATABASE_URL.replace('55433','5432')},{MQTT_ENABLED:'true'},{MQTT_COMMANDS_ENABLED:'true'},{MQTT_AUTOMATION_COMMANDS_ENABLED:'true'},{MQTT_PASSWORD:'SYNTHETIC'}])assert.throws(()=>assertConfig({...e,...patch},proof()));assert.throws(()=>assertConfig(e,{...proof(),checkedAt:'2020-01-01T00:00:00Z'}));});
test('UI HTTP surface allows auth/read paths but denies commands, CRUD and engine endpoints',()=>{assert.ok(routeAllowed('GET','/api/sensors/id/readings'));assert.ok(routeAllowed('POST','/api/auth/login'));for(const [m,p]of [['POST','/api/actuators/id/commands'],['PATCH','/api/devices/id'],['GET','/api/live-evidence'],['GET','/api/shadow-preview']])assert.equal(routeAllowed(m,p),false);});
test('mock startup validates rows/DB, reports safe policy, closes owned server/pool once',async()=>{
 const f=fake(),e=env(),p=proof();let constructedUrl,listen=0,closed=0;function PrismaClient(options){constructedUrl=options.datasourceUrl;return f.raw;}
 const raw=createDatasource({env:e,proof:p,PrismaClient});const lifecycle=await startUIOnly({env:e,proof:p,raw,repositoryRead:p=>p.$transaction([p.sensorReading.findMany(),p.sensorReading.count()]),loadApp:({prisma})=>{assert.throws(()=>prisma.device.update({}),/REFUSED/);return{};},listen:()=>{listen++;return{close:cb=>{closed++;cb();}};}});assert.equal(constructedUrl,e.DATABASE_URL);assert.equal(listen,1);assert.equal(lifecycle.policy.commands,false);await lifecycle.close();await lifecycle.close();assert.equal(closed,1);assert.equal(f.stats().disconnects,1);
});
test('actual Express import/authentication uses shim DB and memory audit; no MQTT/recovery/startup',async()=>{
 const f=fake(),audit=memoryAudit(),db=readonlyPrisma(f.raw);
 const bcrypt=require(path.resolve('backend/node_modules/bcryptjs'));f.setUser({id:'mvp-owner-a',fullName:'Synthetic Owner',email:'owner-a@mvp.invalid',status:'ACTIVE',role:'FARM_OWNER',passwordHash:await bcrypt.hash('SYNTHETIC_LOGIN_ONLY',4)});
 require(path.resolve('backend/node_modules/tsx/dist/cjs/index.cjs'));
 const old={...process.env};Object.assign(process.env,env(),{JWT_SECRET:'SYNTHETIC_ONLY_'.repeat(5)});
 const restore=installBoundary(db,audit);
 try{
  const app=require(path.resolve('backend/src/app.ts')).app;assert.equal(typeof app,'function');assert.equal(f.stats().connections,0,'import must not query DB');
  assert.throws(()=>require(path.resolve('backend/src/server.ts')),/SIDE_EFFECT_REFUSED/);
  assert.throws(()=>require(path.resolve('backend/src/mqtt/mqtt-client.service.ts')).mqttClientService.start(),/SIDE_EFFECT_REFUSED/);
  assert.throws(()=>require(path.resolve('backend/src/mqtt/mqtt-pump-state.adapter.ts')).recoverMqttCommands(),/SIDE_EFFECT_REFUSED/);
  assert.throws(()=>require('mqtt').connect(),/SIDE_EFFECT_REFUSED/);
  const auth=require(path.resolve('backend/src/services/auth.service.ts')).authService;
  await assert.rejects(auth.login('owner-a@mvp.invalid','WRONG_SYNTHETIC'));
  const result=await auth.login('owner-a@mvp.invalid','SYNTHETIC_LOGIN_ONLY');assert.equal(result.user.id,'mvp-owner-a');assert.equal(typeof result.accessToken,'string');assert.equal(audit.snapshot().events,1);assert.equal(f.stats().writes,0);
  // Ephemeral synthetic loopback server only; guard prohibits real DEV ports.
  // Exercise the actual shell and actual Express CORS/auth with fake datasource.
  const shell=require(path.resolve('backend/node_modules/express'))();shell.use(uiOnlyHttpBoundary);shell.use(app);
  const server=await new Promise((resolve,reject)=>{const s=shell.listen(0,'127.0.0.1',()=>resolve(s));s.once('error',reject);});
  try{
   const origin='http://127.0.0.1:55173',base='http://127.0.0.1:'+server.address().port;
   const before=f.stats(),events=audit.snapshot().events;
   const pre=await fetch(base+'/api/auth/login',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
   assert.equal(pre.status,204);assert.equal(await pre.text(),'');assert.equal(pre.headers.get('access-control-allow-origin'),origin);assert.equal(pre.headers.get('access-control-allow-methods'),'POST');assert.equal(pre.headers.get('access-control-allow-headers'),'Content-Type');assert.equal(pre.headers.get('access-control-allow-credentials'),null);assert.equal(pre.headers.get('access-control-max-age'),null);
   assert.deepEqual(f.stats(),before);assert.equal(audit.snapshot().events,events,'preflight cannot call authentication');
   const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'owner-a@mvp.invalid',password:'SYNTHETIC_LOGIN_ONLY'})});
   assert.equal(login.status,200);assert.equal(login.headers.get('access-control-allow-origin'),origin);assert.match(login.headers.get('vary'),/Origin/);const payload=await login.json();assert.equal(payload.success,true);assert.equal(payload.data.user.id,'mvp-owner-a');assert.equal(typeof payload.data.accessToken,'string');assert.equal(audit.snapshot().events,events+1);assert.equal(f.stats().writes,0);
   const mePre=await fetch(base+'/api/auth/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});assert.equal(mePre.status,204);
   const me=await fetch(base+'/api/auth/me',{headers:{Origin:origin,Authorization:'Bearer '+payload.data.accessToken}});assert.equal(me.status,200);assert.equal((await me.json()).data.user.id,'mvp-owner-a');assert.equal(me.headers.get('access-control-allow-origin'),origin);
   // AR: actual frontend service modules -> synthetic browser-equivalent HTTP
   // -> actual shell/router/controller/service -> guarded fake datasource.
   const {PIN,SENSORS}=require('./mvp-real-device-resume.cjs'),{VALUES,RECEIVED}=require('./mvp-ui-only-supervisor.cjs');
   const historicalRows=READING_IDS.map((id,i)=>({id,sensorId:SENSOR_IDS[i%4],value:VALUES[i],source:'MQTT',recordedAt:new Date(times[Math.floor(i/4)]),receivedAt:new Date(RECEIVED[Math.floor(i/4)])}));
   const farm={id:PIN.farmId,name:'SYNTHETIC READ-CONTRACT FARM',ownerId:PIN.ownerId,status:'ACTIVE',staffAssignments:[]};
   const zone={id:PIN.zoneId,name:'SYNTHETIC READ-CONTRACT ZONE',farmId:farm.id,status:'ACTIVE',farm,_count:{crops:0}};
   const device={id:PIN.deviceId,deviceCode:PIN.deviceCode,zoneId:zone.id,status:'ACTIVE',connectionStatus:'ONLINE',zone};
   const sensorRows=SENSORS.map(([id,sensorCode,type],i)=>({id,sensorCode,type,deviceId:device.id,status:'ACTIVE',name:'SYNTHETIC '+sensorCode,device,readings:[historicalRows[8+i]]}));
   const pump={id:PIN.actuatorId,deviceId:device.id,actuatorCode:'PUMP_01',type:'PUMP',hardwareChannel:'GPIO26',name:'SYNTHETIC READ-CONTRACT PUMP',status:'ACTIVE',currentState:'OFF',lastStateChangedAt:new Date(times[2]),device};
   f.setRead('farm','findUnique',a=>a.where.id===farm.id?farm:null);f.setRead('zone','findUnique',a=>a.where.id===zone.id?zone:null);
   f.setRead('farm','findMany',()=>[farm]);f.setRead('farm','count',()=>1);f.setRead('zone','findMany',()=>[zone]);f.setRead('zone','count',()=>1);
   f.setRead('sensor','findMany',()=>sensorRows);f.setRead('sensor','count',()=>4);f.setRead('actuator','findMany',()=>[pump]);f.setRead('actuator','count',()=>1);
   f.setRead('device','count',a=>/MAINTENANCE|INACTIVE|OFFLINE|UNKNOWN/.test(JSON.stringify(a.where))?0:1);f.setRead('sensorReading','count',()=>12);
   const beforeRows=JSON.stringify(historicalRows),requests=[];
   const zoneBefore=f.stats(),zoneAuditBefore=audit.snapshot().events;const zonePre=await fetch(base+'/api/zones/'+zone.id+'/latest-readings',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization, content-type'}});assert.equal(zonePre.status,204);assert.equal(await zonePre.text(),'');assert.deepEqual(f.stats(),zoneBefore);assert.equal(audit.snapshot().events,zoneAuditBefore);
   const browserApi={get:async(url,options={})=>{
    const target=new URL(base+'/api'+url);for(const [k,v]of Object.entries(options.params||{}))target.searchParams.set(k,String(v));
    const stats=f.stats(),auditBefore=audit.snapshot().events;
    const p=await fetch(target,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization, content-type'}});assert.equal(p.status,204,'preflight '+url);assert.equal(p.headers.get('access-control-allow-origin'),origin);assert.equal(await p.text(),'');assert.equal(f.stats().writes,stats.writes);assert.equal(audit.snapshot().events,auditBefore);
    const response=await fetch(target,{headers:{Origin:origin,Authorization:'Bearer '+payload.data.accessToken,'Content-Type':'application/json'},signal:options.signal});requests.push({path:target.pathname,status:response.status});
    const data=await response.json();if(!response.ok)throw Object.assign(Error('SYNTHETIC_HTTP_READ_FAILED'),{status:response.status});return{data};
   },post:()=>{throw Error('MUTATION_NOT_PART_OF_DASHBOARD_READ_TEST');}};
   const ts=require(path.resolve('frontend/node_modules/typescript'));
   const loadService=name=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('frontend/src/services/'+name+'.service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(n==='./api')return{api:browserApi};if(n==='../utils/irrigation-control')return{manualCommandBody:browserApi.post};throw Error('UNREVIEWED_SYNTHETIC_SERVICE_DEPENDENCY');}});return exports;};
   const services=Object.assign({},...['sensor','alert','actuator','automation','device','farm','zone','health','report','activity-log'].map(loadService));
   const batch=await Promise.all([services.sensorService.zoneLatest(zone.id),services.alertService.list({zoneId:zone.id,active:true,limit:100}),services.actuatorService.list({zoneId:zone.id,type:'PUMP',limit:20}),services.automationService.list({zoneId:zone.id,enabled:true,limit:100})]);
   assert.equal(batch[0].zone.id,zone.id);assert.deepEqual(batch[0].sensors.map(s=>[s.sensorId,s.type,s.value,s.unit]),SENSORS.map(([id,_code,type],i)=>[id,type,VALUES[8+i],['°C','%','lux','%'][i]]));
   assert.ok(batch[0].sensors.every(s=>s.recordedAt===times[2]));assert.ok(Array.isArray(batch[1].items));assert.equal(batch[2].items[0].id,pump.id);assert.equal(batch[2].items[0].currentState,'UNKNOWN');assert.equal(batch[2].items[0].controlEnabled,false);assert.equal(batch[2].items[0].gatewayMode,'DISABLED');assert.deepEqual(batch[3].items,[]);
   const summary=await Promise.all([services.deviceService.summary({}),services.alertService.summary(),services.alertService.list({active:true,limit:5})]);assert.equal(summary[0].total,1);assert.equal(summary[1].active,0);assert.ok(Array.isArray(summary[2].items));
   assert.equal((await services.farmService.list({status:'ACTIVE',limit:100})).items[0].id,farm.id);assert.equal((await services.zoneService.list({farmId:farm.id,status:'ACTIVE',limit:100})).items[0].id,zone.id);
   assert.equal((await services.getApiHealth()).data.database,'connected');assert.equal((await services.reportService.overview({from:times[0],to:times[2]})).farmCount,1);assert.ok(Array.isArray((await services.activityLogService.list({page:1,limit:5})).items));
   assert.ok(requests.every(r=>r.status===200));assert.equal(JSON.stringify(historicalRows),beforeRows);assert.equal(f.stats().writes,0);
   f.setRead('sensor','findMany',()=>sensorRows.map(s=>({...s,readings:[]})));const missing=await services.sensorService.zoneLatest(zone.id);assert.ok(missing.sensors.every(s=>s.value===null&&s.recordedAt===null),'missing readings stay null, never zero');
   f.setRead('sensor','findMany',()=>{throw Error('SYNTHETIC_READ_FAILURE');});await assert.rejects(services.sensorService.zoneLatest(zone.id),e=>e.status===500);
   f.setRead('zone','findUnique',()=>null);await assert.rejects(services.sensorService.zoneLatest(zone.id),e=>e.status===404);
   const unauthorized=await fetch(base+'/api/zones/'+zone.id+'/latest-readings',{headers:{Origin:origin}});assert.equal(unauthorized.status,401);
   const denied=await fetch(base+'/api/actuators/id/commands',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);assert.equal((await denied.json()).message,'UI_ONLY_READ_ONLY');
  }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 }finally{restore();for(const k of Object.keys(process.env))delete process.env[k];Object.assign(process.env,old);}
});

function corsRequest(url='/api/auth/login',requested,headerValue){
 if(arguments.length<2)requested='POST';if(arguments.length<3)headerValue='content-type';
 const headers={origin:'http://127.0.0.1:55173','access-control-request-method':requested};if(headerValue!==undefined)headers['access-control-request-headers']=headerValue;
 return{method:'OPTIONS',url,headers};
}
function boundary(req){const result={status:200,headers:{},forwarded:0,ended:false};const res={vary:value=>{result.headers.Vary=[...new Set([...(result.headers.Vary||[]),value])];},setHeader:(key,value)=>{result.headers[key]=value;},status:code=>{result.status=code;return res;},json:body=>{result.body=body;return res;},end:()=>{result.ended=true;return res;}};uiOnlyHttpBoundary(req,res,()=>result.forwarded++);return result;}
for(const [label,url,method,headers]of [
 ['login','/api/auth/login','POST','content-type'],['logout','/api/auth/logout','POST','Authorization, CONTENT-TYPE'],['me','/api/auth/me','GET','authorization'],['history','/api/sensors/sensor_1/readings?page=1','GET','authorization'],['chart HEAD','/api/sensors/sensor_1/chart','HEAD','authorization'],['no requested headers','/api/health','GET',undefined]
])test('restricted preflight positive: '+label,()=>{const req=corsRequest(url,method,headers),r=boundary(req);assert.equal(r.status,204);assert.equal(r.ended,true);assert.equal(r.body,undefined);assert.equal(r.forwarded,0);assert.equal(r.headers['Access-Control-Allow-Origin'],'http://127.0.0.1:55173');assert.equal(r.headers['Access-Control-Allow-Methods'],method);assert.deepEqual(r.headers.Vary,['Origin','Access-Control-Request-Method','Access-Control-Request-Headers']);assert.ok(!('Access-Control-Allow-Credentials'in r.headers));assert.ok(!('Access-Control-Max-Age'in r.headers));if(headers===undefined)assert.ok(!('Access-Control-Allow-Headers'in r.headers));});
for(const origin of ['http://localhost:55173','http://127.0.0.1:55174','null','','https://127.0.0.1:55173','http://127.0.0.1:55173/','http://127.0.0.1:55173, https://other.invalid',undefined,['http://127.0.0.1:55173','https://other.invalid']])test('reject wrong/missing/ambiguous origin '+JSON.stringify(origin),()=>{const req=corsRequest();req.headers.origin=origin;const r=boundary(req);assert.equal(r.status,403);assert.equal(r.forwarded,0);assert.ok(!r.headers['Access-Control-Allow-Origin']);});
for(const method of ['PUT','PATCH','DELETE','OPTIONS','post','POST, GET','',undefined])test('reject unsupported requested method '+method,()=>{const r=boundary(corsRequest('/api/auth/login',method));assert.equal(r.status,403);assert.equal(r.forwarded,0);});
for(const headers of ['x-unreviewed','content-type, x-unreviewed','authorization,AUTHORIZATION','content-type,','',',authorization','content type','authorization;content-type','authorization\r\nx-bad: value'])test('reject malformed/unsupported/duplicate headers '+JSON.stringify(headers),()=>{const r=boundary(corsRequest('/api/auth/login','POST',headers));assert.equal(r.status,403);assert.equal(r.forwarded,0);});
for(const [method,url]of [['POST','/api/device-commands'],['POST','/api/actuators/id/commands'],['POST','/api/irrigation'],['POST','/api/sensors'],['GET','/api/device-commands'],['HEAD','/api/live-evidence'],['GET','/api/shadow-preview'],['GET','/api/unknown'],['GET','/api/sensors/id/unknown'],['POST','/api/auth/login/'],['POST','/api/auth/LOGIN'],['GET','http://127.0.0.1:55001/api/auth/me'],['GET','//api/auth/me'],['GET','/api//auth/me'],['GET','/api/./auth/me'],['GET','/api/sensors/../auth/me'],['GET','/api/%61uth/me'],['GET','/api/auth%2fme'],['GET','/api/auth\\me'],['GET','/api/auth/me#fragment'],['GET','/api/auth/me\r\n'],['GET','/api/auth/me extra']])test('reject forbidden/unknown/noncanonical preflight '+method+' '+JSON.stringify(url),()=>{const r=boundary(corsRequest(url,method));assert.equal(r.status,403);assert.equal(r.forwarded,0);});
test('raw duplicate Origin/method/header fields rejected even if parsed value hides duplicates',()=>{
 for(const name of ['origin','access-control-request-method','access-control-request-headers']){const req=corsRequest();req.rawHeaders=Object.entries(req.headers).flat();req.rawHeaders.push(name,req.headers[name]);assert.equal(boundary(req).status,403);req.rawHeaders[req.rawHeaders.length-1]='conflicting';assert.equal(boundary(req).status,403);}
 const req=corsRequest();req.headers['access-control-request-headers']=['authorization','content-type'];assert.equal(boundary(req).status,403);
});
test('ordinary OPTIONS and non-OPTIONS cannot use preflight exception',()=>{assert.equal(boundary({method:'OPTIONS',url:'/api/auth/login',headers:{}}).status,403);const req=corsRequest();req.method='POST';assert.equal(preflightPolicy(req),null);assert.equal(boundary(req).forwarded,1);});
test('actual request policy decisions unchanged; actual forbidden routes never forwarded',()=>{
 for(const [method,url]of [['GET','/api/sensors/id/readings'],['HEAD','/api/auth/me'],['POST','/api/auth/login'],['POST','/api/auth/logout']])assert.equal(boundary({method,url}).forwarded,1);
 for(const [method,url]of [['POST','/api/sensors'],['POST','/api/device-commands'],['POST','/api/actuators/id/commands'],['PATCH','/api/devices/id'],['GET','/api/live-evidence']]){const r=boundary({method,url});assert.equal(r.status,403);assert.equal(r.forwarded,0);}
});
test('preflight terminates before any auth/database/MQTT/command/automation dispatch',()=>{
 const forbidden=new Proxy({},{get(){throw Error('SIDE_EFFECT_REACHED');}});
 for(const req of [corsRequest(),corsRequest('/api/device-commands','POST'),corsRequest('/api/unknown','GET')]){const calls={next:0};const res={vary(){},setHeader(){},status(){return this;},json(){return this;},end(){return this;}};uiOnlyHttpBoundary(req,res,()=>{calls.next++;forbidden.database;});assert.equal(calls.next,0);}
});
test('AN manifest revision5 preserves exact revision4 lineage, members and runtime pins',()=>{
 const crypto=require('node:crypto'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 const oldBytes=fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev4.json'),old=JSON.parse(oldBytes),active=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev5.json','utf8'));
 assert.equal(hash(oldBytes),'b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56');assert.equal(old.revision,4);assert.equal(active.revision,5);assert.equal(active.version,old.version);assert.equal(active.purpose,'SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL');
 assert.equal(active.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev4.json');assert.equal(active.previousManifestSha256,hash(oldBytes));assert.deepEqual(Object.keys(active.sourceHashes),Object.keys(old.sourceHashes));assert.equal(Object.keys(active.sourceHashes).length,250);assert.deepEqual(active.runtimeHashes,old.runtimeHashes);
 assert.deepEqual(Object.keys(active.sourceHashes).filter(f=>active.sourceHashes[f]!==old.sourceHashes[f]),['scripts/mvp-ui-only-api.cjs']);assert.deepEqual(Object.keys(active.offlineTestHashes),Object.keys(old.offlineTestHashes));assert.deepEqual(Object.keys(active.offlineTestHashes).filter(f=>active.offlineTestHashes[f]!==old.offlineTestHashes[f]),['scripts/mvp-ui-only.test.cjs']);
 for(const f of ['backend/src/app.ts','backend/src/services/auth.service.ts','frontend/src/services/api.ts','scripts/mvp-ui-only-readonly.cjs','scripts/mvp-ui-only-worker.cjs','scripts/mvp-ui-only-supervisor.cjs'])assert.equal(active.sourceHashes[f],old.sourceHashes[f]);
});
test('AP revision6 preserves revision5, exact members/binaries and only reviewed DEV source changes',()=>{
 const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
 const oldBytes=fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev5.json'),old=JSON.parse(oldBytes),active=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev6.json','utf8'));
 assert.equal(hash(oldBytes),'bb073209114dd4ed5bbf76abd10e1407a9e4f5a27f87e97b07ace63d78d780e5');assert.equal(active.revision,6);assert.equal(active.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev5.json');assert.equal(active.previousManifestSha256,hash(oldBytes));assert.equal(active.version,old.version);assert.equal(active.purpose,old.purpose);assert.deepEqual(active.runtimeHashes,old.runtimeHashes);assert.deepEqual(Object.keys(active.sourceHashes),Object.keys(old.sourceHashes));
 assert.deepEqual(Object.keys(active.sourceHashes).filter(f=>active.sourceHashes[f]!==old.sourceHashes[f]).sort(),['api.cjs','historical.cjs','runtime.cjs','session.ps1','supervisor.cjs','worker.cjs'].map(n=>'scripts/mvp-ui-only-'+n).sort());
 for(const f of ['backend/src/app.ts','backend/src/services/auth.service.ts','backend/src/constants/sensor-metadata.ts','frontend/src/types/sensor.ts','scripts/mvp-ui-only-readonly.cjs'])assert.equal(hash(fs.readFileSync(f)),old.sourceHashes[f]);
 for(const h of Object.values(active.offlineTestHashes))assert.match(h,/^[a-f0-9]{64}$/);
});

for(const method of ['GET','HEAD'])test('AR zone latest-readings preflight permits only existing read method '+method,()=>{const req=corsRequest('/api/zones/cmvtxbkd20003um8kdf93cfx4/latest-readings',method,'Authorization, Content-Type'),r=boundary(req);assert.equal(routeAllowed(method,req.url),true);assert.equal(r.status,204);assert.equal(r.forwarded,0);assert.equal(r.headers['Access-Control-Allow-Origin'],'http://127.0.0.1:55173');assert.equal(r.headers['Access-Control-Allow-Methods'],method);assert.equal(r.headers['Access-Control-Allow-Headers'],'Authorization, Content-Type');});
for(const url of ['/api/health','/api/reports/overview?from=2026-11-02','/api/activity-logs?page=1','/api/devices/summary','/api/alerts/summary','/api/alerts?active=true','/api/farms?limit=100','/api/zones?farmId=fixture','/api/actuators?zoneId=fixture&type=PUMP','/api/automation-rules?enabled=true'])test('AR reviewed Dashboard read catalogue '+url,()=>{const r=boundary(corsRequest(url,'GET','authorization, content-type'));assert.equal(r.status,204);assert.equal(r.forwarded,0);});
for(const [method,url,origin,headers]of [
 ['GET','/api/zones/id/unknown'],['GET','/api/zones/id/latest-readings/unknown'],['GET','/api/zones/id/latest-readings/'],['GET','/api/zones/id/latest-readings','http://localhost:55173'],['GET','/api/zones/id/latest-readings',undefined,'x-unreviewed'],['POST','/api/zones/id/latest-readings'],['PATCH','/api/zones/id/latest-readings'],['POST','/api/actuators/id/commands'],['GET','/api/device-commands'],['GET','/api/live-evidence'],['GET','/api/shadow-preview'],['GET','/api/zones/id/../latest-readings'],['GET','/api/zones/%69d/latest-readings'],['GET','/api/zones/id%2Flatest-readings'],['GET','/api/dashboard/new-endpoint']
])test('AR zone/dashboard bypass or unsupported contract denied '+method+' '+url+' '+(origin||headers||''),()=>{const req=corsRequest(url,method,headers||'authorization');if(origin)req.headers.origin=origin;assert.equal(boundary(req).status,403);assert.equal(boundary(req).forwarded,0);});
test('AR route discovery comes from real frontend/backend source; shared Promise.all still propagates read failure',async()=>{
 const frontend=fs.readFileSync('frontend/src/services/sensor.service.ts','utf8'),backend=fs.readFileSync('backend/src/routes/zone.route.ts','utf8'),client=fs.readFileSync('frontend/src/services/api.ts','utf8');
 assert.ok(frontend.includes('`/zones/${zoneId}/latest-readings`'));assert.ok(backend.includes('zoneRouter.get("/:zoneId/latest-readings"'));assert.match(backend,/zoneRouter.use\(authenticate\)/);assert.match(client,/config.headers.Authorization = `Bearer/);assert.match(client,/Content-Type/);
 const source=fs.readFileSync('frontend/src/pages/dashboard/DashboardPage.tsx','utf8'),body=source.match(/const fetchMonitoring = useCallback\(async \(signal: AbortSignal\) => \{([\s\S]*?)\}, \[monitoredZoneId\]\);/)[1];
 const callback=vm.runInNewContext('(async function(signal){'+body+'})',{commandGeneration:{current:0},monitoredZoneId:'SYNTHETIC_ZONE',sensorService:{zoneLatest:async()=>{throw Error('SYNTHETIC_CORS_OR_HTTP_READ_FAILURE');}},alertService:{list:async()=>({items:[]})},actuatorService:{list:async()=>({items:[]})},automationService:{list:async()=>({items:[]})}});
 await assert.rejects(callback(new AbortController().signal),/SYNTHETIC_CORS_OR_HTTP_READ_FAILURE/);assert.match(source,/onReset: \(\) => \{ setLatest\(\[\]\)/);assert.match(source,/Chưa cấu hình cảm biến/);assert.match(source,/summaryError \|\| monitoringError/);
 assert.match(NOTICE,/không LIVE/);assert.match(NOTICE,/chất lượng chưa xác minh/);
});
test('AR revision7 preserves revision6 lineage and changes only the reviewed shell and test',()=>{
 const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
 const bytes=fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev6.json'),old=JSON.parse(bytes),current=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev7.json','utf8'));
 assert.equal(hash(bytes),'6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177');assert.equal(current.revision,7);assert.equal(current.version,old.version);assert.equal(current.purpose,old.purpose);assert.equal(current.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev6.json');assert.equal(current.previousManifestSha256,hash(bytes));assert.deepEqual(Object.keys(current.sourceHashes),Object.keys(old.sourceHashes));assert.deepEqual(current.runtimeHashes,old.runtimeHashes);
 assert.deepEqual(Object.keys(current.sourceHashes).filter(f=>current.sourceHashes[f]!==old.sourceHashes[f]),['scripts/mvp-ui-only-api.cjs']);assert.deepEqual(Object.keys(current.offlineTestHashes).filter(f=>current.offlineTestHashes[f]!==old.offlineTestHashes[f]),['scripts/mvp-ui-only.test.cjs']);
 for(const h of Object.values(current.offlineTestHashes))assert.match(h,/^[a-f0-9]{64}$/);
 for(const f of ['frontend/src/pages/dashboard/DashboardPage.tsx','frontend/src/hooks/usePolling.ts','scripts/mvp-ui-only-readonly.cjs','scripts/mvp-ui-only-supervisor.cjs','scripts/mvp-ui-only-worker.cjs','scripts/mvp-ui-only-historical.cjs','backend/src/app.ts'])assert.equal(hash(fs.readFileSync(f)),old.sourceHashes[f]);
});
test('DEV-only presentation banner/card show historical/timezone/quality without hardcoded soil value',()=>{
 assert.match(NOTICE,/không LIVE/);assert.match(NOTICE,/ONLINE\/OFF chỉ/);assert.ok(!NOTICE.includes('4095'));assert.ok(!NOTICE.includes('soil0'));
 const ts=require(path.resolve('frontend/node_modules/typescript')),React=require(path.resolve('frontend/node_modules/react')),{renderToStaticMarkup}=require(path.resolve('frontend/node_modules/react-dom/server'));
 const source=fs.readFileSync('frontend/src/dev/ui-only-sensor-card.tsx','utf8');const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Intl,Date,require:n=>n==='react/jsx-runtime'?require(path.resolve('frontend/node_modules/react/jsx-runtime')):n.includes('sensor')?{sensorMetadata:{SOIL_MOISTURE:{label:'SOIL',unit:'%'}}}:{severityLabels:{}}});
 const html=renderToStaticMarkup(React.createElement(exports.SensorValueCard,{type:'SOIL_MOISTURE',value:100,recordedAt:times[0]}));assert.match(html,/100 %/);assert.match(html,/19:11:18/);assert.match(html,/chưa xác minh/);assert.match(html,/không LIVE/);assert.ok(!html.includes('Bình thường'));
 const plugin=require('./mvp-ui-only-presentation.cjs').presentationPlugin();assert.ok(plugin.transform('', 'C:/project/src/components/sensors/SensorValueCard.tsx').code.includes('/src/dev/'));assert.equal(plugin.transform('','other.tsx'),undefined);
});
test('DEV-only history/chart/detail timezone transforms transpile without changing production files',()=>{
 const ts=require(path.resolve('frontend/node_modules/typescript')),plugin=require('./mvp-ui-only-presentation.cjs').presentationPlugin();
 for(const file of ['pages/sensors/SensorHistoryPage.tsx','components/sensors/SensorHistoryChart.tsx','pages/devices/DeviceDetailPage.tsx']){
  const p=path.resolve('frontend/src',file),before=fs.readFileSync(p),transformed=plugin.transform(before.toString(),p);assert.match(transformed.code,/Asia\/Ho_Chi_Minh/);assert.equal(ts.transpileModule(transformed.code,{reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}}).diagnostics.length,0);assert.ok(before.equals(fs.readFileSync(p)));
 }
});

// AU: render real DEV-transformed components with inert hooks/services. No DOM,
// browser, credentials or real datasource. These are not browser acceptance.
function auModule(file,{states=[],params={},extra=''}={}){
 const ts=require(path.resolve('frontend/node_modules/typescript')),React=require(path.resolve('frontend/node_modules/react'));
 const source=fs.readFileSync(path.join('frontend/src',file),'utf8'),plugin=require('./mvp-ui-only-presentation.cjs').presentationPlugin();
 const code=plugin.transform(source,path.resolve('frontend/src',file))?.code??source;
 const result=ts.transpileModule(code+extra,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});assert.equal(result.diagnostics.length,0);
 let state=0;const exports={};const never=()=>{throw Error('AU_UNEXPECTED_IO_OR_ACTION');};
 const inert=({children})=>React.createElement('div',null,children);
 const hooks={...React,useState:initial=>{const i=state++;return[i<states.length?states[i]:typeof initial==='function'?initial():initial,never];},useEffect:()=>{},useCallback:f=>f,useRef:v=>({current:v})};
 vm.runInNewContext(result.outputText,{exports,Intl,Date,AbortController,require:name=>{
  if(name==='react')return hooks;
  if(name==='react/jsx-runtime')return require(path.resolve('frontend/node_modules/react/jsx-runtime'));
  if(name==='lucide-react'||name==='recharts')return new Proxy({},{get:()=>inert});
  if(name==='react-router-dom')return{Outlet:()=>React.createElement('div',{'data-testid':'outlet'}),Link:({children,to})=>React.createElement('a',{href:to},children),useParams:()=>params};
  if(name.endsWith('/useAuth'))return{useAuth:()=>({user:{role:'STAFF'}})};
  if(name.endsWith('/usePolling'))return{usePolling:()=>({loading:false,error:'',refresh:never})};
  if(name.endsWith('/types/device'))return auModule('types/device.ts').exports;
  if(name.endsWith('/types/actuator'))return auModule('types/actuator.ts').exports;
  if(name.endsWith('/types/sensor'))return auModule('types/sensor.ts').exports;
  if(name.endsWith('/types/alert'))return auModule('types/alert.ts').exports;
  if(name.endsWith('/SensorValueCard'))return auModule('dev/ui-only-sensor-card.tsx').exports;
  if(name.includes('/services/'))return new Proxy({},{get:()=>new Proxy(never,{get:()=>never})});
  if(name.includes('/components/'))return new Proxy({},{get:()=>inert});
  throw Error('AU_UNREVIEWED_IMPORT');
 }});
 return{exports,code,render:component=>require(path.resolve('frontend/node_modules/react-dom/server')).renderToStaticMarkup(React.createElement(component))};
}
for(const collapsed of [false,true])test('AU banner renders inside responsive content main, not body/under sidebar '+collapsed,()=>{
 const m=auModule('layouts/DashboardLayout.tsx',{states:[collapsed,false]}),html=m.render(m.exports.DashboardLayout);
 assert.ok(html.indexOf('<main')<html.indexOf('id="ui-only-historical-warning"'));assert.ok(html.indexOf('id="ui-only-historical-warning"')<html.indexOf('data-testid="outlet"'));assert.ok(html.indexOf('data-testid="outlet"')<html.indexOf('</main>'));
 assert.match(html,collapsed?/lg:ml-20/:/lg:ml-\[268px\]/);assert.match(html,/whitespace-normal break-words/);assert.match(html,/role="alert"/);assert.match(html,/MQTT đã lưu/);assert.match(html,/không LIVE/);assert.match(html,/chưa hiệu chuẩn/);assert.match(html,/Automation bị khóa/);
 assert.equal((html.match(/id="ui-only-historical-warning"/g)||[]).length,1);assert.ok(!/position:\s*fixed|fixed top-0/.test(html));
});
test('AU only dedicated serve plugin injects banner; missing or ambiguous layout anchors fail closed',()=>{
 const p=require('./mvp-ui-only-presentation.cjs').presentationPlugin();assert.equal(p.apply,'serve');assert.equal(p.transformIndexHtml,undefined);
 assert.equal(p.transform('same','C:/repo/unknown.tsx'),undefined);assert.throws(()=>p.transform('no outlet','C:/repo/src/layouts/DashboardLayout.tsx'),/ANCHOR_DRIFT/);assert.throws(()=>p.transform('<Outlet /><Outlet />','C:/repo/src/layouts/DashboardLayout.tsx'),/ANCHOR_DRIFT/);
 const entry=fs.readFileSync('scripts/mvp-ui-only-frontend.mjs','utf8');assert.match(entry,/presentationPlugin\(\)/);assert.ok(!fs.readFileSync('frontend/vite.config.ts','utf8').includes('presentationPlugin'));
});
for(const status of ['ONLINE','OFFLINE','UNKNOWN'])test('AU device '+status+' is explicitly historical and current connection unverified',()=>{
 const device={id:'AU_DEVICE',name:'SYNTHETIC DEVICE',deviceCode:'ESP32-GF-A-01',type:'CONTROLLER',status:'ACTIVE',connectionStatus:status,hardwareModel:'ESP32 DevKit V1',firmwareVersion:null,lastSeenAt:times[2],installedAt:null,createdAt:times[0],zone:{id:'AU_ZONE',name:'SYNTHETIC ZONE',farm:{id:'AU_FARM',name:'SYNTHETIC FARM'}}};
 const sensors=['TEMP','AIR_HUMIDITY','LIGHT','SOIL_MOISTURE'].map((type,i)=>({id:'AU_SENSOR_'+i,type,name:type,sensorCode:['TEMP_01','HUM_01','LIGHT_01','SOIL_01'][i],latestReading:{value:[30.2,72.4,5,100][i],recordedAt:times[2]}}));
 const m=auModule('pages/devices/DeviceDetailPage.tsx',{params:{deviceId:device.id},states:[device,sensors,[],[],'',false,undefined,undefined,false,'','',null]}),html=m.render(m.exports.DeviceDetailPage);
 assert.match(html,/Kết nối đã ghi nhận — không LIVE/);assert.match(html,/Đã lưu: .* — không LIVE/);assert.match(html,/MQTT đã tắt.*không xác minh kết nối ESP32 hiện tại/);assert.match(html,/19:11:48/);assert.match(html,/UTC\+7/);
 for(const unit of ['30.2 °C','72.4 %','5 lux','100 %'])assert.ok(html.includes(unit));assert.match(html,/chưa hiệu chuẩn/);assert.ok(!html.includes('Trạng thái kết nối được cung cấp bởi backend'));
});
test('AU Reports render historical snapshot and qualified device counts with unchanged numeric values',()=>{
 const overview={farmCount:1,zoneCount:1,cropCount:0,deviceCount:1,deviceOnline:1,deviceOffline:0,sensorCount:4,sensorReadingCount:12,newAlertCount:0,activeAlertCount:0,manualCommandCount:0,automationCommandCount:0,automationRuleCount:0,enabledAutomationRuleCount:0};
 const m=auModule('pages/reports/ReportsPage.tsx',{states:['7days','2026-11-02','2026-11-05','','',[],[],{},'overview',overview,[],{info:0,warning:0,critical:0},{manualCommands:0,automationCommands:0,successRate:null},{},'',false,'','']});
 const html=m.render(m.exports.ReportsPage);assert.match(html,/Bản ghi lịch sử — không phải trạng thái hiện tại/);assert.match(html,/1 online đã lưu/);assert.match(html,/không LIVE/);assert.match(html,/12 phép đo/);assert.ok(!html.includes('snapshot hiện tại')&&!html.includes('Snapshot hiện tại'));
});
test('AU Reports sensor section preserves null, units and Vietnam measurement timestamp',()=>{
 const m=auModule('pages/reports/ReportsPage.tsx',{extra:'\nexport { SensorSection as AUSection };'}),React=require(path.resolve('frontend/node_modules/react'));
 const row={sensorType:'TEMP',sensorCount:1,readingCount:3,minimum:null,average:30.2,maximum:30.2,latest:{value:30.2,recordedAt:times[0]},unit:'°C'};
 const html=require(path.resolve('frontend/node_modules/react-dom/server')).renderToStaticMarkup(React.createElement(m.exports.AUSection,{sensors:[row]}));assert.match(html,/19:11/);assert.match(html,/°C/);assert.match(html,/—/);assert.match(html,/30,2/);
});
for(const value of [100,null])test('AU SOIL '+value+' retains truthful measurement/absence and calibration warning',()=>{
 const m=auModule('dev/ui-only-sensor-card.tsx'),React=require(path.resolve('frontend/node_modules/react'));
 const html=require(path.resolve('frontend/node_modules/react-dom/server')).renderToStaticMarkup(React.createElement(m.exports.SensorValueCard,{type:'SOIL_MOISTURE',value,recordedAt:value===null?null:times[0]}));
 assert.match(html,/chưa hiệu chuẩn/);assert.match(html,/không dùng tưới tự động/);assert.match(html,/không LIVE/);if(value===null){assert.match(html,/Chưa có dữ liệu lịch sử/);assert.match(html,/Chưa có timestamp đo/);assert.ok(!html.includes('0 %'));}else{assert.match(html,/100 %/);assert.match(html,/19:11:18/);}
});
test('AU transformed Dashboard labels counts historical without touching command or polling logic',()=>{
 const source=fs.readFileSync('frontend/src/pages/dashboard/DashboardPage.tsx','utf8'),code=require('./mvp-ui-only-presentation.cjs').presentationPlugin().transform(source,path.resolve('frontend/src/pages/dashboard/DashboardPage.tsx')).code;
 assert.match(code,/online đã lưu/);assert.match(code,/offline đã lưu — không LIVE/);assert.equal(code.replace('online đã lưu','online').replace('offline đã lưu — không LIVE','offline'),source);
});
for(const state of ['OFF','ON','UNKNOWN'])test('AU disabled policy keeps both pump actions unavailable for '+state,()=>{
 const m=auModule('utils/irrigation-control.ts');const p=m.exports.pumpPresentation({controlEnabled:false,canControl:true,status:'ACTIVE',currentState:state,device:{connectionStatus:'ONLINE',status:'ACTIVE',zone:{status:'ACTIVE',farm:{status:'ACTIVE'}}}});assert.equal(p.canOn,false);assert.equal(p.canOff,false);assert.equal(p.available,false);
});
test('AU chart mean/count/bucket timestamp remains derived from the three stored synthetic samples',async()=>{
 const f=fake();f.setRead('sensorReading','findMany',()=>times.map((recordedAt,i)=>({id:'AU_'+i,sensorId:SENSOR_IDS[1],recordedAt,value:[72.5,72.3,72.4][i]})));
 const points=await buckets(readonlyPrisma(f.raw),SENSOR_IDS[1],new Date(times[0]),new Date(times[2]),7200);assert.equal(points.length,1);assert.equal(points[0].count,3n);assert.ok(Math.abs(points[0].value-72.4)<1e-10);assert.equal(points[0].epoch,BigInt(Math.floor(Date.parse(times[0])/1000/7200)*7200));assert.equal(f.stats().writes,0);
});
test('AU transformed TSX surfaces have no syntax diagnostics and production files remain byte-identical to revision7',()=>{
 const ts=require(path.resolve('frontend/node_modules/typescript')),p=require('./mvp-ui-only-presentation.cjs').presentationPlugin(),old=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev7.json','utf8')),hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
 for(const file of ['layouts/DashboardLayout.tsx','types/device.ts','pages/devices/DeviceDetailPage.tsx','pages/reports/ReportsPage.tsx','pages/dashboard/DashboardPage.tsx','pages/sensors/SensorHistoryPage.tsx','components/sensors/SensorHistoryChart.tsx']){
  const name='frontend/src/'+file,bytes=fs.readFileSync(name);assert.equal(hash(bytes),old.sourceHashes[name]);const code=p.transform(bytes.toString(),path.resolve(name)).code;assert.equal(ts.transpileModule(code,{reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}}).diagnostics.length,0);
 }
});
test('AU revision8 pins only two reviewed DEV source changes and current offline tests',()=>{
 const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev7.json'),old=JSON.parse(bytes),m=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev8.json','utf8'));
 assert.equal(hash(bytes),'000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7');assert.equal(m.revision,8);assert.equal(m.previousManifestSha256,hash(bytes));assert.equal(m.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev7.json');assert.deepEqual(Object.keys(m.sourceHashes),Object.keys(old.sourceHashes));assert.equal(Object.keys(m.sourceHashes).length,250);assert.deepEqual(m.runtimeHashes,old.runtimeHashes);
 assert.deepEqual(Object.keys(m.sourceHashes).filter(f=>m.sourceHashes[f]!==old.sourceHashes[f]).sort(),['frontend/src/dev/ui-only-sensor-card.tsx','scripts/mvp-ui-only-presentation.cjs']);
 assert.deepEqual(Object.keys(m.offlineTestHashes).filter(f=>m.offlineTestHashes[f]!==old.offlineTestHashes[f]),['scripts/mvp-ui-only.test.cjs']);for(const h of Object.values(m.offlineTestHashes))assert.match(h,/^[a-f0-9]{64}$/);
 for(const f of ['scripts/mvp-ui-only-readonly.cjs','scripts/mvp-ui-only-api.cjs','scripts/mvp-ui-only-supervisor.cjs','scripts/mvp-ui-only-worker.cjs','scripts/mvp-ui-only-runtime.cjs','scripts/mvp-ui-only-historical.cjs','backend/src/repositories/sensor-reading.repository.ts'])assert.equal(hash(fs.readFileSync(f)),old.sourceHashes[f]);
});

test('AW actual installed Vite serve pipeline, no listener or application startup', {timeout:90000},async t=>{
 const ts=require(path.resolve('frontend/node_modules/typescript')),{pathToFileURL}=require('node:url'),net=require('node:net');
 const root=process.cwd(),temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'aw-vite-'));
 fs.mkdirSync(path.join(temp,'empty-env'));
 const vite=await import(pathToFileURL(path.join(root,'frontend/node_modules/vite/dist/node/index.js')).href);
 const {default:react}=await import(pathToFileURL(path.join(root,'frontend/node_modules/@vitejs/plugin-react/dist/index.js')).href);
 const {devCssPlugins}=await import(pathToFileURL(path.join(root,'scripts/mvp-dev-css.mjs')).href);
 const {presentationPlugin}=require('./mvp-ui-only-presentation.cjs');
 const entry=fs.readFileSync('scripts/mvp-ui-only-frontend.mjs','utf8'),ast=ts.createSourceFile('entry.mjs',entry,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),configs=[];
 function findConfig(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='createServer'){assert.equal(n.arguments.length,1);assert.ok(ts.isObjectLiteralExpression(n.arguments[0]));configs.push(n.arguments[0].getText(ast));}ts.forEachChild(n,findConfig);}
 findConfig(ast);assert.equal(configs.length,1); // Never import the auto-starting entry.
 const evidence={vite:require(path.resolve('frontend/node_modules/vite/package.json')).version,react:require(path.resolve('frontend/node_modules/@vitejs/plugin-react/package.json')).version,entrySha256:require('node:crypto').createHash('sha256').update(entry).digest('hex'),configurationSource:'ACTUAL_ENTRY_CREATE_SERVER_OBJECT_AST',baseline:null,fixed:null,modules:[],listenAttempts:0,closed:[]};
 const oldListen=net.Server.prototype.listen,servers=[];
 net.Server.prototype.listen=function(){evidence.listenAttempts++;throw Error('AW_ANY_NETWORK_LISTEN_PROHIBITED');};
 async function configuration(before=false){
  const traces=[];
  const factory=()=>{const p=presentationPlugin();if(before)delete p.enforce;const transform=p.transform;p.transform=function(source,id,...args){const trace={id,rawOutlet:source.includes('<Outlet />')};traces.push(trace);const result=transform.call(this,source,id,...args);trace.output=result?.code;return result;};return p;};
  // Evaluate only the actual config expression, with reviewed dependencies and
  // empty envDir. Safety overrides affect offline resources, not transform order.
  const base=await vm.runInNewContext('(async()=>('+configs[0]+'))()',{root,path,react,devCssPlugins,presentationPlugin:factory,process:{env:{MVP_EMPTY_ENV_DIR:path.join(temp,'empty-env')}}});
  const config={...base,envFile:false,cacheDir:path.join(temp,before?'cache-before':'cache-after'),logLevel:'silent',optimizeDeps:{noDiscovery:true,include:[],entries:[]},server:{...base.server,port:0,middlewareMode:true,ws:false,hmr:false,watch:null,preTransformRequests:false,warmup:{clientFiles:[],ssrFiles:[]}}};
  return{base,config,traces};
 }
 async function serverFor(settings){const server=await vite.createServer(settings.config);servers.push(server);assert.equal(server.httpServer,null);assert.equal(server.config.server.middlewareMode,true);assert.equal(server.config.server.ws,false);assert.equal(server.config.server.hmr,false);assert.equal(server.config.server.watch,null);return server;}
 const names=s=>s.config.plugins.map(p=>p.name),layoutId=path.resolve('frontend/src/layouts/DashboardLayout.tsx');
 const parse=code=>{const tree=ts.createSourceFile('output.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);const literals=[];function walk(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))literals.push(n.text);ts.forEachChild(n,walk);}walk(tree);return{tree,text:literals.join('\n')};};
 try{
  const baseline=await configuration(true);let before;
  await t.test('real resolved normal-stage order reproduces AV anchor failure once offline',async()=>{
   before=await serverFor(baseline);const order=names(before);evidence.baseline={order};assert.ok(order.indexOf('vite:esbuild')<order.indexOf('ui-only-historical-presentation'));
   await assert.rejects(before.transformRequest('/src/layouts/DashboardLayout.tsx'),/UI_ONLY_PRESENTATION_ANCHOR_DRIFT/);
   const trace=baseline.traces.find(x=>x.id.replaceAll('\\','/').endsWith('/src/layouts/DashboardLayout.tsx'));assert.ok(trace);assert.equal(trace.rawOutlet,false);evidence.baseline.rawOutletAtPresentation=false;evidence.baseline.expectedFailure='UI_ONLY_PRESENTATION_ANCHOR_DRIFT';
   await before.close();evidence.closed.push('baseline');
  });
  const fixed=await configuration(false),server=await serverFor(fixed),order=names(server);
  await t.test('actual Vite resolves presentation pre before React and JSX compilation',()=>{
   const p=order.indexOf('ui-only-historical-presentation'),r=order.indexOf('vite:react-babel'),e=order.indexOf('vite:esbuild');assert.ok(p>=0&&r>=0&&e>=0&&p<r&&p<e);evidence.fixed={order,presentationIndex:p,reactIndex:r,esbuildIndex:e};
  });
  await t.test('actual DashboardLayout pipeline compiles one banner inside main and preserves responsive margins',async()=>{
   const result=await server.transformRequest('/src/layouts/DashboardLayout.tsx');assert.ok(result?.code);parse(result.code);assert.equal(result.code.split('ui-only-historical-warning').length-1,1);assert.ok(!result.code.includes('<Outlet />'));assert.match(result.code,/jsxDEV|jsx-runtime|jsx-dev-runtime/);
   const trace=fixed.traces.find(x=>x.id.replaceAll('\\','/').endsWith('/src/layouts/DashboardLayout.tsx'));assert.equal(trace.rawOutlet,true);assert.ok(trace.output);
   const tree=ts.createSourceFile('layout.tsx',trace.output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(tree.parseDiagnostics.length,0);let main;
   function findMain(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(tree)==='main')main=n;ts.forEachChild(n,findMain);}findMain(tree);assert.ok(main);const content=main.getText(tree);assert.ok(content.indexOf('ui-only-historical-warning')<content.indexOf('<Outlet />'));assert.equal(content.split('ui-only-historical-warning').length-1,1);assert.match(trace.output,/lg:ml-20/);assert.match(trace.output,/lg:ml-\[268px\]/);assert.match(content,/whitespace-normal break-words/);assert.match(content,/role="alert"/);
   evidence.fixed.rawOutletAtPresentation=true;evidence.modules.push({file:'layouts/DashboardLayout.tsx',compiled:true,bannerCount:1,bannerInsideMain:true});
  });
  const cases=[
   ['pages/devices/DeviceDetailPage.tsx',[/Kết nối đã ghi nhận — không LIVE/,/MQTT đã tắt/,/Asia\/Ho_Chi_Minh/]],
   ['pages/dashboard/DashboardPage.tsx',[/online đã lưu/,/offline đã lưu — không LIVE/]],
   ['pages/reports/ReportsPage.tsx',[/Bản ghi lịch sử — không phải trạng thái hiện tại/,/online đã lưu/,/Asia\/Ho_Chi_Minh/]],
   ['types/device.ts',[/Đã lưu: Trực tuyến — không LIVE/,/Đã lưu: Ngoại tuyến — không LIVE/]],
   ['components/sensors/SensorValueCard.tsx',[/ui-only-sensor-card/]],
   ['dev/ui-only-sensor-card.tsx',[/chưa hiệu chuẩn/,/không dùng tưới tự động/,/Chưa có dữ liệu lịch sử/,/Asia\/Ho_Chi_Minh/]],
   ['types/sensor.ts',[/°C/,/lux/]],
   ['pages/sensors/SensorHistoryPage.tsx',[/Lần đọc dữ liệu lịch sử/,/Asia\/Ho_Chi_Minh/]],
   ['components/sensors/SensorHistoryChart.tsx',[/Asia\/Ho_Chi_Minh/]],
  ];
  for(const [file,expected]of cases)await t.test('real serve transform compiles '+file,async()=>{const result=await server.transformRequest('/src/'+file);assert.ok(result?.code);const output=parse(result.code);for(const pattern of expected)assert.match(output.text,pattern);evidence.modules.push({file,compiled:true});});
  for(const [kind,drift]of [['missing',s=>s.replace('<Outlet />','<span />')],['duplicate',s=>s.replace('<Outlet />','<Outlet /><Outlet />')],['unexpected',s=>s.replace('<Outlet />','<Outlet context={null} />')]])await t.test('actual pipeline still rejects '+kind+' raw layout anchor drift',async()=>{await assert.rejects(server.pluginContainer.transform(drift(fs.readFileSync(layoutId,'utf8')),layoutId),/UI_ONLY_PRESENTATION_ANCHOR_DRIFT/);});
  await t.test('actual build-mode plugin resolution excludes DEV presentation; production config/source untouched',async()=>{
   const config=await vite.resolveConfig({...fixed.config,build:{write:false}},'build','production');assert.ok(!config.plugins.some(p=>p.name==='ui-only-historical-presentation'));
   const raw=fs.readFileSync(layoutId,'utf8'),out=await vite.transformWithEsbuild(raw,layoutId,{loader:'tsx',jsx:'automatic'});parse(out.code);assert.ok(!out.code.includes('ui-only-historical-warning'));
   const production=fs.readFileSync('frontend/vite.config.ts','utf8');assert.ok(!production.includes('presentationPlugin'));evidence.productionPresentationExcluded=true;
  });
  await server.close();evidence.closed.push('fixed');
  await t.test('all temporary Vite containers closed without any network listener',()=>{assert.equal(evidence.listenAttempts,0);assert.equal(evidence.closed.length,2);assert.equal(before.httpServer,null);assert.equal(server.httpServer,null);});
 }finally{
  try{for(const server of servers)await server.close();}finally{net.Server.prototype.listen=oldListen;fs.writeFileSync(path.join(temp,'aw-vite-pipeline.json'),JSON.stringify(evidence,null,2),{flag:'wx'});}
 }
});

test('AW revision9 changes only plugin ordering, preserves revision8 and pins current test evidence',()=>{
 const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev8.json'),old=JSON.parse(bytes),m=JSON.parse(fs.readFileSync('docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json','utf8'));
 assert.equal(hash(bytes),'5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4');assert.equal(m.revision,9);assert.equal(m.previousManifestSha256,hash(bytes));assert.equal(m.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev8.json');assert.deepEqual(Object.keys(m.sourceHashes),Object.keys(old.sourceHashes));assert.equal(Object.keys(m.sourceHashes).length,250);assert.deepEqual(m.runtimeHashes,old.runtimeHashes);
 assert.deepEqual(Object.keys(m.sourceHashes).filter(f=>m.sourceHashes[f]!==old.sourceHashes[f]),['scripts/mvp-ui-only-presentation.cjs']);for(const [f,h]of Object.entries(m.offlineTestHashes))assert.equal(hash(fs.readFileSync(f)),h);
 const current=fs.readFileSync('scripts/mvp-ui-only-presentation.cjs','utf8');assert.equal(hash(current.replace("enforce:'pre',",'')),old.sourceHashes['scripts/mvp-ui-only-presentation.cjs']);
});
