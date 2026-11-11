'use strict';
// Offline candidate only: no OS/SQL/MQTT/API executor and no user-supplied transport callback.
const { createHash } = require('node:crypto');
const sql = require('./phase13-5d1e-readonly-sql.cjs');
const v = require('./phase13-5d1e-validators.cjs');
const TTL = Object.freeze({ catalog: 30000, baseline: 10000, process: 10000, broker: 10000, physical: 120000, storage: 30000 });
const IDS = Object.freeze({ catalog: 'D1E_SQL_CATALOG', baseline: 'D1E_SQL_BASELINE', process: 'D1E_WINDOWS_PROCESS',
  broker: 'D1E_LAN_BROKER_IDENTITY', physical: 'D1E_OPERATOR_CONFIRMATION', storage: 'D1E_NTFS_STORAGE' });
const sha = text => createHash('sha256').update(text).digest('hex');
function freeze(x) { if (x && typeof x === 'object') { for (const y of Object.values(x)) freeze(y); Object.freeze(x); } return x; }
function target(kind, runId) {
  if (['catalog','baseline'].includes(kind)) return { ...sql.planSql().connection };
  if (kind === 'broker') return { host: v.BROKER.host, port: 1883, instance: 'LAN_CANDIDATE_NOT_LIVE_VERIFIED' };
  if (kind === 'physical') return { runId, deviceCode: 'ESP32-GF-A-01', actuatorCode: 'PUMP_01' };
  return { runId, repository: 'C:\\DATN\\Project_datn', scope: kind === 'process' ? 'BACKEND_5000' : 'PRIVATE_RUNTIME_LOGS' };
}
const REASONS = new Set([
  'OFFLINE_SESSION_REQUIRED','UNKNOWN_COLLECTOR','SESSION_LATCHED_NO_RETRY','DUPLICATE_COLLECTION_NO_RETRY',
  'NATIVE_ENVELOPE_INVALID','NATIVE_ERROR_OR_TIMEOUT','NATIVE_NONZERO_OR_SIGNAL','NATIVE_STDERR_OR_OUTPUT_LIMIT',
  'NATIVE_JSON_INCOMPLETE','COLLECTOR_ATTESTATION_MISSING','COLLECTION_TIME_INVALID','SQL_NOT_ALLOWLISTED',
  'EVIDENCE_NOT_ISSUED_HERE','EVIDENCE_STALE_OR_FUTURE','CATALOG_REQUIRED_FIRST','DB_RESTART_BETWEEN_STAGES',
  'OUTPUT_SCHEMA_MISMATCH','DB_IDENTITY_MISMATCH','DB_CATALOG_IDENTITY_MISMATCH','RELATION_IDENTITY_OR_RLS_MISMATCH',
  'SCHEMA_FINGERPRINT_MISMATCH','PHASE12_COLUMNS_MISSING','PROPOSED_OBJECT_CONFLICT','MIGRATION_BASELINE_MISMATCH',
  'COMMAND_BASELINE_UNSAFE','COMMAND_BREAKDOWN_MISMATCH','ACTUATOR_BASELINE_MISSING','ACTUATOR_BASELINE_UNSAFE',
  'PROCESS_SNAPSHOT_INCOMPLETE','PROCESS_CHANGED_DURING_COLLECTION','UNKNOWN_NODE_PROCESS','UNKNOWN_BACKEND_WRAPPER',
  'DUPLICATE_BACKEND','ATTEMPT_UNVERIFIABLE','PID_REUSED','STALE_UNRESOLVED_ATTEMPT','LISTENER_OWNER_UNKNOWN',
  'BACKEND_NOT_ABSENT','BROKER_ENDPOINT_MISMATCH','BROKER_PROCESS_MISMATCH','BROKER_NOT_LAN_INSTANCE',
  'BROKER_CONFIG_UNVERIFIED','PHYSICAL_CONFIRMATION_REQUIRED','STORAGE_IDENTITY_UNSAFE','STORAGE_DACL_UNSAFE',
  'STORAGE_REPARSE_UNVERIFIED','STORAGE_APPROVAL_REQUIRED','EVIDENCE_MISSING','OFFLINE_COLLECTION_REJECTED'
]);
function blocked(reason) { return freeze({ status: 'BLOCKED', reasonCodes: [REASONS.has(reason) ? reason : 'OFFLINE_COLLECTION_REJECTED'],
  evidenceLevel: 'OFFLINE_MOCK_ONLY', productionAuthorized: false, liveEvidenceVerified: false, retry: false }); }
function createOfflineSession(options = {}) {
  v.need(v.keys(options,['runId']) && v.label(options.runId), 'OFFLINE_SESSION_REQUIRED');
  const runId = options.runId, issued = new WeakSet(), latest = new Map(), attempted = new Set();
  let latched = false;
  function inspect(item, now) {
    if (!item || !issued.has(item)) return blocked('EVIDENCE_NOT_ISSUED_HERE');
    const n = v.time(now), at = v.time(item.collectedAt), until = v.time(item.expiresAt);
    if (![n,at,until].every(Number.isFinite) || at > n || until <= n || until - at > TTL[item.kind]) return blocked('EVIDENCE_STALE_OR_FUTURE');
    return freeze({ status: 'OFFLINE_ITEM_VALID', evidenceLevel: 'OFFLINE_MOCK_ONLY', productionAuthorized: false, liveEvidenceVerified: false, reasonCodes: [] });
  }
  function collectMock(kind, native, now, query) {
    if (latched) return blocked('SESSION_LATCHED_NO_RETRY');
    if (!Object.hasOwn(TTL, kind)) { latched = true; return blocked('UNKNOWN_COLLECTOR'); }
    if (attempted.has(kind)) { latched = true; return blocked('DUPLICATE_COLLECTION_NO_RETRY'); }
    attempted.add(kind);
    try {
      v.need(v.keys(native,['fixtureSource','collectedAt','exitCode','error','signal','timedOut','durationMs','stdout','stderr']), 'NATIVE_ENVELOPE_INVALID');
      const s = native.fixtureSource;
      v.need(v.keys(s,['kind','collectorId','runId','target']) && s.kind === 'MOCK_FIXTURE' && s.collectorId === IDS[kind] && s.runId === runId &&
        JSON.stringify(s.target) === JSON.stringify(target(kind,runId)), 'COLLECTOR_ATTESTATION_MISSING');
      const n = v.time(now), at = v.time(native.collectedAt);
      v.need(Number.isFinite(n) && Number.isFinite(at) && at <= n && n - at < TTL[kind], 'COLLECTION_TIME_INVALID');
      v.need(native.error === null && native.timedOut === false && Number.isFinite(native.durationMs) && native.durationMs >= 0 && native.durationMs <= 8000, 'NATIVE_ERROR_OR_TIMEOUT');
      v.need(native.exitCode === 0 && native.signal === null, 'NATIVE_NONZERO_OR_SIGNAL');
      v.need(typeof native.stdout === 'string' && Buffer.byteLength(native.stdout,'utf8') <= 1048576 && native.stderr === '', 'NATIVE_STDERR_OR_OUTPUT_LIMIT');
      if (kind === 'catalog' || kind === 'baseline') v.need(sql.validateSql(kind, query ?? sql.QUERIES[kind]), 'SQL_NOT_ALLOWLISTED');
      let raw; try { raw = JSON.parse(native.stdout.replace(/^\uFEFF/,'')); } catch { throw Error('NATIVE_JSON_INCOMPLETE'); }
      v.need(raw && typeof raw === 'object' && !Array.isArray(raw), 'OUTPUT_SCHEMA_MISMATCH');
      let value;
      if (kind === 'catalog') value = v.catalog(raw);
      if (kind === 'baseline') {
        const first = latest.get('catalog');
        v.need(first && inspect(first,now).status === 'OFFLINE_ITEM_VALID', 'CATALOG_REQUIRED_FIRST');
        value = v.commandBaseline(raw,first.value);
      }
      if (kind === 'catalog' || kind === 'baseline') v.need(Date.parse(value.serverStartedAt) <= at, 'DB_IDENTITY_MISMATCH');
      if (kind === 'process') value = v.processState(raw,at);
      if (kind === 'broker') value = v.broker(raw);
      if (kind === 'physical') value = v.physical(raw,at,runId);
      if (kind === 'storage') value = v.storage(raw,runId);
      const expiry = kind === 'physical' ? Math.min(at + TTL[kind],v.time(value.confirmedAt) + TTL[kind]) : at + TTL[kind];
      const item = freeze({ phase: '13.5D.1E', kind, runId, source: { kind: 'MOCK_COLLECTED', collectorId: IDS[kind],
        attestation: 'SESSION_LOCAL_OFFLINE_ONLY', outputSha256: sha(native.stdout), querySha256: sql.QUERIES[kind] ? sha(sql.QUERIES[kind]) : null },
        target: target(kind,runId), collectedAt: native.collectedAt, expiresAt: new Date(expiry).toISOString(), value,
        verification: 'OFFLINE_VALIDATED_ONLY', productionAuthorized: false, liveEvidenceVerified: false });
      issued.add(item); latest.set(kind,item);
      return item;
    } catch (error) { latched = true; return blocked(error.message); }
  }
  function evaluate(now) {
    if (latched) return blocked('SESSION_LATCHED_NO_RETRY');
    for (const kind of Object.keys(TTL)) {
      const item = latest.get(kind);
      if (!item) return blocked('EVIDENCE_MISSING');
      const check = inspect(item,now); if (check.status === 'BLOCKED') return check;
      if (kind === 'process' && item.value.preStartSafe !== true) return blocked('BACKEND_NOT_ABSENT');
    }
    return freeze({ status: 'OFFLINE_COLLECTORS_PASS', evidenceLevel: 'OFFLINE_MOCK_ONLY', productionAuthorized: false, liveEvidenceVerified: false, reasonCodes: [] });
  }
  return Object.freeze({ collectMock, inspect, evaluate });
}
function executeLive() { throw Error('LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'); }
function sanitize(item) {
  const allowed = new Set(['BLOCKED','OFFLINE_COLLECTORS_PASS','OFFLINE_ITEM_VALID']);
  return freeze({ phase: '13.5D.1E', status: allowed.has(item?.status) ? item.status : 'OFFLINE_EVIDENCE_NOT_PUBLISHED',
    evidenceLevel: 'OFFLINE_MOCK_ONLY', productionAuthorized: false, liveEvidenceVerified: false,
    reasonCodes: Array.isArray(item?.reasonCodes) ? item.reasonCodes.filter(r => REASONS.has(r)) : [] });
}
module.exports = { createOfflineSession, executeLive, sanitize, target, TTL, IDS };
if (require.main === module) {
  if (process.argv.length > 2) { console.error('LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'); process.exitCode = 2; }
  else console.log(JSON.stringify({ phase: '13.5D.1E', mode: 'PLAN_ONLY', executionEnabled: false, productionAuthorized: false }));
}
