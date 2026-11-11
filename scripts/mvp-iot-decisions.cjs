// Selected software-only decisions from the existing closed test graph; never imports runtime/DB/MQTT.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const file=path.resolve(__dirname,'../backend/scripts/shadow-irrigation.test.cjs'),source=fs.readFileSync(file,'utf8');
const cut=source.indexOf('for (const [value, outcome, reason]');assert.ok(cut>0,'EXPLICIT_TEST_GRAPH_BOUNDARY_REQUIRED');
const api=new Function('require','__dirname',source.slice(0,cut)+'\nreturn {base,decideIrrigation,plain};')(createRequire(file),path.dirname(file));
const scenarios=[
 ['dry',s=>{s.reading.value=18;},'WOULD_ON','SOIL_BELOW_THRESHOLD'],
 ['wet',s=>{s.reading.value=80;},'WOULD_SKIP','SOIL_MOISTURE_SUFFICIENT'],
 ['hysteresis',s=>{s.reading.value=30;},'WOULD_SKIP','HYSTERESIS_IDLE'],
 ['stale',s=>{s.reading.recordedAt=new Date(Date.parse(s.now)-600000).toISOString();},'BLOCKED','STALE_READING'],
 ['invalid',s=>{s.reading.value=null;},'BLOCKED','SNAPSHOT_INVALID'],
 ['missing',s=>{delete s.reading;},'BLOCKED','SNAPSHOT_INVALID'],
 ['offline',s=>{s.device.connectionStatus='OFFLINE';},'BLOCKED','DEVICE_NOT_ONLINE'],
 ['unknown_actuator',s=>{s.actuator.state='UNKNOWN';},'BLOCKED','PUMP_STATE_UNKNOWN'],
 ['cooldown',s=>{s.safety.lastActuatorOffAt=new Date(Date.parse(s.now)-1000).toISOString();},'BLOCKED','COOLDOWN_ACTIVE'],
 ['duplicate',s=>{s.reading.mqtt.duplicate=true;},'BLOCKED','DUPLICATE_READING'],
 ['restart_lost_cycle',s=>{s.cycle=null;},'BLOCKED','CYCLE_STATE_UNTRUSTED'],
 ['clock_unknown',s=>{s.clock.health='UNKNOWN';},'BLOCKED','CLOCK_UNKNOWN'],
 ['expired_clock',s=>{s.clock.checkedAt=new Date(Date.parse(s.now)-600000).toISOString();},'BLOCKED','CLOCK_SNAPSHOT_STALE'],
 ['emergency_stop_before_clock',s=>{s.safety.emergencyStop=true;s.clock.health='UNKNOWN';},'BLOCKED','EMERGENCY_STOP'],
 ['untrusted_publisher',s=>{s.reading.mqtt.verified=false;},'BLOCKED','MQTT_READING_UNTRUSTED'],
 ['retained',s=>{s.reading.mqtt.retained=true;},'BLOCKED','RETAINED_READING'],
 ['runtime_above_1s',s=>{s.rule.pulseSeconds=2;},'BLOCKED','POLICY_RUNTIME_EXCEEDED'],
];
const results=scenarios.map(([id,change,outcome,reason])=>{const snapshot=api.base();change(snapshot);const actual=api.decideIrrigation(snapshot);assert.equal(actual.outcome,outcome,id);assert.equal(actual.reasonCode,reason,id);return{id,kind:'SHADOW_ONLY_SYNTHETIC_INPUT',timestamp:snapshot.now,soilValue:snapshot.reading?.value??null,outcome:actual.outcome,reasonCode:actual.reasonCode,recommendedRunSeconds:actual.recommendedRunSeconds,result:'PASS',realCommands:0};});
const run=process.argv[2];assert.ok(run&&path.dirname(path.resolve(run))==='C:\\DATN\\test-instances\\phase13-3b');
fs.writeFileSync(path.join(run,'offline-decision-cases.json'),JSON.stringify({scope:'SHADOW_ONLY_NOT_HARDWARE',pass:results.length,results,realMqttConnections:0,deviceCommands:0,physicalActuation:0},null,2),{flag:'wx'});
console.log(JSON.stringify({selectedDecisionCases:results.length,scope:'SHADOW_ONLY',physicalActuation:0}));
