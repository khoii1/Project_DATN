'use strict';
// OFFLINE SYNTHETIC ADAPTER ONLY. Production execution is deliberately unavailable.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../build/phase13-5d1c-offline');
const fixture = path.join(__dirname, 'phase13-5d1c-synthetic-child.cjs');
const host = path.join(__dirname, 'phase13-5d1c-console-host.ps1');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = file => {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { if (error instanceof SyntaxError) return null; throw error; }
  // Incomplete/invalid evidence never grants readiness. Bounded monitor deadline still applies.
};
function lastHeartbeat(file) {
  if (!fs.existsSync(file)) return null;
  // Ignore an incomplete append rather than interpreting it as process death.
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = lines.length - 2; i >= 0; i--) { try { return JSON.parse(lines[i]); } catch { /* preceding complete record */ } }
  return null;
}
function createNew(file, value) { fs.writeFileSync(file, JSON.stringify(value), { flag: 'wx' }); }
function sameIdentity(expected, actual) {
  return !!expected && !!actual && Number.isInteger(expected.childPid) && expected.childPid > 0 &&
    Number.isInteger(expected.hostPid) && expected.hostPid > 0 && /^\d+$/.test(expected.childStartTicks || '') &&
    /^\d+$/.test(expected.hostStartTicks || '') && typeof expected.executable === 'string' && expected.executable.length > 0 &&
    expected.childPid === actual.childPid && expected.childStartTicks === actual.childStartTicks &&
    expected.hostPid === actual.hostPid && expected.hostStartTicks === actual.hostStartTicks && expected.executable === actual.executable;
}
function observedState(e, now) {
  if (e.exit) {
    if (!sameIdentity(e.expected, e.actual) || e.exit.childPid !== e.expected.childPid || e.exit.childStartTicks !== e.expected.childStartTicks || !Number.isInteger(e.exit.exitCode)) return 'MONITOR_LOST';
    return e.exit.exitCode === 0 ? 'EXITED' : 'FAILED';
  }
  if (!e.processPresent || !sameIdentity(e.expected, e.actual) || !Number.isFinite(now) || !Number.isFinite(e.heartbeatAt) ||
      !Number.isFinite(e.ttlMs) || e.ttlMs <= 0 || e.heartbeatAt > now || now - e.heartbeatAt > e.ttlMs) return 'MONITOR_LOST';
  return e.verified ? 'VERIFIED' : 'RUNNING_UNVERIFIED';
}
function assessRecoveryContract(e) {
  const reasons = [];
  if (!e || e.host !== '127.0.0.1' || e.port !== 5432 || e.database !== 'smart_agriculture' || e.schema !== 'public' ||
      e.systemId !== '7472695863566132416' || e.readOnly !== true || e.postgresMajor !== 17) reasons.push('DATABASE_IDENTITY_NOT_VERIFIED');
  if (!e || e.migrationBaselineVerified !== true || e.migrationRows !== 11) reasons.push('MIGRATION_BASELINE_NOT_VERIFIED');
  if (!e || e.pending !== 0 || !Number.isInteger(e.commandCount) || e.commandCount < 0) reasons.push('COMMAND_BASELINE_NOT_SAFE');
  if (!e || e.pumpPowerDisconnectedConfirmed !== true || e.operatorConfirmationFresh !== true) reasons.push('PHYSICAL_CONFIRMATION_REQUIRED');
  if (!e || e.backendAbsent !== true || e.port5000Free !== true || e.lanBrokerVerified !== true) reasons.push('PROCESS_OR_BROKER_NOT_VERIFIED');
  if (!e || e.commandsEnabled !== false || e.automationEnabled !== false || e.testMode !== true || e.effectiveMaxRunSeconds !== 1) reasons.push('UNSAFE_CONFIGURATION');
  // Offline DTO checks are NOT an attestation adapter or permission to start production.
  return { status: reasons.length ? 'BLOCKED' : 'MOCK_CONTRACT_PASS', reasons, productionAuthorized: false };
}
function verifyServingEvidence(e) {
  return !!e && sameIdentity(e.expected, e.actual) && e.listenerPid === e.expected.childPid &&
    e.runtimePid === e.expected.childPid && e.database === 'connected' && e.mqtt === 'connected' &&
    e.commandsEnabled === false && e.automationEnabled === false && e.testMode === true && e.effectiveMaxRunSeconds === 1 &&
    e.gatewayMode === 'DISABLED' && e.controlEnabled === false;
}
function safeDirectory(runId) {
  if (!/^[a-z0-9-]{1,80}$/.test(runId || '')) throw Error('INVALID_RUN_ID');
  for (let current = __dirname; ; current = path.dirname(current)) {
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('REPARSE_PATH_REFUSED');
    if (path.dirname(current) === current) break;
  }
  for (let current = root; ; current = path.dirname(current)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw Error('REPARSE_PATH_REFUSED');
    if (path.dirname(current) === current) break;
  }
  fs.mkdirSync(root, { recursive: true });
  if (fs.lstatSync(root).isSymbolicLink()) throw Error('REPARSE_PATH_REFUSED');
  const directory = path.join(root, runId);
  if (fs.existsSync(directory)) throw Error('ATTEMPT_EXISTS_NO_RETRY');
  fs.mkdirSync(directory);
  return directory;
}
async function launch(options = {}) {
  if (!options.mode || options.mode === 'PLAN_ONLY') return { mode: 'PLAN_ONLY', launched: false, productionAuthorized: false };
  if (options.mode !== 'SYNTHETIC') throw Error('PRODUCTION_EXECUTION_NOT_IMPLEMENTED_OR_AUTHORIZED');
  if (options.approval !== 'PHASE13_5D1C_OFFLINE_ONLY') throw Error('OFFLINE_APPROVAL_REQUIRED');
  const keys = new Set(['mode','approval','runId','scenario','loseWrapperHeartbeat','wrongStopIdentity','startupTimeoutMs']);
  if (Object.keys(options).some(key => !keys.has(key))) throw Error('UNAPPROVED_OPTION');
  if (process.platform !== 'win32') throw Error('WINDOWS_REQUIRED');
  const scenario = options.scenario || 'graceful';
  if (!['graceful','exit0','exit7','no-ready','ignore-stop','logs'].includes(scenario)) throw Error('SYNTHETIC_SCENARIO_REQUIRED');
  const directory = safeDirectory(options.runId), nonce = crypto.randomBytes(16).toString('hex');
  createNew(path.join(directory, 'attempt.json'), { runId: options.runId, approval: options.approval, nonce, attempts: 1, production: false,
    wrapperPid: process.pid, wrapperStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(), executable: process.execPath,
    fixtureSha256: digest(fixture), hostSha256: digest(host), utc: new Date().toISOString() });
  const env = Object.fromEntries(['SystemRoot','WINDIR','PATH'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  env.TEMP = directory; env.TMP = directory;
  const powershell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const hostOut = fs.openSync(path.join(directory, 'host.stdout.log'), 'wx');
  let hostErr, child;
  try {
    hostErr = fs.openSync(path.join(directory, 'host.stderr.log'), 'wx');
    child = spawn(powershell, ['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',host,
      '-RunDirectory',directory,'-NodeExecutable',process.execPath,'-FixtureSha256',digest(fixture),'-Scenario',scenario,'-Nonce',nonce],
      { windowsHide: true, env, stdio: ['ignore',hostOut,hostErr] });
  } finally { fs.closeSync(hostOut); if (hostErr !== undefined) fs.closeSync(hostErr); }
  let hostExit = null, spawnFailure = false;
  child.on('error', error => { spawnFailure = true; createNew(path.join(directory, 'host-spawn-error.json'), { code: error.code || 'UNKNOWN', retry: false }); });
  child.on('exit', (code, signal) => {
    hostExit = { code, signal, hostPid: child.pid, utc: new Date().toISOString() };
    createNew(path.join(directory, 'host-exit.json'), hostExit);
  });
  let sequence = 0;
  const journal = state => createNew(path.join(directory, `state-${String(++sequence).padStart(4,'0')}.json`), {
    state, mode: 'SYNTHETIC', proof: 'OFFLINE_FIXTURE_ONLY', listenerOwnership: 'NOT_APPLICABLE_NO_NETWORK',
    utc: new Date().toISOString(), hostPid: child.pid });
  journal('STARTING');
  const lease = () => fs.appendFileSync(path.join(directory, 'wrapper-heartbeat.jsonl'), JSON.stringify({ pid: process.pid, at: Date.now() }) + '\n');
  lease();
  const ticker = setInterval(lease, 100);
  const start = Date.now(); let identity = null, ready = false, sent = false, failure = null;
  try {
    while (Date.now() - start < 12000) {
      if (options.loseWrapperHeartbeat && identity) clearInterval(ticker);
      if (spawnFailure) { failure = 'HOST_SPAWN_FAILED_NO_RETRY'; break; }
      if (read(path.join(directory, 'host-error.json'))) { failure = 'HOST_FAILURE_NO_RETRY'; break; }
      if (!identity) {
        identity = read(path.join(directory, 'child.json'));
        if (identity) {
          if (identity.nonce !== nonce || identity.hostPid !== child.pid || identity.parentPid !== child.pid ||
              path.resolve(identity.executable).toLowerCase() !== path.resolve(process.execPath).toLowerCase() || !identity.childStartTicks || !identity.hostStartTicks) throw Error('CHILD_IDENTITY_MISMATCH');
          journal('RUNNING_UNVERIFIED');
        }
      }
      const heartbeat = lastHeartbeat(path.join(directory, 'host-heartbeat.jsonl'));
      if (identity && heartbeat && (heartbeat.hostPid !== identity.hostPid || heartbeat.childPid !== identity.childPid || Date.now() - Date.parse(heartbeat.utc) > 2000)) {
        failure = 'MONITOR_LOST'; // No signal to a process with unproven live identity.
      }
      const logPath = path.join(directory, 'stdout.log');
      const stdout = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
      if (!ready && identity) {
        ready = stdout.split(/\r?\n/).some(line => { try { const v = JSON.parse(line); return v.kind === 'READY' && v.nonce === nonce && v.pid === identity.childPid; } catch { return false; } });
        if (ready && !failure) journal('VERIFIED'); // Synthetic readiness only, never production safety.
      }
      if (!sent && identity && !['exit0','exit7'].includes(scenario) && !options.loseWrapperHeartbeat &&
          (ready || Date.now() - start > (options.startupTimeoutMs || 6000))) {
        if (!ready) failure = 'STARTUP_TIMEOUT';
        createNew(path.join(directory, 'stop-request.json'), { nonce, childPid: identity.childPid + (options.wrongStopIdentity ? 1 : 0), childStartTicks: identity.childStartTicks });
        sent = true;
      }
      const exit = read(path.join(directory, 'exit.json'));
      if (exit) {
        if (!identity || exit.childPid !== identity.childPid || exit.childStartTicks !== identity.childStartTicks) throw Error('EXIT_IDENTITY_MISMATCH');
        if (read(path.join(directory, 'stop-timeout.json'))) failure = 'GRACEFUL_STOP_TIMEOUT';
        if (read(path.join(directory, 'stop-refused.json'))) failure = 'STOP_IDENTITY_MISMATCH';
        if (exit.stopReason === 'WRAPPER_HEARTBEAT_LOST') { failure = 'MONITOR_LOST'; journal('MONITOR_LOST'); }
        journal(failure || exit.exitCode !== 0 ? 'FAILED' : 'EXITED');
        return { directory, ready, identity, exit, failure, hostPid: child.pid, forceKillUsed: false, launchAttempts: 1 };
      }
      if (hostExit) { failure = 'HOST_EXIT_WITHOUT_CHILD_OUTCOME'; break; }
      await sleep(50);
    }
    journal('MONITOR_LOST');
    return { directory, failure: failure || 'MONITOR_TIMEOUT_NO_RETRY', hostPid: child.pid, launchAttempts: 1, forceKillUsed: false };
  } finally { clearInterval(ticker); }
}
module.exports = { launch, sameIdentity, observedState, createNew, readEvidence: read, assessRecoveryContract, verifyServingEvidence };
if (require.main === module) {
  if (process.argv.length > 2) { console.error('CLI_EXECUTION_DISABLED_PLAN_ONLY'); process.exitCode = 2; }
  else launch().then(result => console.log(JSON.stringify(result)));
}
