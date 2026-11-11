const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { previewShadow, previewQuerySchema, makeApp, counts, allowed, root } = require('./shadow-preview-harness.cjs');
const now = '2026-10-20T12:00:00.000Z';
const run = extra => previewShadow({ deviceId: 'fixture-device', ...extra }, now);
for (const [query, reason] of [
  [{}, 'SOIL_BELOW_THRESHOLD'], [{ soilMoisture: 0 }, 'SOIL_BELOW_THRESHOLD'], [{ soilMoisture: 100 }, 'SOIL_MOISTURE_SUFFICIENT'],
  [{ soilMoisture: 20 }, 'HYSTERESIS_IDLE'], [{ soilMoisture: 30 }, 'HYSTERESIS_IDLE'], [{ soilMoisture: 40 }, 'SOIL_MOISTURE_SUFFICIENT'],
  [{ cyclePhase: 'REEVALUATE', soilMoisture: 30 }, 'HYSTERESIS_HOLD'],
  [{ clockHealth: 'UNKNOWN' }, 'CLOCK_UNKNOWN'], [{ clockHealth: 'UNHEALTHY' }, 'CLOCK_UNHEALTHY'],
  [{ connectionStatus: 'OFFLINE' }, 'DEVICE_NOT_ONLINE'], [{ pumpState: 'UNKNOWN' }, 'PUMP_STATE_UNKNOWN'],
  [{ pumpState: 'ON' }, 'PUMP_ALREADY_ON'], [{ brokerHealthy: 'false' }, 'BROKER_UNAVAILABLE'],
  [{ readingScenario: 'STALE' }, 'STALE_READING'], [{ readingScenario: 'FUTURE' }, 'FUTURE_READING'],
  [{ readingScenario: 'RETAINED' }, 'RETAINED_READING'], [{ readingScenario: 'DUPLICATE' }, 'DUPLICATE_READING'],
  [{ cooldownSeconds: 10 }, 'COOLDOWN_ACTIVE'], [{ soakSeconds: 10 }, 'SOAK_ACTIVE'],
  [{ reservedRuns: 3 }, 'DAILY_RUN_LIMIT'], [{ reservedSeconds: 3 }, 'DAILY_BUDGET_EXHAUSTED'],
  [{ faultLatched: 'true' }, 'FAULT_LATCHED'], [{ cyclePhase: 'PENDING_ACK' }, 'COMMAND_PENDING'],
  [{ cyclePhase: 'PULSE_ACTIVE' }, 'CYCLE_IN_FLIGHT'], [{ cyclePhase: 'WAIT_FRESH_OFF' }, 'CYCLE_IN_FLIGHT'],
  [{ thresholdOn: 40, thresholdOff: 20 }, 'INVALID_THRESHOLDS'],
]) test('preview engine reason ' + reason + JSON.stringify(query), () => {
  const result = run(query); assert.equal(result.decision.reasonCode, reason);
  assert.equal(result.liveVerification, 'NOT_VERIFIED'); assert.ok(['FIXTURE', 'MOCK'].includes(result.source));
  assert.ok(/[À-ỹ]/u.test(result.reasonVi));
});
for (const key of ['verified', 'authenticated', 'trusted', 'source', 'snapshot', 'cycle', 'mode', 'command', 'now', 'budget']) test('reject client trust/state injection ' + key, () => {
  assert.equal(previewQuerySchema.safeParse({ deviceId: 'fixture-device', [key]: 'true' }).success, false);
});
test('fixture provenance never promoted to live and independent scenarios do not retain budget', () => {
  assert.equal(run({}).source, 'FIXTURE'); assert.equal(run({ soilMoisture: 45 }).source, 'MOCK');
  assert.equal(run({}).diagnostics.reservedRuns, 1); assert.equal(run({}).diagnostics.reservedRuns, 1);
});
test('authenticated GET scope, validation and method restrictions with no production writes', async () => {
  const server = makeApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/shadow-preview`;
  async function request(query, token = 'owner', method = 'GET') {
    return fetch(base + '?' + new URLSearchParams({ deviceId: 'fixture-device', ...query }), { method, headers: token ? { Authorization: 'Bearer ' + token } : {} });
  }
  try {
    assert.equal((await request({}, '')).status, 401);
    assert.equal((await request({}, 'outsider')).status, 404);
    assert.equal((await request({ deviceId: 'other' })).status, 404);
    assert.equal((await request({ trusted: 'true' })).status, 400);
    assert.equal((await request({ soilMoisture: '-1' })).status, 400);
    assert.equal((await request({ soilMoisture: 'NaN' })).status, 400);
    assert.equal((await request({}, 'owner', 'POST')).status, 404);
    const response = await request({}, 'staff'); assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).data.decision.outcome, 'WOULD_ON');
    assert.ok(counts.reads > 0);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('closed preview import graph, no write paths; no direct production gateway or evaluator', () => {
  const preview = fs.readFileSync(path.join(root, 'services/shadow-preview/preview.service.ts'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'routes/shadow-preview.route.ts'), 'utf8');
  assert.doesNotMatch(preview + route, /deviceCommandService|automationEvaluationService|mqttDeviceGateway|\.publish\(|\.create\(|\.update\(|\.delete\(/);
  assert.ok(allowed.size > 0);
  assert.deepEqual({ ...counts, reads: 0 }, { reads: 0, mqttPublished: 0, deviceCommandCreated: 0, dbWrites: 0, actuatorMutations: 0 });
});
