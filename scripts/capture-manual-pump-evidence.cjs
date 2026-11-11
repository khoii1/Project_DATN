// Read-only historical command evidence. Does not import MQTT or send device commands.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dotenv=require(path.join(root,'backend/node_modules/dotenv'));
const output=path.resolve(process.argv[2]||'');
if(path.dirname(output)!==path.join(root,'docs/evidence')||!/^manual-pump-terminal-\d+$/.test(path.basename(output)))throw Error('OUTPUT_PATH_REFUSED');
const e=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env'))),u=new URL(e.DATABASE_URL);
if(!['127.0.0.1','localhost'].includes(u.hostname)||(u.port||'5432')!=='5432'||u.pathname!=='/smart_agriculture')throw Error('READ_ONLY_TARGET_REFUSED');
const sql=`BEGIN READ ONLY; SET LOCAL statement_timeout='5000'; SELECT json_build_object('systemId',(SELECT system_identifier::text FROM pg_control_system()),'capturedAt',clock_timestamp(),'commands',(SELECT json_agg(row_to_json(c)) FROM (SELECT d.device_code,a.actuator_code,dc.correlation_id AS command_id,dc.command,dc.source,dc.transport,dc.max_run_seconds,dc.status,dc.requested_at,dc.sent_at,dc.acknowledged_at,dc.completed_at,dc.failure_reason FROM device_commands dc JOIN actuators a ON a.id=dc.actuator_id JOIN devices d ON d.id=a.device_id WHERE dc.correlation_id IN ('4a93eb02-ba36-40a5-bb78-fdc7e81015b6','0cefc135-ff16-418d-bc3f-70ccaabee8bd') AND d.device_code='ESP32-GF-A-01' AND a.actuator_code='PUMP_01' ORDER BY dc.requested_at)c)); COMMIT;`;
const env={SystemRoot:'C:/Windows',WINDIR:'C:/Windows',PGPASSWORD:decodeURIComponent(u.password),PGCONNECT_TIMEOUT:'5'};
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-q','-A','-t','-w','-h','127.0.0.1','-p','5432','-U',decodeURIComponent(u.username),'-d','smart_agriculture','-v','ON_ERROR_STOP=1','-c',sql],{env,encoding:'utf8',windowsHide:true,timeout:12000});env.PGPASSWORD='';
if(r.status!==0)throw Error('READ_ONLY_QUERY_FAILED');
const data=JSON.parse(r.stdout.trim());if(data.systemId!=='7472695863566132416'||data.commands?.length!==2)throw Error('EVIDENCE_IDENTITY_OR_ROW_COUNT_MISMATCH');
fs.writeFileSync(path.join(output,'command-evidence.json'),JSON.stringify({scope:'READ_ONLY_DATABASE_HISTORY_NOT_RAW_MQTT_PACKET_LOG',nativeExit:0,...data},null,2),{flag:'wx'});
console.log('SMART AGRICULTURE - MANUAL PUMP / MQTT COMMAND & ACK RESULT');
console.log('Source: PostgreSQL command history | Query: READ ONLY | psql exit: 0');
console.log('This is saved backend evidence, NOT a raw MQTT packet capture.');
console.log('No MQTT publish or pump activation was performed for this screenshot.');
console.log('Captured: '+data.capturedAt);
console.log('Device: ESP32-GF-A-01 | Actuator: PUMP_01');
console.log('Command topic: smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01');
console.log('ACK topic: smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01');
for(const [i,c]of data.commands.entries()){
 console.log('');console.log('['+(i+1)+'] STORED MANUAL COMMAND: '+c.command);
 console.log('Command ID  : '+c.command_id);
 console.log('Transport   : '+c.transport+' | Max runtime: '+c.max_run_seconds+' second');
 console.log('RequestedAt : '+c.requested_at+'Z (UTC)');
 console.log('PublishedAt : '+c.sent_at+'Z (UTC)');
 console.log('ACK savedAt : '+c.acknowledged_at+'Z (UTC)');
 console.log('Final status: '+c.status+' | Failure: '+(c.failure_reason??'NONE'));
}
console.log('');console.log('Operator observation: pump stopped automatically after about 1 second.');
console.log('ACK confirms relay command outcome; motor/water flow is separate evidence.');
console.log('Raw ACK payload / precise GPIO pulse duration: NOT CAPTURED.');
