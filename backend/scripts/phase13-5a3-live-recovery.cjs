// Controlled recovery diagnostic. Only SELECT/GET + one existing normal login.
// No server, gateway, command service, seed or simulator imports.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const root = path.resolve(__dirname,'../..');
const values = { ...require('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env'))), ...process.env };
const runId = process.argv[3];
if (!/^[a-zA-Z0-9-]{1,90}$/.test(runId || '')) throw Error('RUN_ID_REQUIRED');
const evidencePrefix = process.argv.includes('--phase13-5c3') ? 'phase13-5c3' : 'phase13-5a3';
const reportFile = path.join(root,`report/${evidencePrefix}-${runId}.json`);
const stateFile = path.join(root,`build/${evidencePrefix}-${runId}.state.json`);
const baselineFile = path.join(root,`report/${evidencePrefix}-${runId}-baseline.json`);
const read = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const codes = ['HUM_01','LIGHT_01','SOIL_01','TEMP_01'];
const safe = (ok,code) => { if(!ok) throw Error(code); };
const url = new URL(values.DATABASE_URL);
safe(['localhost','127.0.0.1'].includes(url.hostname) && (url.port || '5432')==='5432' && url.pathname==='/smart_agriculture','READ_TARGET_MISMATCH');
const db = new PrismaClient({datasourceUrl:values.DATABASE_URL});
async function snapshot(since) {
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [identity]=await tx.$queryRawUnsafe("SELECT current_database() AS database,current_schema() AS schema,inet_server_port() AS port,pg_postmaster_start_time()::text AS started");
    safe(identity.database==='smart_agriculture' && identity.schema==='public' && identity.port===5432,'READ_TARGET_MISMATCH');
    const device=await tx.device.findUnique({where:{deviceCode:'ESP32-GF-A-01'},select:{id:true,deviceCode:true,connectionStatus:true,lastSeenAt:true,
      sensors:{where:{sensorCode:{in:codes}},select:{id:true,sensorCode:true}},
      actuators:{where:{actuatorCode:'PUMP_01'},select:{id:true,currentState:true,lastStateChangedAt:true}}}});
    safe(device && device.sensors.length===4 && device.actuators.length===1,'DEVICE_SENSOR_ACTUATOR_CONTEXT_MISSING');
    const rows=since?await tx.sensorReading.findMany({where:{source:'MQTT',recordedAt:{gt:new Date(since)},sensor:{deviceId:device.id,sensorCode:{in:codes}}},orderBy:[{recordedAt:'asc'},{id:'asc'}],take:100,
      select:{id:true,value:true,source:true,recordedAt:true,receivedAt:true,sensor:{select:{id:true,sensorCode:true}}}}):[];
    return {at:new Date().toISOString(),identity,device,rows,pending:await tx.deviceCommand.count({where:{status:'PENDING'}}),commandCount:await tx.deviceCommand.count()};
  });
}
let headers = {'Connection':'close'};
async function api(route) {
  const response=await fetch('http://127.0.0.1:5000/api'+route,{headers,signal:AbortSignal.timeout(13000)});
  safe(response.ok,'API_GET_FAILED_'+response.status);
  return (await response.json()).data;
}
const result={runId,started:new Date().toISOString(),batches:[],offs:[],states:[],checks:[],physicalPumpTriggered:false,commandsIssued:0};
function save(){fs.writeFileSync(reportFile,JSON.stringify(result,null,2));}
async function main(){
  if(process.argv[2]==='--baseline'){
    const baseline=await snapshot();safe(baseline.pending===0,'PENDING_PRECHECK_FAILED');
    fs.writeFileSync(baselineFile,JSON.stringify(baseline,null,2));
    console.log(JSON.stringify({baseline:baselineFile,pending:baseline.pending,commandCount:baseline.commandCount,deviceState:baseline.device.connectionStatus,relay:baseline.device.actuators[0].currentState}));return;
  }
  safe(process.argv[2]==='--verify','MODE_REQUIRED');
  const baseline=read(baselineFile),state=read(stateFile);result.baseline=baseline;result.process=state;
  const deadline=Date.now()+100000;
  let healthy=false;
  while(Date.now()<deadline && !healthy){
    if(fs.existsSync(state.exitEvidence))throw Error('BACKEND_EXITED_NO_RETRY');
    try {result.health=await api('/health');healthy=result.health.database==='connected' && result.health.mqtt==='connected';}catch{ }
    if(!healthy)await sleep(750);
  }
  safe(healthy,'BACKEND_HEALTH_NOT_READY');
  const out=fs.readFileSync(state.stdout,'utf8');
  const attestation=out.match(/MQTT pump safety runtime:\s*(\{[^\r\n]+\})/);
  // Recovery logger may still buffer startup output. In that case require protected
  // live runtime API below; never substitute a historical PID's startup attestation.
  const apiRuntimeFallback=evidencePrefix==='phase13-5c3' && !attestation;
  safe(attestation || apiRuntimeFallback,'RUNTIME_ATTESTATION_MISSING');
  result.runtime=attestation?JSON.parse(attestation[1]):null;
  if(result.runtime) safe(result.runtime.pid===state.pid && result.runtime.commandsEnabled===false && result.runtime.automationEnabled===false && result.runtime.testMode===true && result.runtime.effectiveMaxRunSeconds===1,'UNSAFE_RUNTIME_STOP_REQUIRED');
  result.runtimeEvidenceMethod=apiRuntimeFallback?'PROTECTED_LIVE_API_AND_LISTENER_PID_STARTUP_LOG_BUFFERED':'SERVING_PID_STARTUP_LOG_AND_API';
  result.mqttLogs={connackAcceptedEvent:out.includes('MQTT connected: host=172.20.10.2 port=1883'),subscriptionsRestored:out.includes('MQTT subscriptions restored'),offSubscription:out.includes('MQTT OFF-state observation subscribed (commands disabled)')};
  if(!apiRuntimeFallback) safe(Object.values(result.mqttLogs).every(Boolean),'MQTT_SUBSCRIPTIONS_NOT_PROVEN');
  const listener=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',"@(Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true}));
  result.listenerPids=Array.isArray(listener)?listener:[listener];safe(result.listenerPids.length===1 && result.listenerPids[0]===state.pid,'SERVING_PID_MISMATCH');
  // Existing demo account is read locally, never logged or reseeded.
  const seed=fs.readFileSync(path.join(root,'backend/prisma/seed.ts'),'utf8');
  const credential=seed.match(/email:\s*"(owner@smartagri\.local)",\s*password:\s*"([^"]+)"/);
  safe(credential,'EXISTING_AUTH_METHOD_UNAVAILABLE');
  const login=await fetch('http://127.0.0.1:5000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Connection':'close'},body:JSON.stringify({email:credential[1],password:credential[2]}),signal:AbortSignal.timeout(8000)});
  safe(login.ok,'EXISTING_AUTH_FAILED');
  const auth=await login.json();safe(auth.data?.accessToken,'AUTH_TOKEN_MISSING');headers={...headers,Authorization:'Bearer '+auth.data.accessToken};
  result.auth={method:'NORMAL_EXISTING_ACCOUNT_LOGIN',loginActivityExpected:true,tokenPersisted:false};
  let session=null;
  while(Date.now()<deadline && (result.batches.length<3 || result.offs.length<3)){
    if(fs.existsSync(state.exitEvidence))throw Error('BACKEND_EXITED_NO_RETRY');
    const sql=await snapshot(state.startedAt);
    safe(sql.pending===0 && sql.commandCount===baseline.commandCount,'UNEXPECTED_COMMAND_OR_PENDING_STOP_REQUIRED');
    result.states.push({at:sql.at,connectionStatus:sql.device.connectionStatus,lastSeenAt:sql.device.lastSeenAt,...sql.device.actuators[0]});
    const live=await api('/live-evidence?deviceId='+encodeURIComponent(sql.device.id));
    safe(live.runtime?.commandsEnabled===false && live.runtime?.automationEnabled===false && live.runtime?.pumpTestMode===true,'UNSAFE_API_RUNTIME_STOP_REQUIRED');
    result.protectedApiRuntime=live.runtime;
    safe(live.verifiedLiveReady===false && live.engineCalled===false,'UNEXPECTED_TRUST_OR_ENGINE_STATE');
    if(session && session!==live.observer.sessionId)throw Error('MQTT_OBSERVER_SESSION_CHANGED_NOT_ACCEPTED');
    session=live.observer.sessionId;result.observer=live.observer;result.clock=live.clock;
    const pump=(await api('/actuators/'+sql.device.actuators[0].id)).actuator;
    safe(pump.gatewayMode==='DISABLED' && pump.controlEnabled===false,'UNSAFE_ACTUATOR_API_STOP_REQUIRED');
    result.actuatorApi={id:pump.id,currentState:pump.currentState,gatewayMode:pump.gatewayMode,controlEnabled:pump.controlEnabled,lastStateChangedAt:pump.lastStateChangedAt};
    const packet=live.reading;
    if(packet && new Date(packet.recordedAt)>new Date(state.startedAt) && packet.qos===1 && packet.retain===false && packet.dup===false && packet.sessionId===session && packet.reading?.source==='MQTT' && !result.batches.some(b=>b.recordedAt===packet.recordedAt)){
      const rows=sql.rows.filter(r=>r.recordedAt.toISOString()===packet.recordedAt);
      if(rows.length===4){
        assert.deepEqual(rows.map(r=>r.sensor.sensorCode).sort(),codes);
        const apiRows=[];
        for(const row of rows){
          const from=encodeURIComponent(new Date(Date.parse(packet.recordedAt)-1).toISOString());
          const to=encodeURIComponent(new Date(Date.parse(packet.recordedAt)+1).toISOString());
          const history=await api('/sensors/'+row.sensor.id+'/readings?from='+from+'&to='+to+'&limit=10');
          const match=history.items.find(r=>r.id===row.id);
          safe(match && match.value===row.value && match.source==='MQTT' && match.recordedAt===row.recordedAt.toISOString() && match.receivedAt===row.receivedAt.toISOString(),'READING_API_DB_MISMATCH');
          apiRows.push({id:match.id,sensorCode:row.sensor.sensorCode,value:match.value,source:match.source,recordedAt:match.recordedAt,receivedAt:match.receivedAt});
        }
        result.batches.push({recordedAt:packet.recordedAt,receiptId:packet.receiptId,sessionId:session,qos:packet.qos,retain:packet.retain,dup:packet.dup,callbackReceivedAt:packet.callbackReceivedAt,rows:apiRows});
      }
    }
    const off=live.off, actuator=sql.device.actuators[0];
    if(off && off.reason==='PERIODIC' && off.qos===1 && off.retain===false && off.dup===false && off.sessionId===session && new Date(off.recordedAt)>new Date(state.startedAt) && !result.offs.some(o=>o.recordedAt===off.recordedAt) && actuator.currentState==='OFF' && actuator.lastStateChangedAt?.toISOString()===off.recordedAt && pump.currentState==='OFF' && pump.lastStateChangedAt===off.recordedAt){
      result.offs.push(off);
    }
    result.finalDatabase={at:sql.at,pending:sql.pending,commandCount:sql.commandCount,device:sql.device};save();
    console.log(JSON.stringify({sampleAt:sql.at,batches:result.batches.length,offs:result.offs.length,online:sql.device.connectionStatus,relay:actuator.currentState,clock:live.clock.health}));
    await sleep(1000);
  }
  const final=await snapshot(state.startedAt);result.finalDatabase={at:final.at,pending:final.pending,commandCount:final.commandCount,device:final.device};
  safe(final.pending===0 && final.commandCount===baseline.commandCount,'UNEXPECTED_FINAL_COMMAND_STATE_STOP_REQUIRED');
  result.verdicts={backendStartup:'PASS',mqttBackendConnection:'PASS',telemetry:result.batches.length>=3?'PASS':'NOT_VERIFIED',periodicOff:result.offs.length>=3?'PASS':'NOT_VERIFIED',online:final.device.connectionStatus==='ONLINE' && new Date(final.device.lastSeenAt)>new Date(state.startedAt),runtimeCommandsDisabled:true,runtimeAutomationDisabled:true};
  result.status='RUNNING';result.ended=new Date().toISOString();save();
  console.log(JSON.stringify({report:reportFile,...result.verdicts,backendPid:state.pid,readings:result.batches.length*4,offReports:result.offs.length,exitCodeWritten:fs.existsSync(state.exitEvidence)}));
}
main().catch(e=>{result.error={code:e.code,type:e.name,reason:/^[A-Z0-9_]+$/.test(e.message)?e.message:'VERIFICATION_ERROR_REDACTED'};result.ended=new Date().toISOString();save();console.error(JSON.stringify(result.error));process.exitCode=1;}).finally(()=>db.$disconnect());
