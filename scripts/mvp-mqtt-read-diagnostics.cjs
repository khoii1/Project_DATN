// Offline-capable diagnostics only. No MQTT connection, credentials or database on import.
const { TextDecoder } = require('node:util');
const { topics } = require('./mvp-iot-transport.cjs');
const DEVICE='ESP32-GF-A-01', CODES=['TEMP_01','HUM_01','LIGHT_01','SOIL_01'];
const NAMES=['MQTT_CONNECTIONS','SUBACK_GRANTED','MQTT_MESSAGES_RECEIVED_RAW','TELEMETRY_TOPIC_MATCH','STATUS_TOPIC_MATCH','ACTUATOR_STATE_TOPIC_MATCH','TOPIC_MISMATCH','PAYLOAD_DECODE_SUCCESS','PAYLOAD_DECODE_FAILED','SCHEMA_VALID','SCHEMA_INVALID','DEVICE_ID_MISMATCH','TIMESTAMP_INVALID_OR_STALE','RETAINED_REJECTED','DUPLICATE_REJECTED','TELEMETRY_ACCEPTED','PERIODIC_OFF_ACCEPTED','OTHER_REJECTED'];
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function createDiagnostics({startedAt=Date.now(),now=Date.now}={}) {
 const counters=Object.fromEntries(NAMES.map(k=>[k,0])), metadata=[],accepted=[],seen=new Set();
 function message(topic,bytes,packet={}) {
  counters.MQTT_MESSAGES_RECEIVED_RAW++; // Must precede EVERY application filter.
  const idx=topics.indexOf(topic), at=now();
  const m={topic:idx<0?'UNEXPECTED_TOPIC':topic,payloadLength:bytes.length,qos:packet.qos,retain:!!packet.retain,duplicate:!!packet.dup,receivedAt:new Date(at).toISOString(),messageType:['TELEMETRY','STATUS','ACTUATOR_STATE'][idx]||'UNKNOWN'};
  const reject=(counter,reason)=>{counters[counter]++;m.validation='REJECTED';m.reason=reason;metadata.push(m);return m;};
  if(idx<0)return reject('TOPIC_MISMATCH','TOPIC_MISMATCH');
  counters[['TELEMETRY_TOPIC_MATCH','STATUS_TOPIC_MATCH','ACTUATOR_STATE_TOPIC_MATCH'][idx]]++;
  if(bytes.length>4096)return reject('OTHER_REJECTED','PAYLOAD_TOO_LARGE');
  let x;try{x=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));counters.PAYLOAD_DECODE_SUCCESS++;}catch{return reject('PAYLOAD_DECODE_FAILED','INVALID_UTF8_OR_JSON');}
  if(typeof x?.schemaVersion==='number')m.schemaVersion=x.schemaVersion;
  if(!x||typeof x!=='object'||Array.isArray(x))return reject('SCHEMA_INVALID','PAYLOAD_NOT_OBJECT');
  if(x.deviceCode!==DEVICE)return reject('DEVICE_ID_MISMATCH','DEVICE_ID_MISMATCH');
  m.deviceId=DEVICE;
  if(x.schemaVersion!==1)return reject('SCHEMA_INVALID','SCHEMA_VERSION_UNSUPPORTED');
  let valid=false;
  if(idx===0)valid=exact(x,['schemaVersion','deviceCode','recordedAt','readings'])&&Array.isArray(x.readings)&&x.readings.length===4&&CODES.every(code=>x.readings.filter(r=>r?.sensorCode===code).length===1)&&x.readings.every(r=>exact(r,['sensorCode','value'])&&typeof r.value==='number'&&Number.isFinite(r.value));
  if(idx===1)valid=exact(x,['schemaVersion','deviceCode','status'])&&['ONLINE','OFFLINE'].includes(x.status);
  if(idx===2)valid=exact(x,['schemaVersion','deviceCode','actuatorCode','state','reason','recordedAt'])&&x.actuatorCode==='PUMP_01'&&x.state==='OFF'&&['BOOT','RECONNECT','PERIODIC','MAX_RUNTIME','COMMAND','WIFI_LOST','MQTT_LOST','CLOCK_INVALID','STARTUP'].includes(x.reason);
  if(!valid)return reject('SCHEMA_INVALID','PAYLOAD_SCHEMA_INVALID');
  counters.SCHEMA_VALID++;
  if(packet.retain)return reject('RETAINED_REJECTED','RETAINED_NOT_FRESH');
  if(packet.dup)return reject('DUPLICATE_REJECTED','MQTT_DUP_FLAG');
  if(packet.qos!==1)return reject('OTHER_REJECTED','QOS_NOT_ONE');
  if(idx!==1){
   const ts=typeof x.recordedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(x.recordedAt)?Date.parse(x.recordedAt):NaN;
   if(!Number.isFinite(ts))return reject('TIMESTAMP_INVALID_OR_STALE','TIMESTAMP_INVALID');
   if(ts>at+2000)return reject('TIMESTAMP_INVALID_OR_STALE','TIMESTAMP_FUTURE');
   if(at-ts>30000||ts<startedAt)return reject('TIMESTAMP_INVALID_OR_STALE','TIMESTAMP_STALE_OR_BEFORE_SESSION');
   m.recordedAt=new Date(ts).toISOString();
  }
  const key=topic+'|'+(idx===1?x.status:m.recordedAt);
  if(seen.has(key))return reject('DUPLICATE_REJECTED','DUPLICATE_LOGICAL_SAMPLE');
  seen.add(key);m.validation='ACCEPTED';m.reason='VALID_FRESH_MESSAGE';metadata.push(m);
  // Whitelist observations, never serialize the original payload or unknown fields.
  const row={...m};
  if(idx===0){counters.TELEMETRY_ACCEPTED++;row.readings=x.readings.map(r=>({sensorCode:r.sensorCode,value:r.value,unit:{TEMP_01:'C',HUM_01:'%',LIGHT_01:'lux',SOIL_01:'%'}[r.sensorCode]}));}
  if(idx===1)row.status=x.status;
  if(idx===2){row.state='OFF';row.stateReason=x.reason;if(x.reason==='PERIODIC')counters.PERIODIC_OFF_ACCEPTED++;}
  accepted.push(row);return m;
 }
 function verdict(){return counters.TELEMETRY_ACCEPTED>0?{delivery:'MQTT_READ_UNBLOCKED',freshness:counters.TELEMETRY_ACCEPTED>=3?'MQTT_FRESH_TELEMETRY_ACCEPTED':'MQTT_FRESH_TELEMETRY_PARTIAL'}:{delivery:counters.MQTT_MESSAGES_RECEIVED_RAW===0?'MQTT_DELIVERY_NOT_OBSERVED':'MQTT_MESSAGES_FILTERED_OR_REJECTED',freshness:'NOT_VERIFIED'};}
 return{counters,metadata,accepted,message,verdict};
}
module.exports={createDiagnostics};
