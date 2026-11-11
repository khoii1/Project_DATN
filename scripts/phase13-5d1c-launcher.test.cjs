'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const tool = require('./phase13-5d1c-launcher.cjs');
const prefix = `test-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const root = path.resolve(__dirname, '../build/phase13-5d1c-offline');
let sequence = 0;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
async function run(scenario, extra = {}) {
  const result = await tool.launch({ mode: 'SYNTHETIC', approval: 'PHASE13_5D1C_OFFLINE_ONLY', runId: `${prefix}-${++sequence}`, scenario, ...extra });
  assert.equal(result.launchAttempts, 1); assert.equal(result.forceKillUsed, false);
  return result;
}
const identity = { childPid: 101, childStartTicks: '1234', hostPid: 100, hostStartTicks: '1230', executable: 'fixture-node.exe' };
const contract = { host: '127.0.0.1', port: 5432, database: 'smart_agriculture', schema: 'public', systemId: '7472695863566132416', postgresMajor: 17,
  readOnly: true, migrationBaselineVerified: true, migrationRows: 11, pending: 0, commandCount: 43, pumpPowerDisconnectedConfirmed: true,
  operatorConfirmationFresh: true, backendAbsent: true, port5000Free: true, lanBrokerVerified: true,
  commandsEnabled: false, automationEnabled: false, testMode: true, effectiveMaxRunSeconds: 1 };
test('default PLAN_ONLY does not launch or create an attempt', async () => {
  const before = fs.existsSync(root) ? fs.readdirSync(root).sort() : [];
  assert.deepEqual(await tool.launch(), { mode: 'PLAN_ONLY', launched: false, productionAuthorized: false });
  assert.deepEqual(fs.existsSync(root) ? fs.readdirSync(root).sort() : [], before);
});
test('production and old/missing approvals always refused', async () => {
  await assert.rejects(tool.launch({ mode: 'PRODUCTION' }), /NOT_IMPLEMENTED_OR_AUTHORIZED/);
  for (const approval of [undefined, 'phase13-5c3-backup', 'User approval C.3']) await assert.rejects(tool.launch({ mode: 'SYNTHETIC', approval }), /OFFLINE_APPROVAL_REQUIRED/);
});
test('unapproved child/credential options rejected before directory creation', async () => {
  await assert.rejects(tool.launch({ mode: 'SYNTHETIC', approval: 'PHASE13_5D1C_OFFLINE_ONLY', serverPath: 'src/server.ts' }), /UNAPPROVED_OPTION/);
});
test('path traversal and arbitrary scenario blocked', async () => {
  await assert.rejects(run('graceful', { runId: '../outside' }), /INVALID_RUN_ID/);
  await assert.rejects(run('production-server'), /SYNTHETIC_SCENARIO_REQUIRED/);
});
test('PID reuse and wrong executable/start/parent-host identities fail', () => {
  assert.equal(tool.sameIdentity(identity, { ...identity }), true);
  assert.equal(tool.sameIdentity({}, {}), false); assert.equal(tool.sameIdentity(null, null), false);
  for (const delta of [{ childPid: 102 }, { childStartTicks: 'other' }, { hostPid: 99 }, { hostStartTicks: 'other' }, { executable: 'other' }]) assert.equal(tool.sameIdentity(identity, { ...identity, ...delta }), false);
});
test('stale state never proves running or VERIFIED', () => {
  const e = { expected: identity, actual: identity, heartbeatAt: 100, ttlMs: 500, processPresent: true, verified: true };
  assert.equal(tool.observedState(e, 200), 'VERIFIED');
  assert.equal(tool.observedState({ ...e, verified: false }, 200), 'RUNNING_UNVERIFIED');
  assert.equal(tool.observedState(e, 1000), 'MONITOR_LOST');
  assert.equal(tool.observedState({ ...e, processPresent: false }, 200), 'MONITOR_LOST');
  assert.equal(tool.observedState({ ...e, actual: { ...identity, childStartTicks: 'reused' } }, 200), 'MONITOR_LOST');
  assert.equal(tool.observedState({ ...e, heartbeatAt: undefined }, 200), 'MONITOR_LOST');
  assert.equal(tool.observedState({ ...e, heartbeatAt: 300 }, 200), 'MONITOR_LOST');
});
test('terminal exit classification is not stale running state', () => {
  const e = { expected: identity, actual: identity, exit: { childPid: 101, childStartTicks: '1234', exitCode: 0 } };
  assert.equal(tool.observedState(e), 'EXITED');
  assert.equal(tool.observedState({ ...e, exit: { ...e.exit, exitCode: 7 } }), 'FAILED');
  assert.equal(tool.observedState({ ...e, exit: { ...e.exit, childStartTicks: 'reused' } }), 'MONITOR_LOST');
});
test('create-new evidence refuses overwrite and preserves original bytes', () => {
  fs.mkdirSync(root, { recursive: true }); const file = path.join(root, `${prefix}-preserved.json`);
  tool.createNew(file, { old: true }); const before = fs.readFileSync(file);
  assert.throws(() => tool.createNew(file, { old: false }), /EEXIST/); assert.deepEqual(fs.readFileSync(file), before);
});
test('partial JSON never grants evidence; complete publication becomes readable', () => {
  const file = path.join(root, `${prefix}-partial.json`);
  fs.writeFileSync(file, '{', { flag: 'wx' }); assert.equal(tool.readEvidence(file), null);
  fs.appendFileSync(file, '"ok":true}'); assert.deepEqual(tool.readEvidence(file), { ok: true });
});
test('synthetic success, real Windows SIGINT, resource closure and voluntary exit0', async () => {
  const r = await run('graceful');
  assert.equal(r.ready, true); assert.equal(r.failure, null); assert.equal(r.exit.exitCode, 0);
  const log = fs.readFileSync(path.join(r.directory, 'stdout.log'), 'utf8');
  assert.match(log, /SHUTDOWN_SIGNAL:SIGINT/); assert.match(log, /RESOURCE_CLOSED/); assert.doesNotMatch(log, /SELF_EXPIRY/);
  const signal = read(path.join(r.directory, 'signal.json'));
  assert.equal(signal.signal, 'CTRL_C_EVENT'); assert.deepEqual([...signal.consoleMembers].sort(), [r.identity.hostPid, r.identity.childPid].sort());
  assert.equal(r.exit.stopSent, true);
});
test('child spontaneous exit0 captures both final stream tails', async () => {
  const r = await run('exit0'); assert.equal(r.exit.exitCode, 0); assert.equal(r.exit.stopSent, false);
  assert.match(fs.readFileSync(path.join(r.directory, 'stdout.log'), 'utf8'), /FINAL_STDOUT_TAIL/);
  assert.match(fs.readFileSync(path.join(r.directory, 'stderr.log'), 'utf8'), /FINAL_STDERR_TAIL/);
});
test('child nonzero exit preserves exit7, no restart', async () => {
  const r = await run('exit7'); assert.equal(r.exit.exitCode, 7); assert.equal(r.exit.stopSent, false);
  assert.equal(fs.readdirSync(r.directory).filter(x => x === 'child.json').length, 1);
});
test('stdout and stderr separate; inherited secret canary excluded from child', async () => {
  const prior = process.env.PHASE13_OFFLINE_CANARY;
  process.env.PHASE13_OFFLINE_CANARY = 'SYNTHETIC_NOT_A_CREDENTIAL';
  let r; try { r = await run('logs'); } finally { if (prior === undefined) delete process.env.PHASE13_OFFLINE_CANARY; else process.env.PHASE13_OFFLINE_CANARY = prior; }
  assert.equal(r.exit.exitCode, 0);
  assert.match(fs.readFileSync(path.join(r.directory, 'stdout.log'), 'utf8'), /STDOUT_FIXTURE/);
  assert.match(fs.readFileSync(path.join(r.directory, 'stderr.log'), 'utf8'), /STDERR_FIXTURE/);
  for (const file of fs.readdirSync(r.directory).filter(x => /\.(json|jsonl|log)$/.test(x))) assert.doesNotMatch(fs.readFileSync(path.join(r.directory, file), 'utf8'), /SYNTHETIC_NOT_A_CREDENTIAL/);
});
test('duplicate attempt blocked without changing any prior evidence', async () => {
  const r = await run('exit0'); const before = fs.readFileSync(path.join(r.directory, 'attempt.json'));
  await assert.rejects(tool.launch({ mode: 'SYNTHETIC', approval: 'PHASE13_5D1C_OFFLINE_ONLY', runId: path.basename(r.directory) }), /ATTEMPT_EXISTS_NO_RETRY/);
  assert.deepEqual(fs.readFileSync(path.join(r.directory, 'attempt.json')), before);
});
test('startup timeout stops only fixture gracefully; no second launch', async () => {
  const r = await run('no-ready', { startupTimeoutMs: 1800 });
  assert.equal(r.ready, false); assert.equal(r.failure, 'STARTUP_TIMEOUT'); assert.equal(r.exit.exitCode, 0);
  assert.match(fs.readFileSync(path.join(r.directory, 'stdout.log'), 'utf8'), /RESOURCE_CLOSED/);
});
test('lost wrapper heartbeat triggers host lease protection, not automatic restart', async () => {
  const r = await run('graceful', { loseWrapperHeartbeat: true });
  assert.equal(r.failure, 'MONITOR_LOST'); assert.equal(r.exit.stopReason, 'WRAPPER_HEARTBEAT_LOST'); assert.equal(r.exit.exitCode, 0);
});
test('wrong requested PID refused; fixture self-expiry is not called graceful', async () => {
  const r = await run('graceful', { wrongStopIdentity: true });
  assert.equal(r.failure, 'STOP_IDENTITY_MISMATCH'); assert.equal(r.exit.stopSent, false); assert.equal(r.exit.exitCode, 23);
  assert.equal(fs.existsSync(path.join(r.directory, 'signal.json')), false);
});
test('graceful failure records timeout; no force kill and self-exit23 not PASS', async () => {
  const r = await run('ignore-stop'); assert.equal(r.failure, 'GRACEFUL_STOP_TIMEOUT'); assert.equal(r.exit.exitCode, 23);
  assert.equal(read(path.join(r.directory, 'stop-timeout.json')).forceKillUsed, false);
  const log = fs.readFileSync(path.join(r.directory, 'stdout.log'), 'utf8'); assert.match(log, /SHUTDOWN_SIGNAL/); assert.doesNotMatch(log, /RESOURCE_CLOSED/);
});
test('recovery preflight mock requires every safety prerequisite; never authorizes live', () => {
  assert.equal(tool.assessRecoveryContract(contract).status, 'MOCK_CONTRACT_PASS');
  for (const delta of [{ port: 55433 }, { systemId: 'recovery' }, { pending: 1 }, { migrationRows: 12 }, { pumpPowerDisconnectedConfirmed: false },
    { operatorConfirmationFresh: false }, { backendAbsent: false }, { port5000Free: false }, { lanBrokerVerified: false },
    { commandsEnabled: true }, { automationEnabled: true }, { testMode: false }, { effectiveMaxRunSeconds: 5 }]) {
    const r = tool.assessRecoveryContract({ ...contract, ...delta }); assert.equal(r.status, 'BLOCKED'); assert.equal(r.productionAuthorized, false);
  }
});
test('listener ownership/runtime snapshot requires same serving identity and safe effective flags', () => {
  const e = { expected: identity, actual: identity, listenerPid: 101, runtimePid: 101, database: 'connected', mqtt: 'connected',
    commandsEnabled: false, automationEnabled: false, testMode: true, effectiveMaxRunSeconds: 1, gatewayMode: 'DISABLED', controlEnabled: false };
  assert.equal(tool.verifyServingEvidence(e), true);
  for (const delta of [{ listenerPid: 999 }, { runtimePid: 100 }, { mqtt: 'disconnected' }, { commandsEnabled: true }, { automationEnabled: true },
    { testMode: false }, { effectiveMaxRunSeconds: 5 }, { controlEnabled: true }, { gatewayMode: 'MQTT' }]) assert.equal(tool.verifyServingEvidence({ ...e, ...delta }), false);
});
test('PowerShell AST parses and no force-kill or production startup exists in offline tools', () => {
  const host = path.join(__dirname, 'phase13-5d1c-console-host.ps1');
  const code = "$e=$null;$t=$null;[System.Management.Automation.Language.Parser]::ParseFile('"+host.replaceAll("'", "''")+"',[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}";
  const r = spawnSync('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-Command', code], { windowsHide: true, timeout: 15000 });
  assert.equal(r.status, 0); assert.equal(r.error, undefined);
  const sources = ['phase13-5d1c-console-host.ps1','phase13-5d1c-launcher.cjs','phase13-5d1c-synthetic-child.cjs'].map(x => fs.readFileSync(path.join(__dirname,x),'utf8')).join('\n');
  assert.doesNotMatch(sources, /Stop-Process|taskkill|\.Kill\(|process\.kill\(|require\(['"](?:mqtt|@prisma\/client|dotenv|node:net|node:http)['"]\)/);
  assert.doesNotMatch(sources, /fetch\(|Invoke-RestMethod|Invoke-WebRequest|npm (?:run|start)|--import tsx/);
});
