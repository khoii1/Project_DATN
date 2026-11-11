// DEV acceptance only: diagnostic tap on the actual backend client, never another subscriber.
const {restrictSubscriber}=require('./mvp-iot-transport.cjs');
const {createDiagnostics}=require('./mvp-mqtt-read-diagnostics.cjs');
function receiveOnly(connect,endpoint,options,send=()=>{}){
 if(endpoint!=='mqtt://172.20.10.2:1883'||options.username!=='smartagri_backend'||!options.clientId?.startsWith('mvp-iot-backend-real-')||options.clean!==true||options.will)throw Error('REAL_DEV_MQTT_TARGET_REFUSED');
 // MQTT.js manualConnect defers all transport setup until the sanitized tap and
 // publish blockers are installed. packetreceive precedes CONNACK error handling.
 const d=createDiagnostics(),client=restrictSubscriber(connect(endpoint,{...options,protocolVersion:4,manualConnect:true,reconnectPeriod:0,connectTimeout:10000,resubscribe:false}));
 if(typeof client.connect!=='function')throw Error('REAL_DEV_MANUAL_CONNECT_UNSUPPORTED');
 if(typeof client._sendPacket==='function'){const original=client._sendPacket;client._sendPacket=function(packet,...args){if(packet?.cmd==='publish')throw Error('REAL_DEV_OUTBOUND_PUBLISH_FORBIDDEN');return original.call(this,packet,...args);};}
 const subscribe=client.subscribe.bind(client);client.subscribe=(filters,opts,callback)=>subscribe(filters,opts,(error,grants)=>{if(!error&&grants)d.counters.SUBACK_GRANTED+=grants.filter(g=>g.qos<=2).length;send({kind:'SUBACK',grants:grants?.map(g=>({topic:g.topic,qos:g.qos})),failed:!!error});callback?.(error,grants);});
 client.on('packetreceive',p=>{
  if(p?.cmd!=='connack')return;
  const record={kind:'CONNACK',protocolVersion:4,timestamp:new Date().toISOString(),clientId:options.clientId};
  if(Number.isInteger(p.returnCode))record.returnCode=p.returnCode;
  if(Number.isInteger(p.reasonCode))record.reasonCode=p.reasonCode;
  if(typeof p.sessionPresent==='boolean')record.sessionPresent=p.sessionPresent;
  send(record);
 });
 client.on('connect',()=>{d.counters.MQTT_CONNECTIONS++;});
 client.on('message',(topic,bytes,packet)=>{const previous=d.accepted.length;d.message(topic,bytes,packet);send({kind:'MQTT_RECEIPT',counters:{...d.counters},metadata:d.metadata.at(-1),accepted:d.accepted.length>previous?d.accepted.at(-1):null});});
 client.on('error',()=>send({kind:'TRANSPORT_ERROR'}));client.on('close',()=>send({kind:'TRANSPORT_CLOSED'}));
 client.connect(); // Exactly one explicit connect, after every tap/blocker above.
 return client;
}
module.exports={receiveOnly};
