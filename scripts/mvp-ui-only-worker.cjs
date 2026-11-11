// Supervised child only. No start/connect on import. No secrets in IPC/stdout.
const fs=require('node:fs'),path=require('node:path');
const {readTransaction}=require('./mvp-ui-only-readonly.cjs');
const {PIN,SENSORS}=require('./mvp-real-device-resume.cjs');
const {READING_IDS,authoritativeUnits,deriveMeasurementUnits}=require('./mvp-ui-only-historical.cjs');
async function snapshot(raw,options){return readTransaction(raw,async tx=>{
 const [identity]=await tx.$queryRawUnsafe("SELECT current_database() AS db,current_user AS role,inet_server_port() AS port,current_schema() AS schema,current_setting('transaction_read_only') AS readonly");
 const migrations=await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
 const mapping={farm:await tx.farm.findUnique({where:{id:PIN.farmId}}),zone:await tx.zone.findUnique({where:{id:PIN.zoneId}}),devices:await tx.device.findMany({where:{OR:[{id:PIN.deviceId},{deviceCode:PIN.deviceCode}]}}),sensors:await tx.sensor.findMany({where:{OR:[{deviceId:PIN.deviceId},{id:{in:SENSORS.map(x=>x[0])}}]}}),actuators:await tx.actuator.findMany({where:{OR:[{deviceId:PIN.deviceId},{id:PIN.actuatorId}]}})};
 const readings=await tx.sensorReading.findMany({where:{id:{in:READING_IDS}},orderBy:{id:'asc'}});
 const metadata=authoritativeUnits(fs.readFileSync(path.join(__dirname,'../backend/src/constants/sensor-metadata.ts'),'utf8'),fs.readFileSync(path.join(__dirname,'../frontend/src/types/sensor.ts'),'utf8'));
 const measurementUnits=deriveMeasurementUnits(readings,mapping.sensors,metadata);
 let persistedActivityLog;
 try{persistedActivityLog=await tx.activityLog.count();if(!Number.isSafeInteger(persistedActivityLog)||persistedActivityLog<0)throw Error();}catch{throw Error('AUDIT_PERSISTENCE_BASELINE_BLOCKED');}
 const counts={commands:await tx.deviceCommand.count(),pending:await tx.deviceCommand.count({where:{status:'PENDING'}}),enabledAutomation:await tx.automationRule.count({where:{enabled:true}}),actuatorOn:await tx.actuator.count({where:{currentState:'ON'}}),allReadings:await tx.sensorReading.count(),persistedActivityLog};
 return{identity,migrations,mapping,readings,measurementUnits,counts};
},options);}
async function worker(){
 if(!process.connected||process.env.MVP_UI_ONLY_WORKER!=='true')throw Error('SUPERVISOR_REQUIRED');
 const read=fs.readFileSync,exists=fs.existsSync,envFile=f=>typeof f==='string'&&/^\.env(?:\.|$)/.test(path.basename(f));
 fs.existsSync=function(f){return envFile(f)?false:exists.call(this,f);};fs.readFileSync=function(f,...args){if(envFile(f))throw Error('UI_ONLY_ENV_FILE_REFUSED');return read.call(this,f,...args);};
 let raw,env,proof,lifecycle,stopped=false,nativeFailure;const pids=new Set();let verified=0;
 const onVerified=row=>{verified++;pids.add(row.pid);};
 process.on('message',async m=>{
  if(stopped)return;let data;
  try{
   if(m.cmd==='INIT'){
    if(raw)throw Error('NO_RETRY');proof=m.proof;
    const {observeNativeExit}=require('./mvp-native-exit.cjs');
    const dec=await observeNativeExit({executable:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',args:['-NoProfile','-NonInteractive','-File',path.join(__dirname,'mvp-dev-existing-unprotect.ps1'),'-CredentialFile','C:\\DATN\\test-instances\\phase13-3b\\mvp-direct-1793193356053-b27caf\\credentials.dpapi'],cwd:process.cwd(),environment:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'},deadline:15000});
    if(dec.code!==0||dec.unknown||dec.stderr){nativeFailure={nativeCode:Number.isInteger(dec.code)?dec.code:null,unknown:!!dec.unknown};throw Error('DEV_DPAPI_FAILED');}
    const secrets=JSON.parse(dec.stdout);dec.stdout='';
    env={DATABASE_URL:`postgresql://sa_mvp_dev_app:${encodeURIComponent(secrets.appPassword)}@127.0.0.1:55433/smart_agriculture_mvp_dev?schema=public`,JWT_SECRET:secrets.jwtSecret,NODE_ENV:'development',PORT:'55001',CLIENT_URL:'http://127.0.0.1:55173',MQTT_ENABLED:'false',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1'};
    for(const key of Object.keys(secrets))secrets[key]=null;
    Object.assign(process.env,env);
    const {PrismaClient}=require(path.resolve(__dirname,'../backend/node_modules/@prisma/client'));
    raw=require('./mvp-ui-only-api.cjs').createDatasource({env,proof,PrismaClient});data={initialized:true};
   }else if(m.cmd==='STOP'&&!raw){stopped=true;data={otherClients:null,notInitialized:true};}
   else if(!raw)throw Error('NOT_INITIALIZED');
   else if(m.cmd==='SNAPSHOT'){
    const options={expectedStart:proof.postmasterStart,onVerified};
    // Actual concurrent pool paths, all inside guarded transactions; no test DML.
    await Promise.all([readTransaction(raw,()=>true,options),readTransaction(raw,()=>true,options)]);
    data=await snapshot(raw,options);data.poolVerification={transactions:verified,backendPids:[...pids],readonly:'on'};
   }else if(m.cmd==='START_API'){
    if(lifecycle)throw Error('NO_RETRY');proof={...proof,checkedAt:new Date().toISOString()};
    lifecycle=await require('./mvp-ui-only-api.cjs').startUIOnly({env,proof,raw,onReadonlyVerified:onVerified});data={pid:process.pid,owned:true,policy:lifecycle.policy,readonlyCoverage:lifecycle.readonlyCoverage};
   }else if(m.cmd==='GATE_OBSERVATION'){
    if(!lifecycle)throw Error('API_NOT_READY');data={pid:process.pid,audit:lifecycle.audit(),policy:lifecycle.policy,verifiedTransactions:verified};
   }else if(m.cmd==='STOP'){
    stopped=true;if(lifecycle)await lifecycle.close();else await raw.$disconnect();
    // Reuse the same supervised client for one cleanup-only readonly probe;
    // previous pool is closed, so idle connections from it cannot skew count.
    const [row]=await readTransaction(raw,tx=>tx.$queryRawUnsafe("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND datname IS NOT NULL AND (backend_type='client backend' OR backend_type IS NULL)"));
    await raw.$disconnect();data={otherClients:row.n};
   }else throw Error('UNKNOWN_COMMAND');
   process.send({id:m.id,ok:true,data},()=>{if(stopped){process.disconnect();process.exitCode=0;}});
  }catch{
   process.send({id:m.id,ok:false,category:'UI_ONLY_WORKER_GATE_FAILED',...nativeFailure});nativeFailure=undefined;
   if(stopped){await raw?.$disconnect().catch(()=>{});process.disconnect();process.exitCode=3;}
  }
 });
}
module.exports={snapshot};
if(require.main===module)worker().catch(()=>{console.error('UI_ONLY_WORKER_BLOCKED');process.exitCode=3;});
