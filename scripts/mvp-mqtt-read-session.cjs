// One read-only MQTT session. No database, backend, frontend, COM or application publishes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createDiagnostics}=require('./mvp-mqtt-read-diagnostics.cjs');
const {restrictSubscriber,topics}=require('./mvp-iot-transport.cjs');
const BASE='C:\\DATN\\test-instances\\phase13-3b',ROOT=path.resolve(__dirname,'..');
const APPROVAL='C:\\Users\\Acer Swift3\\.codex\\attachments\\48803163-d765-409a-83b5-0439d8b93136\\Pasted text.txt';
const FILES=['scripts/mvp-mqtt-read-session.cjs','scripts/mvp-mqtt-read-diagnostics.cjs','scripts/mvp-iot-transport.cjs','scripts/mvp-mqtt-read-launch.ps1','firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino','firmware/SmartAgricultureESP32/PumpProtocol.h'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2),{flag:'wx'});
function prepare(){
 const run=path.join(BASE,'mvp-mqtt-read-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'));fs.mkdirSync(run);
 write(path.join(run,'plan.json'),{at:new Date().toISOString(),approvalHash:hash(APPROVAL),hashes:Object.fromEntries(FILES.map(f=>[f,hash(path.join(ROOT,f))])),endpoint:'mqtt://172.20.10.2:1883',topics,seconds:90,requiresOperatorSafetyConfirmation:true});
 console.log(JSON.stringify({run}));
}
async function execute(run,input){
 if(path.dirname(run)!==BASE||!/^mvp-mqtt-read-\d+-[a-f0-9]+$/.test(path.basename(run)))throw Error('PATH_REFUSED');
 const plan=JSON.parse(fs.readFileSync(path.join(run,'plan.json'),'utf8'));
 if(hash(APPROVAL)!==plan.approvalHash)throw Error('APPROVAL_DRIFT');
 for(const[f,h]of Object.entries(plan.hashes))if(hash(path.join(ROOT,f))!==h)throw Error('SOURCE_DRIFT');
 if(input.operatorConfirmed!==true||!input.username||!input.password)throw Error('LOCAL_HANDOFF_REFUSED');
 write(path.join(run,'attempt.json'),{at:new Date().toISOString(),oneSession:true,operatorConfirmed:true,connectAttempts:1,publishForbidden:true});
 const start=Date.now(),d=createDiagnostics({startedAt:start}),summary={startedAt:new Date(start).toISOString(),endpoint:plan.endpoint,topics,clientId:'mvp-read-'+path.basename(run),protocol:'MQTT_3_1_1',cleanSession:true,automaticReconnect:false,connections:[],subscription:[],stopReason:null};
 let client,closeUnknown=false;
 try{
  const mqtt=require(path.join(ROOT,'backend/node_modules/mqtt'));
  client=restrictSubscriber(mqtt.connect(plan.endpoint,{clientId:summary.clientId,username:input.username,password:input.password,protocolVersion:4,clean:true,resubscribe:false,reconnectPeriod:0,connectTimeout:10000}));
  input.username=null;input.password=null;
  await new Promise(resolve=>{
   let done=false;const finish=reason=>{if(done)return;done=true;summary.stopReason=reason;clearTimeout(timer);resolve();};
   const timer=setTimeout(()=>finish('OBSERVATION_90_SECOND_LIMIT'),90000);
   client.on('error',()=>finish('MQTT_ERROR_NO_RETRY')); // Never log native error text/credentials.
   client.on('close',()=>finish('MQTT_DISCONNECTED_NO_RETRY'));
   client.on('message',(topic,bytes,packet)=>{d.message(topic,bytes,packet);if(d.counters.MQTT_MESSAGES_RECEIVED_RAW>=256)finish('MESSAGE_LIMIT');});
   client.once('connect',packet=>{
    d.counters.MQTT_CONNECTIONS++;summary.connections.push({at:new Date().toISOString(),returnCode:packet.returnCode,sessionPresent:packet.sessionPresent});
    client.subscribe(topics,{qos:1},(err,grants)=>{
     summary.subscription=(grants||[]).map(g=>({topic:topics.includes(g.topic)?g.topic:'UNEXPECTED_TOPIC',qos:g.qos}));
     if(err||grants?.length!==3||grants.some(g=>g.qos!==1)){finish('SUBACK_NOT_GRANTED');return;}
     d.counters.SUBACK_GRANTED+=grants.length;
     console.log('MQTT_CONNECTED_SUBACK_3_GRANTED_OBSERVING_MAX_90_SECONDS');
    });
   });
  });
 }catch{summary.stopReason='EXECUTION_ERROR_NO_RETRY';}
 finally{
  if(client)await new Promise(resolve=>{const timer=setTimeout(()=>{closeUnknown=true;resolve();},5000);client.end(false,{},()=>{clearTimeout(timer);resolve();});});
  summary.endedAt=new Date().toISOString();summary.elapsedMs=Date.now()-start;summary.counters=d.counters;summary.diagnostic=d.verdict();summary.close=closeUnknown?'UNKNOWN_NO_RETRY':'CLOSED';
  const good=summary.stopReason==='OBSERVATION_90_SECOND_LIMIT'&&!closeUnknown&&d.counters.SUBACK_GRANTED===3;
  summary.verdict=!good?'MQTT_READ_DIAGNOSTICS_BLOCKED':d.counters.TELEMETRY_ACCEPTED>=3?'MQTT_READ_DIAGNOSTICS_PASS':'MQTT_READ_DIAGNOSTICS_PARTIAL';
  summary.safety={applicationPublishes:0,devStarted:false,databaseAccess:false,physicalActuation:false,automation:false,soilQuality:'SOIL_QUALITY_BLOCKED_ADC_AT_RAIL'};
  write(path.join(run,'metadata.json'),d.metadata);write(path.join(run,'accepted-whitelist.json'),d.accepted);write(path.join(run,'summary.json'),summary);
  input.username=null;input.password=null;
  console.log(JSON.stringify({run,verdict:summary.verdict,diagnostic:summary.diagnostic,counters:d.counters,close:summary.close}));
 }
}
if(require.main===module)(async()=>{const a=process.argv.slice(2);if(a.length===1&&a[0]==='--prepare')return prepare();if(a.length!==2||a[0]!=='--execute')throw Error('MODE_REQUIRED');let s='';for await(const b of process.stdin){s+=b;if(s.length>8192)throw Error('HANDOFF_LIMIT');}const input=JSON.parse(s);s='';await execute(path.resolve(a[1]),input);})().catch(()=>{console.error('MQTT_READ_STOPPED_NO_RETRY');process.exitCode=1;});
