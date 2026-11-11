// Pure, offline permission assessment; no password file, MQTT or filesystem access.
const {assess,TOPICS}=require('./mqtt-acl-prepare.cjs');
function evaluate(parsed,username){
 const witness=r=>r.filter.split('/').map(s=>s==='%u'?username:s==='%c'?'UNVERIFIED_CLIENT_ID':s==='+'?'PUMP_01':s==='#'?'assessment':s).join('/');
 const writes=parsed.rules.filter(r=>r.kind==='pattern'&&['write','readwrite'].includes(r.access)).map(r=>({line:r.line,topic:witness(r)})).map(x=>({...x,permission:assess(parsed,username,x.topic,'write')}));
 return {userBlockCount:parsed.users.filter(u=>u.name===username).length,readTopics:TOPICS.map(topic=>({topic,read:assess(parsed,username,topic)})),globalWriteWitnesses:writes,writeGranted:writes.some(x=>x.permission==='ALLOWED'),writeUncertain:writes.some(x=>x.permission==='UNDETERMINED'),commandPublish:assess(parsed,username,'smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01','write'),ownCommandRead:assess(parsed,username,`smart-agriculture/v1/devices/${username}/commands/PUMP_01`)};
}
module.exports={evaluate};
