// Offline only: no Prisma client, environment loader, network or gateway.
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IrrigationPersistenceFoundation: Foundation } = require('../src/services/irrigation-persistence/foundation.ts');
const { PostgresTestIrrigationRepository: Pg } = require('../src/services/irrigation-persistence/postgres-test.repository.ts');
const { createStore, createFakeRepository } = require('./irrigation-persistence-fake.cjs');
function setup() {
  const snapshot = structuredClone(require('./fixtures/shadow-irrigation.json').snapshot);
  const safety = { actuatorId: 'actuator', deviceId: 'device', deviceCode: snapshot.device.deviceCode, actuatorCode: 'PUMP_01', sessionId: snapshot.device.sessionId,
    version: 0, faultLatched: false, faultReason: null, emergencyStop: false, manualOverrideUntil: null,
    lastActuatorOffAt: null, cooldownUntil: null, lastAcceptedTime: null, budgetDayHighWater: null, reportedState: 'OFF' };
  const cycle = { actuatorId: 'actuator', version: 0, state: structuredClone(snapshot.cycle), policy: structuredClone(snapshot.rule), soakUntil: null };
  const store = createStore({ safety: new Map([['actuator', safety]]), cycles: new Map([[cycle.state.id, cycle]]), budgets: new Map(), intents: new Map(), reservations: new Map(), audits: new Map() });
  let count = 0;
  const repo = createFakeRepository(store), svc = new Foundation(repo, () => 'durable-' + ++count);
  const request = key => ({ actuatorId: 'actuator', cycleId: cycle.state.id, idempotencyKey: key || 'request', source: 'FIXTURE', snapshot: structuredClone(snapshot) });
  const cancel = i => svc.cancelUnclaimed('actuator', i.id, '2026-10-20T12:00:01.000Z', i.correlationId);
  return { store, svc, repo, snapshot, request, cancel, cycleId: cycle.state.id };
}
test('release is atomic, audited, once only, and never resets consumed reading or clock/day high water', async () => {
  const f = setup(), { intent } = await f.svc.reserve(f.request());
  const cycleBefore = structuredClone(f.store.data.cycles.get(f.cycleId));
  assert.equal(await f.cancel(intent), 'RELEASED');
  assert.equal(await f.cancel(intent), 'ALREADY_CANCELLED');
  assert.equal([...f.store.data.budgets.values()][0].state.reservedSeconds, 0);
  assert.equal([...f.store.data.budgets.values()][0].state.reservedRuns, 0);
  assert.equal([...f.store.data.reservations.values()][0].status, 'RELEASED');
  assert.equal(f.store.data.intents.get(intent.id).status, 'CANCELLED');
  const c = f.store.data.cycles.get(f.cycleId);
  assert.deepEqual(c.state.consumedKeys, cycleBefore.state.consumedKeys);
  assert.equal(c.state.pulsesInCycle, cycleBefore.state.pulsesInCycle);
  assert.equal(c.state.phase, 'FAULT_LOCKED');
  assert.equal(f.store.data.audits.size, 2);
  assert.equal(f.store.data.safety.get('actuator').budgetDayHighWater, '2026-10-20');
  assert.equal((await f.svc.reserve(f.request())).kind, 'REPLAY');
  assert.notEqual((await f.svc.reserve(f.request('new-key'))).kind, 'RESERVED');
});
for (const operation of ['savebudgets', 'savereservations', 'saveintents', 'savecycles', 'savesafety', 'appendDecision']) {
  test('release rollback at ' + operation + ' leaves all six ledgers unchanged', async () => {
    const f = setup(), { intent } = await f.svc.reserve(f.request()), before = structuredClone(f.store.data);
    f.store.failAt = operation;
    await assert.rejects(f.cancel(intent), /Injected failure/);
    assert.deepEqual(f.store.data, before);
  });
}
for (const stage of ['DISPATCH_CLAIMED', 'PUBLISHED', 'ACKED', 'UNCERTAIN', 'REJECTED']) {
  test('cannot release quota from ' + stage, async () => {
    const f = setup(), { intent: i } = await f.svc.reserve(f.request());
    await f.svc.recordLifecycle('actuator', i.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:00.100Z', i.correlationId);
    if (stage === 'PUBLISHED' || stage === 'ACKED') await f.svc.recordLifecycle('actuator', i.id, 'PUBLISHED', '2026-10-20T12:00:00.200Z', i.correlationId);
    if (stage === 'ACKED') await f.svc.recordLifecycle('actuator', i.id, 'ACK_APPLIED', '2026-10-20T12:00:00.300Z', i.correlationId);
    if (stage === 'UNCERTAIN' || stage === 'REJECTED') await f.svc.recordLifecycle('actuator', i.id, stage === 'UNCERTAIN' ? 'ACK_TIMEOUT' : 'ACK_REJECTED', '2026-10-20T12:00:00.300Z', i.correlationId);
    const before = structuredClone(f.store.data);
    assert.equal(await f.cancel(i), 'RELEASE_FORBIDDEN'); assert.deepEqual(f.store.data, before);
  });
}
test('cancel racing dispatch has only one serialized winner and cannot refund after claim', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  const results = await Promise.all([
    f.svc.recordLifecycle('actuator', i.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:00.100Z', i.correlationId), f.cancel(i)
  ]);
  assert.deepEqual(results, ['DISPATCH_CLAIMED', 'RELEASE_FORBIDDEN']);
  assert.equal([...f.store.data.budgets.values()][0].state.reservedSeconds, 1);
});
test('duplicate cancellation requests release just once', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  assert.deepEqual(await Promise.all([f.cancel(i), f.cancel(i)]), ['RELEASED', 'ALREADY_CANCELLED']);
});
test('cancel winning a dispatch race makes the later claim terminal, without a second refund', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  assert.deepEqual(await Promise.all([f.cancel(i), f.svc.recordLifecycle('actuator', i.id, 'DISPATCH_CLAIMED', '2026-10-20T12:00:02Z', i.correlationId)]), ['RELEASED', 'TERMINAL_INTENT_NO_RETRY']);
  assert.equal([...f.store.data.budgets.values()][0].state.reservedRuns, 0);
});
test('skip evaluation replay returns original immutable audit outcome', async () => {
  const f = setup(), r = f.request(); r.snapshot.reading.value = 50;
  const a = await f.svc.reserve(r), before = structuredClone(f.store.data);
  const b = await f.svc.reserve(r);
  assert.equal(a.kind, 'SKIPPED'); assert.equal(b.kind, a.kind); assert.equal(b.reason, a.reason);
  assert.deepEqual(f.store.data, before);
});
test('idempotency key of a skip cannot be reused for a different reading/payload', async () => {
  const f = setup(), r = f.request(); r.snapshot.reading.value = 50;
  await f.svc.reserve(r);
  assert.equal((await f.svc.reserve(f.request())).reason, 'IDEMPOTENCY_KEY_REUSED');
  assert.equal(f.store.data.intents.size, 0); assert.equal(f.store.data.audits.size, 1);
});
for (const kind of ['EMERGENCY_STOP', 'MANUAL_OVERRIDE']) test(kind + ' prevents subsequent dispatch claim/publication', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind, until: '2026-10-21T00:00:00Z' });
  for (const event of ['DISPATCH_CLAIMED', 'PUBLISHED']) assert.equal(await f.svc.recordLifecycle('actuator', i.id, event, '2026-10-20T12:00:01Z', i.correlationId), 'SAFETY_INHIBITED');
  assert.equal(f.store.data.intents.get(i.id).status, 'RESERVED');
});
test('clock rollback blocks release and latches fault without allocating yesterday quota', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  assert.equal(await f.svc.cancelUnclaimed('actuator', i.id, '2026-10-19T12:00:00Z', i.correlationId), 'CLOCK_ROLLBACK');
  assert.equal([...f.store.data.budgets.values()][0].state.reservedSeconds, 1);
  assert.equal(f.store.data.safety.get('actuator').faultReason, 'CLOCK_ROLLBACK');
});
test('wrong correlation/session cannot cancel', async () => {
  const f = setup(), { intent: i } = await f.svc.reserve(f.request());
  assert.equal(await f.svc.cancelUnclaimed('actuator', i.id, f.snapshot.now, 'wrong'), 'CONTEXT_MISMATCH');
  f.store.data.safety.get('actuator').sessionId = 'new';
  assert.equal(await f.cancel(i), 'CONTEXT_MISMATCH');
});
test('emergency stop survives repository reconstruction and recovery; no rearm API', async () => {
  const f = setup();
  assert.equal(await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'EMERGENCY_STOP' }), 'INHIBITED');
  const restored = createStore(f.store.data), service = new Foundation(createFakeRepository(restored));
  await service.recover('actuator', 'new-session', '2026-10-20T12:00:01Z');
  assert.equal(restored.data.safety.get('actuator').emergencyStop, true);
  assert.equal(restored.data.safety.get('actuator').faultLatched, true);
  assert.equal(restored.data.audits.size, 1);
  assert.equal(typeof service.rearm, 'undefined');
});
test('manual override only extends, persists through recovery and blocks reserve', async () => {
  const f = setup(), until = '2026-10-21T12:00:00Z';
  await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'MANUAL_OVERRIDE', until });
  await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'MANUAL_OVERRIDE', until: '2026-10-20T13:00:00Z' });
  assert.equal(f.store.data.safety.get('actuator').manualOverrideUntil, until);
  assert.notEqual((await f.svc.reserve(f.request())).kind, 'RESERVED');
  await f.svc.recover('actuator', 'new-session', f.snapshot.now);
  assert.equal(f.store.data.safety.get('actuator').manualOverrideUntil, until);
});
test('inhibit audit keys include cycle/session even when an isolated fixture initializes the same safety version', async () => {
  const f = setup();
  await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'EMERGENCY_STOP' });
  const old = f.store.data.cycles.get(f.cycleId), next = structuredClone(old);
  next.state.id = 'next-fixture-cycle'; next.state.sessionId = 'next-session';
  f.store.data.cycles.set(next.state.id, next);
  const safety = f.store.data.safety.get('actuator'); safety.version = 0; safety.sessionId = 'next-session';
  await f.svc.inhibit('actuator', next.state.id, f.snapshot.now, { kind: 'MANUAL_OVERRIDE', until: '2026-10-21T12:00:00Z' });
  assert.equal(f.store.data.audits.size, 2);
});
test('emergency stop cannot be prevented by clock rollback, high-water never decreases', async () => {
  const f = setup(), s = f.store.data.safety.get('actuator'); s.lastAcceptedTime = '2026-10-21T00:00:00Z';
  await f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'EMERGENCY_STOP' });
  assert.equal(f.store.data.safety.get('actuator').emergencyStop, true);
  assert.equal(f.store.data.safety.get('actuator').lastAcceptedTime, s.lastAcceptedTime);
});
for (const operation of ['savesafety', 'appendDecision']) test('inhibit audit/state transaction rolls back at ' + operation, async () => {
  const f = setup(), before = structuredClone(f.store.data); f.store.failAt = operation;
  await assert.rejects(f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, { kind: 'EMERGENCY_STOP' }), /Injected/);
  assert.deepEqual(f.store.data, before);
});
test('audit is append-only and conflicting idempotency never silently overwrites evidence', async () => {
  const f = setup(); await f.svc.reserve(f.request()); const row = [...f.store.data.audits.values()][0];
  await f.repo.transaction('actuator', tx => tx.appendDecision(row));
  await assert.rejects(f.repo.transaction('actuator', tx => tx.appendDecision({ ...row, reasonCode: 'tampered' })), /AUDIT_IDEMPOTENCY_CONFLICT/);
  assert.deepEqual([...f.store.data.audits.values()][0], row);
});
for (const action of [null, { kind: 'CLEAR' }, { kind: 'MANUAL_OVERRIDE', until: 'bad' }, { kind: 'MANUAL_OVERRIDE', until: '2020-01-01T00:00:00Z' }]) {
  test('invalid inhibit action rejected: ' + JSON.stringify(action), async () => {
    const f = setup(); await assert.rejects(f.svc.inhibit('actuator', f.cycleId, f.snapshot.now, action), /INVALID_INHIBIT/);
    assert.equal(f.store.data.audits.size, 0);
  });
}
// Prisma protocol doubles below test adapter behavior, NOT PostgreSQL SQL semantics.
function protocol(overrides = {}) {
  const identity = { db: 'smart_agriculture_test_phase13_3b', role: 'phase13_test_app', host: '127.0.0.1/32', port: 55433, schema: 'phase13_test_phase13_3b', started: 'test-start', ...overrides };
  const calls = []; let queried = 0;
  const db = { async $queryRawUnsafe(sql) { calls.push(sql); return ++queried === 1 ? [identity] : []; },
    irrigationSafetyState: { async findUnique() { return null; } },
    commandIntent: { async findFirst(args) { calls.push(args); return null; } },
    irrigationDailyBudget: { async findFirst(args) { calls.push(args); return null; } },
    irrigationCycle: { async findUnique() { return { mode: 'SHADOW', actuatorId: 'other' }; } } };
  const client = { async $transaction(work, options) { calls.push(options); return work(db); } };
  return { repo: new Pg(client, 'test-start'), calls, db };
}
for (const [field, value] of Object.entries({ db: 'smart_agriculture', role: 'phase13_test_admin', host: 'remote', port: 5432, schema: 'public', started: 'other-process' })) {
  test('SQL identity refuses ' + field + ' mismatch before work', async () => {
    const f = protocol({ [field]: value }); let ran = false;
    await assert.rejects(f.repo.transaction('actuator', async () => { ran = true; }), /TEST_SQL_IDENTITY_MISMATCH_STOP/);
    assert.equal(ran, false);
  });
}
test('adapter enforces lock before access and scopes intent/budget/cycle to locked actuator', async () => {
  const f = protocol();
  await f.repo.transaction('actuator', async tx => {
    await assert.rejects(tx.getBudget('budget'), /ACTUATOR_LOCK_REQUIRED/);
    await tx.lockActuator('actuator');
    await tx.getIntent('intent'); await tx.getBudget('budget'); assert.equal(await tx.getCycle('foreign'), null);
  });
  assert.match(f.calls[2], /phase13_test_phase13_3b\.irrigation_safety_states.*FOR UPDATE/);
  for (const call of f.calls.filter(c => c.where)) assert.equal(call.where.actuatorId, 'actuator');
});
test('adapter CAS requires version+1 and a single changed row', async () => {
  const f = protocol(); f.db.commandIntent.updateMany = async () => ({ count: 0 });
  const row = { actuatorId: 'actuator', version: 1, mode: 'SHADOW' };
  await f.repo.transaction('actuator', async tx => {
    await tx.lockActuator('actuator');
    await assert.rejects(tx.saveIntent({ ...row, version: 3 }, 0), /VERSION_CONFLICT/);
    await assert.rejects(tx.saveIntent(row, 0), /VERSION_CONFLICT/);
  });
});
test('SQL audit duplicate requires identical evidence and never issues UPDATE', async () => {
  const f = protocol(); let prior;
  f.db.irrigationDecisionLog = {
    async createMany(args) { prior ??= args.data[0]; return { count: 0 }; },
    async findUnique() { return prior; }
  };
  const row = { evaluationKey: 'key', actuatorId: 'actuator', cycleId: 'cycle', intentId: null, readingReference: 'reading', ruleId: 'rule', ruleVersion: 1,
    evaluatedAt: '2026-10-20T12:00:00Z', source: 'FIXTURE', mode: 'SHADOW', outcome: 'WOULD_BLOCK', reasonCode: 'test', evidence: { a: 1, b: 2 } };
  await f.repo.transaction('actuator', async tx => {
    await tx.lockActuator('actuator'); await tx.appendDecision(row);
    await tx.appendDecision({ ...row, evidence: { b: 2, a: 1 } });
    await assert.rejects(tx.appendDecision({ ...row, evidence: { a: 999 } }), /AUDIT_IDEMPOTENCY_CONFLICT/);
    await assert.rejects(tx.appendDecision({ ...row, source: 'VERIFIED_LIVE' }), /SHADOW_AUDIT_ONLY/);
    await assert.rejects(tx.appendDecision({ ...row, mode: 'ACTIVE' }), /SHADOW_AUDIT_ONLY/);
  });
});
test('v2 SQL review is fixed-target, schema-qualified, additive, and rolls back by default', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/proposals/irrigation-v2-isolated-review.sql'), 'utf8');
  assert.match(sql, /inet_server_port\(\) <> 55433/);
  assert.match(sql, /current_database\(\) <> 'smart_agriculture_test_phase13_3b'/);
  assert.match(sql, /current_user <> 'phase13_test_migrator'/);
  assert.match(sql, /ROLLBACK;\s*$/);
  assert.doesNotMatch(sql, /\b(?:DROP|COMMIT)\b|ALTER TABLE (?:public\.|sensor_readings|device_commands)/i);
  for (const match of sql.matchAll(/ALTER TABLE\s+(\S+)/g)) assert.ok(match[1].startsWith('phase13_test_phase13_3b.'));
  assert.match(sql, /BEFORE UPDATE OR DELETE/); assert.match(sql, /BEFORE TRUNCATE/);
});
test('no production import wiring or fallback connection added', () => {
  const root = path.resolve(__dirname, '../src');
  for (const file of ['server.ts', 'services/automation-evaluation.service.ts', 'services/telemetry-ingestion.service.ts', 'routes/index.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /irrigation-persistence/);
  }
  const source = fs.readFileSync(path.join(root, 'services/irrigation-persistence/postgres-test.repository.ts'), 'utf8');
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|new PrismaClient|mqtt|\.publish\(/);
});
