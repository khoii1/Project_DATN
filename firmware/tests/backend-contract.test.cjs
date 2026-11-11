// Execute the real C++ serializer fixture binary, then load backend validators offline.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../backend/node_modules/typescript');
const zod = require('../../backend/node_modules/zod');
const executable = process.env.FIRMWARE_TEST_EXE || path.resolve(__dirname, '../../build/firmware-tests/pump_controller_test.exe');
const fixtures = JSON.parse(execFileSync(executable, ['--fixtures'], { encoding: 'utf8' }));
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../../backend/src', file), exports = {};
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, Buffer, Date, console, setTimeout: () => 1, clearTimeout() {}, require(name) {
    if (name === 'zod') return zod;
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw Error(`Real environment/network/DB import prohibited: ${name}`);
  } }, { filename }); return exports;
}
const { MqttDeviceGateway, pumpStateSchema } = load('gateways/mqtt-device.gateway.ts');
const { mqttTelemetrySchema, mqttStatusSchema } = load('mqtt/mqtt-message.schema.ts', { './mqtt-topic': { MQTT_DEVICE_CODE_PATTERN: /^[A-Z0-9_-]{3,64}$/ } });
async function verifyAck(ack) {
  let settled;
  const gateway = new MqttDeviceGateway({ connected: () => true, publish: (t, p, cb) => cb(), discard() {} }, 'smart-agriculture/v1', () => new Date(fixtures.command.issuedAt));
  await gateway.sendCommand({ correlationId: fixtures.command.commandId, deviceCode: fixtures.command.deviceCode, actuatorCode: fixtures.command.actuatorCode, command: 'TURN_ON', maxRunSeconds: 1, issuedAt: new Date(fixtures.command.issuedAt), expiresAt: new Date(fixtures.command.expiresAt), onResult: async result => { settled = result; } });
  const accepted = await gateway.handleAck(`smart-agriculture/v1/devices/${ack.deviceCode}/command-acks/${ack.actuatorCode}`, Buffer.from(JSON.stringify(ack)), { retain: false, receivedAt: new Date(ack.recordedAt) });
  assert.equal(accepted, true); return settled;
}
test('actual C++ APPLIED ACK accepted by backend gateway', async () => { assert.equal((await verifyAck(fixtures.ack)).confirmedState, 'ON'); });
test('actual C++ dry-run REJECTED ACK accepted without fake success', async () => { const result = await verifyAck(fixtures.rejected); assert.equal(result.success, false); assert.match(result.error, /PUMP_COMMANDS_DISABLED/); });
test('actual C++ OFF state matches strict backend schema', () => { assert.equal(pumpStateSchema.safeParse(fixtures.state).success, true); });
test('actual C++ periodic OFF matches additive backend reason without changing envelope', () => { assert.equal(fixtures.periodic.reason, 'PERIODIC'); assert.equal(pumpStateSchema.safeParse(fixtures.periodic).success, true); });
test('actual C++ telemetry matches strict schema and preserves LIGHT=0', () => { const payload = mqttTelemetrySchema.parse(fixtures.telemetry); assert.deepEqual(payload.readings.map(r => r.sensorCode), ['TEMP_01','HUM_01','LIGHT_01','SOIL_01']); assert.equal(payload.readings[2].value, 0); assert.equal(payload.readings[3].value, 100); });
test('birth/LWT match status schema; sample has no fake sensor timestamps', () => { for(const status of ['ONLINE','OFFLINE']) mqttStatusSchema.parse({ schemaVersion: 1, deviceCode: fixtures.command.deviceCode, status }); assert.equal(fixtures.telemetry.recordedAt, fixtures.ack.recordedAt); });
