'use strict';
// Pure DTO contracts only. No filesystem, environment, network, application or process imports.
const REPO = 'C:\\DATN\\Project_datn';
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const SYSTEM_ID = '7472695863566132416';
const DEVICE = 'ESP32-GF-A-01', ACTUATOR = 'PUMP_01';
const SIDE_EFFECTS = Object.freeze([
  'RECOVER_ALL_PENDING_MQTT_TO_FAILED', 'INVALIDATE_CONFIGURED_ACTUATOR_TO_UNKNOWN',
  'PRESENCE_METADATA_WRITES', 'TELEMETRY_READING_WRITES', 'ALERT_STATE_WRITES', 'LEGACY_AUTOMATION_METADATA_WRITES',
]);
const SAFE_ENV = Object.freeze({ PORT: '5000', MQTT_ENABLED: 'true', MQTT_COMMANDS_ENABLED: 'false',
  MQTT_AUTOMATION_COMMANDS_ENABLED: 'false', MQTT_PUMP_TEST_MODE: 'true', MQTT_PUMP_MAX_RUN_SECONDS: '1',
  MQTT_BROKER_URL: 'mqtt://172.20.10.2:1883' });
const TTL = Object.freeze({ physical: 120000, process: 10000, database: 30000, migrations: 30000,
  commands: 10000, actuator: 10000, broker: 10000, configuration: 30000, storage: 30000, approval: 60000,
  runtime: 10000, observation: 10000 });
const COLLECTORS = Object.freeze({ physical: 'MOCK_OPERATOR', process: 'MOCK_OS', database: 'MOCK_SQL',
  migrations: 'MOCK_SQL', commands: 'MOCK_SQL', actuator: 'MOCK_SQL', broker: 'MOCK_BROKER',
  configuration: 'MOCK_CONFIG', storage: 'MOCK_NTFS', approval: 'MOCK_APPROVAL', runtime: 'MOCK_RUNTIME', observation: 'MOCK_RUNTIME' });
const MIGRATIONS = Object.freeze([
  ['20260826044448_add_users_auth','76b3bf2f8ebc4c546968bd58a4e53aad6df82c90af2977e589ab50f6e793df30'],
  ['20260826053517_add_farms_zones_crops','35f717305819cc2399770595bd83e7156e9015e39ee0d7f76b70116067f45da6'],
  ['20260826064902_add_iot_devices','1bf8a8bde5fe2b15494972a9860f868ee4d0390c39e0362c9c1d5e9ab3bfb950'],
  ['20260826091140_add_sensors_and_readings','426c3af4a3084563b2e430993210e66df40f65646f2a5852bc0557a708202c68'],
  ['20260826143000_rename_temperature_sensor_type_to_temp','183dfec7e273f4e49598b623bfcd180b795fe1f46280d7131d3c1836a4071a5a'],
  ['20260827022817_add_alert_rules_and_alerts','d1c72dfea3cfc3a4aa4e40cfada2d117bb11d45e966e8f455f39eb300602c83c'],
  ['20260827032735_add_actuators_and_device_commands','21c26cc5d219040d4a8d1a960e6d185ef17877a1af09ce0fe38c56cfe47356dc'],
  ['20260827113854_add_automation_rules','1d70eb0324962afd4451f95c86df81a95e1b324db7631070263572dcfa22aea3'],
  ['20260827120000_add_automation_enabled_rule_index','2a011f06e820a1efbc7a0db1e4bf78e55222997e22a891f42e9577eea07ae8a5'],
  ['20260827150000_add_activity_log_farm_scope','0a0365622567856c7eaae02f11955f9368b40eaf6a787a3d0f2f6ad6b5e594b8'],
  ['20261014090000_mqtt_pump_commands','2a38418373a21de5d33e522efa74b0734d80a37e61eca28e905bd12e8b06f221'],
].map(Object.freeze));
const TIME = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) ? Date.parse(value) : NaN;
const validLabel = v => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v);
const HASH = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
const eq = (a, b) => a === b;
function freeze(value) { if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; }
function exactObject(actual, expected) {
  return !!actual && typeof actual === 'object' && !Array.isArray(actual) &&
    Object.keys(actual).length === Object.keys(expected).length && Object.keys(expected).every(k => eq(actual[k], expected[k]));
}
function targetFor(gate, runId) {
  if (['database','migrations','commands'].includes(gate)) return { host: '127.0.0.1', port: 5432, database: 'smart_agriculture', schema: 'public', systemId: SYSTEM_ID };
  if (['physical','actuator'].includes(gate)) return { deviceCode: DEVICE, actuatorCode: ACTUATOR };
  if (gate === 'broker') return { host: '172.20.10.2', port: 1883, instance: 'LAN' };
  return { runId, repository: REPO };
}
function baseEvidence(gate, evidence, runId, now) {
  if (!evidence) return ['EVIDENCE_MISSING'];
  if (Object.keys(evidence).some(key => !['source','checkedAt','expiresAt','target','value'].includes(key))) return ['SELF_DECLARED_OR_UNKNOWN_EVIDENCE_FIELD'];
  const s = evidence.source;
  if (!s || s.kind !== 'MOCK' || s.collector !== COLLECTORS[gate] || !validLabel(s.reference)) return ['UNTRUSTED_OR_NONMOCK_EVIDENCE_SOURCE'];
  const n = TIME(now), at = TIME(evidence.checkedAt), until = TIME(evidence.expiresAt);
  if (![n, at, until].every(Number.isFinite) || at > n || until <= n || until <= at || until - at > TTL[gate] || n - at > TTL[gate]) return ['EVIDENCE_STALE_FUTURE_OR_INVALID'];
  if (!exactObject(evidence.target, targetFor(gate, runId))) return ['EVIDENCE_TARGET_MISMATCH'];
  if (!evidence.value || typeof evidence.value !== 'object' || Array.isArray(evidence.value)) return ['EVIDENCE_VALUE_MISSING'];
  return [];
}
function processPart(v) { return !!v && Number.isSafeInteger(v.pid) && v.pid > 0 && typeof v.startTicks === 'string' && /^\d{15,20}$/.test(v.startTicks); }
function identityShape(v) {
  return !!v && validLabel(v.runId) && typeof v.nonce === 'string' && /^[a-f0-9]{32}$/.test(v.nonce) &&
    processPart(v.wrapper) && processPart(v.host) && processPart(v.child) &&
    new Set([v.wrapper.pid,v.host.pid,v.child.pid]).size === 3 && v.host.parentPid === v.wrapper.pid && v.child.parentPid === v.host.pid &&
    v.child.executable === NODE;
}
function verifyProcessIdentity(expected, observed) {
  return identityShape(expected) && identityShape(observed) && expected.runId === observed.runId && expected.nonce === observed.nonce &&
    ['wrapper','host','child'].every(key => expected[key].pid === observed[key].pid && expected[key].startTicks === observed[key].startTicks);
}
function safeStoragePath(value) {
  // Deliberately narrow candidate location. Actual operator SID/ACL/reparse must be collected later.
  return typeof value === 'string' && !value.includes('\\..\\') && /^C:\\Users\\[^\\/:*?"<>|]+\\AppData\\Local\\SmartAgricultureRuntimeRecovery\\[a-z0-9-]{1,80}$/.test(value);
}
function buildPlan(options = {}) {
  if (Object.keys(options).some(k => !['runId','storagePath'].includes(k))) throw Error('UNAPPROVED_PLAN_OPTION');
  const runId = options.runId || 'candidate-not-approved';
  if (!validLabel(runId)) throw Error('INVALID_RUN_ID');
  const storagePath = options.storagePath ?? null;
  if (storagePath !== null && (!safeStoragePath(storagePath) || !storagePath.endsWith('\\' + runId))) throw Error('UNAPPROVED_PRIVATE_STORAGE_SPEC');
  return freeze({ phase: '13.5D.1D', mode: 'PLAN_ONLY', runId, productionAuthorized: false, launched: false,
    startup: { executable: NODE, args: ['--import','tsx','src/server.ts'], workingDirectory: REPO + '\\backend',
      environmentOverrides: { ...SAFE_ENV }, configurationPrecedence: 'INJECTED_ENV_WINS_DOTENV_DEFAULT_OVERRIDE_FALSE',
      credentialHandling: 'NO_SECRET_VALUES_IN_SPEC_OR_REPORT; FUTURE_LOCAL_CONFIG_ACCESS_REQUIRES_APPROVAL' },
    storage: { path: storagePath, acceptance: 'NOT_VERIFIED', noOverwrite: true, privateStorageApprovalRequired: true },
    sideEffects: [...SIDE_EFFECTS], maxLaunchAttempts: 1,
    monitor: { heartbeatTtlMs: 2000, startupDeadlineMs: 60000, acceptanceDeadlineMs: 120000,
      gracefulStopDeadlineMs: 10000, identity: 'PID_AND_START_TICKS_ALL_THREE_PROCESSES', signal: 'CTRL_C_EVENT_PRIVATE_CONSOLE_ONLY',
      stdoutMaxBytes: 1048576, stderrMaxBytes: 1048576, atomicPublication: true, autoRetry: false, forceKill: false },
    requiredEvidenceInterfaces: ['operatorConfirmation','osProcessSnapshot','sqlReadOnlySnapshot','migrationBaseline',
      'commandBaseline','actuatorBaseline','lanBrokerIdentity','environmentSpecification','privateStorageAcceptance','approvalRegistry',
      'servingRuntimeAttestation','liveObservationReceipts'],
    unavailableCapabilities: ['LIVE_EVIDENCE_COLLECTORS','PRODUCTION_PROCESS_EXECUTOR','PRODUCTION_STOP_EXECUTOR'] });
}
function validatePreStart(plan, bundle, now) {
  const runId = plan?.runId;
  if (!validLabel(runId) || plan?.phase !== '13.5D.1D' || plan.productionAuthorized !== false || plan.mode !== 'PLAN_ONLY' ||
      !exactObject(plan.startup?.environmentOverrides, SAFE_ENV) || plan.startup?.executable !== NODE ||
      plan.startup?.workingDirectory !== REPO + '\\backend' || !Array.isArray(plan.startup?.args) || plan.startup.args.length !== 3 ||
      !['--import','tsx','src/server.ts'].every((arg, i) => plan.startup.args[i] === arg))
    return { status: 'BLOCKED', gates: [], reasonCodes: ['CANDIDATE_PLAN_TAMPERED'], productionAuthorized: false };
  const checks = {
    physical: v => v.confirmedByOperator === true && v.pumpAdapterDisconnected === true && v.esp32UsbOnly === true && validLabel(v.confirmationReference),
    process: v => Number.isInteger(v.backendProcessCount) && v.backendProcessCount === 0 && v.port5000ListenerCount === 0 && v.startupAttemptInProgress === false && v.unknownPriorOutcome === false,
    database: v => v.readOnly === true && v.postgresMajor === 17 && v.pgdata === 'C:/Program Files/PostgreSQL/17/data' &&
      v.systemId === SYSTEM_ID && v.database === 'smart_agriculture' && v.schema === 'public' && v.host === '127.0.0.1' && v.port === 5432 && Number.isFinite(TIME(v.serverStartedAt)) && validLabel(v.principalReference),
    migrations: v => v.rows === 11 && v.unfinished === 0 && v.rolledBack === 0 && Array.isArray(v.actualRows) && v.actualRows.length === 11 &&
      new Set(v.actualRows.map(row => row.name)).size === 11 && MIGRATIONS.every(([name, checksum]) =>
        v.actualRows.some(row => row.name === name && row.checksum === checksum && Number.isFinite(TIME(row.finishedAt)) && row.rolledBackAt === null)) &&
      v.columnFingerprint === '390c65cfe11f3b8695a6bc5ff21d94d4' && v.constraintFingerprint === '2e5981464ef4017e1ad5a6854ba17cc2' && v.objectConflicts === 0,
    commands: v => v.pending === 0 && Number.isSafeInteger(v.total) && v.total >= 0 && HASH(v.baselineDigest),
    actuator: v => v.deviceCode === DEVICE && v.actuatorCode === ACTUATOR && ['OFF','UNKNOWN'].includes(v.state) &&
      (v.stateAt === null || Number.isFinite(TIME(v.stateAt))) && v.directDatabaseObservation === true,
    broker: v => processPart(v.process) && v.listenerPid === v.process.pid && v.lanListenerVerified === true && v.backendEndpointMatches === true &&
      v.executable === 'C:/Program Files/mosquitto/mosquitto.exe' && v.configPath === 'C:/mosquitto/config/mosquitto.conf' &&
      HASH(v.reviewedConfigHash) && v.reviewedConfigHash === v.observedConfigHash && v.loopbackInstance === false && v.effectiveInstanceVerified === true,
    configuration: v => exactObject(v.environmentOverrides, SAFE_ENV) && v.inheritedCodeInjectionOptionsExcluded === true && v.credentialValuesIncluded === false,
    storage: v => safeStoragePath(v.path) && v.path === plan.storage.path && v.path.endsWith('\\' + runId) && typeof v.operatorSid === 'string' && /^S-1-5-21-\d+-\d+-\d+-\d+$/.test(v.operatorSid) &&
      v.ownerSid === v.operatorSid && v.protectedDacl === true && v.inheritanceEnabled === false && v.unexpectedReparse === false && v.existingRunConflict === false &&
      Array.isArray(v.fullControlSids) && v.fullControlSids.length === 2 && new Set(v.fullControlSids).size === 2 && v.fullControlSids.includes(v.operatorSid) && v.fullControlSids.includes('S-1-5-18') &&
      v.knownCloudRoot === false && v.cloudBackupScope === 'NOT_VERIFIED' && v.dataHandlingApproved === true && v.residualRiskAccepted === true && validLabel(v.storageApprovalReference),
    approval: v => v.phase === '13.5D.1D' && v.scope === 'OFFLINE_ADAPTER_PREPARATION' && v.runId === runId && validLabel(v.reference) &&
      !/phase13-5c3|c\.3|historical/i.test(v.reference) && v.maxAttempts === 1 && v.productionStartupAuthorized === false &&
      Array.isArray(v.reviewedSideEffects) && v.reviewedSideEffects.length === SIDE_EFFECTS.length && SIDE_EFFECTS.every(effect => v.reviewedSideEffects.includes(effect)),
  };
  const gates = Object.keys(checks).map(gate => {
    const evidence = bundle?.[gate]; let reasons = baseEvidence(gate, evidence, runId, now);
    if (!reasons.length) { try { if (!checks[gate](evidence.value)) reasons = ['SAFETY_VALUE_INVALID_OR_UNKNOWN']; } catch { reasons = ['SAFETY_VALUE_INVALID_OR_UNKNOWN']; } }
    return { name: gate, status: reasons.length ? 'BLOCKED' : 'PASS', evidenceLevel: 'MOCK_ONLY', reasonCodes: reasons };
  });
  if (Object.keys(bundle || {}).some(key => !Object.hasOwn(checks, key))) gates.push({ name: 'envelope', status: 'BLOCKED', evidenceLevel: 'MOCK_ONLY', reasonCodes: ['SELF_DECLARED_OR_UNKNOWN_EVIDENCE_FIELD'] });
  return { status: gates.every(g => g.status === 'PASS') ? 'MOCK_CONTRACT_PASS' : 'BLOCKED', gates,
    reasonCodes: [...new Set(gates.flatMap(g => g.reasonCodes))], productionAuthorized: false, liveEvidenceVerified: false };
}
function validateRuntime(expected, evidence, now) {
  const reasons = baseEvidence('runtime', evidence, expected?.runId, now);
  if (!identityShape(expected)) reasons.push('PROCESS_IDENTITY_INVALID');
  const v = evidence?.value;
  if (!reasons.length) {
    if (!verifyProcessIdentity(expected, v.identity) || v.listenerPort !== 5000 || v.listenerPid !== expected.child.pid || v.attestation?.pid !== expected.child.pid ||
        v.checkedProcessAfter?.pid !== expected.child.pid || v.checkedProcessAfter?.startTicks !== expected.child.startTicks) reasons.push('SERVING_PROCESS_IDENTITY_MISMATCH');
    let launchedAt = NaN;
    try { launchedAt = Number((BigInt(expected.child.startTicks) - 621355968000000000n) / 10000n); } catch { /* fail closed */ }
    const attestedAt = TIME(v.attestation?.startedAt);
    if (!Number.isFinite(launchedAt) || !Number.isFinite(attestedAt) || attestedAt < launchedAt || attestedAt > launchedAt + 120000 || attestedAt > TIME(evidence.checkedAt)) reasons.push('STALE_OR_WRONG_STARTUP_ATTESTATION');
    if (v.attestation?.commandsEnabled !== false || v.attestation?.automationEnabled !== false || v.attestation?.testMode !== true || v.attestation?.effectiveMaxRunSeconds !== 1 ||
        v.apiRuntime?.commandsEnabled !== false || v.apiRuntime?.automationEnabled !== false || v.apiRuntime?.pumpTestMode !== true || v.apiRuntime?.effectiveMaxRunSeconds !== 1 ||
        v.gatewayMode !== 'DISABLED' || v.controlEnabled !== false || v.health?.database !== 'connected' || v.health?.mqtt !== 'connected') reasons.push('EFFECTIVE_RUNTIME_UNSAFE_OR_MISSING');
  }
  return { status: reasons.length ? 'BLOCKED' : 'MOCK_RUNTIME_PASS', reasonCodes: [...new Set(reasons)], productionAuthorized: false, liveEvidenceVerified: false };
}
function monitorDecision(expected, observation, now) {
  const reasons = baseEvidence('observation', observation, expected?.runId, now), v = observation?.value;
  if (!reasons.length && !verifyProcessIdentity(expected, v.identity)) reasons.push('MONITOR_IDENTITY_OR_HEARTBEAT_LOST');
  if (!reasons.length && v.exit !== null) {
    if (v.exit?.pid !== expected.child.pid || v.exit?.startTicks !== expected.child.startTicks || !Number.isInteger(v.exit?.code)) reasons.push('EXIT_IDENTITY_UNKNOWN');
    else return { state: v.exit.code === 0 ? 'EXITED' : 'FAILED', action: 'NO_RETRY', productionAuthorized: false };
  }
  if (!reasons.length && (v.processPresent !== true || v.wrapperAlive !== true || v.hostAlive !== true ||
      !Number.isFinite(TIME(v.heartbeatAt)) || TIME(v.heartbeatAt) > TIME(now) || TIME(now) - TIME(v.heartbeatAt) > 2000)) reasons.push('MONITOR_IDENTITY_OR_HEARTBEAT_LOST');
  if (reasons.length) return { state: 'MONITOR_LOST', action: 'STOP_AND_INSPECT_NO_SIGNAL', reasonCodes: reasons, productionAuthorized: false };
  if (v.stopRequested === true) {
    const members = v.consoleMembers;
    if (v.gracefulStopApproved !== true || v.signalAlreadySent !== false || !Array.isArray(members) || members.length !== 2 ||
        new Set(members).size !== 2 || !members.includes(expected.host.pid) || !members.includes(expected.child.pid))
      return { state: 'BLOCKED', action: 'DO_NOT_SIGNAL', reasonCodes: ['STOP_SCOPE_OR_CONSOLE_IDENTITY_INVALID'], productionAuthorized: false };
    return { state: 'STOP_PLANNED', action: 'CANDIDATE_CTRL_C_ONLY_EXECUTOR_DISABLED', productionAuthorized: false };
  }
  return { state: 'RUNNING_UNVERIFIED', action: 'AWAIT_EFFECTIVE_RUNTIME_EVIDENCE', productionAuthorized: false };
}
const KNOWN_REASONS = new Set(['CANDIDATE_PLAN_TAMPERED','EVIDENCE_MISSING','SELF_DECLARED_OR_UNKNOWN_EVIDENCE_FIELD',
  'UNTRUSTED_OR_NONMOCK_EVIDENCE_SOURCE','EVIDENCE_STALE_FUTURE_OR_INVALID','EVIDENCE_TARGET_MISMATCH','EVIDENCE_VALUE_MISSING',
  'SAFETY_VALUE_INVALID_OR_UNKNOWN','PROCESS_IDENTITY_INVALID','SERVING_PROCESS_IDENTITY_MISMATCH','STALE_OR_WRONG_STARTUP_ATTESTATION',
  'EFFECTIVE_RUNTIME_UNSAFE_OR_MISSING','MONITOR_IDENTITY_OR_HEARTBEAT_LOST','EXIT_IDENTITY_UNKNOWN','STOP_SCOPE_OR_CONSOLE_IDENTITY_INVALID']);
function sanitizeReport(input) {
  const statuses = new Set(['PLAN_ONLY','BLOCKED','MOCK_CONTRACT_PASS','MOCK_RUNTIME_PASS','PASS','FAILED','EXITED','MONITOR_LOST']);
  const out = { phase: '13.5D.1D', productionAuthorized: false };
  if (statuses.has(input?.status)) out.status = input.status;
  if (Number.isInteger(input?.exitCode)) out.exitCode = input.exitCode;
  out.reasonCodes = Array.isArray(input?.reasonCodes) ? [...new Set(input.reasonCodes.filter(v => KNOWN_REASONS.has(v)))] : [];
  if (Array.isArray(input?.gates)) out.gates = input.gates.filter(g => Object.hasOwn(TTL, g?.name)).map(g => ({
    name: g.name, status: g.status === 'PASS' ? 'PASS' : 'BLOCKED', evidenceLevel: 'MOCK_ONLY',
    reasonCodes: Array.isArray(g.reasonCodes) ? g.reasonCodes.filter(r => KNOWN_REASONS.has(r)) : [] }));
  // No arbitrary messages, stack traces, URLs, env, paths, reference text or nested evidence copied.
  return out;
}
module.exports = { buildPlan, validatePreStart, verifyProcessIdentity, validateRuntime, monitorDecision, sanitizeReport,
  targetFor, TTL, COLLECTORS, SIDE_EFFECTS, SAFE_ENV, MIGRATIONS, REPO, NODE, SYSTEM_ID };
