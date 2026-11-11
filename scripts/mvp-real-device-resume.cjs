// Pure validation and injected read-only repository. No env, Prisma or network imports.
const assert = require('node:assert/strict');
const PIN = Object.freeze({
  systemId: '7698826681383327460', pgdata: 'C:\\DATN\\test-instances\\phase13-3b\\data',
  database: 'smart_agriculture_mvp_dev', role: 'sa_mvp_dev_app', port: 55433,
  farmId: 'cmvtxbkc90001um8ks1hk03hm', zoneId: 'cmvtxbkd20003um8kdf93cfx4',
  deviceId: 'cmvtxbkde0005um8koudtvcda', actuatorId: 'cmvtxbkdx000fum8k19dyhm22',
  ownerId: 'mvp-owner-a', deviceCode: 'ESP32-GF-A-01',
});
const SENSORS = Object.freeze([
  ['cmvtxbkdh0007um8k48yxqnms', 'TEMP_01', 'TEMP'],
  ['cmvtxbkdt0009um8k0aeixu24', 'HUM_01', 'AIR_HUMIDITY'],
  ['cmvtxbkdv000bum8kzj97uk3p', 'LIGHT_01', 'LIGHT'],
  ['cmvtxbkdw000dum8kqn85q98p', 'SOIL_01', 'SOIL_MOISTURE'],
].map(Object.freeze));
function registrationMode(value) {
  assert.ok(['REGISTER_NEW', 'RESUME_EXISTING_DEVICE'].includes(value), 'EXPLICIT_REGISTRATION_MODE_REQUIRED');
  return value;
}
function assertDevUrl(value) {
  const u = new URL(value);
  assert.ok(['postgresql:', 'postgres:'].includes(u.protocol) && u.hostname === '127.0.0.1' &&
    u.port === String(PIN.port) && u.pathname === '/' + PIN.database && u.username === PIN.role &&
    u.search === '?schema=public' && !u.hash, 'ISOLATED_DEV_TARGET_REQUIRED');
}
function validateMapping(s) {
  // Fixed error labels: no record contents, identifiers or credentials in errors.
  assert.equal(s.farm?.id, PIN.farmId, 'RESUME_FARM_ID');
  assert.equal(s.farm.ownerId, PIN.ownerId, 'RESUME_FARM_OWNER');
  assert.equal(s.zone?.id, PIN.zoneId, 'RESUME_ZONE_ID');
  assert.equal(s.zone.farmId, PIN.farmId, 'RESUME_ZONE_FARM');
  assert.equal(s.devices?.length, 1, 'RESUME_DEVICE_COUNT');
  const d = s.devices[0];
  assert.ok(d.id === PIN.deviceId && d.zoneId === PIN.zoneId && d.deviceCode === PIN.deviceCode &&
    d.type === 'CONTROLLER' && d.hardwareModel === 'ESP32 DevKit V1', 'RESUME_DEVICE_MAPPING');
  for (const row of [s.farm, s.zone, d]) assert.equal(row.status, 'ACTIVE', 'RESUME_ACTIVE_REQUIRED');
  assert.equal(s.sensors?.length, 4, 'RESUME_SENSOR_COUNT');
  for (const [id, code, type] of SENSORS) {
    const matches = s.sensors.filter(x => x.id === id && x.sensorCode === code && x.type === type &&
      x.deviceId === PIN.deviceId && x.status === 'ACTIVE');
    assert.equal(matches.length, 1, 'RESUME_SENSOR_MAPPING');
  }
  assert.equal(s.actuators?.length, 1, 'RESUME_ACTUATOR_COUNT');
  const a = s.actuators[0];
  assert.ok(a.id === PIN.actuatorId && a.deviceId === PIN.deviceId && a.actuatorCode === 'PUMP_01' &&
    a.type === 'PUMP' && a.hardwareChannel === 'GPIO26' && a.status === 'ACTIVE', 'RESUME_ACTUATOR_MAPPING');
  // Presence/GPIO values are intentionally not fresh evidence and are never rewritten here.
  return { farmId: PIN.farmId, zoneId: PIN.zoneId, deviceId: PIN.deviceId, actuatorId: PIN.actuatorId,
    sensors: SENSORS.map(([id, sensorCode, type]) => ({ id, sensorCode, type })) };
}
async function resumeExistingDevice(db, url) {
  assertDevUrl(url); // Refuse before invoking even an injected repository.
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const [identity] = await tx.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port');
    assert.ok(identity?.db === PIN.database && identity.role === PIN.role && identity.port === PIN.port,
      'RESUME_SQL_IDENTITY');
    const farm = await tx.farm.findUnique({where:{id:PIN.farmId}});
    const zone = await tx.zone.findUnique({where:{id:PIN.zoneId}});
    const devices = await tx.device.findMany({where:{OR:[{id:PIN.deviceId},{deviceCode:PIN.deviceCode}]}});
    const sensors = await tx.sensor.findMany({where:{OR:[{deviceId:PIN.deviceId},{id:{in:SENSORS.map(x=>x[0])}}]}});
    const actuators = await tx.actuator.findMany({where:{OR:[{deviceId:PIN.deviceId},{id:PIN.actuatorId}]}});
    return validateMapping({farm,zone,devices,sensors,actuators});
  }, {maxWait:5000,timeout:10000});
}
module.exports = {PIN, SENSORS, registrationMode, assertDevUrl, validateMapping, resumeExistingDevice};
