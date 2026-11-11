// Offline VM with a closed dependency graph. Never import env, Prisma, MQTT or server.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/services');
const allowed = new Set(['automatic-irrigation/decision-engine.ts', 'automatic-irrigation/shadow-schema.ts', 'automatic-irrigation/shadow-cycle.ts', 'pump-command-policy.ts']);
const sideEffects = { mqttPublished: 0, deviceCommandsCreated: 0, productionDbWrites: 0, actuatorMutations: 0 };
const forbidden = key => () => { sideEffects[key]++; throw Error('Side effect forbidden: ' + key); };
const cache = new Map();
class ExplicitDate extends Date {
  constructor(...args) { if (!args.length) throw Error('Implicit wall clock forbidden'); super(...args); }
  static now() { throw Error('Implicit wall clock forbidden'); }
}
function load(relative) {
  assert.ok(allowed.has(relative), 'Unapproved dependency: ' + relative);
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative), source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Date: ExplicitDate,
    mqtt: { publish: forbidden('mqttPublished') },
    prisma: { deviceCommand: { create: forbidden('deviceCommandsCreated') }, $executeRaw: forbidden('productionDbWrites'), actuator: { update: forbidden('actuatorMutations') } },
    process: { get env() { throw Error('Environment access forbidden'); } },
    fetch() { throw Error('Network forbidden'); }, setTimeout() { throw Error('Timers forbidden'); },
    require(specifier) {
      if (specifier === 'zod') return require('zod');
      if (!specifier.startsWith('.')) throw Error('Unapproved import: ' + specifier);
      return load(path.relative(root, path.resolve(path.dirname(filename), specifier) + '.ts').replaceAll('\\', '/'));
    },
  }, { filename, timeout: 2000 });
  cache.set(relative, exports);
  return exports;
}
const { decideIrrigation, irrigationDay } = load('automatic-irrigation/decision-engine.ts');
const { advanceShadowCycle } = load('automatic-irrigation/shadow-cycle.ts');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/shadow-irrigation.json'), 'utf8'));
const base = () => structuredClone(fixture.snapshot);
const plain = value => JSON.parse(JSON.stringify(value));
const iso = ms => new Date(ms).toISOString();
function refresh(s, ms, id = 'reading-' + ms) {
  s.now = iso(ms); s.clock.checkedAt = s.now; s.device.lastSeenAt = s.now;
  s.reading.readingId = id; s.reading.recordedAt = iso(ms - 1000); s.reading.receivedAt = s.now;
  s.actuator.off.recordedAt = iso(ms - 500); s.actuator.off.receivedAt = s.now;
}
function useDecision(s, d) { s.cycle = plain(d.nextCycle); s.budget = plain(d.nextBudget); }
function transition(s, type, key) {
  const r = advanceShadowCycle(s, { type, idempotencyKey: key });
  if (r.accepted) { s.cycle = plain(r.nextCycle); s.budget = plain(r.nextBudget); s.safety.lastActuatorOffAt = r.lastActuatorOffAt; }
  return r;
}
function pulse(s) {
  const d = decideIrrigation(s); assert.equal(d.outcome, 'WOULD_ON'); useDecision(s, d);
  assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, true);
  const ms = Date.parse(s.now);
  refresh(s, ms + 1000);
  assert.equal(transition(s, 'PULSE_ELAPSED', d.idempotencyKey).nextCycle.phase, 'WAIT_FRESH_OFF');
  refresh(s, ms + 1500);
  assert.equal(transition(s, 'OFF_REPORTED', d.idempotencyKey).nextCycle.phase, 'SOAK');
  return { d, ms };
}

for (const [value, outcome, reason] of [
  [18, 'WOULD_ON', 'SOIL_BELOW_THRESHOLD'], [0, 'WOULD_ON', 'SOIL_BELOW_THRESHOLD'],
  [20, 'WOULD_SKIP', 'HYSTERESIS_IDLE'], [30, 'WOULD_SKIP', 'HYSTERESIS_IDLE'],
  [40, 'WOULD_SKIP', 'SOIL_MOISTURE_SUFFICIENT'], [80, 'WOULD_SKIP', 'SOIL_MOISTURE_SUFFICIENT'],
  [100, 'WOULD_SKIP', 'SOIL_MOISTURE_SUFFICIENT'],
]) test('soil boundary ' + value, () => {
  const s = base(); s.reading.value = value;
  const d = decideIrrigation(s); assert.equal(d.outcome, outcome); assert.equal(d.reasonCode, reason); assert.equal(d.soilMoisture, value);
  assert.equal(d.recommendedRunSeconds, outcome === 'WOULD_ON' ? 1 : null);
});

for (const [name, change, reason] of [
  ['null', s => { s.reading.value = null; }, 'SNAPSHOT_INVALID'],
  ['NaN', s => { s.reading.value = NaN; }, 'SNAPSHOT_INVALID'],
  ['Infinity', s => { s.reading.value = Infinity; }, 'SNAPSHOT_INVALID'],
  ['below zero', s => { s.reading.value = -1; }, 'SNAPSHOT_INVALID'],
  ['above 100', s => { s.reading.value = 101; }, 'SNAPSHOT_INVALID'],
  ['missing trust', s => { delete s.reading.mqtt; }, 'SNAPSHOT_INVALID'],
  ['unknown input property', s => { s.injected = 'gateway'; }, 'SNAPSHOT_INVALID'],
  ['ACTIVE forbidden', s => { s.mode = 'ACTIVE'; }, 'SNAPSHOT_INVALID'],
  ['disabled', s => { s.mode = 'DISABLED'; }, 'AUTOMATION_DISABLED'],
  ['rule disabled', s => { s.rule.enabled = false; }, 'AUTOMATION_DISABLED'],
  ['threshold order', s => { s.rule.thresholdOn = s.rule.thresholdOff; }, 'INVALID_THRESHOLDS'],
  ['runtime above 1', s => { s.rule.pulseSeconds = 2; }, 'POLICY_RUNTIME_EXCEEDED'],
  ['sensor identity', s => { s.reading.sensorCode = 'TEMP_01'; }, 'IDENTITY_MISMATCH'],
  ['device identity', s => { s.device.deviceCode = 'ESP32-GF-B-01'; }, 'IDENTITY_MISMATCH'],
  ['actuator identity', s => { s.actuator.actuatorCode = 'PUMP_02'; }, 'IDENTITY_MISMATCH'],
  ['stale recordedAt', s => { s.reading.recordedAt = '2026-10-20T11:59:00Z'; }, 'STALE_READING'],
  ['stale receivedAt', s => { s.reading.recordedAt = s.reading.receivedAt = '2026-10-20T11:59:00Z'; }, 'STALE_READING'],
  ['future recordedAt', s => { s.reading.recordedAt = '2026-10-20T12:00:03Z'; }, 'FUTURE_READING'],
  ['future receivedAt', s => { s.reading.receivedAt = '2026-10-20T12:00:03Z'; }, 'FUTURE_READING'],
  ['wrong source', s => { s.reading.source = 'HTTP'; }, 'READING_SOURCE_INVALID'],
  ['unverified MQTT', s => { s.reading.mqtt.verified = false; }, 'MQTT_READING_UNTRUSTED'],
  ['unauthenticated MQTT', s => { s.reading.mqtt.authenticated = false; }, 'MQTT_READING_UNTRUSTED'],
  ['topic mismatch', s => { s.reading.mqtt.topicMatches = false; }, 'MQTT_READING_UNTRUSTED'],
  ['retained', s => { s.reading.mqtt.retained = true; }, 'RETAINED_READING'],
  ['duplicate', s => { s.reading.mqtt.duplicate = true; }, 'DUPLICATE_READING'],
  ['out of order', s => { s.reading.mqtt.outOfOrder = true; }, 'OUT_OF_ORDER_READING'],
  ['offline', s => { s.device.connectionStatus = 'OFFLINE'; }, 'DEVICE_NOT_ONLINE'],
  ['unknown presence', s => { s.device.connectionStatus = 'UNKNOWN'; }, 'DEVICE_NOT_ONLINE'],
  ['stale presence', s => { s.device.lastSeenAt = '2026-10-20T11:59:00Z'; }, 'PRESENCE_UNTRUSTED'],
  ['missing presence', s => { s.device.lastSeenAt = null; }, 'PRESENCE_UNTRUSTED'],
  ['pump unknown', s => { s.actuator.state = 'UNKNOWN'; }, 'PUMP_STATE_UNKNOWN'],
  ['pump on', s => { s.actuator.state = 'ON'; }, 'PUMP_ALREADY_ON'],
  ['no off', s => { s.actuator.off = null; }, 'OFF_UNTRUSTED'],
  ['historical/mock off', s => { s.actuator.off.source = 'MOCK'; }, 'OFF_UNTRUSTED'],
  ['retained off', s => { s.actuator.off.retained = true; }, 'OFF_UNTRUSTED'],
  ['previous session off', s => { s.actuator.off.sessionId = 'old'; }, 'OFF_SESSION_MISMATCH'],
  ['pre-session off', s => { s.actuator.off.recordedAt = '2026-10-20T10:59:59Z'; }, 'OFF_SESSION_MISMATCH'],
  ['stale off', s => { s.actuator.off.recordedAt = '2026-10-20T11:59:00Z'; }, 'OFF_STALE_OR_FUTURE'],
  ['future off', s => { s.actuator.off.recordedAt = '2026-10-20T12:00:03Z'; }, 'OFF_STALE_OR_FUTURE'],
  ['broker disconnected', s => { s.device.brokerHealthy = false; }, 'BROKER_UNAVAILABLE'],
  ['clock unhealthy', s => { s.clock.health = 'UNHEALTHY'; }, 'CLOCK_UNHEALTHY'],
  ['clock unknown', s => { s.clock.health = 'UNKNOWN'; }, 'CLOCK_UNKNOWN'],
  ['clock stale', s => { s.clock.checkedAt = '2026-10-20T11:58:00Z'; }, 'CLOCK_SNAPSHOT_STALE'],
  ['clock future', s => { s.clock.checkedAt = '2026-10-20T12:00:01Z'; }, 'CLOCK_SNAPSHOT_FUTURE'],
  ['clock offset missing', s => { s.clock.offsetMs = null; }, 'CLOCK_OFFSET_UNTRUSTED'],
  ['clock skew', s => { s.clock.offsetMs = -501; }, 'CLOCK_OFFSET_UNTRUSTED'],
  ['pending', s => { s.actuator.pending = true; }, 'COMMAND_PENDING'],
  ['manual override', s => { s.safety.manualOverrideUntil = '2026-10-20T12:01:00Z'; }, 'MANUAL_OVERRIDE'],
  ['cooldown', s => { s.safety.lastActuatorOffAt = '2026-10-20T11:59:50Z'; }, 'COOLDOWN_ACTIVE'],
  ['future shared cooldown', s => { s.safety.lastActuatorOffAt = '2026-10-20T12:00:01Z'; }, 'CYCLE_TIMESTAMP_FUTURE'],
  ['daily seconds', s => { s.budget.reservedSeconds = 3; }, 'DAILY_BUDGET_EXHAUSTED'],
  ['daily runs', s => { s.budget.reservedRuns = 3; }, 'DAILY_RUN_LIMIT'],
  ['budget not trusted', s => { s.budget.trusted = false; }, 'BUDGET_STATE_UNTRUSTED'],
  ['budget from yesterday', s => { s.budget.day = '2026-10-19'; }, 'BUDGET_STATE_UNTRUSTED'],
  ['fault latch', s => { s.safety.faultLatched = true; }, 'FAULT_LATCHED'],
  ['fault cycle', s => { s.cycle.phase = 'FAULT_LOCKED'; }, 'FAULT_LATCHED'],
  ['emergency stop', s => { s.safety.emergencyStop = true; }, 'EMERGENCY_STOP'],
  ['restart loses cycle', s => { s.cycle = null; }, 'CYCLE_STATE_UNTRUSTED'],
  ['untrusted cycle', s => { s.cycle.trusted = false; }, 'CYCLE_STATE_UNTRUSTED'],
  ['restart session changed', s => { s.cycle.sessionId = 'previous'; }, 'CYCLE_CONTEXT_MISMATCH'],
  ['rule version changed', s => { s.cycle.ruleVersion = 2; }, 'CYCLE_CONTEXT_MISMATCH'],
  ['cycle pending', s => { s.cycle.phase = 'PENDING_ACK'; }, 'CYCLE_IN_FLIGHT'],
  ['cycle active', s => { s.cycle.phase = 'PULSE_ACTIVE'; }, 'CYCLE_IN_FLIGHT'],
  ['cycle waiting off', s => { s.cycle.phase = 'WAIT_FRESH_OFF'; }, 'CYCLE_IN_FLIGHT'],
  ['reading reused', s => { s.cycle.lastReadingId = s.reading.readingId; }, 'READING_ALREADY_EVALUATED'],
  ['old reading', s => { s.cycle.lastReadingRecordedAt = s.reading.recordedAt; }, 'READING_ALREADY_EVALUATED'],
  ['no off after pulse', s => { s.cycle.pulsesInCycle = 1; }, 'PULSE_OFF_EVIDENCE_MISSING'],
  ['soak missing off', s => { s.cycle.phase = 'SOAK'; }, 'PULSE_OFF_EVIDENCE_MISSING'],
]) test('fail closed: ' + name, () => {
  const s = base(); change(s); const before = structuredClone(s);
  const d = decideIrrigation(s); assert.equal(d.outcome, 'BLOCKED'); assert.equal(d.reasonCode, reason); assert.equal(d.recommendedRunSeconds, null);
  assert.deepEqual(s, before);
});

test('same snapshot is deterministic; caller must carry proposed state, no atomic cross-instance claim', () => {
  const s = base(), one = decideIrrigation(s), two = decideIrrigation(s);
  assert.deepEqual(plain(one), plain(two)); assert.equal(one.idempotencyKey, two.idempotencyKey);
  useDecision(s, one); assert.equal(decideIrrigation(s).reasonCode, 'CYCLE_IN_FLIGHT');
  s.cycle.phase = 'IDLE'; s.cycle.lastReadingId = null; s.cycle.lastReadingRecordedAt = null;
  // Replaying a consumed slot is blocked even if a caller tampers with phase/count.
  s.cycle.pulsesInCycle = 0;
  assert.equal(decideIrrigation(s).reasonCode, 'IDEMPOTENCY_KEY_CONSUMED');
});
test('hysteresis uses trusted cycle state, no ON within band', () => {
  const s = base(); s.reading.value = 30; s.cycle.phase = 'REEVALUATE';
  assert.equal(decideIrrigation(s).reasonCode, 'HYSTERESIS_HOLD');
  s.cycle = null; assert.equal(decideIrrigation(s).outcome, 'BLOCKED');
});
test('pulse -> wait fresh OFF -> soak; no immediate repeat', () => {
  const s = base(), { d, ms } = pulse(s);
  assert.equal(d.nextCycle.phase, 'PENDING_ACK');
  assert.equal(decideIrrigation(s).reasonCode, 'COOLDOWN_ACTIVE');
  refresh(s, ms + 40_000); assert.equal(decideIrrigation(s).reasonCode, 'SOAK_ACTIVE');
  refresh(s, ms + 63_000);
  assert.equal(decideIrrigation(s).outcome, 'WOULD_ON');
});
test('old OFF cannot finish a pulse; duplicate ACK, early elapsed and late ACK are rejected', () => {
  const s = base(), d = decideIrrigation(s); useDecision(s, d);
  assert.equal(transition(s, 'OFF_REPORTED', d.idempotencyKey).accepted, false);
  assert.equal(transition(s, 'ACK_APPLIED', 'wrong').accepted, false);
  assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, true);
  assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, false);
  assert.equal(transition(s, 'PULSE_ELAPSED', d.idempotencyKey).accepted, false);
  assert.equal(transition(s, 'OFF_REPORTED', d.idempotencyKey).accepted, false);
});
for (const type of ['ACK_TIMEOUT', 'ACK_REJECTED']) test(type + ' latches fault without refund or retry', () => {
  const s = base(), d = decideIrrigation(s); useDecision(s, d);
  assert.equal(transition(s, type, d.idempotencyKey).accepted, true);
  assert.equal(s.budget.reservedRuns, 1); assert.equal(s.budget.reservedSeconds, 1);
  assert.equal(decideIrrigation(s).reasonCode, 'FAULT_LATCHED');
  assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, false);
});
test('persistent dry soil stops after finite daily run reservations', () => {
  const s = base();
  for (let i = 0; i < 3; i++) { const { ms } = pulse(s); refresh(s, ms + 63_000); }
  assert.equal(decideIrrigation(s).reasonCode, 'DAILY_RUN_LIMIT');
  assert.equal(s.budget.reservedRuns, 3); assert.equal(s.budget.reservedSeconds, 3);
});
test('per-cycle cap applies independently of daily quota', () => {
  const s = base(); s.rule.maxPulsesPerCycle = 1;
  const { ms } = pulse(s); refresh(s, ms + 63_000);
  assert.equal(decideIrrigation(s).reasonCode, 'CYCLE_PULSE_LIMIT');
});
test('reevaluation needs reading after pulse OFF, not a cached reading', () => {
  const s = base(), { ms } = pulse(s); refresh(s, ms + 63_000);
  s.reading.recordedAt = s.cycle.lastOffAt; s.rule.maxReadingAgeSeconds = 120;
  assert.equal(decideIrrigation(s).reasonCode, 'READING_BEFORE_PULSE_OFF');
});
test('UTC+7 budget day, no automatic midnight budget reset', () => {
  assert.equal(irrigationDay('2026-10-20T17:00:00Z'), '2026-10-21');
  const s = base(); refresh(s, Date.parse('2026-10-20T17:00:00Z'));
  assert.equal(decideIrrigation(s).reasonCode, 'BUDGET_STATE_UNTRUSTED');
});
test('closed source boundary: no side-effectful imports, dynamic require, timers or implicit clock', () => {
  for (const name of allowed) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
    function walk(node) {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier.text;
        if (specifier !== 'zod') {
          assert.ok(specifier.startsWith('.'));
          const target = path.relative(root, path.resolve(path.dirname(path.join(root, name)), specifier) + '.ts').replaceAll('\\', '/');
          assert.ok(allowed.has(target), target);
        }
      }
      if (ts.isCallExpression(node)) assert.ok(!['require', 'eval', 'Function', 'Date.now', 'Math.random', 'fetch', 'setTimeout', 'setInterval', 'import'].includes(node.expression.getText(tree)));
      if (ts.isNewExpression(node) && node.expression.getText(tree) === 'Date') assert.ok(node.arguments?.length);
      ts.forEachChild(node, walk);
    }
    walk(tree);
  }
  const s = base(), saved = structuredClone(s);
  for (let i = 0; i < 100; i++) decideIrrigation(s);
  assert.deepEqual(s, saved);
  assert.deepEqual(sideEffects, { mqttPublished: 0, deviceCommandsCreated: 0, productionDbWrites: 0, actuatorMutations: 0 });
});

test('proposal audit includes eligibility, isolated output cannot mutate input actuator or cycle', () => {
  const s = base(), before = structuredClone(s), d = decideIrrigation(s);
  assert.deepEqual(plain(d.phaseTransitions), ['IDLE', 'ELIGIBLE', 'PENDING_ACK']);
  d.nextCycle.consumedKeys.push('changed only in result'); d.nextBudget.reservedRuns = 100;
  assert.deepEqual(s, before);
});
test('invalid, disabled or restarted transition cannot resume watering', () => {
  const s = base(), d = decideIrrigation(s); useDecision(s, d);
  assert.equal(advanceShadowCycle(null, {}).accepted, false);
  s.mode = 'DISABLED'; assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, false);
  s.mode = 'SHADOW'; s.cycle.sessionId = 'old-session';
  assert.equal(transition(s, 'ACK_APPLIED', d.idempotencyKey).accepted, false);
});
test('retained, stale or duplicate OFF cannot complete simulated pulse', () => {
  for (const change of [s => { s.actuator.off.retained = true; }, s => { s.actuator.off.duplicate = true; }, s => { s.actuator.off.sessionId = 'old'; }]) {
    const s = base(), d = decideIrrigation(s); useDecision(s, d);
    transition(s, 'ACK_APPLIED', d.idempotencyKey); refresh(s, Date.parse(s.now) + 2000); change(s);
    assert.equal(transition(s, 'OFF_REPORTED', d.idempotencyKey).accepted, false);
  }
});
test('clock TTL and offset exact boundary accepted, expired TTL blocked', () => {
  const s = base(); s.clock.offsetMs = 500; s.clock.checkedAt = '2026-10-20T11:59:00Z';
  assert.equal(decideIrrigation(s).outcome, 'WOULD_ON');
  s.clock.checkedAt = '2026-10-20T11:58:59.999Z'; assert.equal(decideIrrigation(s).reasonCode, 'CLOCK_SNAPSHOT_STALE');
});
test('shared actuator cooldown applies even to a different rule/cycle snapshot', () => {
  const s = base(); s.rule.id = s.cycle.ruleId = 'different-fixture-rule';
  s.cycle.id = 'different-cycle'; s.safety.lastActuatorOffAt = '2026-10-20T11:59:59Z';
  assert.equal(decideIrrigation(s).reasonCode, 'COOLDOWN_ACTIVE');
});
test('production source never imports or invokes isolated shadow modules', () => {
  function visit(directory) {
    for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, file.name);
      if (['automatic-irrigation', 'shadow-preview', 'irrigation-persistence'].some(name => filename === path.join(root, name))) continue;
      if (file.isDirectory()) visit(filename);
      else if (file.name.endsWith('.ts')) assert.doesNotMatch(fs.readFileSync(filename, 'utf8'), /automatic-irrigation|decideIrrigation|advanceShadowCycle/);
    }
  }
  visit(path.resolve(__dirname, '../src'));
});
