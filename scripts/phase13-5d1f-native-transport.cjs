'use strict';
// Invocation/capture logic for mock native results ONLY. No spawn, SQL driver or live IO.
const { createHash } = require('node:crypto');
const revision = require('./phase13-5d1f-sql-revision.cjs');
const v = require('./phase13-5d1e-validators.cjs');
const hash = text => createHash('sha256').update(text).digest('hex');
const PSQL = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const ROOT = 'C:\\DATN\\Project_datn';
function freeze(x) { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
function buildPlan(kind = 'postgres') {
  v.need(['postgres','windows'].includes(kind),'INVOCATION_NOT_ALLOWLISTED');
  return freeze({ phase: '13.5D.1F', mode: 'PLAN_ONLY', executionEnabled: false, kind, shell: false, inheritEnvironment: false,
    executable: kind === 'postgres' ? PSQL : POWERSHELL,
    args: kind === 'postgres' ? ['--no-psqlrc','--no-password','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=1','--host=127.0.0.1','--port=5432','--dbname=smart_agriculture','--file=-'] :
      ['-NoLogo','-NoProfile','-NonInteractive','-File', ROOT + '\\scripts\\phase13-5d1f-windows-transport.ps1','-Mode','OFFLINE_FIXTURE'],
    stdin: kind === 'postgres' ? revision.SQL : 'FIXTURE_JSON_ONLY',
    environment: kind === 'postgres' ? { PGCLIENTENCODING: 'UTF8', PGTZ: 'UTC', PGDATESTYLE: 'ISO, YMD', PGCONNECT_TIMEOUT: '3',
      PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=3000 -c lock_timeout=500', PGAPPNAME: 'smartagri-d1f-readonly-candidate' } : {},
    credentialHandling: 'UNAVAILABLE_REQUIRES_SEPARATE_LOCAL_SECURE_HANDOFF_APPROVAL',
    nativeTimeoutMs: 8000, stdoutMaxBytes: 1048576, stderrMaxBytes: 1048576,
    maxAttempts: 1, autoRetry: false, evidenceWritePolicy: 'CREATE_NEW_ONLY_NO_PRODUCTION_DIRECTORY',
    capturePolicy: 'SEPARATE_STREAMS_FAIL_ON_NATIVE_ERROR_EVEN_STATUS_ZERO',
    liveAuthorized: false });
}
function invocationMatches(spec, kind) {
  return !!spec && JSON.stringify(spec) === JSON.stringify(buildPlan(kind));
}
function validateSqlTranscript(text) {
  const lines = text.trim().split(/\r?\n/); v.need(lines.length === 6,'SQL_TRANSCRIPT_INCOMPLETE');
  const rows = lines.map(line => JSON.parse(line)), [start,pre,locked,commands,after,end] = rows;
  for (const frame of [start,end]) v.need(v.keys(frame,['backendPid','snapshot','isolation','readOnly','protectedRelations']) &&
    Number.isSafeInteger(frame.backendPid) && frame.backendPid > 0 && typeof frame.snapshot === 'string' && /^\d+:\d+:(?:\d+(?:,\d+)*)?$/.test(frame.snapshot) &&
    frame.isolation === 'repeatable read' && frame.readOnly === 'on' && Number.isInteger(frame.protectedRelations), 'SNAPSHOT_PROOF_MISSING');
  v.need(start.backendPid === end.backendPid && start.snapshot === end.snapshot && end.protectedRelations === 6,'SQL_STAGE_IDENTITY_OR_LOCK_MISMATCH');
  [pre,locked,after].forEach(v.catalog);
  v.need(JSON.stringify(pre) === JSON.stringify(locked) && JSON.stringify(locked) === JSON.stringify(after), 'CATALOG_CHANGED_DURING_ACQUISITION');
  v.commandBaseline(commands,locked);
  return { database: pre.database, systemId: pre.systemId, principal: pre.principal, serverStartedAt: pre.serverStartedAt,
    catalogDigest: hash(JSON.stringify(locked)), baselineDigest: hash(JSON.stringify(commands)), commandCount: Number(commands.commands.total),
    pending: 0, actuator: commands.actuators[0], snapshotContract: 'OFFLINE_RR_AND_ACCESS_SHARE_PROOF', sourceLive: false };
}
const REASONS = new Set(['OFFLINE_SESSION_REQUIRED','UNKNOWN_KIND','INVOCATION_NOT_ALLOWLISTED','DUPLICATE_ATTEMPT_NO_RETRY',
  'SESSION_LATCHED_NO_RETRY','NATIVE_RESULT_INVALID','NATIVE_ATTESTATION_MISMATCH','NATIVE_ERROR_OR_TIMEOUT','NATIVE_EXIT_OR_SIGNAL',
  'OUTPUT_LIMIT_OR_STDERR','COLLECTION_TIME_INVALID','SQL_TRANSCRIPT_INCOMPLETE','SNAPSHOT_PROOF_MISSING','SQL_STAGE_IDENTITY_OR_LOCK_MISMATCH',
  'CATALOG_CHANGED_DURING_ACQUISITION','DB_IDENTITY_MISMATCH','DB_CATALOG_IDENTITY_MISMATCH','DB_RESTART_BETWEEN_STAGES',
  'MIGRATION_BASELINE_MISMATCH','COMMAND_BASELINE_UNSAFE','COMMAND_BREAKDOWN_MISMATCH','ACTUATOR_BASELINE_MISSING','ACTUATOR_BASELINE_UNSAFE',
  'SCHEMA_FINGERPRINT_MISMATCH','PHASE12_COLUMNS_MISSING','PROPOSED_OBJECT_CONFLICT','RELATION_IDENTITY_OR_RLS_MISMATCH','OUTPUT_SCHEMA_MISMATCH',
  'WINDOWS_NOT_VERIFIED','PROCESS_SNAPSHOT_INCOMPLETE','PROCESS_CHANGED_DURING_COLLECTION','UNKNOWN_NODE_PROCESS','UNKNOWN_BACKEND_WRAPPER',
  'DUPLICATE_BACKEND','ATTEMPT_UNVERIFIABLE','PID_REUSED','STALE_UNRESOLVED_ATTEMPT','LISTENER_OWNER_UNKNOWN','BACKEND_NOT_ABSENT',
  'BROKER_ENDPOINT_MISMATCH','BROKER_PROCESS_MISMATCH','BROKER_NOT_LAN_INSTANCE','BROKER_CONFIG_UNVERIFIED','OFFLINE_NATIVE_REJECTED']);
const fail = reason => freeze({ status: 'BLOCKED', reasonCode: REASONS.has(reason) ? reason : 'OFFLINE_NATIVE_REJECTED',
  productionAuthorized: false, liveEvidenceVerified: false, retry: false });
function createMockTransport(options) {
  v.need(v.keys(options,['runId']) && v.label(options.runId),'OFFLINE_SESSION_REQUIRED');
  const attempts = new Set(); let failed = false;
  function collect(kind, spec, native, now) {
    if (failed) return fail('SESSION_LATCHED_NO_RETRY');
    if (!['postgres','windows'].includes(kind)) { failed = true; return fail('UNKNOWN_KIND'); }
    if (attempts.has(kind)) { failed = true; return fail('DUPLICATE_ATTEMPT_NO_RETRY'); }
    attempts.add(kind);
    try {
      v.need(invocationMatches(spec,kind),'INVOCATION_NOT_ALLOWLISTED');
      v.need(v.keys(native,['source','startedAt','endedAt','status','error','signal','timedOut','stdout','stderr']), 'NATIVE_RESULT_INVALID');
      v.need(v.keys(native.source,['kind','runId','invocationSha256']) && native.source.kind === 'OFFLINE_NATIVE_FIXTURE' && native.source.runId === options.runId &&
        native.source.invocationSha256 === hash(JSON.stringify(spec)), 'NATIVE_ATTESTATION_MISMATCH');
      const n = v.time(now), start = v.time(native.startedAt), end = v.time(native.endedAt);
      v.need([n,start,end].every(Number.isFinite) && start <= end && end <= n && n-start < 10000,'COLLECTION_TIME_INVALID');
      v.need(native.error === null && native.timedOut === false && end-start <= spec.nativeTimeoutMs,'NATIVE_ERROR_OR_TIMEOUT');
      v.need(native.status === 0 && native.signal === null,'NATIVE_EXIT_OR_SIGNAL');
      v.need(typeof native.stdout === 'string' && typeof native.stderr === 'string' && Buffer.byteLength(native.stdout) <= spec.stdoutMaxBytes &&
        Buffer.byteLength(native.stderr) <= spec.stderrMaxBytes && native.stderr === '', 'OUTPUT_LIMIT_OR_STDERR');
      let value;
      if (kind === 'postgres') {
        value = validateSqlTranscript(native.stdout.replace(/^\uFEFF/,''));
        v.need(Date.parse(value.serverStartedAt) <= start,'DB_IDENTITY_MISMATCH');
      }
      else {
        const raw = JSON.parse(native.stdout.replace(/^\uFEFF/,''));
        v.need(v.keys(raw,['status','process','broker']) && raw.status === 'OFFLINE_WINDOWS_FIXTURE_VALIDATED','WINDOWS_NOT_VERIFIED');
        const process = v.processState(raw.process,start); v.need(process.preStartSafe === true,'BACKEND_NOT_ABSENT');
        value = { process, broker: v.broker(raw.broker) };
      }
      return freeze({ status: 'OFFLINE_NATIVE_PASS', runId: options.runId, kind, collectedAt: native.startedAt,
        expiresAt: new Date(start+10000).toISOString(), invocationSha256: hash(JSON.stringify(spec)), stdoutSha256: hash(native.stdout),
        evidenceLevel: 'OFFLINE_FIXTURE_ONLY', productionAuthorized: false, liveEvidenceVerified: false, value });
    } catch (error) { failed = true; return fail(error.message); }
  }
  return Object.freeze({ collect });
}
function executeLive() { throw Error('LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'); }
function sanitize(result) {
  return freeze({ phase: '13.5D.1F', status: result?.status === 'OFFLINE_NATIVE_PASS' ? 'OFFLINE_NATIVE_PASS' : 'BLOCKED',
    reasonCode: REASONS.has(result?.reasonCode) ? result.reasonCode : null, productionAuthorized: false, liveEvidenceVerified: false });
}
module.exports = { buildPlan, invocationMatches, createMockTransport, executeLive, sanitize, validateSqlTranscript, PSQL, POWERSHELL };
if (require.main === module) {
  if (process.argv.length > 2) { console.error('LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'); process.exitCode = 2; }
  else console.log(JSON.stringify({ phase: '13.5D.1F', mode: 'PLAN_ONLY', liveAuthorized: false, executionEnabled: false }));
}
