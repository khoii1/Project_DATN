// Offline source-level unit tests. No .env, real Prisma instance or MQTT connection.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ts = require('typescript');
const sourceRoot = path.join(__dirname, '../src');
const external = new Set(['@prisma/client', 'zod', 'node:crypto']);
function load(file, mocks = {}, globals = {}) {
  mocks = { "../gateways/mqtt-gateway.runtime": { mqttDeviceGateway: { disconnect: async () => {} } }, "./mqtt-pump-state.adapter": { handlePumpState: async () => {} }, ...mocks };
  const filename = path.join(sourceRoot, file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const context = { exports, Buffer, Date, URL, AbortController, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} }, ...globals,
    require(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(filename), specifier) + '.ts';
        if (target.endsWith(path.join('config', 'database.ts')) || target.endsWith(path.join('config', 'env.ts'))) throw new Error('Real database/environment import prohibited');
        return load(path.relative(sourceRoot, target), mocks, globals);
      }
      if (!external.has(specifier)) throw new Error(`Unmocked dependency prohibited: ${specifier}`);
      return require(specifier);
    },
  };
  vm.runInNewContext(code, context, { filename });
  return exports;
}
const { createDevicePresenceService } = load('services/device-presence.policy.ts');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function matches(row, where) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'AND') return expected.every(condition => matches(row, condition));
    if (key === 'OR') return expected.some(condition => matches(row, condition));
    const actual = row[key];
    if (expected === null || typeof expected !== 'object') return actual === expected;
    return Object.entries(expected).every(([op, value]) => {
      if (op === 'lt') return actual !== null && actual < value;
      if (op === 'lte') return actual !== null && actual <= value;
      if (op === 'not') return actual !== value;
      throw new Error(`Unsupported predicate ${op}`);
    });
  });
}
function fixture(rows = []) {
  let now = new Date('2026-10-13T10:00:00Z');
  const records = rows.map(row => ({ deviceCode: 'ESP32-GF-A-01', connectionStatus: 'ONLINE', lastSeenAt: new Date(now.getTime() - 100_000), ...row }));
  const updates = [];
  const store = { async updateMany(input) { updates.push(input); let count = 0; for (const row of records) if (matches(row, input.where)) { Object.assign(row, input.data); count++; } return { count }; } };
  const service = createDevicePresenceService(store, 90, () => new Date(now));
  return { records, updates, store, service, now: () => new Date(now), advance: seconds => { now = new Date(now.getTime() + seconds * 1000); } };
}
const env = { mqttTopicPrefix: 'smart-agriculture/v1', mqttMaxPayloadBytes: 32768, mqttSideEffectMaxAgeSeconds: 300 };
const topic = suffix => `smart-agriculture/v1/devices/ESP32-GF-A-01/${suffix}`;
const status = state => Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode: 'ESP32-GF-A-01', status: state }));
function statusAdapter(f) {
  return load('mqtt/mqtt-presence.adapter.ts', {
    '../config/env': { env },
    '../repositories/device.repository': { deviceRepository: { findByCode: async code => f.records.find(row => row.deviceCode === code) } },
    '../services/device-presence.service': { devicePresenceService: f.service },
  }).mqttPresenceAdapter;
}

test('1 ONLINE: valid telemetry uses backend receipt time; duplicate readings preserve history', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]);
  const readings = [{ id: 'historical', sensorId: 'sensor', recordedAt: new Date('2026-01-01'), value: 12 }];
  let sideEffects = 0;
  const ingest = load('services/telemetry-ingestion.service.ts', {
    '../repositories/device.repository': { deviceRepository: { findTelemetryContextByCode: async () => ({ status: 'ACTIVE', sensors: [{ id: 'sensor', sensorCode: 'TEMP_01', status: 'ACTIVE', type: 'TEMP' }] }) } },
    '../repositories/sensor-reading.repository': { sensorReadingRepository: { createMany: async data => { const created = data.filter(row => !readings.some(old => old.sensorId === row.sensorId && +old.recordedAt === +row.recordedAt)); readings.push(...created); return created; } } },
    './device-presence.service': { devicePresenceService: f.service },
    './alert-evaluation.service': { alertEvaluationService: { evaluate: async rows => { sideEffects += rows.length; } } },
    './automation-evaluation.service': { automationEvaluationService: { evaluate: async rows => { sideEffects += rows.length; } } },
  }).telemetryIngestionService;
  const batch = { deviceCode: 'ESP32-GF-A-01', recordedAt: new Date('2026-01-02'), source: 'MQTT', presenceSeenAt: f.now(), readings: [{ sensorCode: 'TEMP_01', value: 0 }] };
  await ingest.ingest(batch);
  assert.equal(f.records[0].connectionStatus, 'ONLINE'); assert.equal(+f.records[0].lastSeenAt, +f.now());
  f.advance(15); await ingest.ingest({ ...batch, presenceSeenAt: f.now() });
  assert.equal(readings.length, 2); assert.equal(readings[0].value, 12); assert.equal(sideEffects, 2); assert.equal(+f.records[0].lastSeenAt, +f.now());
  await ingest.ingest({ ...batch, presenceSeenAt: null }); assert.equal(readings.length, 2); assert.equal(f.updates.length, 2);
});
test('2 timeout expires ONLINE without touching lastSeenAt', async () => {
  const f = fixture([{}]); const before = +f.records[0].lastSeenAt;
  assert.equal((await f.service.expire(true)).count, 1); assert.equal(f.records[0].connectionStatus, 'OFFLINE'); assert.equal(+f.records[0].lastSeenAt, before);
  assert.equal((await f.service.expire(true)).count, 0);
});
test('3 within TTL and exact TTL boundary remain ONLINE', async () => {
  const f = fixture([{}]); f.records[0].lastSeenAt = new Date(+f.now() - 90_000);
  assert.equal((await f.service.expire(true)).count, 0); f.advance(1); assert.equal((await f.service.expire(true)).count, 1);
});
test('4 atomic watchdog predicate cannot overwrite a concurrent heartbeat', async () => {
  const f = fixture([{}]); const update = f.store.updateMany.bind(f.store); let interleave = true;
  f.store.updateMany = async input => { if (input.data.connectionStatus === 'OFFLINE' && interleave) { interleave = false; await f.service.markOnline('ESP32-GF-A-01', f.now()); } return update(input); };
  assert.equal((await f.service.expire(true)).count, 0); assert.equal(f.records[0].connectionStatus, 'ONLINE');
  // Reverse order: heartbeat recovers a row the watchdog already expired.
  f.advance(100); await f.service.expire(true); await f.service.markOnline('ESP32-GF-A-01'); assert.equal(f.records[0].connectionStatus, 'ONLINE');
});
test('5 live ONLINE reconnect recovers OFFLINE', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]); await statusAdapter(f).handle(topic('status'), status('ONLINE'), { retain: false, receivedAt: f.now() });
  assert.equal(f.records[0].connectionStatus, 'ONLINE'); assert.equal(+f.records[0].lastSeenAt, +f.now());
});
test('6 retained ONLINE replay never revives or touches lastSeenAt', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]); const before = +f.records[0].lastSeenAt;
  assert.equal(await statusAdapter(f).handle(topic('status'), status('ONLINE'), { retain: true, receivedAt: f.now() }), 'ignored');
  assert.equal(f.records[0].connectionStatus, 'OFFLINE'); assert.equal(+f.records[0].lastSeenAt, before); assert.equal(f.updates.length, 0);
});
test('7 retained OFFLINE replay cannot overwrite fresh ONLINE', async () => {
  const f = fixture([{}]); await f.service.markOnline('ESP32-GF-A-01');
  await statusAdapter(f).handle(topic('status'), status('OFFLINE'), { retain: true, receivedAt: f.now() }); assert.equal(f.records[0].connectionStatus, 'ONLINE');
});
test('8 live broker Last Will OFFLINE is accepted; old arrival cannot overwrite newer heartbeat', async () => {
  const f = fixture([{}]); const adapter = statusAdapter(f); await f.service.markOnline('ESP32-GF-A-01'); const before = +f.records[0].lastSeenAt;
  f.advance(1); await adapter.handle(topic('status'), status('OFFLINE'), { retain: false, receivedAt: f.now() }); assert.equal(f.records[0].connectionStatus, 'OFFLINE'); assert.equal(+f.records[0].lastSeenAt, before);
  const old = f.now(); f.advance(1); await f.service.markOnline('ESP32-GF-A-01'); await adapter.handle(topic('status'), status('OFFLINE'), { retain: false, receivedAt: old }); assert.equal(f.records[0].connectionStatus, 'ONLINE');
});
test('11 multi-device expiry is isolated', async () => {
  const f = fixture([{}, { deviceCode: 'ESP32-GF-B-01' }]); await f.service.markOnline('ESP32-GF-B-01'); await f.service.expire(true);
  assert.equal(f.records[0].connectionStatus, 'OFFLINE'); assert.equal(f.records[1].connectionStatus, 'ONLINE');
});
test('broker outage means UNKNOWN after TTL; recovery re-evaluates without refreshing timestamp', async () => {
  const f = fixture([{}, { deviceCode: 'NEW-DEVICE', connectionStatus: 'UNKNOWN', lastSeenAt: null }]); const before = +f.records[0].lastSeenAt;
  await f.service.expire(false); assert.equal(f.records[0].connectionStatus, 'UNKNOWN'); assert.equal(+f.records[0].lastSeenAt, before);
  await f.service.expire(true); assert.equal(f.records[0].connectionStatus, 'OFFLINE'); assert.equal(f.records[1].connectionStatus, 'UNKNOWN');
});
test('out-of-order or queue-delayed ONLINE cannot refresh presence', async () => {
  const f = fixture([{}]); const old = f.now(); await f.service.markOnline('ESP32-GF-A-01'); f.advance(1); await f.service.markOnline('ESP32-GF-A-01');
  assert.equal((await f.service.markOnline('ESP32-GF-A-01', old)).count, 0); f.advance(100); assert.equal((await f.service.markOnline('ESP32-GF-A-01', old)).count, 0);
});
test('telemetry transport metadata suppresses retained presence; freshness flags are unchanged', async () => {
  const received = [];
  const adapter = load('mqtt/mqtt-telemetry.adapter.ts', { '../config/env': { env }, '../services/telemetry-ingestion.service': { telemetryIngestionService: { ingest: async batch => received.push(batch) } } }).mqttTelemetryAdapter;
  const now = new Date(); const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode: 'ESP32-GF-A-01', recordedAt: now.toISOString(), readings: [{ sensorCode: 'LIGHT_01', value: 0 }] }));
  await adapter.handle(topic('telemetry'), payload, { retain: true, receivedAt: now }); assert.equal(received[0].presenceSeenAt, null); assert.equal(received[0].evaluateAlerts, false); assert.equal(received[0].evaluateAutomation, false);
  await adapter.handle(topic('telemetry'), payload, { retain: false, receivedAt: now }); assert.equal(received[1].presenceSeenAt, now); assert.equal(received[1].evaluateAlerts, true); assert.equal(received[1].evaluateAutomation, true);
  assert.equal(await adapter.handle(topic('telemetry'), Buffer.from('not-json')), 'ignored'); assert.equal(received.length, 2);
});
test('9 watchdog start/stop/restart is idempotent, serial and survives database failure', async () => {
  const timers = new Map(); let id = 0, calls = 0, release; const errors = [];
  const { createPresenceWatchdog } = load('services/presence-watchdog.ts', {}, { setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key) });
  const watchdog = createPresenceWatchdog({ intervalMs: 10_000, check: () => { calls++; return calls === 1 ? Promise.reject(new Error('db unavailable')) : new Promise(resolve => { release = resolve; }); }, info() {}, warn: error => errors.push(error) });
  const tick = async () => { const next = timers.entries().next().value; timers.delete(next[0]); next[1](); await flush(); };
  watchdog.start(); watchdog.start(); assert.equal(timers.size, 1); await tick(); assert.equal(errors.length, 1); assert.equal(timers.size, 1);
  await tick(); assert.equal(calls, 2); assert.equal(timers.size, 0); watchdog.start(); assert.equal(timers.size, 0);
  const stopped = watchdog.stop(); release({ count: 0 }); await stopped; assert.equal(timers.size, 0);
  watchdog.start(); assert.equal(timers.size, 1); await watchdog.stop(); assert.equal(timers.size, 0);
});
test('14 MQTT reconnect resubscribes once per connect and forwards retained/arrival metadata', async () => {
  const clients = [], forwarded = [], subscriptions = [];
  const mqtt = { connect() { const client = new EventEmitter(); client.subscribe = (topics, options, callback) => { subscriptions.push({ topics, options }); callback(null, topics.map(topic => ({ topic, qos: 1 }))); }; client.end = (_force, _options, callback) => callback(); clients.push(client); return client; } };
  const service = load('mqtt/mqtt-client.service.ts', {
    mqtt, '../config/env': { env: { ...env, mqttEnabled: true, mqttReconnectPeriodMs: 3000 } },
    './mqtt-message-router': { mqttMessageRouter: { handle: async (...args) => forwarded.push(args) } },
  }).mqttClientService;
  service.start(); service.start(); assert.equal(clients.length, 1); clients[0].emit('connect'); assert.equal(service.connectionState, 'connected');
  clients[0].emit('message', topic('status'), status('ONLINE'), { retain: true }); await flush(); assert.equal(forwarded[0][2].retain, true); assert.ok(forwarded[0][2].receivedAt instanceof Date);
  clients[0].emit('offline'); assert.equal(service.connectionState, 'disconnected'); clients[0].emit('connect'); assert.equal(subscriptions.length, 4); assert.equal(subscriptions[1].options.qos, 1);
  assert.equal(subscriptions.filter(s => s.topics.length === 1 && s.topics[0].endsWith('/actuator/state')).length, 2);
  await service.stop(); service.start(); assert.equal(clients.length, 2); await service.stop();
});
test('12 authorization/farm scope unchanged; 13 presence source never writes readings or commands', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'services/device-presence.policy.ts'), 'utf8');
  assert.doesNotMatch(source, /sensorReading|deviceCommand|automationEvaluation|alertEvaluation/);
  const { farmScope } = load('repositories/farm.repository.ts', { '../config/database': { prisma: {} } });
  assert.equal(JSON.stringify(farmScope({ id: 'owner', role: 'FARM_OWNER' })), JSON.stringify({ ownerId: 'owner' }));
  assert.equal(JSON.stringify(farmScope({ id: 'staff', role: 'STAFF' })), JSON.stringify({ staffAssignments: { some: { staffId: 'staff' } } }));
  const command = fs.readFileSync(path.join(sourceRoot, 'services/device-command.service.ts'), 'utf8');
  assert.match(command, /command === "TURN_ON"/); assert.match(command, /connectionStatus !== "ONLINE"/);
});

test('12 auth uses current database role and farm access still rejects out-of-scope actors', async () => {
  const auth = load('middlewares/auth.middleware.ts', {
    '../repositories/user.repository': { userRepository: { findPublicById: async () => ({ id: 'staff', role: 'STAFF', status: 'ACTIVE' }) } },
    '../utils/jwt': { verifyAccessToken: () => ({ userId: 'staff', role: 'ADMIN' }) },
  }).authenticate;
  const request = { headers: { authorization: 'Bearer unit-test-placeholder' } }; let authError;
  await auth(request, {}, error => { authError = error; }); assert.equal(authError, undefined); assert.equal(request.user.role, 'STAFF');
  const { authorize } = load('middlewares/authorize.middleware.ts'); let roleError;
  authorize('ADMIN')(request, {}, error => { roleError = error; }); assert.equal(roleError.statusCode, 403);
  const access = load('services/farm-access.service.ts', {
    '../repositories/farm.repository': { farmRepository: { findAccessContext: async () => ({ ownerId: 'owner', farmAssignments: [], staffAssignments: [] }) } },
    '../repositories/zone.repository': { zoneRepository: {} }, '../repositories/crop.repository': { cropRepository: {} },
    '../repositories/device.repository': { deviceRepository: {} }, '../repositories/sensor.repository': { sensorRepository: {} },
  }).farmAccessService;
  await assert.rejects(access.assertFarmReadable('farm', { id: 'outside', role: 'STAFF' }), error => error.statusCode === 404);
  assert.ok(await access.assertFarmReadable('farm', { id: 'owner', role: 'FARM_OWNER' }));
});

test('router preserves transport context for telemetry and status', async () => {
  const calls = []; const adapter = { handle: async (...args) => calls.push(args) };
  const router = load('mqtt/mqtt-message-router.ts', { '../config/env': { env }, './mqtt-presence.adapter': { mqttPresenceAdapter: adapter }, './mqtt-telemetry.adapter': { mqttTelemetryAdapter: adapter } }).mqttMessageRouter;
  const context = { retain: true, receivedAt: new Date() };
  await router.handle(topic('telemetry'), Buffer.from('{}'), context); await router.handle(topic('status'), status('ONLINE'), context);
  assert.equal(calls.length, 2); assert.equal(calls[0][2], context); assert.equal(calls[1][2], context);
});
test('invalid or unknown status never changes presence', async () => {
  const f = fixture([{}]); const adapter = statusAdapter(f);
  assert.equal(await adapter.handle(topic('status'), Buffer.from('invalid')), 'ignored');
  assert.equal(await adapter.handle(topic('status'), Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode: 'WRONG', status: 'ONLINE' }))), 'ignored');
  const unknown = 'smart-agriculture/v1/devices/UNKNOWN-DEVICE/status';
  assert.equal(await adapter.handle(unknown, Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode: 'UNKNOWN-DEVICE', status: 'ONLINE' }))), 'ignored');
  assert.equal(f.updates.length, 0);
});
test('denied SUBACK is uncertain rather than a healthy MQTT observer', async () => {
  const client = new EventEmitter(); client.subscribe = (_topics, _options, callback) => callback(null, [{ qos: 128 }, { qos: 1 }]); client.end = (_force, _options, callback) => callback();
  const service = load('mqtt/mqtt-client.service.ts', { mqtt: { connect: () => client }, '../config/env': { env: { ...env, mqttEnabled: true } }, './mqtt-message-router': { mqttMessageRouter: { handle: async () => {} } } }).mqttClientService;
  service.start(); client.emit('connect'); assert.equal(service.connectionState, 'disconnected'); await service.stop();
});

test('Phase12C connected endpoint log redacts URL userinfo', async () => {
  const client = new EventEmitter(); const logs = [];
  client.subscribe = (topics, options, cb) => cb(null, topics.map(topic => ({ topic, qos: 1 })));
  client.end = (_force, _options, cb) => cb();
  const service = load('mqtt/mqtt-client.service.ts', {
    mqtt: { connect: () => client },
    '../config/env': { env: { ...env, mqttEnabled: true, mqttBrokerUrl: 'mqtt://test-user:DO_NOT_LOG@192.168.1.6:1883' } },
    './mqtt-message-router': { mqttMessageRouter: { handle: async () => {} } },
  }, { console: { log: value => logs.push(value), warn() {}, error() {} } }).mqttClientService;
  service.start(); client.emit('connect');
  assert.match(logs[0], /host=192\.168\.1\.6 port=1883/);
  assert.doesNotMatch(logs.join(' '), /test-user|DO_NOT_LOG/);
  await service.stop();
});

test('Phase12C backend starting after ESP32 accepts next non-retained heartbeat', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]);
  const adapter = statusAdapter(f);
  await adapter.handle(topic('status'), status('OFFLINE'), { retain: true, receivedAt: f.now() });
  assert.equal(f.records[0].connectionStatus, 'OFFLINE');
  f.advance(15);
  assert.equal(await adapter.handle(topic('status'), status('ONLINE'), { retain: false, receivedAt: f.now() }), 'accepted');
  assert.equal(f.records[0].connectionStatus, 'ONLINE');
  assert.equal(+f.records[0].lastSeenAt, +f.now());
});

test('Phase12C telemetry still reaches ingestion when status JSON is rejected', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]); const batches = [];
  const telemetry = load('mqtt/mqtt-telemetry.adapter.ts', {
    '../config/env': { env },
    '../services/telemetry-ingestion.service': { telemetryIngestionService: { ingest: async batch => batches.push(batch) } },
  }).mqttTelemetryAdapter;
  const router = load('mqtt/mqtt-message-router.ts', {
    '../config/env': { env }, './mqtt-presence.adapter': { mqttPresenceAdapter: statusAdapter(f) },
    './mqtt-telemetry.adapter': { mqttTelemetryAdapter: telemetry },
  }).mqttMessageRouter;
  await router.handle(topic('status'), Buffer.from('bad-json'));
  const context = { retain: false, receivedAt: f.now() };
  await router.handle(topic('telemetry'), Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode: 'ESP32-GF-A-01', recordedAt: new Date().toISOString(), readings: [{ sensorCode: 'LIGHT_01', value: 0 }] })), context);
  assert.equal(batches.length, 1); assert.equal(batches[0].readings[0].value, 0);
  assert.equal(batches[0].presenceSeenAt, context.receivedAt);
});

test('Phase12C device detail controller preserves database connectionStatus', async () => {
  const device = { id: 'real-id', deviceCode: 'ESP32-GF-A-01', connectionStatus: 'ONLINE', lastSeenAt: new Date() };
  const actor = { id: 'scoped-user', role: 'STAFF' };
  const service = load('services/device.service.ts', {
    '../repositories/device.repository': { deviceRepository: { findAccessibleById: async (id, user) => { assert.equal(id, device.id); assert.equal(user, actor); return device; } } },
    './activity-log.service': { recordActivity: async () => assert.fail('GET must not write activity') },
    './farm-access.service': { farmAccessService: {} },
  }).deviceService;
  const controller = load('controllers/device.controller.ts', { '../services/device.service': { deviceService: service } });
  let body;
  await controller.getDevice({ params: { id: device.id }, user: actor }, { json: value => { body = value; } }, error => { throw error; });
  assert.equal(body.data.device.connectionStatus, 'ONLINE'); assert.equal(body.data.device.lastSeenAt, device.lastSeenAt);
});

test('Phase12C diagnostic logs contain receipt and committed row count, never payload', async () => {
  const f = fixture([{ connectionStatus: 'OFFLINE' }]); const logs = [];
  const adapter = load('mqtt/mqtt-presence.adapter.ts', {
    '../config/env': { env: { ...env, mqttPresenceDebug: true } },
    '../repositories/device.repository': { deviceRepository: { findByCode: async () => f.records[0] } },
    '../services/device-presence.service': { devicePresenceService: f.service },
  }, { console: { log: value => logs.push(JSON.parse(value)), warn() {}, error() {} } }).mqttPresenceAdapter;
  await adapter.handle(topic('status'), status('ONLINE'), { retain: false, receivedAt: f.now() });
  assert.deepEqual(logs.map(log => log.event), ['STATUS_RECEIVED', 'DEVICE_MATCHED', 'DB_UPDATE_COMPLETED']);
  assert.equal(logs[2].affected, 1); assert.equal(logs[2].status, 'ONLINE');
  for (const log of logs) assert.deepEqual(Object.keys(log).filter(key => /password|token|payload|secret/i.test(key)), []);
  await adapter.handle(topic('status'), status('OFFLINE'), { retain: true, receivedAt: f.now() });
  assert.equal(logs.at(-1).event, 'REPLAY_IGNORED'); assert.equal(f.records[0].connectionStatus, 'ONLINE');
});

test('Phase12C frontend ONLINE label and device binding use actual API connectionStatus (static contract)', () => {
  const labels = load('../../frontend/src/types/device.ts').connectionLabels;
  assert.equal(labels.ONLINE, 'Trực tuyến'); assert.equal(labels.OFFLINE, 'Ngoại tuyến');
  const detail = fs.readFileSync(path.join(sourceRoot, '../../frontend/src/pages/devices/DeviceDetailPage.tsx'), 'utf8');
  const list = fs.readFileSync(path.join(sourceRoot, '../../frontend/src/pages/devices/DevicesPage.tsx'), 'utf8');
  assert.match(detail, /connectionLabels\[device.connectionStatus\]/);
  assert.match(list, /connectionLabels\[d.connectionStatus\]/);
  assert.match(detail, /usePolling\(/); assert.match(list, /usePolling\(/);
});

test('presence environment defaults and timeout validation require no real .env', () => {
  const base = { DATABASE_URL: 'unit-test-placeholder', JWT_SECRET: 'unit-test-placeholder-more-than-32-characters' };
  const read = overrides => load('config/env.ts', { dotenv: { config() {} } }, { process: { env: { ...base, ...overrides } } }).env;
  const config = read({}); assert.equal(config.devicePresenceTimeoutSeconds, 90); assert.equal(config.devicePresenceCheckIntervalSeconds, 10);
  assert.throws(() => read({ DEVICE_PRESENCE_TIMEOUT_SECONDS: '0' }), /positive integer/);
  assert.throws(() => read({ DEVICE_PRESENCE_CHECK_INTERVAL_SECONDS: '100' }), /must not exceed/);
});

test('QoS redelivery cannot replay an old OFFLINE over newer ONLINE', async () => {
  const f = fixture([{}]); await f.service.markOnline('ESP32-GF-A-01'); f.advance(1);
  await statusAdapter(f).handle(topic('status'), status('OFFLINE'), { retain: false, dup: true, receivedAt: f.now() });
  assert.equal(f.records[0].connectionStatus, 'ONLINE');
});
