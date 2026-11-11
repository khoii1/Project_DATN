// Preparation library only. No automatic startup; a future approved supervisor
// must supply the isolated datasource and fresh control-metadata receipt.
const path=require('node:path'),assert=require('node:assert/strict');
const {readonlyPrisma,memoryAudit,buckets,readTransaction,createCoverageGate}=require('./mvp-ui-only-readonly.cjs');
const {verifyReadings}=require('./mvp-ui-only-historical.cjs');
const ROOT=path.resolve(__dirname,'..');
const datasources=new WeakMap();
const deny=()=>{throw Error('UI_ONLY_SIDE_EFFECT_REFUSED');};
function assertConfig(env,proof){
 const u=new URL(env.DATABASE_URL||'invalid:');
 assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/smart_agriculture_mvp_dev');assert.equal(u.username,'sa_mvp_dev_app');assert.equal(u.search,'?schema=public');
 for(const [k,v]of Object.entries({MQTT_ENABLED:'false',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1',PORT:'55001',CLIENT_URL:'http://127.0.0.1:55173',NODE_ENV:'development'}))assert.equal(env[k],v,'UI_ONLY_CONFIG_REFUSED');
 assert.equal(env.NODE_OPTIONS,undefined);assert.ok(!env.MQTT_PASSWORD&&!env.MQTT_USERNAME&&!env.MQTT_BROKER_URL);
 assert.ok(typeof env.JWT_SECRET==='string'&&env.JWT_SECRET.length>=32,'UI_ONLY_JWT_REQUIRED');
 assert.equal(proof?.scope,'ONE_DEV_UI_ONLY_HISTORICAL_SESSION');assert.equal(proof.systemId,'7698826681383327460');assert.equal(proof.pgdata,'C:\\DATN\\test-instances\\phase13-3b\\data');
 assert.equal(proof.approvalVerified,true);assert.equal(proof.sourcePinsVerified,true);assert.ok(Date.now()-Date.parse(proof.checkedAt)>=0&&Date.now()-Date.parse(proof.checkedAt)<60000,'FRESH_SUPERVISOR_PROOF_REQUIRED');
}
function routeAllowed(method,url){const p=url.split('?')[0];return /^(GET|HEAD)$/.test(method)&&!/^\/api\/(shadow-preview|live-evidence|device-commands)/.test(p)||method==='POST'&&['/api/auth/login','/api/auth/logout'].includes(p);}
const UI_ORIGIN='http://127.0.0.1:55173';
// Preflight has a narrower, explicit route catalogue than the unchanged actual
// request gate. Never normalize an ambiguous URL into an allowed route.
function preflightPathAllowed(method,url){
 if(typeof url!=='string'||/[\x00-\x20\x7f\\#]/.test(url))return false;
 const p=url.split('?')[0];
 if(!/^\/api\//.test(p)||p.includes('%')||p.includes('//')||p.split('/').some(x=>x==='.'||x==='..'))return false;
 if(!routeAllowed(method,url))return false;
 if(method==='POST')return true; // exact login/logout gate above
 if(!['GET','HEAD'].includes(method))return false;
 return /^\/api\/(?:health|auth\/me)$/.test(p)||
  /^\/api\/(?:users|farms|zones|crops|devices|sensors|alert-rules|alerts|actuators|automation-rules)(?:\/[A-Za-z0-9_-]+)?$/.test(p)||
  /^\/api\/farms\/[A-Za-z0-9_-]+\/(?:staff|staff-candidates)$/.test(p)||
  /^\/api\/devices\/[A-Za-z0-9_-]+\/latest-readings$/.test(p)||
  /^\/api\/zones\/[A-Za-z0-9_-]+\/latest-readings$/.test(p)||
  /^\/api\/sensors\/[A-Za-z0-9_-]+\/(?:readings|chart|statistics)$/.test(p)||
  /^\/api\/(?:activity-logs|reports\/(?:overview|sensors|alerts|irrigation|automation|export))$/.test(p);
}
function singleHeader(req,name){
 const value=req.headers?.[name];
 if(value!==undefined&&typeof value!=='string')return{valid:false};
 const raw=req.rawHeaders;
 if(raw){if(!Array.isArray(raw)||raw.length%2)return{valid:false};let count=0;
  for(let i=0;i<raw.length;i+=2)if(String(raw[i]).toLowerCase()===name){count++;if(raw[i+1]!==value)return{valid:false};}
  if(count>1||count!==Number(value!==undefined))return{valid:false};
 }
 return{valid:true,value};
}
function preflightPolicy(req){
 if(req.method!=='OPTIONS')return null;
 const origin=singleHeader(req,'origin'),method=singleHeader(req,'access-control-request-method'),headers=singleHeader(req,'access-control-request-headers');
 if(!origin.valid||!method.valid||!headers.valid||origin.value!==UI_ORIGIN||!preflightPathAllowed(method.value,req.url))return null;
 const names=headers.value===undefined?[]:headers.value.split(',').map(x=>x.trim().toLowerCase());
 const canonical={'content-type':'Content-Type',authorization:'Authorization'};
 if(new Set(names).size!==names.length||names.some(x=>!Object.hasOwn(canonical,x)))return null;
 return{method:method.value,headers:names.map(x=>canonical[x])};
}
function uiOnlyHttpBoundary(req,res,next){
 if(req.method!=='OPTIONS')return routeAllowed(req.method,req.url)?next():res.status(403).json({message:'UI_ONLY_READ_ONLY'});
 res.vary('Origin');res.vary('Access-Control-Request-Method');res.vary('Access-Control-Request-Headers');
 const allowed=preflightPolicy(req);
 if(!allowed)return res.status(403).json({message:'UI_ONLY_READ_ONLY'});
 res.setHeader('Access-Control-Allow-Origin',UI_ORIGIN);
 res.setHeader('Access-Control-Allow-Methods',allowed.method);
 if(allowed.headers.length)res.setHeader('Access-Control-Allow-Headers',allowed.headers.join(', '));
 return res.status(204).end(); // no auth/ORM/MQTT/business-route dispatch
}
const PREFLIGHT_FIELDS=['attempted','statusCode','expectedOriginMatched','allowedMethodMatched','allowedHeadersMatched','varyMatched','bodyEmpty','credentialsAbsent','cacheAbsent','passed'];
const LOGIN_FIELDS=['attempted','statusCode','success','authenticatedIdentityMatched','tokenReturned','responseOriginMatched','memoryAuditVerified','passed'];
function gateEvidence(apiPid){
 const pre=()=>Object.fromEntries(PREFLIGHT_FIELDS.map(k=>[k,k==='statusCode'?null:false]));
 return{version:1,apiPid,apiReady:true,corsLoginPreflight:pre(),corsReadPreflight:pre(),directDevLogin:Object.fromEntries(LOGIN_FIELDS.map(k=>[k,k==='statusCode'?null:false])),preflightTransactionsUnchanged:false,preflightAuditUnchanged:false,policyVerified:false,requests:{loginOptions:0,readOptions:0,login:0},completed:false,passed:false,failureReason:null};
}
function sanitizePreFrontendEvidence(raw,pid){
 const e=gateEvidence(pid);e.version=raw?.version===1?1:0;e.apiPid=Number.isInteger(raw?.apiPid)?raw.apiPid:0;e.apiReady=raw?.apiReady===true;
 for(const [key,fields]of [['corsLoginPreflight',PREFLIGHT_FIELDS],['corsReadPreflight',PREFLIGHT_FIELDS],['directDevLogin',LOGIN_FIELDS]])for(const f of fields)e[key][f]=f==='statusCode'?(Number.isInteger(raw?.[key]?.[f])&&raw[key][f]>=100&&raw[key][f]<=599?raw[key][f]:null):raw?.[key]?.[f]===true;
 for(const key of ['preflightTransactionsUnchanged','preflightAuditUnchanged','policyVerified','completed','passed'])e[key]=raw?.[key]===true;
 for(const key of Object.keys(e.requests))e.requests[key]=Number.isInteger(raw?.requests?.[key])&&raw.requests[key]>=0&&raw.requests[key]<=1?raw.requests[key]:0;
 const reasons=['POLICY_NOT_VERIFIED','RESPONSE_INVALID','CORS_STATUS','CORS_HEADERS','PREFLIGHT_SIDE_EFFECT','CREDENTIAL_CONTRACT','LOGIN_STATUS','LOGIN_PAYLOAD','LOGIN_EVIDENCE','CANCELLED','HTTP_TIMEOUT','HTTP_REDIRECT','HTTP_TRANSPORT'];
 e.failureReason=raw?.failureReason===null?null:reasons.includes(raw?.failureReason)?raw.failureReason:'ATTESTATION_INVALID';return e;
}
function validatePreFrontendEvidence(e,pid){
 const shape=(o,keys)=>assert.deepEqual(Object.keys(o||{}).sort(),keys.slice().sort(),'PRE_FRONTEND_ATTESTATION_INVALID');
 shape(e,['version','apiPid','apiReady','corsLoginPreflight','corsReadPreflight','directDevLogin','preflightTransactionsUnchanged','preflightAuditUnchanged','policyVerified','requests','completed','passed','failureReason']);
 assert.equal(e.version,1);assert.ok(Number.isInteger(pid)&&pid>0);assert.equal(e.apiPid,pid);assert.equal(e.apiReady,true);
 for(const key of ['corsLoginPreflight','corsReadPreflight']){shape(e[key],PREFLIGHT_FIELDS);for(const f of PREFLIGHT_FIELDS)assert.equal(e[key][f],f==='statusCode'?204:true,'PRE_FRONTEND_CORS_NOT_VERIFIED');}
 shape(e.directDevLogin,LOGIN_FIELDS);for(const f of LOGIN_FIELDS)assert.equal(e.directDevLogin[f],f==='statusCode'?200:true,'PRE_FRONTEND_LOGIN_NOT_VERIFIED');
 shape(e.requests,['loginOptions','readOptions','login']);for(const n of Object.values(e.requests))assert.equal(n,1);
 for(const k of ['preflightTransactionsUnchanged','preflightAuditUnchanged','policyVerified','completed','passed'])assert.equal(e[k],true);
 assert.equal(e.failureReason,null);return true;
}
async function runPreFrontendGate({request,credential,observe,apiPid,signal}){
 const e=gateEvidence(apiPid);let secret,body,payload,stage='observation';
 const check=(yes,reason)=>{if(!yes)throw Object.assign(Error('PRE_FRONTEND_GATE_FAILED'),{gateReason:reason});};
 const policy=s=>s?.pid===apiPid&&s.audit?.policy==='DEV_MEMORY_ONLY_NO_AUDIT_PERSISTENCE'&&Number.isSafeInteger(s.audit.events)&&s.audit.events>=0&&Number.isSafeInteger(s.verifiedTransactions)&&s.verifiedTransactions>=0&&s.policy?.mqtt==='disabled'&&s.policy.commands===false&&s.policy.automation===false&&s.policy.testMode===true&&s.policy.maxRunSeconds===1;
 const tokens=v=>typeof v==='string'?v.split(',').map(x=>x.trim().toLowerCase()).sort():[];
 const text=async r=>{const value=await r.text();check(typeof value==='string'&&Buffer.byteLength(value)<=32768,'RESPONSE_INVALID');return value;};
 async function preflight(name,url,method,header){
  stage=name;e.requests[name==='corsLoginPreflight'?'loginOptions':'readOptions']++;
  const row=e[name];row.attempted=true;
  const r=await request(url,{method:'OPTIONS',headers:{Origin:UI_ORIGIN,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':header},redirect:'error',signal});
  row.statusCode=Number.isInteger(r.status)?r.status:null;row.expectedOriginMatched=r.headers.get('access-control-allow-origin')===UI_ORIGIN;
  row.allowedMethodMatched=r.headers.get('access-control-allow-methods')===method;row.allowedHeadersMatched=JSON.stringify(tokens(r.headers.get('access-control-allow-headers')))===JSON.stringify([header.toLowerCase()]);
  row.varyMatched=JSON.stringify(tokens(r.headers.get('vary')))===JSON.stringify(['origin','access-control-request-method','access-control-request-headers'].sort());
  row.credentialsAbsent=r.headers.get('access-control-allow-credentials')===null;row.cacheAbsent=r.headers.get('access-control-max-age')===null;row.bodyEmpty=(await text(r))==='';
  row.passed=row.statusCode===204&&PREFLIGHT_FIELDS.filter(k=>!['attempted','statusCode','passed'].includes(k)).every(k=>row[k]===true);
  check(row.passed,row.statusCode!==204?'CORS_STATUS':'CORS_HEADERS');
 }
 try{
  const before=await observe();check(policy(before),'POLICY_NOT_VERIFIED');e.policyVerified=true;
  await preflight('corsLoginPreflight','http://127.0.0.1:55001/api/auth/login','POST','content-type');
  await preflight('corsReadPreflight','http://127.0.0.1:55001/api/auth/me','GET','authorization');
  const afterPre=await observe();check(policy(afterPre),'POLICY_NOT_VERIFIED');e.preflightTransactionsUnchanged=afterPre.verifiedTransactions===before.verifiedTransactions;e.preflightAuditUnchanged=afterPre.audit.events===before.audit.events;check(e.preflightTransactionsUnchanged&&e.preflightAuditUnchanged,'PREFLIGHT_SIDE_EFFECT');
  stage='credential';secret=await credential();check(secret&&secret.email==='owner-a@mvp.invalid'&&typeof secret.password==='string'&&secret.password.length>0&&secret.password.length<=1024,'CREDENTIAL_CONTRACT');
  stage='login';e.requests.login++;const row=e.directDevLogin;row.attempted=true;
  const r=await request('http://127.0.0.1:55001/api/auth/login',{method:'POST',headers:{Origin:UI_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({email:secret.email,password:secret.password}),redirect:'error',signal});
  row.statusCode=Number.isInteger(r.status)?r.status:null;row.responseOriginMatched=r.headers.get('access-control-allow-origin')===UI_ORIGIN;check(row.statusCode===200,'LOGIN_STATUS');
  body=await text(r);try{payload=JSON.parse(body);}catch{check(false,'LOGIN_PAYLOAD');}
  row.success=payload?.success===true;row.authenticatedIdentityMatched=payload?.data?.user?.id==='mvp-owner-a'&&payload.data.user.email===secret.email&&payload.data.user.role==='FARM_OWNER'&&payload.data.user.status==='ACTIVE';
  row.tokenReturned=typeof payload?.data?.accessToken==='string'&&payload.data.accessToken.length>0;
  const after=await observe();row.memoryAuditVerified=policy(after)&&after.audit.events===afterPre.audit.events+1;
  row.passed=LOGIN_FIELDS.filter(k=>!['attempted','statusCode','passed'].includes(k)).every(k=>row[k]===true);check(row.passed,'LOGIN_EVIDENCE');
  e.completed=true;e.passed=true;validatePreFrontendEvidence(e,apiPid);
 }catch(error){
  e.completed=true;e.passed=false;
  const known=['POLICY_NOT_VERIFIED','RESPONSE_INVALID','CORS_STATUS','CORS_HEADERS','PREFLIGHT_SIDE_EFFECT','CREDENTIAL_CONTRACT','LOGIN_STATUS','LOGIN_PAYLOAD','LOGIN_EVIDENCE'];
  e.failureReason=known.includes(error?.gateReason)?error.gateReason:signal?.aborted?'CANCELLED':['TimeoutError','AbortError'].includes(error?.name)?'HTTP_TIMEOUT':error?.code==='HTTP_REDIRECT'?'HTTP_REDIRECT':stage==='credential'?'CREDENTIAL_CONTRACT':'HTTP_TRANSPORT';
 }finally{if(secret){secret.password=null;secret=null;}body=null;payload=null;}
 return e;
}
function createDatasource({env,proof,PrismaClient}){
 assertConfig(env,proof);const fs=require('node:fs'),read=fs.readFileSync,exists=fs.existsSync,blocked=f=>typeof f==='string'&&/^\.env(?:\.|$)/.test(path.basename(f));
 // Prisma may probe .env during its constructor, before app import boundary.
 fs.existsSync=function(f){return blocked(f)?false:exists.call(this,f);};fs.readFileSync=function(f,...a){if(blocked(f))deny();return read.call(this,f,...a);};
 try{const raw=new PrismaClient({datasourceUrl:env.DATABASE_URL,log:[]});datasources.set(raw,env.DATABASE_URL);return raw;}finally{fs.readFileSync=read;fs.existsSync=exists;}
}
function devConfig(e){return Object.freeze({port:55001,databaseUrl:e.DATABASE_URL,nodeEnv:'development',clientUrl:'http://127.0.0.1:55173',jwtSecret:e.JWT_SECRET,jwtExpiresIn:'1h',mqttEnabled:false,mqttCommandsEnabled:false,mqttAutomationCommandsEnabled:false,mqttPumpTestMode:true,mqttPumpMaxRunSeconds:1,mqttCommandExpirySeconds:10,mqttCommandDeviceCode:'ESP32-GF-A-01',mqttCommandActuatorCode:'PUMP_01',mqttTopicPrefix:'smart-agriculture/v1',mqttBrokerUrl:'mqtt://127.0.0.1:0',mqttBackendClientId:'ui-only-no-mqtt',mqttReconnectPeriodMs:0,mqttSideEffectMaxAgeSeconds:300,mqttMaxPayloadBytes:32768,devicePresenceTimeoutSeconds:90,devicePresenceCheckIntervalSeconds:10,automationCommandCooldownSeconds:60,automationManualOverrideMinutes:15,automationMaxReadingAgeSeconds:300});}
function installBoundary(prisma,audit,configuration=devConfig(process.env)){
 const Module=require('node:module'),fs=require('node:fs'),old=Module._load,read=fs.readFileSync,exists=fs.existsSync;
 const blocked=f=>typeof f==='string'&&/^\.env(?:\.|$)/.test(path.basename(f));
 fs.readFileSync=function(f,...args){if(blocked(f))deny();return read.call(this,f,...args);};fs.existsSync=function(f){return blocked(f)?false:exists.call(this,f);};
 Module._load=function(name,parent,...rest){
  if(name==='dotenv')return{config:()=>({parsed:{}})};
  if(name==='mqtt')return{connect:deny,connectAsync:deny};
  const f=Module._resolveFilename(name,parent).replaceAll('\\','/');
  if(f.endsWith('/backend/src/server.ts'))deny();
  if(f.endsWith('/backend/src/config/database.ts'))return{prisma,connectDatabase:deny,disconnectDatabase:deny};
  if(f.endsWith('/backend/src/config/env.ts'))return{env:configuration};
  if(f.endsWith('/backend/src/mqtt/mqtt-client.service.ts'))return{mqttClientService:{connectionState:'disabled',start:deny,stop:async()=>{}}};
  if(f.endsWith('/backend/src/mqtt/mqtt-pump-state.adapter.ts'))return{recoverMqttCommands:deny,invalidatePumpState:deny,handlePumpState:deny};
  if(f.endsWith('/backend/src/services/presence-watchdog.service.ts'))return{presenceWatchdog:{start:deny,stop:async()=>{}}};
  const value=old.call(this,name,parent,...rest);
  if(name==='@prisma/client')return new Proxy(value,{get(o,k){if(k==='PrismaClient')return deny;return o[k];}});
  if(f.endsWith('/backend/src/services/activity-log.service.ts'))return{...value,recordActivity:audit.recordActivity};
  if(f.endsWith('/backend/src/repositories/sensor-reading.repository.ts'))return{...value,sensorReadingRepository:{...value.sensorReadingRepository,bucketPoints:(...args)=>buckets(prisma,...args)}};
  return value;
 };
 return()=>{Module._load=old;fs.readFileSync=read;fs.existsSync=exists;};
}
async function startUIOnly({env,proof,raw,loadApp,listen,onReadonlyVerified,repositoryRead}){
 assertConfig(env,proof);assert.equal(datasources.get(raw),env.DATABASE_URL,'UI_ONLY_UNPINNED_DATASOURCE');const options={expectedStart:proof.postmasterStart,onVerified:onReadonlyVerified};const coverageGate=createCoverageGate(raw,options),prisma=coverageGate.prisma,audit=memoryAudit();
 let restore,server,closed=false,readonlyCoverage;
 try{
 // This is intentionally the same per-connection DB boundary, not a one-off
 // SET followed by reads on arbitrary pooled connections.
 const [id]=await readTransaction(raw,tx=>tx.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port'),options);
 assert.deepEqual({db:id.db,role:id.role,port:id.port},{db:'smart_agriculture_mvp_dev',role:'sa_mvp_dev_app',port:55433});
 verifyReadings(await prisma.sensorReading.findMany());
  if(!loadApp){
   // Must run in a dedicated closed-env process; never inside production.
   assert.ok(!Object.keys(require.cache).some(f=>f.replaceAll('\\','/').includes('/backend/src/')),'UI_ONLY_FRESH_PROCESS_REQUIRED');
   assertConfig(process.env,proof);assert.equal(process.env.DATABASE_URL,env.DATABASE_URL);require(path.join(ROOT,'backend/node_modules/tsx/dist/cjs/index.cjs'));
   restore=installBoundary(prisma,audit);
   const repository=require(path.join(ROOT,'backend/src/repositories/sensor-reading.repository.ts')).sensorReadingRepository;
   repositoryRead=()=>repository.list(require('./mvp-ui-only-historical.cjs').SENSOR_IDS[0],{page:1,limit:12,sort:'asc'});
   loadApp=()=>require(path.join(ROOT,'backend/src/app.ts')).app;
  }
  // Actual repository import uses the same guarded datasource installed above.
  // Complete every supported transaction path before app creation/listening.
  readonlyCoverage=await coverageGate.verify(repositoryRead);
  const app=loadApp({prisma,audit});
  if(!listen){const shell=require(path.join(ROOT,'backend/node_modules/express'))();shell.use(uiOnlyHttpBoundary);shell.use(app);listen=()=>new Promise((resolve,reject)=>{const s=shell.listen(55001,'127.0.0.1',()=>resolve(s));s.once('error',reject);});}
  server=await listen(app);
 }catch(e){restore?.();await raw.$disconnect();throw Error('UI_ONLY_STARTUP_BLOCKED');}
 return{readonlyCoverage,policy:{commands:false,automation:false,testMode:true,maxRunSeconds:1,mqtt:'disabled',audit:'DEV_MEMORY_ONLY',data:'HISTORICAL_PHASE_Y'},audit:audit.snapshot,async close(){if(closed)return;closed=true;try{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}finally{try{await raw.$disconnect();}finally{restore?.();}}}};
}
module.exports={assertConfig,routeAllowed,installBoundary,startUIOnly,createDatasource,preflightPolicy,uiOnlyHttpBoundary,runPreFrontendGate,validatePreFrontendEvidence,sanitizePreFrontendEvidence};
if(require.main===module){console.error('SEPARATE_UI_ONLY_APPROVAL_AND_SUPERVISOR_REQUIRED');process.exitCode=3;}
