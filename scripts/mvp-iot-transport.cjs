// Bench-only read-only transport. Never imported by production.
const PREFIX='smart-agriculture/v1',DEVICE='ESP32-GF-A-01';
const topics=['telemetry','status','actuator/state'].map(x=>`${PREFIX}/devices/${DEVICE}/${x}`);
function restrictSubscriber(client){
 const subscribe=client.subscribe.bind(client);
 client.publish=()=>{throw Error('IOT_BENCH_ALL_PUBLISH_FORBIDDEN');};
 client.subscribe=function(filters,...args){
  const exact=value=>{const fixed=value.replace(`${PREFIX}/devices/+/`,`${PREFIX}/devices/${DEVICE}/`);if(!topics.includes(fixed))throw Error('IOT_BENCH_SUBSCRIPTION_FORBIDDEN');return fixed;};
  if(typeof filters==='string')return subscribe(exact(filters),...args);
  if(Array.isArray(filters))return subscribe(filters.map(exact),...args);
  throw Error('IOT_BENCH_SUBSCRIPTION_SHAPE_FORBIDDEN');
 };
 return client;
}
module.exports={restrictSubscriber,topics};
