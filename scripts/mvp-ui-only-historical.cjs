// Identity allowlist only: never generates readings or changes their timestamps.
const SENSOR_IDS=['cmvtxbkdh0007um8k48yxqnms','cmvtxbkdt0009um8k0aeixu24','cmvtxbkdv000bum8kzj97uk3p','cmvtxbkdw000dum8kqn85q98p'];
const READING_IDS=['cmvz7x2r40002umbs2fcukunc','cmvz7x2r40003umbsuq9ygeqz','cmvz7x2r40004umbsj05bzzic','cmvz7x2r40005umbsikhkhlw9','cmvz7xeae0006umbs1pl17271','cmvz7xeae0007umbszfvij5id','cmvz7xeae0008umbscejqyoo0','cmvz7xeae0009umbsn96c8op9','cmvz7xpwa000aumbsxe16j2se','cmvz7xpwa000bumbs4aod2r0t','cmvz7xpwa000cumbslakxwnrf','cmvz7xpwa000dumbsxufe61rf'];
const SCOPE=Object.freeze({farm:['cmvtxbkc90001um8ks1hk03hm'],zone:['cmvtxbkd20003um8kdf93cfx4'],device:['cmvtxbkde0005um8koudtvcda'],sensor:SENSOR_IDS,actuator:['cmvtxbkdx000fum8k19dyhm22'],sensorReading:READING_IDS});
Object.values(SCOPE).forEach(Object.freeze);
const NOTICE='DỮ LIỆU LỊCH SỬ ESP32 — 12 readings MQTT đã lưu ở Phase Y, không LIVE. ONLINE/OFF chỉ là trạng thái đã ghi nhận, không xác nhận kết nối/GPIO hiện tại. SOIL_01: chất lượng chưa xác minh, không dùng tưới tự động. Audit đăng nhập chỉ ghi nhận memory-only, không nghiệm thu persistence.';
// Units are derived from sensor type, not a SensorReading database column.
// Exact values mirror the existing authoritative backend and frontend metadata.
const EXPECTED_UNITS=Object.freeze({TEMP:'°C',AIR_HUMIDITY:'%',LIGHT:'lux',SOIL_MOISTURE:'%'});
const TYPES=['TEMP','AIR_HUMIDITY','LIGHT','SOIL_MOISTURE'];
function authoritativeUnits(backendSource,frontendSource){
 const maps=[backendSource,frontendSource].map(source=>{
  if(typeof source!=='string')throw Error('EXPECTED_UNIT_VERIFICATION_BLOCKED');
  const map={};for(const type of TYPES){const matches=[...source.matchAll(new RegExp('\\b'+type+'\\s*:\\s*\\{[^{}]*?\\bunit\\s*:\\s*"([^"\\r\\n]+)"','g'))];if(matches.length!==1)throw Error('EXPECTED_UNIT_VERIFICATION_BLOCKED');map[type]=matches[0][1];}
  if(TYPES.some(type=>map[type]!==EXPECTED_UNITS[type]))throw Error('EXPECTED_UNIT_VERIFICATION_BLOCKED');return map;
 });
 return maps[0];
}
function deriveMeasurementUnits(rows,sensors,metadata){
 if(!metadata||TYPES.some(type=>metadata[type]!==EXPECTED_UNITS[type]))throw Error('EXPECTED_UNIT_VERIFICATION_BLOCKED');
 return rows.map(row=>{const i=READING_IDS.indexOf(row.id),matches=sensors.filter(s=>s.id===row.sensorId);if(i<0||matches.length!==1||row.sensorId!==SENSOR_IDS[i%4]||matches[0].type!==TYPES[i%4])throw Error('EXPECTED_UNIT_VERIFICATION_BLOCKED');return{readingId:row.id,sensorId:row.sensorId,sensorType:matches[0].type,unit:metadata[matches[0].type]};});
}
function verifyMeasurementUnits(rows,sensors,evidence){
 const assert=require('node:assert/strict');assert.ok(Array.isArray(evidence)&&evidence.length===12,'EXPECTED_UNIT_VERIFICATION_BLOCKED');
 const expected=deriveMeasurementUnits(rows,sensors,EXPECTED_UNITS);assert.deepEqual(evidence,expected,'EXPECTED_UNIT_VERIFICATION_BLOCKED');return true;
}
function verifyReadings(rows){
 if(rows.length!==12||new Set(rows.map(r=>r.id)).size!==12||rows.some(r=>!READING_IDS.includes(r.id)||!SENSOR_IDS.includes(r.sensorId)||r.source!=='MQTT'||!Number.isFinite(r.value)))throw Error('UI_ONLY_HISTORICAL_MAPPING_REFUSED');
 const times=['2026-11-02T12:11:18.853Z','2026-11-02T12:11:33.853Z','2026-11-02T12:11:48.853Z'];
 rows.forEach(r=>{const i=READING_IDS.indexOf(r.id);if(r.sensorId!==SENSOR_IDS[i%4]||new Date(r.recordedAt).toISOString()!==times[Math.floor(i/4)])throw Error('UI_ONLY_HISTORICAL_MAPPING_REFUSED');});
 return true;
}
module.exports={SCOPE,SENSOR_IDS,READING_IDS,NOTICE,verifyReadings,EXPECTED_UNITS,authoritativeUnits,deriveMeasurementUnits,verifyMeasurementUnits};
