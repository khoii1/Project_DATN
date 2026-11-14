// Offline only. Imports of real env, DB and MQTT are explicitly prohibited.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  mocks = { '../services/live-provenance/evidence-store': { liveEvidenceStore: { reset() {}, observeCommittedOff() {} } }, ...mocks };
  if (file !== 'mqtt/mqtt-state-observer.ts') mocks = {
    './mqtt-state-observer': { mqttStateObserver: stateObserver },
    '../mqtt/mqtt-state-observer': { mqttStateObserver: stateObserver }, ...mocks,
  };
  const filename = path.join(__dirname, '../src', file), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, Date, URL, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} }, ...globals, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['zod', '@prisma/client', 'node:crypto'].includes(name)) return require(name);
    throw Error(`Unmocked dependency prohibited: ${name}`);
  } }, { filename }); return exports;
}
const stateObserver = load('mqtt/mqtt-state-observer.ts').mqttStateObserver;
const runtimePolicy = load('services/pump-command-policy.ts');
const { MqttDeviceGateway, pumpStateSchema } = load('gateways/mqtt-device.gateway.ts');
const prefix = 'smart-agriculture/v1', deviceCode = 'ESP32-GF-A-01', actuatorCode = 'PUMP_01';
const commandId = '550e8400-e29b-41d4-a716-446655440000';
function gatewayFixture() {
  let now = new Date('2026-10-14T09:00:00Z'), connected = true;
  const sent = [], discarded = [], results = [], timers = new Set();
  const transport = { connected: () => connected, publish: (topic, payload, cb) => { sent.push({ topic, payload: JSON.parse(payload), cb }); cb(); }, discard: id => discarded.push(id) };
  const Gateway = load('gateways/mqtt-device.gateway.ts', {}, { setTimeout: cb => { timers.add(cb); return cb; }, clearTimeout: cb => timers.delete(cb) }).MqttDeviceGateway;
  const gateway = new Gateway(transport, prefix, () => now);
  const input = (extra = {}) => ({ correlationId: commandId, deviceCode, actuatorCode, command: 'TURN_ON', maxRunSeconds: 5, issuedAt: new Date(now), expiresAt: new Date(now.getTime() + 10000), onResult: async result => results.push(result), ...extra });
  const ack = (extra = {}) => Buffer.from(JSON.stringify({ schemaVersion: 1, commandId, deviceCode, actuatorCode, type: 'PUMP_SET', state: 'ON', result: 'APPLIED', recordedAt: now.toISOString(), ...extra }));
  const receive = (extra = {}, context = {}, topic = `${prefix}/devices/${deviceCode}/command-acks/${actuatorCode}`) => gateway.handleAck(topic, ack(extra), { retain: false, receivedAt: new Date(now), ...context });
  return { gateway, input, receive, ack, sent, results, discarded, timers, transport, offline: () => { connected = false; }, advance: ms => { now = new Date(now.getTime() + ms); } };
}
test('ON publish has unique command identity, bounded duration and expiry; PUBACK is not success', async () => {
  const f = gatewayFixture(); assert.equal((await f.gateway.sendCommand(f.input())).pending, true);
  assert.equal(f.sent[0].topic, `${prefix}/devices/${deviceCode}/commands/${actuatorCode}`);
  assert.equal(f.sent[0].payload.maxRunSeconds, 5); assert.equal(f.sent[0].payload.commandId, commandId);
  assert.equal(f.results.length, 0); await f.gateway.disconnect(); assert.equal(f.timers.size, 0);
});
test('OFF omits runtime and valid OFF ACK confirms OFF', async () => {
  const f = gatewayFixture(); await f.gateway.sendCommand(f.input({ command: 'TURN_OFF', maxRunSeconds: undefined }));
  assert.equal('maxRunSeconds' in f.sent[0].payload, false); await f.receive({ state: 'OFF' }); assert.equal(f.results[0].confirmedState, 'OFF');
});
test('APPLIED ACK is required for confirmed ON', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); assert.equal(await f.receive(), true); assert.equal(f.results[0].confirmedState, 'ON'); assert.equal(f.gateway.pendingCount, 0); });
test('REJECTED retains reason and does not confirm state', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); await f.receive({ result: 'REJECTED', reason: 'CLOCK_UNSYNCED' }); assert.equal(f.results[0].success, false); assert.match(f.results[0].error, /CLOCK_UNSYNCED/); });
test('timeout clears timer and discarded outgoing command', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); for (const cb of [...f.timers]) cb(); await Promise.resolve(); assert.equal(f.results[0].error, 'ACK_TIMEOUT'); assert.equal(f.gateway.pendingCount, 0); });
test('broker unavailable never publishes or falls back', async () => { const f = gatewayFixture(); f.offline(); assert.equal((await f.gateway.sendCommand(f.input())).error, 'BROKER_UNAVAILABLE'); assert.equal(f.sent.length, 0); });
test('expired ON never publishes', async () => { const f = gatewayFixture(); const input = f.input(); f.advance(10001); assert.equal((await f.gateway.sendCommand(input)).error, 'EXPIRED_OR_INVALID_COMMAND'); assert.equal(f.sent.length, 0); });
test('duplicate ACK cannot reapply a command', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); await f.receive(); assert.equal(await f.receive(), false); assert.equal(f.results.length, 1); });
test('wrong id/device/actuator/state/topic and retained ACKs ignored', async () => {
  const f = gatewayFixture(); await f.gateway.sendCommand(f.input());
  for (const invalid of [{ commandId: '550e8400-e29b-41d4-a716-446655440001' }, { deviceCode: 'OTHER_01' }, { actuatorCode: 'OTHER_01' }, { state: 'OFF' }, { schemaVersion: 2 }, { recordedAt: 'invalid' }]) assert.equal(await f.receive(invalid), false);
  assert.equal(await f.receive({}, { retain: true }), false); assert.equal(await f.receive({}, {}, `${prefix}/devices/OTHER_01/command-acks/${actuatorCode}`), false);
  assert.equal(f.results.length, 0); await f.gateway.disconnect();
});
test('late ACK and future timestamp ignored', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); assert.equal(await f.receive({ recordedAt: '2026-10-14T09:01:00Z' }), false); f.advance(10000); assert.equal(await f.receive(), false); await f.gateway.disconnect(); });
test('conflicting ON rejected; emergency OFF supersedes ON', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); assert.equal((await f.gateway.sendCommand(f.input({ correlationId: 'second' }))).error, 'COMMAND_PENDING'); await f.gateway.sendCommand(f.input({ correlationId: 'off', command: 'TURN_OFF' })); assert.equal(f.results[0].error, 'SUPERSEDED_BY_OFF'); assert.equal(f.sent[1].payload.state, 'OFF'); await f.gateway.disconnect(); });
test('disconnect/reconnect and new backend gateway never replay ON', async () => { const f = gatewayFixture(); await f.gateway.sendCommand(f.input()); await f.gateway.disconnect(); assert.equal(f.results[0].error, 'BROKER_DISCONNECTED'); assert.equal(f.sent.length, 1); assert.equal(await f.receive(), false); const restarted = new MqttDeviceGateway(f.transport, prefix); assert.equal(await restarted.handleAck('', f.ack(), { retain: false, receivedAt: new Date() }), false); });
test('device auto-OFF cancels older pending ON but not OFF', async () => { const f = gatewayFixture(); const input = f.input(); await f.gateway.sendCommand(input); await f.gateway.cancelActuator(deviceCode, actuatorCode, input.issuedAt); assert.equal(f.results[0].error, 'DEVICE_REPORTED_OFF'); await f.gateway.sendCommand(f.input({ command: 'TURN_OFF' })); await f.gateway.cancelActuator(deviceCode, actuatorCode, input.issuedAt); assert.equal(f.gateway.pendingCount, 1); await f.gateway.disconnect(); });
test('invalid max runtime and missing callback rejected', async () => { const f = gatewayFixture(); for (const maxRunSeconds of [0, -1, 31, 1.5]) assert.equal((await f.gateway.sendCommand(f.input({ maxRunSeconds }))).pending, undefined); assert.equal((await f.gateway.sendCommand(f.input({ onResult: undefined }))).pending, undefined); });
test('publish error is FAILED not APPLIED', async () => { const f = gatewayFixture(); f.transport.publish = (t, p, cb) => cb(new Error('down')); await f.gateway.sendCommand(f.input()); assert.equal(f.results[0].error, 'PUBLISH_FAILED'); assert.equal(f.gateway.pendingCount, 0); });

const env = { mqttEnabled: true, mqttCommandsEnabled: true, mqttAutomationCommandsEnabled: false, mqttCommandDeviceCode: deviceCode, mqttCommandActuatorCode: actuatorCode, mqttPumpMaxRunSeconds: 5, mqttCommandExpirySeconds: 10, devicePresenceTimeoutSeconds: 90, automationManualOverrideMinutes: 15, mqttTopicPrefix: prefix };
function serviceFixture(extra = {}) {
  stateObserver.reset(); stateObserver.ready = true;
  const rows = [], events = [], updates = [];
  const actuator = { id: 'pump-id', actuatorCode, type: 'PUMP', status: 'ACTIVE', currentState: 'OFF', lastStateChangedAt: null, device: { deviceCode, status: 'ACTIVE', connectionStatus: 'ONLINE', lastSeenAt: new Date(), zone: { status: 'ACTIVE', farmId: 'farm-a', name: 'zone-a', farm: { id: 'farm-a', status: 'ACTIVE' } } } };
  let permission = true, visible = true, receiver, receipt;
  actuator.lastStateChangedAt = new Date();
  stateObserver.confirmOff(deviceCode, actuatorCode, actuator.lastStateChangedAt, stateObserver.generation);
  const db = {
    actuator: { findUnique: async () => actuator, findUniqueOrThrow: async () => ({ ...actuator }), updateMany: async ({ data }) => { Object.assign(actuator, data); updates.push(data); return { count: 1 }; } },
    farmStaffAssignment: { findUnique: async () => ({ canControlIrrigation: permission }) },
    deviceCommand: {
      create: async ({ data }) => { const row = { id: `row-${rows.length}`, status: 'PENDING', ...data }; rows.push(row); return row; },
      findUniqueOrThrow: async ({ where }) => ({ ...rows.find(row => row.id === where.id) }),
      findFirst: async () => null,
      updateMany: async ({ where, data }) => { let count = 0; for (const row of rows) if (Object.entries(where).every(([key, val]) => key === 'expiresAt' ? row[key] <= val.lte : row[key] === val)) { Object.assign(row, data); count++; } return { count }; },
    },
    $queryRaw: async () => [],
    $transaction: async work => typeof work === 'function' ? work(db) : Promise.all(work),
  };
  const gateway = { sendCommand: async input => { receiver = input.onResult; receipt = input.onPublished; return { pending: true, success: false }; }, cancel: async () => {} };
  const service = load('services/device-command.service.ts', {
    './pump-command-policy': runtimePolicy,
    '../config/database': { prisma: db }, '../config/env': { env: { ...env, ...extra } },
    '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: gateway }, '../mqtt/mqtt-command-channel': { mqttCommandChannel: { transport: { connected: () => extra.broker !== false } } },
    '../repositories/actuator.repository': { actuatorInclude: {}, actuatorRepository: { findAccessibleById: async () => visible ? actuator : null } },
    '../repositories/device-command.repository': { deviceCommandRepository: { findPending: async () => rows.find(row => row.status === 'PENDING') } },
    './activity-log.service': { recordActivity: async event => events.push(event) },
    '../utils/app-error': load('utils/app-error.ts'),
  }).deviceCommandService;
  const actor = { id: 'staff-a', fullName: 'Staff', role: 'STAFF' };
  return { service, actor, actuator, db, rows, events, updates, deny: () => { permission = false; }, hide: () => { visible = false; }, published: () => receipt(), reply: result => receiver(result) };
}
test('service/DB integration: API pending, only ACK persists SUCCESS and actuator ON', async () => { const f = serviceFixture(); const result = await f.service.issue('pump-id', 'TURN_ON', f.actor); assert.equal(result.command.status, 'PENDING'); assert.equal(f.actuator.currentState, 'OFF'); assert.equal(f.rows[0].transport, 'MQTT'); assert.ok(f.rows[0].expiresAt); assert.equal(f.rows[0].sentAt, undefined); await f.published(); assert.ok(f.rows[0].sentAt); assert.equal(f.rows[0].status, 'PENDING'); await f.reply({ success: true, confirmedState: 'ON', acknowledgedAt: new Date(), recordedAt: new Date() }); assert.equal(f.rows[0].status, 'SUCCESS'); assert.equal(f.actuator.currentState, 'ON'); assert.ok(f.rows[0].acknowledgedAt); });
test('service DB rejects ACK timeout and does not claim OFF', async () => { const f = serviceFixture(); await f.service.issue('pump-id', 'TURN_ON', f.actor); await f.reply({ success: false, error: 'ACK_TIMEOUT' }); assert.equal(f.rows[0].status, 'FAILED'); assert.equal(f.rows[0].failureReason, 'ACK_TIMEOUT'); assert.equal(f.actuator.currentState, 'UNKNOWN'); });
test('RBAC: cross-farm inaccessible actuator cannot create command', async () => { const f = serviceFixture(); f.hide(); await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor), error => error.statusCode === 404); assert.equal(f.rows.length, 0); });
test('RBAC: STAFF without irrigation permission cannot create command', async () => { const f = serviceFixture(); f.deny(); await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor), error => error.statusCode === 403); assert.equal(f.rows.length, 0); });
test('offline/stale presence blocks ON before persistence', async () => { for (const stale of [false, true]) { const f = serviceFixture(); if (stale) f.actuator.device.lastSeenAt = new Date(0); else f.actuator.device.connectionStatus = 'OFFLINE'; await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor)); assert.equal(f.rows.length, 0); } });
test('disabled feature and unavailable broker never fallback to mock', async () => { for (const config of [{ mqttCommandsEnabled: false }, { mqttEnabled: false }, { broker: false }]) { const f = serviceFixture(config); await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor)); assert.equal(f.rows.length, 0); } });
test('allowlist, server runtime bound and automatic opt-in enforced', async () => { const f = serviceFixture(); await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor, '', { maxRunSeconds: 6 })); await assert.rejects(f.service.executeAutomationCommand('pump-id', 'TURN_ON', 'rule-id')); f.actuator.actuatorCode = 'OTHER_01'; await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor)); assert.equal(f.rows.length, 0); });
test('rapid conflicting requests serialize; OFF supersedes pending ON', async () => { const f = serviceFixture(); const results = await Promise.allSettled([f.service.issue('pump-id', 'TURN_ON', f.actor), f.service.issue('pump-id', 'TURN_ON', f.actor)]); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); await f.service.issue('pump-id', 'TURN_OFF', f.actor); assert.equal(f.rows[0].status, 'FAILED'); assert.equal(f.rows[0].failureReason, 'SUPERSEDED_BY_OFF'); assert.equal(f.rows[1].status, 'PENDING'); });
test('12D2 test mode defaults ON to one second and rejects oversized bypass before writes', async () => {
  const f = serviceFixture({ mqttPumpTestMode: true });
  for (const seconds of [2, 5, 30, 0, 1.5]) {
    await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor, undefined, { maxRunSeconds: seconds }), error => error.statusCode === 400);
  }
  assert.equal(f.rows.length, 0);
  await f.service.issue('pump-id', 'TURN_ON', f.actor);
  assert.equal(f.rows[0].maxRunSeconds, 1);
  assert.equal(runtimePolicy.pumpRuntimeLimit(30, false), 5);
});

test('12D2 env test mode is safe by default and invalid values cannot bypass it', () => {
  const read = value => load('config/env.ts', { dotenv: { config() {} } }, { process: { env: {
    DATABASE_URL: 'unused-in-memory', JWT_SECRET: 'x'.repeat(32), ...(value === undefined ? {} : { MQTT_PUMP_TEST_MODE: value }),
  } } }).env;
  assert.equal(read(undefined).mqttPumpTestMode, true);
  assert.equal(read('true').mqttPumpTestMode, true); assert.equal(read('false').mqttPumpTestMode, false);
  for (const value of ['TRUE', '0', '', 'invalid']) assert.throws(() => read(value));
});

test('12D2 UNKNOWN or persisted OFF without session evidence blocks real ON', async () => {
  for (const unknown of [true, false]) {
    const f = serviceFixture();
    if (unknown) f.actuator.currentState = 'UNKNOWN'; else stateObserver.reset();
    await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor), error => error.statusCode === 409);
    assert.equal(f.rows.length, 0);
  }
});

test('12D2 new periodic OFF restores restarted state; old, duplicate and pre-session frames never do', async () => {
  stateObserver.reset(); stateObserver.ready = true;
  const floor = stateObserver.sessionStartedAt;
  let stored = { currentState: 'UNKNOWN', lastStateChangedAt: new Date(floor.getTime()-1000) }, writes = 0;
  const adapter = load('mqtt/mqtt-pump-state.adapter.ts', {
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } },
    '../gateways/mqtt-device.gateway': { pumpStateSchema }, '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: {} },
    '../config/database': { prisma: { actuator: { updateMany: async ({ data }) => {
      if (data.lastStateChangedAt <= stored.lastStateChangedAt) return { count: 0 };
      stored = data; writes++; return { count: 1 };
    } } } },
  });
  const receive = (at, context = {}) => adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'PERIODIC', recordedAt: at.toISOString() })), { retain: false, receivedAt: new Date(floor.getTime()+10), ...context });
  await receive(new Date(floor.getTime()-1)); assert.equal(stored.currentState, 'UNKNOWN');
  const at = new Date(floor.getTime()+1);
  await receive(at, { retain: true }); await receive(at, { dup: true }); assert.equal(writes, 0);
  await receive(at); assert.equal(stored.currentState, 'OFF'); assert.equal(writes, 1);
  assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, at), true);
  await receive(at); await receive(floor); assert.equal(writes, 1);
  stateObserver.reset(); stateObserver.ready = true; assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, at), false);
});

test('12D2 expired OFF evidence is not a current physical claim', () => {
  stateObserver.reset(); stateObserver.ready = true;
  const old = new Date(Date.now()-30001);
  stateObserver.confirmOff(deviceCode, actuatorCode, old, stateObserver.generation);
  assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, old), false);
  assert.equal(stateObserver.offFilters().length, 0);
});

test('12D3C DB commit / observer-confirm gap fails closed in API and command service', async () => {
  const f = serviceFixture();
  const nextAt = new Date(Math.max(Date.now(), f.actuator.lastStateChangedAt.getTime() + 1));
  let markCommitted, finishCommit;
  const committed = new Promise(resolve => { markCommitted = resolve; });
  const release = new Promise(resolve => { finishCommit = resolve; });
  const adapter = load('mqtt/mqtt-pump-state.adapter.ts', {
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } },
    '../gateways/mqtt-device.gateway': { pumpStateSchema },
    '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: {} },
    '../config/database': { prisma: { actuator: { updateMany: async ({ data }) => {
      Object.assign(f.actuator, data); markCommitted(); await release; return { count: 1 };
    } } } },
  });
  const api = load('services/actuator.service.ts', {
    '../config/env': { env },
    '../mqtt/mqtt-command-channel': { mqttCommandChannel: { transport: { connected: () => true } } },
    '../config/database': { prisma: { deviceCommand: { findMany: async () => [] } } },
    '../repositories/actuator.repository': { actuatorRepository: { findAccessibleById: async () => ({ ...f.actuator }) } },
    '../utils/app-error': load('utils/app-error.ts'),
    './activity-log.service': { recordActivity: async () => assert.fail('GET must not write') },
    './farm-access.service': { farmAccessService: {} },
  }).actuatorService;
  const work = adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from(JSON.stringify({
    schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'PERIODIC', recordedAt: nextAt.toISOString(),
  })), { retain: false, dup: false, receivedAt: nextAt });
  try {
    await committed;
    assert.equal((await api.get('pump-id', { ...f.actor, role: 'FARM_OWNER' })).currentState, 'UNKNOWN');
    await assert.rejects(f.service.issue('pump-id', 'TURN_ON', f.actor), error => error.statusCode === 409);
    assert.equal(f.rows.length, 0);
  } finally { finishCommit(); await work; }
  assert.equal((await api.get('pump-id', { ...f.actor, role: 'FARM_OWNER' })).currentState, 'OFF');
  stateObserver.reset(); stateObserver.ready = true;
  assert.equal((await api.get('pump-id', { ...f.actor, role: 'FARM_OWNER' })).currentState, 'UNKNOWN');
});

test('12D3C serving-process startup attests shared cap and disabled flags without secrets', async () => {
  const logs = [];
  const safeEnv = { ...env, port: 5000, nodeEnv: 'test', mqttCommandsEnabled: false,
    mqttAutomationCommandsEnabled: false, mqttPumpTestMode: true, mqttPumpMaxRunSeconds: 30 };
  load('server.ts', {
    './mqtt/mqtt-pump-state.adapter': { recoverMqttCommands: async () => {} },
    './app': { app: { listen: (_port, ready) => { ready(); return { close() {} }; } } },
    './config/database': { connectDatabase: async () => true, disconnectDatabase: async () => {} },
    './config/env': { env: safeEnv },
    './mqtt/mqtt-client.service': { mqttClientService: { start() {}, stop: async () => {} } },
    './services/presence-watchdog.service': { presenceWatchdog: { start() {}, stop: async () => {} } },
    './services/pump-command-policy': runtimePolicy,
  }, { process: { pid: 12345, on() {} }, console: { log: value => logs.push(value), warn() {} } });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const line = logs.find(value => value.startsWith('MQTT pump safety runtime: '));
  assert.ok(line);
  const metadata = JSON.parse(line.slice('MQTT pump safety runtime: '.length));
  assert.equal(metadata.pid, 12345); assert.equal(metadata.testMode, true);
  assert.equal(metadata.effectiveMaxRunSeconds, 1);
  assert.equal(metadata.commandsEnabled, false); assert.equal(metadata.automationEnabled, false);
  assert.equal(Object.keys(metadata).sort().join(','), 'automationEnabled,commandsEnabled,effectiveMaxRunSeconds,pid,startedAt,testMode');
});

test('restart recovery fails orphan MQTT commands without publishing', async () => {
  const updates = []; const db = { deviceCommand: { updateMany: arg => { updates.push(arg); return Promise.resolve({ count: 1 }); } }, actuator: { updateMany: arg => { updates.push(arg); return Promise.resolve({ count: 1 }); } }, $transaction: tasks => Promise.all(tasks) };
  const adapter = load('mqtt/mqtt-pump-state.adapter.ts', { '../config/database': { prisma: db }, '../config/env': { env }, '../gateways/mqtt-device.gateway': { pumpStateSchema }, '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: { cancelActuator: async () => {} } } });
  await adapter.recoverMqttCommands(); assert.equal(updates[0].where.transport, 'MQTT'); assert.equal(updates[0].data.failureReason, 'BACKEND_RESTARTED_NO_REPLAY'); assert.equal(updates[1].data.currentState, 'UNKNOWN');
});
test('state adapter accepts fresh auto-OFF, rejects retained/stale/unsolicited ON', async () => {
  const updates = [], cancelled = []; const adapter = load('mqtt/mqtt-pump-state.adapter.ts', { '../config/database': { prisma: { actuator: { updateMany: async arg => { updates.push(arg); } } } }, '../config/env': { env }, '../gateways/mqtt-device.gateway': { pumpStateSchema }, '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: { cancelActuator: async (...args) => cancelled.push(args) } } });
  const now = new Date(), topic = `${prefix}/devices/${deviceCode}/actuator/state`, payload = { schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'MAX_RUNTIME', recordedAt: now.toISOString() };
  const receive = (extra = {}, retain = false) => adapter.handlePumpState(topic, Buffer.from(JSON.stringify({ ...payload, ...extra })), { retain, receivedAt: now });
  await receive({}, true); await receive({ state: 'ON' }); await receive({ recordedAt: '2020-01-01T00:00:00Z' }); assert.equal(updates.length, 0);
  await receive(); assert.equal(updates[0].data.currentState, 'OFF'); assert.equal(cancelled.length, 1); assert.ok(updates[0].where.OR[1].lastStateChangedAt.lt);
});
test('12C2 OFF observation commits with commands disabled; no command gateway side effects', async () => {
  stateObserver.reset(); stateObserver.ready = true;
  const at = new Date(); let update, cancelled = 0;
  const adapter = load('mqtt/mqtt-pump-state.adapter.ts', {
    '../config/database': { prisma: { actuator: { updateMany: async arg => { update = arg; return { count: 1 }; } } } },
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } },
    '../gateways/mqtt-device.gateway': { pumpStateSchema },
    '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: { cancelActuator: async () => { cancelled++; } } },
  });
  await adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'BOOT', recordedAt: at.toISOString() })), { retain: false, receivedAt: at });
  assert.equal(update.data.currentState, 'OFF'); assert.equal(update.where.device.deviceCode, deviceCode);
  assert.equal(cancelled, 0); assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, at), true);
});

test('12C2 invalid, retained, DUP, stale, future or mismatched state never becomes evidence', async () => {
  stateObserver.reset(); stateObserver.ready = true;
  const at = new Date(); let updates = 0;
  const adapter = load('mqtt/mqtt-pump-state.adapter.ts', {
    '../config/database': { prisma: { actuator: { updateMany: async () => { updates++; return { count: 0 }; } } } },
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } }, '../gateways/mqtt-device.gateway': { pumpStateSchema },
    '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: {} },
  });
  const body = { schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'BOOT', recordedAt: at.toISOString() };
  const receive = (extra = {}, context = {}) => adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from(JSON.stringify({ ...body, ...extra })), { retain: false, receivedAt: at, ...context });
  await receive({}, { retain: true }); await receive({}, { dup: true }); await receive({ state: 'ON' });
  await receive({ actuatorCode: 'OTHER' }); await receive({ deviceCode: 'OTHER' });
  await receive({ recordedAt: new Date(at.getTime() - 30001).toISOString() });
  await receive({ recordedAt: new Date(at.getTime() + 2001).toISOString() });
  await adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from('bad-json'), { retain: false, receivedAt: at });
  assert.equal(updates, 0);
  await receive(); assert.equal(updates, 1); assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, at), false); // Unknown actuator / zero affected rows.
});

test('12C2 failed DB commit or disconnect during commit cannot confirm OFF', async () => {
  for (const fails of [true, false]) {
    stateObserver.reset(); stateObserver.ready = true; const at = new Date();
    const adapter = load('mqtt/mqtt-pump-state.adapter.ts', {
      '../config/database': { prisma: { actuator: { updateMany: async () => { if (fails) throw Error('unit-db-failure'); stateObserver.reset(); stateObserver.ready = true; return { count: 1 }; } } } },
      '../config/env': { env: { ...env, mqttCommandsEnabled: false } }, '../gateways/mqtt-device.gateway': { pumpStateSchema }, '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: {} },
    });
    const call = () => adapter.handlePumpState(`${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode, actuatorCode, state: 'OFF', reason: 'BOOT', recordedAt: at.toISOString() })), { retain: false, receivedAt: at });
    if (fails) await assert.rejects(call); else await call();
    assert.equal(stateObserver.isConfirmedOff(deviceCode, actuatorCode, at), false);
  }
});

test('12C2 API list/detail expose observed OFF without enabling control; OFFLINE/reconnect hide evidence', async () => {
  stateObserver.reset(); stateObserver.ready = true; const at = new Date();
  const item = { id: 'pump-id', actuatorCode, currentState: 'OFF', lastStateChangedAt: at, device: { deviceCode, connectionStatus: 'ONLINE', zone: { farm: { id: 'farm-a', ownerId: 'owner' } } } };
  const service = load('services/actuator.service.ts', {
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } },
    '../mqtt/mqtt-command-channel': { mqttCommandChannel: { transport: { connected: () => false } } },
    '../config/database': { prisma: { deviceCommand: { findMany: async () => [] } } },
    '../utils/app-error': { AppError: class extends Error {} },
    '../repositories/actuator.repository': { actuatorRepository: { findAccessibleById: async () => item, list: async () => ({ items: [item], total: 1 }) } },
    './activity-log.service': { recordActivity: async () => assert.fail('GET must not write') }, './farm-access.service': { farmAccessService: {} },
  }).actuatorService;
  const actor = { id: 'owner', fullName: 'test', role: 'FARM_OWNER' };
  assert.equal((await service.get(item.id, actor)).currentState, 'UNKNOWN'); // Persisted MOCK OFF is not live evidence.
  stateObserver.confirmOff(deviceCode, actuatorCode, at, stateObserver.generation);
  const off = await service.get(item.id, actor); assert.equal(off.currentState, 'OFF'); assert.equal(off.controlEnabled, false); assert.equal(off.gatewayMode, 'DISABLED');
  assert.equal((await service.list({ page: 1, limit: 10 }, actor)).items[0].currentState, 'OFF');
  const controller = load('controllers/actuator.controller.ts', { '../services/actuator.service': { actuatorService: service }, '../services/device-command.service': { deviceCommandService: {} } });
  let body; await controller.getActuator({ params: { id: item.id }, user: actor }, { json: data => { body = data; } }, error => { throw error; }); assert.equal(body.data.actuator.currentState, 'OFF');
  item.device.connectionStatus = 'OFFLINE'; assert.equal((await service.get(item.id, actor)).currentState, 'UNKNOWN');
  item.device.connectionStatus = 'ONLINE'; stateObserver.reset(); stateObserver.ready = true;
  assert.equal((await service.get(item.id, actor)).currentState, 'UNKNOWN');
  stateObserver.confirmOff(deviceCode, actuatorCode, at, stateObserver.generation); assert.equal((await service.get(item.id, actor)).currentState, 'OFF');
});

test('12C2 passive state subscription/routing works with commands disabled and denial preserves telemetry', async () => {
  for (const denied of [true, false]) {
    const client = new EventEmitter(); const routed = [], frames = [], subscriptions = [];
    client.subscribe = (topics, _options, cb) => { subscriptions.push(topics); cb(null, topics.map(topic => ({ topic, qos: denied && topic.endsWith('/actuator/state') ? 128 : 1 }))); };
    client.end = (_force, _options, cb) => cb();
    const channel = { transport: null };
    const service = load('mqtt/mqtt-client.service.ts', {
      mqtt: { connect: () => client }, '../config/env': { env: { ...env, mqttCommandsEnabled: false } }, './mqtt-command-channel': { mqttCommandChannel: channel },
      '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: { disconnect: async () => {}, handleAck: async () => assert.fail('Disabled ACK must not reach command gateway') } },
      './mqtt-pump-state.adapter': { handlePumpState: async (...args) => frames.push(args) }, './mqtt-message-router': { mqttMessageRouter: { handle: async (...args) => routed.push(args) } },
      './mqtt-topic': { mqttTopics: { telemetryFilter: 'telemetry', statusFilter: 'status' } },
    }).mqttClientService;
    service.start(); client.emit('connect'); assert.equal(service.connectionState, 'connected'); assert.equal(stateObserver.ready, !denied);
    assert.equal(channel.transport.connected(), false); assert.equal(subscriptions.length, 2);
    client.emit('message', `${prefix}/devices/${deviceCode}/actuator/state`, Buffer.from('{}'), { retain: false });
    client.emit('message', 'telemetry', Buffer.from('{}'), { retain: false });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(frames.length, denied ? 0 : 1); assert.equal(routed.length, 1);
    client.emit('close'); assert.equal(stateObserver.ready, false);
    client.emit('connect'); assert.equal(subscriptions.length, 4); await service.stop();
  }
});

test('12C2 actuator summary uses the same session OFF evidence as detail', async () => {
  stateObserver.reset(); stateObserver.ready = true; const at = new Date(), calls = [];
  stateObserver.confirmOff(deviceCode, actuatorCode, at, stateObserver.generation);
  const repo = load('repositories/actuator.repository.ts', {
    '../config/env': { env: { ...env, mqttCommandsEnabled: false } },
    '../mqtt/mqtt-command-channel': { mqttCommandChannel: { transport: { connected: () => false } } },
    '../config/database': { prisma: { actuator: { count: async query => { calls.push(query); return 0; } }, $transaction: tasks => Promise.all(tasks) } },
    './farm.repository': { farmScope: () => ({ ownerId: 'owner' }) },
  }).actuatorRepository;
  await repo.summary({ id: 'owner', role: 'FARM_OWNER' }, {});
  const off = calls[3].where.AND[1]; assert.equal(off.currentState, 'OFF'); assert.equal(off.device.connectionStatus, 'ONLINE'); assert.equal(off.OR[0].actuatorCode, actuatorCode); assert.equal(off.OR[0].lastStateChangedAt, at);
});

test('12C2 frontend relay label preserves OFF/UNKNOWN and masks OFFLINE (static contract)', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/devices/DeviceDetailPage.tsx'), 'utf8');
  assert.match(source, /actuatorStateLabels\[device.connectionStatus !== "ONLINE" \? "UNKNOWN" : actuator.currentState\]/);
  const labels = fs.readFileSync(path.join(__dirname, '../../frontend/src/types/actuator.ts'), 'utf8');
  assert.match(labels, /UNKNOWN:\s*"Chưa xác định"/); assert.match(labels, /OFF:\s*"Tắt"/);
});

test('managed client uses QoS1 non-retained; disconnect removes outgoing ON before reconnect', async () => {
  const fake = new EventEmitter(); fake.connected = true; fake._storeProcessing = false; fake._storeProcessingQueue = []; const calls = [], removed = []; fake.subscribe = (topics, options, cb) => { calls.push(topics); cb(null, topics.map(topic => ({ topic, qos: 1 }))); }; fake.publish = (topic, payload, options) => { calls.push(options); fake.emit('packetsend', { cmd: 'publish', topic, payload: Buffer.from(payload), messageId: 11 }); }; fake.removeOutgoingMessage = id => removed.push(id); fake.end = (force, options, cb) => cb();
  const channel = { transport: null }; let disconnects = 0;
  const client = load('mqtt/mqtt-client.service.ts', { mqtt: { connect: () => fake }, '../config/env': { env }, './mqtt-command-channel': { mqttCommandChannel: channel }, '../gateways/mqtt-gateway.runtime': { mqttDeviceGateway: { disconnect: async () => { disconnects++; }, handleAck: async () => {} } }, './mqtt-pump-state.adapter': { handlePumpState: async () => {} }, './mqtt-message-router': { mqttMessageRouter: { handle: async () => {} } }, './mqtt-topic': { mqttTopics: { telemetryFilter: 'telemetry', statusFilter: 'status' } } }).mqttClientService;
  client.start(); client.start(); fake.emit('connect'); assert.equal(fake.listenerCount('message'), 1); assert.equal(calls[0].length, 4);
  fake._storeProcessing = true; assert.equal(channel.transport.connected(), false); fake._storeProcessing = false;
  channel.transport.publish(`${prefix}/devices/${deviceCode}/commands/${actuatorCode}`, JSON.stringify({ commandId }), () => {}); assert.equal(calls[1].qos, 1); assert.equal(calls[1].retain, false);
  fake.emit('offline'); assert.equal(removed[0], 11); fake.emit('close'); fake.emit('connect'); assert.equal(calls.filter(c => c.qos === 1).length, 1); assert.ok(disconnects >= 1); await client.stop(); assert.equal(channel.transport, null);
});
