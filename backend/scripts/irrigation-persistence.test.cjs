const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createStore, createFakeRepository } = require('./irrigation-persistence-fake.cjs');
const root = path.resolve(__dirname, '../src/services');
const allowed = new Set(['irrigation-persistence/foundation.ts', 'irrigation-persistence/test-database-guard.ts', 'automatic-irrigation/decision-engine.ts', 'automatic-irrigation/shadow-schema.ts', 'pump-command-policy.ts']);
const cache = new Map();
function load(relative) {
  if (!allowed.has(relative)) throw Error('Forbidden dependency: ' + relative);
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, Date, URL, require(specifier) {
    if (['zod', 'node:crypto'].includes(specifier)) return require(specifier);
    if (!specifier.startsWith('.')) throw Error('Forbidden import: ' + specifier);
    return load(path.relative(root, path.resolve(path.dirname(filename), specifier) + '.ts').replaceAll('\\', '/'));
  } }, { filename }); cache.set(relative, exports); return exports;
}
const { IrrigationPersistenceFoundation: Foundation } = load('irrigation-persistence/foundation.ts');
const { assertIsolatedTestDatabase } = load('irrigation-persistence/test-database-guard.ts');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/shadow-irrigation.json'), 'utf8')).snapshot;
const iso = ms => new Date(ms).toISOString();
function setup() {
  const snapshot = structuredClone(fixture);
  const safety = { actuatorId: 'actuator', deviceId: 'device', deviceCode: 'ESP32-GF-A-01', actuatorCode: 'PUMP_01', sessionId: snapshot.device.sessionId, version: 0,
    faultLatched: false, faultReason: null, emergencyStop: false, manualOverrideUntil: null, lastActuatorOffAt: null, cooldownUntil: null,
    lastAcceptedTime: null, budgetDayHighWater: null, reportedState: 'OFF' };
  const cycle = { actuatorId: 'actuator', version: 0, state: structuredClone(snapshot.cycle), policy: structuredClone(snapshot.rule), soakUntil: null };
  const store = createStore({ safety: new Map([['actuator', safety]]), cycles: new Map([[snapshot.cycle.id, cycle]]), budgets: new Map(), intents: new Map(), reservations: new Map(), audits: new Map() });
  let id = 0;
  const service = () => new Foundation(createFakeRepository(store), () => 'fake-id-' + (++id));
  const request = (key = 'request-1') => ({ actuatorId: 'actuator', cycleId: snapshot.cycle.id, idempotencyKey: key, source: 'FIXTURE', snapshot: structuredClone(snapshot) });
  return { snapshot, store, service, request };
}
function refresh(snapshot, at) {
  snapshot.now = at; const ms = Date.parse(at);
  snapshot.clock.checkedAt = at; snapshot.device.lastSeenAt = at;
  snapshot.reading.readingId = 'reading-' + ms; snapshot.reading.recordedAt = iso(ms - 100); snapshot.reading.receivedAt = at;
  snapshot.actuator.off.recordedAt = iso(ms - 50); snapshot.actuator.off.receivedAt = at;
}
test('reserve atomically maps cycle, budget, intent, reservation and audit; never DeviceCommand', async () => {
  const f = setup(), result = await f.service().reserve(f.request());
  assert.equal(result.kind, 'RESERVED'); assert.equal(result.intent.mode, 'SHADOW'); assert.equal(result.intent.seconds, 1);
  const d = f.store.data; assert.equal(d.intents.size, 1); assert.equal(d.reservations.size, 1); assert.equal(d.audits.size, 1);
  assert.equal([...d.budgets.values()][0].state.reservedSeconds, 1); assert.equal([...d.cycles.values()][0].state.phase, 'PENDING_ACK');
});
test('unique idempotency, same logical request returns the same intent, never dispatch permission', async () => {
  const f = setup(), service = f.service(), first = await service.reserve(f.request());
  const again = await service.reserve(f.request()); assert.equal(again.kind, 'REPLAY'); assert.equal(first.intent.id, again.intent.id);
  const changed = f.request(); changed.snapshot.reading.value = 19;
  assert.equal((await service.reserve(changed)).reason, 'IDEMPOTENCY_KEY_REUSED'); assert.equal(f.store.data.intents.size, 1);
});
test('JSONB key reordering does not change fingerprint', async () => {
  const f = setup(), service = f.service(); await service.reserve(f.request());
  const reordered = f.request(); reordered.snapshot.rule = Object.fromEntries(Object.entries(reordered.snapshot.rule).reverse());
  assert.equal((await service.reserve(reordered)).kind, 'REPLAY');
});
test('two simulated instances with same key reserve once', async () => {
  const f = setup(), one = f.service(), two = f.service();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? one : two).reserve(f.request())));
  assert.equal(results.filter(r => r.kind === 'RESERVED').length, 1); assert.equal(results.filter(r => r.kind === 'REPLAY').length, 19);
  assert.equal([...f.store.data.budgets.values()][0].state.reservedRuns, 1);
});
test('different keys on same actuator cannot reserve while a prior intent is open', async () => {
  const f = setup(), results = await Promise.all([f.service().reserve(f.request('a')), f.service().reserve(f.request('b'))]);
  assert.equal(results.filter(r => r.kind === 'RESERVED').length, 1); assert.equal(results.find(r => r.kind === 'BLOCKED').reason, 'ACTUATOR_INTENT_OPEN');
});
for (const failure of ['insertIntent', 'insertReservation', 'appendDecision', 'savesafety']) test('transaction rollback after ' + failure, async () => {
  const f = setup(), before = structuredClone(f.store.data); f.store.failAt = failure;
  await assert.rejects(f.service().reserve(f.request()), /Injected/); assert.deepEqual(f.store.data, before);
});
test('CAS mismatch aborts transaction', async () => {
  const f = setup(), repo = createFakeRepository(f.store);
  await assert.rejects(repo.transaction('actuator', async tx => { const s = await tx.lockActuator('actuator'); await tx.saveSafety({ ...s, version: 2 }, 1); }), /VERSION_CONFLICT/);
  assert.equal(f.store.data.safety.get('actuator').version, 0);
});
for (const [field, reason] of [['reservedRuns', 'DAILY_RUN_LIMIT'], ['reservedSeconds', 'DAILY_BUDGET_EXHAUSTED']]) test('persisted quota cannot be reset by snapshot: ' + field, async () => {
  const f = setup(); f.store.data.budgets.set('actuator|SHADOW|2026-10-20', { id: 'actuator|SHADOW|2026-10-20', actuatorId: 'actuator', version: 0, maxRuns: 3, maxSeconds: 3,
    state: { actuatorCode: 'PUMP_01', day: '2026-10-20', trusted: true, reservedRuns: field === 'reservedRuns' ? 3 : 0, reservedSeconds: field === 'reservedSeconds' ? 3 : 0 } });
  assert.equal((await f.service().reserve(f.request())).reason, reason); assert.equal(f.store.data.intents.size, 0);
});
for (const [name, modify, reason] of [
  ['fault', f => { f.store.data.safety.get('actuator').faultLatched = true; }, 'FAULT_LATCHED'],
  ['unknown persisted relay', f => { f.store.data.safety.get('actuator').reportedState = 'UNKNOWN'; }, 'FAULT_LATCHED'],
  ['cooldown', f => { f.store.data.safety.get('actuator').cooldownUntil = '2026-10-20T12:01:00Z'; }, 'PERSISTED_COOLDOWN'],
  ['soak', f => { f.store.data.cycles.get(f.snapshot.cycle.id).soakUntil = '2026-10-20T12:01:00Z'; }, 'PERSISTED_SOAK'],
  ['manual override', f => { f.store.data.safety.get('actuator').manualOverrideUntil = '2026-10-20T12:01:00Z'; }, 'MANUAL_OVERRIDE'],
  ['emergency stop', f => { f.store.data.safety.get('actuator').emergencyStop = true; }, 'EMERGENCY_STOP'],
  ['untrusted reading', f => { f.snapshot.reading.mqtt.verified = false; }, 'MQTT_READING_UNTRUSTED'],
  ['offline', f => { f.snapshot.device.connectionStatus = 'OFFLINE'; }, 'DEVICE_NOT_ONLINE'],
  ['unknown observed relay', f => { f.snapshot.actuator.state = 'UNKNOWN'; }, 'PUMP_STATE_UNKNOWN'],
  ['old OFF session', f => { f.snapshot.actuator.off.sessionId = 'old'; }, 'OFF_SESSION_MISMATCH'],
  ['clock unknown', f => { f.snapshot.clock.health = 'UNKNOWN'; }, 'CLOCK_NOT_TRUSTED'],
]) test('fail closed with persisted state: ' + name, async () => { const f = setup(); modify(f); assert.equal((await f.service().reserve(f.request())).reason, reason); assert.equal(f.store.data.intents.size, 0); });

test('ACTIVE/production repository and disabled snapshots are rejected', async () => {
  const f = setup(); assert.throws(() => new Foundation({ mode: 'ACTIVE', environment: 'PRODUCTION' }), /ISOLATED_SHADOW/);
  const req = f.request(); req.snapshot.mode = 'DISABLED'; assert.equal((await f.service().reserve(req)).reason, 'PERSISTENCE_SHADOW_ONLY');
});
test('stored policy is authoritative', async () => {
  const f = setup(); f.snapshot.rule.soakSeconds = 1;
  assert.equal((await f.service().reserve(f.request())).reason, 'PERSISTED_POLICY_MISMATCH');
});
test('duplicate evaluation under a different request key does not reserve after a skip', async () => {
  const f = setup(); f.snapshot.reading.value = 50;
  assert.equal((await f.service().reserve(f.request())).kind, 'SKIPPED');
  assert.equal((await f.service().reserve(f.request('again'))).reason, 'READING_ALREADY_EVALUATED');
});
test('clock rollback persists fault and never allocates a new day', async () => {
  const f = setup(); f.store.data.safety.get('actuator').lastAcceptedTime = '2026-10-20T12:00:01Z';
  assert.equal((await f.service().reserve(f.request())).reason, 'CLOCK_ROLLBACK');
  assert.equal(f.store.data.safety.get('actuator').faultReason, 'CLOCK_ROLLBACK'); assert.equal(f.store.data.budgets.size, 0);
});
test('UTC+7 midnight starts separate budget without erasing previous reservations', async () => {
  const f = setup(); f.store.data.safety.get('actuator').budgetDayHighWater = '2026-10-20';
  f.store.data.budgets.set('old', { id: 'old', actuatorId: 'actuator', version: 0, maxRuns: 3, maxSeconds: 3, state: { actuatorCode: 'PUMP_01', day: '2026-10-20', trusted: true, reservedRuns: 3, reservedSeconds: 3 } });
  refresh(f.snapshot, '2026-10-20T17:00:00.000Z');
  assert.equal((await f.service().reserve(f.request())).kind, 'RESERVED');
  assert.equal(f.store.data.budgets.get('old').state.reservedSeconds, 3); assert.equal(f.store.data.budgets.get('actuator|SHADOW|2026-10-21').state.reservedSeconds, 1);
});
for (const event of ['ACK_TIMEOUT', 'PUBLISH_UNCERTAIN', 'BROKER_LOST', 'ACK_REJECTED']) test(event + ' retains budget and late ACK cannot clear fault', async () => {
  const f = setup(), svc = f.service(), r = await svc.reserve(f.request()), i = r.intent;
  await svc.recordLifecycle('actuator', i.id, event, '2026-10-20T12:00:01Z', i.correlationId);
  assert.equal(f.store.data.safety.get('actuator').faultLatched, true);
  assert.equal([...f.store.data.budgets.values()][0].state.reservedSeconds, 1);
  assert.equal(await svc.recordLifecycle('actuator', i.id, 'ACK_APPLIED', '2026-10-20T12:00:02Z', i.correlationId), 'TERMINAL_INTENT_NO_RETRY');
  assert.notEqual((await svc.reserve(f.request('new'))).kind, 'RESERVED');
});
for (const stage of ['RESERVED', 'DISPATCH_CLAIMED', 'PUBLISHED', 'ACKED']) test('restart at ' + stage + ' is UNKNOWN/UNCERTAIN with no replay', async () => {
  const f = setup(), svc = f.service(), r = await svc.reserve(f.request()), i = r.intent;
  if (stage !== 'RESERVED') await svc.recordLifecycle('actuator', i.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:00.100Z', i.correlationId);
  if (['PUBLISHED', 'ACKED'].includes(stage)) await svc.recordLifecycle('actuator', i.id, 'PUBLISHED', '2026-10-20T12:00:00.200Z', i.correlationId);
  if (stage === 'ACKED') await svc.recordLifecycle('actuator', i.id, 'ACK_APPLIED', '2026-10-20T12:00:00.300Z', i.correlationId);
  // A new repository object using serialized/detached fake data models restart only.
  const restored = createStore(structuredClone(f.store.data)); const recovered = new Foundation(createFakeRepository(restored));
  assert.equal(await recovered.recover('actuator', 'new-session', '2026-10-20T12:00:01Z'), 'RECOVERY_LOCKED');
  assert.equal(restored.data.intents.get(i.id).status, 'UNCERTAIN'); assert.equal(restored.data.safety.get('actuator').reportedState, 'UNKNOWN');
  assert.equal([...restored.data.budgets.values()][0].state.reservedSeconds, 1); assert.equal(restored.data.intents.size, 1);
  const retry = f.request('another'); retry.snapshot.device.sessionId = 'new-session';
  assert.notEqual((await recovered.reserve(retry)).kind, 'RESERVED');
});
test('fresh OFF after ACK stores fake cooldown/soak, old OFF is rejected', async () => {
  const f = setup(), svc = f.service(), r = await svc.reserve(f.request()), i = r.intent;
  await svc.recordLifecycle('actuator', i.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:00.100Z', i.correlationId);
  await svc.recordLifecycle('actuator', i.id, 'PUBLISHED', '2026-10-20T12:00:00.200Z', i.correlationId);
  await svc.recordLifecycle('actuator', i.id, 'ACK_APPLIED', '2026-10-20T12:00:00.300Z', i.correlationId);
  assert.equal(await svc.acceptOff('actuator', i.id, f.snapshot), 'FRESH_OFF_REQUIRED');
  refresh(f.snapshot, '2026-10-20T12:00:02Z'); assert.equal(await svc.acceptOff('actuator', i.id, f.snapshot), 'SOAK');
  assert.equal(f.store.data.intents.get(i.id).status, 'COMPLETED');
  assert.ok(f.store.data.safety.get('actuator').cooldownUntil); assert.ok(f.store.data.cycles.get(f.snapshot.cycle.id).soakUntil);
  assert.equal((await f.service().reserve(f.request('next'))).reason, 'PERSISTED_COOLDOWN');
});
test('test database guard requires separate approval, exact endpoint/schema and test credentials', () => {
  const gate = { approved: true, testUrl: 'postgresql://phase13_test_user:FAKE_TEST_PASSWORD@127.0.0.1:5432/smart_agriculture_test_unit?schema=phase13_test_unit', productionUrl: 'postgresql://prod:FAKE_PROD_PASSWORD@localhost:5432/smart_agriculture', expectedDatabase: 'smart_agriculture_test_unit', expectedSchema: 'phase13_test_unit' };
  assert.equal(assertIsolatedTestDatabase(gate).productionMigrationAllowed, false);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, approved: false }), /APPROVAL/);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, testUrl: gate.productionUrl }), /ISOLATED/);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, productionUrl: gate.testUrl }), /ISOLATED/);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, testUrl: gate.testUrl.replace('127.0.0.1', 'remote.example') }), /ISOLATED/);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, testUrl: gate.testUrl.replace('phase13_test_unit', 'public') }), /ISOLATED/);
  assert.throws(() => assertIsolatedTestDatabase({ ...gate, testUrl: gate.testUrl + '&options=unsafe' }), /OPTION/);
});
test('module boundary: foundation has no network/Prisma/production routes or actuator mutations', () => {
  const source = fs.readFileSync(path.join(root, 'irrigation-persistence/foundation.ts'), 'utf8');
  assert.doesNotMatch(source, /config\/database|config\/env|mqttDeviceGateway|deviceCommandService|\.publish\(|\.deviceCommand\.|\.actuator\.update/);
});

test('expired intent and broker uncertainty never refund quota or permit redispatch', async () => {
  const f = setup(), svc = f.service(), r = await svc.reserve(f.request());
  assert.equal(await svc.recordLifecycle('actuator', r.intent.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:11Z', r.intent.correlationId), 'INTENT_EXPIRED');
  assert.equal(f.store.data.intents.get(r.intent.id).status, 'UNCERTAIN');
  const replay = await svc.reserve(f.request()); assert.equal(replay.kind, 'REPLAY'); assert.equal(replay.intent.status, 'UNCERTAIN');
  assert.equal([...f.store.data.budgets.values()][0].state.reservedRuns, 1);
});
test('wrong correlation and invalid transition leave ledger unchanged', async () => {
  const f = setup(), svc = f.service(), r = await svc.reserve(f.request()), before = structuredClone(f.store.data);
  assert.equal(await svc.recordLifecycle('actuator', r.intent.id, 'ACK_APPLIED', '2026-10-20T12:00:01Z', 'wrong'), 'CONTEXT_MISMATCH');
  assert.equal(await svc.recordLifecycle('actuator', r.intent.id, 'PUBLISHED', '2026-10-20T12:00:01Z', r.intent.correlationId), 'INVALID_TRANSITION');
  assert.deepEqual(f.store.data, before);
});
test('midnight does not clear fault, manual override or pending intent', async () => {
  for (const state of ['fault', 'manual', 'pending']) {
    const f = setup(), svc = f.service();
    if (state === 'pending') await svc.reserve(f.request());
    if (state === 'fault') f.store.data.safety.get('actuator').faultLatched = true;
    if (state === 'manual') f.store.data.safety.get('actuator').manualOverrideUntil = '2026-10-21T00:00:00Z';
    refresh(f.snapshot, '2026-10-20T17:00:00Z'); assert.notEqual((await svc.reserve(f.request('midnight'))).kind, 'RESERVED');
  }
});
test('persisted day high-water blocks going back to yesterday even with a healthy supplied clock', async () => {
  const f = setup(); f.store.data.safety.get('actuator').budgetDayHighWater = '2026-10-21';
  assert.equal((await f.service().reserve(f.request())).reason, 'CLOCK_ROLLBACK');
});
test('request shape rejects missing or non-string keys', async () => {
  const f = setup(), svc = f.service();
  assert.equal((await svc.reserve(null)).reason, 'REQUEST_INVALID');
  const r = f.request(); r.idempotencyKey = {}; assert.equal((await svc.reserve(r)).reason, 'REQUEST_INVALID');
});
test('foundation is not reachable from production routes, preview or telemetry', () => {
  for (const file of ['routes/index.ts', 'routes/shadow-preview.route.ts', 'services/telemetry-ingestion.service.ts', 'services/automation-evaluation.service.ts', 'services/shadow-preview/preview.service.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.resolve(root, '..', file), 'utf8'), /irrigation-persistence|IrrigationPersistenceFoundation/);
  }
});
