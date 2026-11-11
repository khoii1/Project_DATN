const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{receiveOnly}=require('./mvp-real-mqtt-transport.cjs');
const opts={username:'smartagri_backend',password:'SYNTHETIC_ONLY',clientId:'mvp-iot-backend-real-test',clean:true};
function setup(onConnect){let publishes=0,connects=0;const events=[],c=new EventEmitter();c.subscribe=(f,o,cb)=>cb(null,(Array.isArray(f)?f:[f]).map(topic=>({topic,qos:1})));c.publish=()=>publishes++;c._sendPacket=p=>{if(p.cmd==='publish')publishes++;};c.connect=()=>{connects++;onConnect?.(c);};let actual;const client=receiveOnly((endpoint,o)=>{actual={endpoint,options:o};return c;},'mqtt://172.20.10.2:1883',opts,x=>events.push(x));return{client,events,actual,publishes:()=>publishes,connects:()=>connects};}
test('both public publish and lower packet path are blocked, no outbound publish',()=>{const x=setup();assert.throws(()=>x.client.publish('anything','OFF'));assert.throws(()=>x.client._sendPacket({cmd:'publish',topic:'anything'}));assert.equal(x.publishes(),0);x.client._sendPacket({cmd:'puback'});});
test('one backend connection clean session no retry; subscriptions narrowed to real device',()=>{const x=setup();assert.equal(x.actual.options.reconnectPeriod,0);x.client.subscribe(['smart-agriculture/v1/devices/+/telemetry'],{qos:1},()=>{});assert.equal(x.events[0].grants[0].topic,'smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry');assert.throws(()=>x.client.subscribe(['smart-agriculture/v1/devices/+/commands/+'],{qos:1},()=>{}));});
test('raw callback evidence is counted before payload validation, no secret reflection',()=>{const x=setup();x.client.emit('message','smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry',Buffer.from('SYNTHETIC_SECRET_INVALID'),{qos:1});const e=x.events.at(-1);assert.equal(e.counters.MQTT_MESSAGES_RECEIVED_RAW,1);assert.equal(e.metadata.reason,'INVALID_UTF8_OR_JSON');assert.ok(!JSON.stringify(e).includes('SYNTHETIC_SECRET'));});
test('wrong account, shared client ID, will or broker refused before connection',()=>{for(const[endpoint,o]of[['mqtt://127.0.0.1:1883',opts],['mqtt://172.20.10.2:1883',{...opts,username:'other'}],['mqtt://172.20.10.2:1883',{...opts,clientId:'ESP32-GF-A-01'}],['mqtt://172.20.10.2:1883',{...opts,will:{topic:'any'}}]])assert.throws(()=>receiveOnly(()=>{throw Error('MUST_NOT_CONNECT');},endpoint,o),/TARGET_REFUSED/);});

test('successful CONNACK captured before connect handler, exactly one deferred transport start',()=>{
 const x=setup(c=>{assert.equal(c.listenerCount('packetreceive'),1);assert.throws(()=>c.publish('any','any'));assert.throws(()=>c._sendPacket({cmd:'publish'}));c.emit('packetreceive',{cmd:'connack',returnCode:0,sessionPresent:false,password:'SYNTHETIC_HIDDEN'});c.emit('connect',{returnCode:0});});
 assert.equal(x.connects(),1);assert.equal(x.actual.options.manualConnect,true);assert.equal(x.actual.options.protocolVersion,4);assert.equal(x.events.length,1);assert.equal(x.events[0].returnCode,0);assert.equal(x.events[0].protocolVersion,4);assert.ok(!JSON.stringify(x.events).includes('SYNTHETIC_HIDDEN'));
});
test('refused CONNACK packet observed before error callback; never synthesizes successful connect',()=>{
 const x=setup(c=>{c.emit('packetreceive',{cmd:'connack',returnCode:5,sessionPresent:false});c.emit('error',new Error('SYNTHETIC_HIDDEN'));c.emit('close');});
 assert.deepEqual(x.events.map(e=>e.kind),['CONNACK','TRANSPORT_ERROR','TRANSPORT_CLOSED']);assert.equal(x.events[0].returnCode,5);assert.equal(x.connects(),1);assert.ok(!JSON.stringify(x.events).includes('SYNTHETIC_HIDDEN'));
});
test('transport error without CONNACK is not assigned a broker return code',()=>{
 const x=setup(c=>{c.emit('packetreceive',{cmd:'connect',username:'SYNTHETIC_HIDDEN',password:'SYNTHETIC_HIDDEN'});c.emit('error',new Error('SYNTHETIC_HIDDEN'));});
 assert.deepEqual(x.events,[{kind:'TRANSPORT_ERROR'}]);assert.equal(x.connects(),1);
});
