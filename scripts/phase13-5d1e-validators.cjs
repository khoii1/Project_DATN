'use strict';
const baseline = require('./phase13-5d1d-contracts.cjs');
const EXPECTED_RELATIONS = Object.freeze(['_prisma_migrations','devices','actuators','sensor_readings','device_commands','automation_rules']);
const REQUIRED_COLUMNS = Object.freeze(['transport','expires_at','max_run_seconds','acknowledged_at','correlation_id']);
const BROKER = Object.freeze({ host: '172.20.10.2', port: 1883, executable: 'C:/Program Files/mosquitto/mosquitto.exe', configPath: 'C:/mosquitto/config/mosquitto.conf' });
const label = v => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v);
const hash = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
const sid = v => typeof v === 'string' && /^S-1-5-21-\d+-\d+-\d+-\d+$/.test(v);
const ticks = v => typeof v === 'string' && /^\d{18}$/.test(v) && BigInt(v) > 621355968000000000n;
const integer = v => Number.isSafeInteger(v) && v >= 0;
function time(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)) return NaN;
  const n = Date.parse(v); return Number.isFinite(n) && new Date(n).toISOString() === v ? n : NaN;
}
// pg JSON timestamps may have offsets and microseconds. This parser validates, never rewrites evidence.
function pgTime(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v)) return false;
  const calendar = v.slice(0,10), d = new Date(calendar + 'T00:00:00.000Z');
  return Number.isFinite(Date.parse(v)) && Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === calendar;
}
const keys = (v, allowed) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === allowed.length && allowed.every(k => Object.hasOwn(v,k));
function need(condition, code) { if (!condition) throw Error(code); }
function identity(v) {
  need(v.database === 'smart_agriculture' && v.address === '127.0.0.1' && v.port === 5432 && v.systemId === baseline.SYSTEM_ID &&
    v.readOnly === 'on' && v.inRecovery === false && typeof v.principal === 'string' && /^[a-z_][a-z0-9_]{0,62}$/.test(v.principal) && pgTime(v.serverStartedAt), 'DB_IDENTITY_MISMATCH');
}
function catalog(v) {
  need(keys(v,['database','principal','inRecovery','serverVersion','address','port','systemId','pgdata','serverStartedAt','readOnly','databaseOwner','schema','schemaOwner','relations','columnFingerprint','constraintFingerprint','commandColumns','conflicts']), 'OUTPUT_SCHEMA_MISMATCH');
  identity(v);
  need(Number.isInteger(v.serverVersion) && v.serverVersion >= 170000 && v.serverVersion < 180000 && v.pgdata === 'C:/Program Files/PostgreSQL/17/data' &&
    v.databaseOwner === 'postgres' && v.schema === 'public' && ['postgres','pg_database_owner'].includes(v.schemaOwner), 'DB_CATALOG_IDENTITY_MISMATCH');
  need(Array.isArray(v.relations) && v.relations.length === EXPECTED_RELATIONS.length && new Set(v.relations.map(r => r.name)).size === EXPECTED_RELATIONS.length &&
    EXPECTED_RELATIONS.every(name => v.relations.some(r => keys(r,['name','kind','rls','forceRls']) && r.name === name && r.kind === 'r' && r.rls === false && r.forceRls === false)), 'RELATION_IDENTITY_OR_RLS_MISMATCH');
  need(v.columnFingerprint === '390c65cfe11f3b8695a6bc5ff21d94d4' && v.constraintFingerprint === '2e5981464ef4017e1ad5a6854ba17cc2', 'SCHEMA_FINGERPRINT_MISMATCH');
  need(Array.isArray(v.commandColumns) && v.commandColumns.length === 5 && new Set(v.commandColumns).size === 5 && REQUIRED_COLUMNS.every(c => v.commandColumns.includes(c)), 'PHASE12_COLUMNS_MISSING');
  need(v.conflicts === 0, 'PROPOSED_OBJECT_CONFLICT');
  return v;
}
function commandBaseline(v, previous) {
  need(keys(v,['database','principal','inRecovery','address','port','systemId','serverStartedAt','readOnly','migrations','commands','breakdown','actuators']), 'OUTPUT_SCHEMA_MISMATCH');
  identity(v); need(v.serverStartedAt === previous.serverStartedAt && v.principal === previous.principal, 'DB_RESTART_BETWEEN_STAGES');
  need(Array.isArray(v.migrations) && v.migrations.length === 11 && new Set(v.migrations.map(r => r.name)).size === 11 &&
    baseline.MIGRATIONS.every(([name, checksum]) => v.migrations.some(r => keys(r,['name','checksum','finishedAt','rolledBackAt']) && r.name === name && r.checksum === checksum && pgTime(r.finishedAt) && r.rolledBackAt === null)), 'MIGRATION_BASELINE_MISMATCH');
  const count = n => typeof n === 'string' && /^(0|[1-9]\d*)$/.test(n) && Number.isSafeInteger(Number(n));
  need(keys(v.commands,['total','pending']) && count(v.commands.total) && v.commands.pending === '0', 'COMMAND_BASELINE_UNSAFE');
  need(Array.isArray(v.breakdown) && v.breakdown.every(r => keys(r,['status','count']) && ['PENDING','SUCCESS','FAILED'].includes(r.status) && count(r.count)) &&
    new Set(v.breakdown.map(r => r.status)).size === v.breakdown.length && v.breakdown.reduce((n,r) => n + Number(r.count), 0) === Number(v.commands.total) &&
    v.breakdown.every(r => r.status !== 'PENDING' || r.count === '0'), 'COMMAND_BREAKDOWN_MISMATCH');
  need(Array.isArray(v.actuators) && v.actuators.length === 1, 'ACTUATOR_BASELINE_MISSING');
  const a = v.actuators[0];
  need(keys(a,['deviceCode','actuatorCode','state','stateAt']) && a.deviceCode === 'ESP32-GF-A-01' && a.actuatorCode === 'PUMP_01' &&
    ['OFF','UNKNOWN'].includes(a.state) && (a.stateAt === null || pgTime(a.stateAt)) && (a.state !== 'OFF' || a.stateAt !== null), 'ACTUATOR_BASELINE_UNSAFE');
  return v;
}
function processIdentity(p) {
  return keys(p,['pid','startTicks','parentPid','executable','workingDirectory','entrypoint']) && integer(p.pid) && p.pid > 0 && ticks(p.startTicks) && integer(p.parentPid) && p.parentPid > 0 && p.parentPid !== p.pid &&
    typeof p.executable === 'string' && typeof p.workingDirectory === 'string' && typeof p.entrypoint === 'string';
}
function processSnapshot(s) {
  return keys(s,['complete','processes','listeners']) && s.complete === true && Array.isArray(s.processes) && s.processes.every(processIdentity) &&
    new Set(s.processes.map(p => p.pid)).size === s.processes.length && Array.isArray(s.listeners) && s.listeners.every(l =>
      keys(l,['address','port','pid','startTicks']) && typeof l.address === 'string' && l.port === 5000 && integer(l.pid) && ticks(l.startTicks));
}
function processState(v, at) {
  need(keys(v,['before','after','attempts']) && processSnapshot(v.before) && processSnapshot(v.after) && Array.isArray(v.attempts), 'PROCESS_SNAPSHOT_INCOMPLETE');
  need(JSON.stringify(v.before) === JSON.stringify(v.after), 'PROCESS_CHANGED_DURING_COLLECTION');
  const s = v.after, node = s.processes.filter(p => /(?:^|[\\/])node\.exe$/i.test(p.executable));
  need(s.processes.every(p => /(?:^|[\\/])node\.exe$/i.test(p.executable) ||
    (p.workingDirectory !== baseline.REPO + '\\backend' && p.entrypoint !== 'src/server.ts')), 'UNKNOWN_BACKEND_WRAPPER');
  const backend = node.filter(p => p.executable === baseline.NODE && p.workingDirectory === baseline.REPO + '\\backend' && p.entrypoint === 'src/server.ts');
  need(node.length === backend.length, 'UNKNOWN_NODE_PROCESS');
  need(backend.length <= 1 && s.listeners.length <= 1, 'DUPLICATE_BACKEND');
  need(new Set(v.attempts.map(a => a.runId)).size === v.attempts.length, 'ATTEMPT_UNVERIFIABLE');
  let startupInProgress = false;
  for (const a of v.attempts) {
    need(keys(a,['runId','pid','startTicks','state','updatedAt','exitCode']) && label(a.runId) && integer(a.pid) && a.pid > 0 && ticks(a.startTicks) && Number.isFinite(time(a.updatedAt)), 'ATTEMPT_UNVERIFIABLE');
    const actual = s.processes.find(p => p.pid === a.pid);
    need(!actual || actual.startTicks === a.startTicks, 'PID_REUSED');
    if (['EXITED','FAILED'].includes(a.state)) {
      need(Number.isInteger(a.exitCode) && ((a.state === 'EXITED') === (a.exitCode === 0)) && !actual && time(a.updatedAt) <= at, 'ATTEMPT_UNVERIFIABLE');
    } else {
      need(['STARTING','RUNNING_UNVERIFIED','VERIFIED'].includes(a.state) && a.exitCode === null, 'ATTEMPT_UNVERIFIABLE');
      need(time(a.updatedAt) <= at && at - time(a.updatedAt) <= 10000 && actual, 'STALE_UNRESOLVED_ATTEMPT');
      startupInProgress = true;
    }
  }
  if (startupInProgress) return { classification: 'STARTUP_IN_PROGRESS', preStartSafe: false };
  if (!backend.length) {
    need(s.listeners.length === 0, 'LISTENER_OWNER_UNKNOWN');
    return { classification: 'BACKEND_ABSENT', preStartSafe: true };
  }
  if (!s.listeners.length) return { classification: 'BACKEND_PRESENT_NO_LISTENER', preStartSafe: false };
  const b = backend[0], l = s.listeners[0];
  need(l.pid === b.pid && l.startTicks === b.startTicks, 'LISTENER_OWNER_UNKNOWN');
  return { classification: 'BACKEND_RUNNING_IDENTITY_MATCHED', preStartSafe: false };
}
function broker(v) {
  need(keys(v,['endpoint','backendEndpoint','localAddresses','process','processAfter','listeners','config']), 'OUTPUT_SCHEMA_MISMATCH');
  need(keys(v.endpoint,['host','port']) && v.endpoint.host === BROKER.host && v.endpoint.port === BROKER.port &&
    v.backendEndpoint === 'mqtt://' + BROKER.host + ':1883' && Array.isArray(v.localAddresses) && v.localAddresses.includes(BROKER.host), 'BROKER_ENDPOINT_MISMATCH');
  need(processIdentity(v.process) && processIdentity(v.processAfter) && JSON.stringify(v.process) === JSON.stringify(v.processAfter) &&
    v.process.executable === BROKER.executable, 'BROKER_PROCESS_MISMATCH');
  need(Array.isArray(v.listeners) && v.listeners.length > 0 && v.listeners.every(l => keys(l,['address','port','pid','startTicks']) &&
    l.pid === v.process.pid && l.startTicks === v.process.startTicks && l.port === 1883 && ['0.0.0.0',BROKER.host].includes(l.address)), 'BROKER_NOT_LAN_INSTANCE');
  need(keys(v.config,['path','pathFromProcess','approvedHash','observedHash','approvalReference','source']) && v.config.path === BROKER.configPath &&
    v.config.pathFromProcess === BROKER.configPath && hash(v.config.approvedHash) && v.config.approvedHash === v.config.observedHash &&
    label(v.config.approvalReference) && v.config.source === 'MOCK_REVIEWED_FILE', 'BROKER_CONFIG_UNVERIFIED');
  return { endpoint: v.endpoint, process: { pid: v.process.pid, startTicks: v.process.startTicks }, configHash: v.config.observedHash, mqttConnectionVerified: false };
}
function physical(v, at, runId) {
  need(keys(v,['runId','operatorReference','confirmedAt','adapterDisconnected','esp32Active','usbOnly']) && v.runId === runId && label(v.operatorReference) &&
    Number.isFinite(time(v.confirmedAt)) && time(v.confirmedAt) <= at && at - time(v.confirmedAt) <= 120000 && v.adapterDisconnected === true &&
    typeof v.esp32Active === 'boolean' && v.usbOnly === true, 'PHYSICAL_CONFIRMATION_REQUIRED');
  return { adapterDisconnected: true, usbOnly: true, confirmedAt: v.confirmedAt };
}
function storage(v, runId) {
  need(keys(v,['path','operatorSid','ownerSid','protectedDacl','aces','pathComponents','createNew','existingRunConflict','approval']), 'OUTPUT_SCHEMA_MISMATCH');
  need(typeof v.path === 'string' && /^C:\\Users\\[^\\/:*?"<>|.]+\\AppData\\Local\\SmartAgricultureRuntimeRecovery\\[a-z0-9-]{1,80}$/.test(v.path) && v.path.endsWith('\\' + runId) &&
    sid(v.operatorSid) && v.ownerSid === v.operatorSid && v.protectedDacl === true && v.createNew === true && v.existingRunConflict === false, 'STORAGE_IDENTITY_UNSAFE');
  need(Array.isArray(v.aces) && v.aces.length === 2 && new Set(v.aces.map(a => a.sid)).size === 2 && v.aces.every(a =>
    keys(a,['sid','type','rights','inherited']) && [v.operatorSid,'S-1-5-18'].includes(a.sid) && a.type === 'Allow' && a.rights === 'FullControl' && a.inherited === false), 'STORAGE_DACL_UNSAFE');
  const parts = v.path.split('\\'), ancestors = parts.map((_, i) => parts.slice(0,i+1).join('\\') + (i === 0 ? '\\' : ''));
  need(Array.isArray(v.pathComponents) && v.pathComponents.length === ancestors.length && v.pathComponents.every((p,i) =>
    keys(p,['path','reparse']) && p.path === ancestors[i] && p.reparse === false), 'STORAGE_REPARSE_UNVERIFIED');
  const a = v.approval;
  need(keys(a,['runId','reference','dataHandlingApproved','residualRiskAccepted','cloudBackupScope','knownCloudRoot']) && a.runId === runId && label(a.reference) &&
    a.dataHandlingApproved === true && a.residualRiskAccepted === true && a.cloudBackupScope === 'NOT_VERIFIED' && a.knownCloudRoot === false, 'STORAGE_APPROVAL_REQUIRED');
  return { path: v.path, ownerSid: v.ownerSid, cloudBackupScope: 'NOT_VERIFIED', createNew: true };
}
module.exports = { catalog, commandBaseline, processState, broker, physical, storage, time, keys, label, need, BROKER, EXPECTED_RELATIONS, REQUIRED_COLUMNS };
