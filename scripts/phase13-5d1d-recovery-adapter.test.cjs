'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const adapter = require('./phase13-5d1d-recovery-adapter.cjs');
const NOW = '2026-10-25T16:30:00.000Z', H = 'a'.repeat(64);
const fresh = (delta = 0) => new Date(Date.parse(NOW) + delta).toISOString();
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(runId = 'd1d-pure-case') {
  const planOptions = { runId, storagePath: `C:\\Users\\OfflineOperator\\AppData\\Local\\SmartAgricultureRuntimeRecovery\\${runId}` };
  const plan = adapter.buildPlan(planOptions), values = {
    physical: { confirmedByOperator: true, pumpAdapterDisconnected: true, esp32UsbOnly: true, confirmationReference: 'mock-operator-confirmation' },
    process: { backendProcessCount: 0, port5000ListenerCount: 0, startupAttemptInProgress: false, unknownPriorOutcome: false },
    database: { readOnly: true, postgresMajor: 17, pgdata: 'C:/Program Files/PostgreSQL/17/data', systemId: adapter.SYSTEM_ID,
      database: 'smart_agriculture', schema: 'public', host: '127.0.0.1', port: 5432, serverStartedAt: fresh(-86400000), principalReference: 'mock-database-principal' },
    migrations: { rows: 11, unfinished: 0, rolledBack: 0, actualRows: adapter.MIGRATIONS.map(([name, checksum]) => ({ name, checksum, finishedAt: fresh(-86400000), rolledBackAt: null })),
      columnFingerprint: '390c65cfe11f3b8695a6bc5ff21d94d4', constraintFingerprint: '2e5981464ef4017e1ad5a6854ba17cc2', objectConflicts: 0 },
    commands: { pending: 0, total: 43, baselineDigest: H },
    actuator: { deviceCode: 'ESP32-GF-A-01', actuatorCode: 'PUMP_01', state: 'UNKNOWN', stateAt: fresh(-86400000), directDatabaseObservation: true },
    broker: { process: { pid: 90, startTicks: '639285000000000001' }, listenerPid: 90, lanListenerVerified: true, backendEndpointMatches: true,
      executable: 'C:/Program Files/mosquitto/mosquitto.exe', configPath: 'C:/mosquitto/config/mosquitto.conf', reviewedConfigHash: H,
      observedConfigHash: H, loopbackInstance: false, effectiveInstanceVerified: true },
    configuration: { environmentOverrides: { ...adapter.SAFE_ENV }, inheritedCodeInjectionOptionsExcluded: true, credentialValuesIncluded: false },
    storage: { path: planOptions.storagePath, operatorSid: 'S-1-5-21-11-22-33-1001', ownerSid: 'S-1-5-21-11-22-33-1001',
      protectedDacl: true, inheritanceEnabled: false, unexpectedReparse: false, existingRunConflict: false,
      fullControlSids: ['S-1-5-21-11-22-33-1001','S-1-5-18'], knownCloudRoot: false, cloudBackupScope: 'NOT_VERIFIED',
      dataHandlingApproved: true, residualRiskAccepted: true, storageApprovalReference: 'mock-private-storage' },
    approval: { phase: '13.5D.1D', scope: 'OFFLINE_ADAPTER_PREPARATION', runId, reference: 'mock-d1d-approval', maxAttempts: 1,
      productionStartupAuthorized: false, reviewedSideEffects: [...adapter.SIDE_EFFECTS] },
  };
  const bundle = Object.fromEntries(Object.entries(values).map(([gate, value]) => [gate, envelope(gate, plan.runId, value)]));
  return { planOptions, plan, bundle };
}
function envelope(gate, runId, value) {
  return { source: { kind: 'MOCK', collector: adapter.COLLECTORS[gate], reference: `mock-${gate}-evidence` },
    checkedAt: fresh(-1000), expiresAt: fresh(adapter.TTL[gate] - 1000), target: adapter.targetFor(gate, runId), value };
}
function identity() {
  const ticks = delta => (621355968000000000n + BigInt(Date.parse(fresh(delta))) * 10000n).toString();
  return { runId: 'd1d-runtime-case', nonce: 'f'.repeat(32), wrapper: { pid: 101, startTicks: ticks(-4000) },
    host: { pid: 102, startTicks: ticks(-3000), parentPid: 101 },
    child: { pid: 103, startTicks: ticks(-2000), parentPid: 102, executable: adapter.NODE } };
}
function runtime() {
  const expected = identity();
  return { expected, evidence: envelope('runtime', expected.runId, { identity: clone(expected), listenerPort: 5000, listenerPid: 103,
    checkedProcessAfter: { pid: 103, startTicks: expected.child.startTicks }, attestation: { pid: 103, startedAt: fresh(-1000),
      commandsEnabled: false, automationEnabled: false, testMode: true, effectiveMaxRunSeconds: 1 },
    apiRuntime: { commandsEnabled: false, automationEnabled: false, pumpTestMode: true, effectiveMaxRunSeconds: 1 }, gatewayMode: 'DISABLED', controlEnabled: false,
    health: { database: 'connected', mqtt: 'connected' } }) };
}
test('import has no side effects or platform/runtime access', () => {
  const contractsSource = fs.readFileSync(path.join(__dirname, 'phase13-5d1d-contracts.cjs'), 'utf8');
  const sandbox = { module: { exports: {} } }; vm.runInNewContext(contractsSource, sandbox);
  const adapterSource = fs.readFileSync(path.join(__dirname, 'phase13-5d1d-recovery-adapter.cjs'), 'utf8');
  const req = name => { if (name === './phase13-5d1d-contracts.cjs') return sandbox.module.exports; throw Error('IMPORT_SIDE_EFFECT'); };
  vm.runInNewContext(adapterSource, { module: { exports: {} }, require: req });
});
test('default PLAN_ONLY has no startup or live authorization', () => {
  const p = adapter.prepare(); assert.equal(p.plan.mode, 'PLAN_ONLY'); assert.equal(p.launched, false); assert.equal(p.productionAuthorized, false);
  assert.equal(p.assessment.status, 'BLOCKED');
});
test('production execution denied regardless of command-line style or supplied approval', () => {
  assert.throws(() => adapter.executeProduction({ approval: 'APPROVED', mode: 'PRODUCTION' }), /NOT_AUTHORIZED/);
  assert.throws(() => adapter.prepare({ mode: 'PRODUCTION' }), /NOT_AUTHORIZED/);
  assert.throws(() => adapter.prepare({ approval: 'C.3' }), /UNAPPROVED_ADAPTER_OPTION/);
});
test('fixed startup specification never uses npm or arbitrary entrypoint', () => {
  const p = fixture().plan; assert.deepEqual(p.startup.args, ['--import','tsx','src/server.ts']);
  assert.equal(p.startup.workingDirectory, 'C:\\DATN\\Project_datn\\backend'); assert.deepEqual(p.startup.environmentOverrides, adapter.SAFE_ENV);
  assert.equal(p.maxLaunchAttempts, 1); assert.equal(p.monitor.autoRetry, false); assert.equal(p.monitor.forceKill, false);
  assert.throws(() => adapter.buildPlan({ executable: 'other' }), /UNAPPROVED_PLAN_OPTION/);
  assert.throws(() => adapter.buildPlan({ runId: '../x' }), /INVALID_RUN_ID/);
  assert.throws(() => adapter.buildPlan({ runId: 'x', storagePath: 'C:\\DATN\\Project_datn\\build\\x' }), /UNAPPROVED_PRIVATE_STORAGE_SPEC/);
});
test('injected environment precedence matches config loader and installed dotenv source', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../backend/src/config/env.ts'), 'utf8');
  const dotenv = fs.readFileSync(path.resolve(__dirname, '../backend/node_modules/dotenv/lib/main.js'), 'utf8');
  assert.match(config, /dotenv\.config\(\);/); assert.doesNotMatch(config, /override\s*:\s*true/);
  assert.match(dotenv, /const override = Boolean\(options && options\.override\)/);
  assert.match(dotenv, /if \(override === true\)/);
  assert.equal(fixture().plan.startup.environmentOverrides.MQTT_COMMANDS_ENABLED, 'false');
});
test('all complete fresh mocks pass contract but NEVER become live authorization', () => {
  const f = fixture(), before = JSON.stringify(f.bundle), r = adapter.validatePreStart(f.plan, f.bundle, NOW);
  assert.equal(r.status, 'MOCK_CONTRACT_PASS'); assert.equal(r.productionAuthorized, false); assert.equal(r.liveEvidenceVerified, false);
  assert.equal(JSON.stringify(f.bundle), before); assert.equal(r.gates.length, 10);
});
for (const gate of ['physical','process','database','migrations','commands','actuator','broker','configuration','storage','approval']) {
  test(`missing ${gate} evidence blocks`, () => {
    const f = fixture(); delete f.bundle[gate]; assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  });
  test(`stale ${gate} evidence blocks and caller TTL cannot extend freshness`, () => {
    const f = fixture(); f.bundle[gate].checkedAt = fresh(-adapter.TTL[gate] - 1); f.bundle[gate].expiresAt = fresh(999999);
    assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  });
}
const negativeValues = [
  ['database', { port: 55433 }], ['database', { systemId: '7699532241714573532' }], ['database', { schema: 'other' }],
  ['database', { readOnly: false }], ['database', { postgresMajor: 16 }], ['migrations', { rows: 12 }], ['migrations', { unfinished: 1 }],
  ['migrations', { columnFingerprint: 'drift' }], ['commands', { pending: 1 }], ['commands', { total: undefined }],
  ['physical', { pumpAdapterDisconnected: false }], ['physical', { confirmedByOperator: false }],
  ['process', { backendProcessCount: 1 }], ['process', { port5000ListenerCount: 1 }], ['process', { unknownPriorOutcome: true }],
  ['broker', { listenerPid: 4572 }], ['broker', { loopbackInstance: true }], ['broker', { observedConfigHash: 'b'.repeat(64) }],
  ['broker', { effectiveInstanceVerified: false }], ['configuration', { inheritedCodeInjectionOptionsExcluded: false }],
  ['storage', { inheritanceEnabled: true }], ['storage', { residualRiskAccepted: false }], ['storage', { existingRunConflict: true }],
  ['storage', { fullControlSids: ['Everyone','S-1-5-18'] }], ['approval', { phase: '13.5C.3' }],
  ['approval', { reference: 'phase13-5c3-old' }], ['approval', { scope: 'CONTROLLED_PRODUCTION_STARTUP' }],
  ['approval', { maxAttempts: 2 }], ['approval', { productionStartupAuthorized: true }], ['approval', { reviewedSideEffects: [] }],
];
for (const [index, [gate, delta]] of negativeValues.entries()) test(`unsafe value ${index + 1}: ${gate} rejected`, () => {
  const f = fixture(); Object.assign(f.bundle[gate].value, delta); assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
});
test('Commands/Automation true, wrong test mode/cap and injected code options rejected', () => {
  for (const delta of [{ MQTT_COMMANDS_ENABLED: 'true' }, { MQTT_AUTOMATION_COMMANDS_ENABLED: 'true' }, { MQTT_PUMP_TEST_MODE: 'false' },
    { MQTT_PUMP_MAX_RUN_SECONDS: '5' }, { NODE_OPTIONS: '--require other' }]) {
    const f = fixture(); Object.assign(f.bundle.configuration.value.environmentOverrides, delta); assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  }
});
test('all eleven migration names/checksums/statuses checked, not self-declared PASS', () => {
  for (const mutate of [v => { v.actualRows[0].checksum = H; }, v => { v.actualRows[0].rolledBackAt = NOW; }, v => { v.actualRows[0].finishedAt = null; },
    v => { v.actualRows[0] = { ...v.actualRows[1] }; }, v => { delete v.actualRows; v.nameChecksumMatch = true; }]) {
    const f = fixture(); mutate(f.bundle.migrations.value); assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  }
  for (const [name, checksum] of adapter.MIGRATIONS) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../backend/prisma/migrations', name, 'migration.sql'))).digest('hex'), checksum);
});
test('future timestamp, expired approval, wrong target and self-declared PASS rejected', () => {
  for (const mutate of [f => { f.bundle.approval.expiresAt = NOW; }, f => { f.bundle.physical.checkedAt = fresh(1); },
    f => { f.bundle.broker.target.host = '127.0.0.1'; }, f => { f.bundle.database.status = 'PASS'; }, f => { f.bundle.extra = { status: 'PASS' }; }]) {
    const f = fixture(); mutate(f); assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  }
});
test('fixture/history/self-declared LIVE cannot establish live authority', () => {
  for (const kind of ['HISTORICAL','FIXTURE','VERIFIED_LIVE','LIVE','PASS']) {
    const f = fixture(); f.bundle.database.source.kind = kind; assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
  }
});
test('candidate specification tampering blocks before mock readiness', () => {
  const f = fixture(), altered = clone(f.plan); altered.startup.environmentOverrides.MQTT_COMMANDS_ENABLED = 'true';
  assert.equal(adapter.validatePreStart(altered, f.bundle, NOW).status, 'BLOCKED');
});
test('UNKNOWN observed actuator baseline does not pretend fresh OFF or permit command', () => {
  const f = fixture(); assert.equal(f.bundle.actuator.value.state, 'UNKNOWN'); assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'MOCK_CONTRACT_PASS');
  assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).productionAuthorized, false);
  f.bundle.actuator.value.state = 'ON'; assert.equal(adapter.validatePreStart(f.plan, f.bundle, NOW).status, 'BLOCKED');
});
test('effective runtime requires same process, API flags, log attestation and health', () => {
  const r = runtime(); assert.equal(adapter.validateRuntime(r.expected, r.evidence, NOW).status, 'MOCK_RUNTIME_PASS');
  for (const mutate of [v => { delete v.attestation; }, v => { delete v.apiRuntime; }, v => { v.attestation.commandsEnabled = true; },
    v => { v.apiRuntime.automationEnabled = true; }, v => { v.attestation.effectiveMaxRunSeconds = 5; }, v => { delete v.apiRuntime.effectiveMaxRunSeconds; },
    v => { v.apiRuntime.effectiveMaxRunSeconds = 5; }, v => { v.gatewayMode = 'MQTT'; },
    v => { v.controlEnabled = true; }, v => { v.health.mqtt = 'disconnected'; }, v => { v.listenerPid = 999; },
    v => { v.checkedProcessAfter.startTicks = '639285999999999999'; }, v => { v.attestation.startedAt = fresh(-999999); }]) {
    const x = runtime(); mutate(x.evidence.value); assert.equal(adapter.validateRuntime(x.expected, x.evidence, NOW).status, 'BLOCKED');
  }
});
test('PID reuse, parent relationship and executable mismatch rejected', () => {
  const e = identity(); assert.equal(adapter.verifyProcessIdentity(e, clone(e)), true);
  for (const mutate of [v => { v.child.startTicks = '639285999999999999'; }, v => { v.host.parentPid = 999; }, v => { v.child.parentPid = 101; },
    v => { v.wrapper.startTicks = '639285999999999999'; }, v => { v.child.executable = 'other.exe'; }]) {
    const actual = clone(e); mutate(actual); assert.equal(adapter.verifyProcessIdentity(e, actual), false);
  }
});
test('monitor loss and wrong console never produce permission to signal', () => {
  const e = identity(), value = { identity: clone(e), processPresent: true, wrapperAlive: true, hostAlive: true, heartbeatAt: fresh(-100), exit: null,
    stopRequested: true, gracefulStopApproved: true, signalAlreadySent: false, consoleMembers: [102,103] };
  const check = v => adapter.monitorDecision(e, envelope('observation', e.runId, v), NOW);
  assert.equal(check(value).action, 'CANDIDATE_CTRL_C_ONLY_EXECUTOR_DISABLED');
  for (const delta of [{ wrapperAlive: false }, { hostAlive: false }, { heartbeatAt: fresh(-3000) }, { processPresent: false }]) assert.equal(check({ ...value, ...delta }).state, 'MONITOR_LOST');
  for (const delta of [{ consoleMembers: [102,999] }, { gracefulStopApproved: false }, { signalAlreadySent: true }]) assert.equal(check({ ...value, ...delta }).action, 'DO_NOT_SIGNAL');
});
test('exit0/nonzero preserved, unknown commit/process outcome never retries', () => {
  const e = identity();
  for (const [code, state] of [[0,'EXITED'],[7,'FAILED']]) {
    const v = { identity: clone(e), exit: { pid: 103, startTicks: e.child.startTicks, code }, processPresent: false };
    assert.deepEqual(adapter.monitorDecision(e, envelope('observation', e.runId, v), NOW), { state, action: 'NO_RETRY', productionAuthorized: false });
  }
});
test('report sanitizer drops nested secrets, arbitrary URLs/messages/stacks and false authority', () => {
  const secret = 'SYNTHETIC_SECRET_CANARY_DO_NOT_ECHO';
  const raw = { status: 'BLOCKED', productionAuthorized: true, message: secret, stack: secret, DATABASE_URL: secret, raw: { password: secret },
    reasonCodes: ['EVIDENCE_MISSING', secret], gates: [{ name: 'database', status: 'PASS', message: secret, reasonCodes: [secret] }] };
  const out = adapter.sanitizeReport(raw); assert.doesNotMatch(JSON.stringify(out), /SYNTHETIC_SECRET/); assert.equal(out.productionAuthorized, false);
  assert.deepEqual(out.reasonCodes, ['EVIDENCE_MISSING']);
});
test('adapter imports no network/application/credential loader or production executor', () => {
  const source = fs.readFileSync(path.join(__dirname, 'phase13-5d1d-recovery-adapter.cjs'), 'utf8') + fs.readFileSync(path.join(__dirname, 'phase13-5d1d-contracts.cjs'), 'utf8');
  assert.doesNotMatch(source, /require\(['"](?:mqtt|@prisma\/client|dotenv|node:net|node:http|node:child_process|node:fs)['"]\)|fetch\(|spawn\(|exec\(|\.Kill\(/);
});
const baseline = {
  'phase13-5d1c-launcher.cjs': '051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A',
  'phase13-5d1c-console-host.ps1': 'C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3',
  'phase13-5d1c-synthetic-child.cjs': 'DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF',
  'phase13-5d1c-launcher.test.cjs': '990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10',
};
test('all D.1C inherited hashes unchanged', () => {
  for (const [file, hash] of Object.entries(baseline)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex').toUpperCase(), hash);
});
let syntheticSequence = 0;
const syntheticPrefix = `d1d-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
async function simulation(scenario, extra = {}) {
  const f = fixture(`${syntheticPrefix}-${++syntheticSequence}`);
  return adapter.runSynthetic({ testApproval: 'PHASE13_5D1D_OFFLINE_ONLY', plan: f.planOptions, evidence: f.bundle, now: NOW, scenario, ...extra });
}
test('synthetic adapter refuses missing approval/evidence before invoking launcher', async () => {
  await assert.rejects(adapter.runSynthetic({}), /OFFLINE_TEST_APPROVAL_REQUIRED/);
  const f = fixture(); delete f.bundle.physical;
  const r = await adapter.runSynthetic({ testApproval: 'PHASE13_5D1D_OFFLINE_ONLY', plan: f.planOptions, evidence: f.bundle, now: NOW });
  assert.equal(r.launched, false); assert.equal(r.status, 'BLOCKED');
});
test('D.1D integration: real Windows synthetic SIGINT closes fake resources', async () => {
  const r = await simulation('graceful'); assert.equal(r.status, 'SYNTHETIC_PASS'); assert.equal(r.productionAuthorized, false);
  const text = fs.readFileSync(path.join(r.result.directory, 'stdout.log'), 'utf8'); assert.match(text, /SHUTDOWN_SIGNAL:SIGINT/); assert.match(text, /RESOURCE_CLOSED/);
  assert.equal(r.result.exit.exitCode, 0); assert.equal(r.result.forceKillUsed, false);
});
test('D.1D integration: child exit7 remains failed, no second attempt', async () => {
  const r = await simulation('exit7'); assert.equal(r.status, 'BLOCKED'); assert.equal(r.result.exit.exitCode, 7); assert.equal(r.result.launchAttempts, 1);
});
test('D.1D integration: duplicate attempt and old logs never overwritten', async () => {
  const r = await simulation('exit0'), marker = path.join(r.result.directory, 'attempt.json'), before = fs.readFileSync(marker);
  const f = fixture(path.basename(r.result.directory));
  await assert.rejects(adapter.runSynthetic({ testApproval: 'PHASE13_5D1D_OFFLINE_ONLY', plan: f.planOptions, evidence: f.bundle, now: NOW, scenario: 'exit0' }), /ATTEMPT_EXISTS_NO_RETRY/);
  assert.deepEqual(fs.readFileSync(marker), before);
});
test('D.1D integration: ignored SIGINT is timeout, never called graceful success', async () => {
  const r = await simulation('ignore-stop'); assert.equal(r.status, 'BLOCKED'); assert.equal(r.result.failure, 'GRACEFUL_STOP_TIMEOUT'); assert.equal(r.result.exit.exitCode, 23);
});
test('D.1D integration: wrapper lease loss preserves MONITOR_LOST and no retry', async () => {
  const r = await simulation('graceful', { loseWrapperHeartbeat: true }); assert.equal(r.status, 'BLOCKED'); assert.equal(r.result.failure, 'MONITOR_LOST'); assert.equal(r.result.launchAttempts, 1);
});
