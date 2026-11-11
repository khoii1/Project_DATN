'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const c = require('./phase13-5d1e-evidence-collectors.cjs'), q = require('./phase13-5d1e-readonly-sql.cjs');
const v = require('./phase13-5d1e-validators.cjs'), d = require('./phase13-5d1d-contracts.cjs');
const NOW = '2026-10-25T17:00:00.000Z', RUN = 'd1e-mock-run', HASH = 'a'.repeat(64);
const at = n => new Date(Date.parse(NOW) + n).toISOString(), copy = x => JSON.parse(JSON.stringify(x));
const sid = 'S-1-5-21-11-22-33-1001';
const storagePath = 'C:\\Users\\OfflineOperator\\AppData\\Local\\SmartAgricultureRuntimeRecovery\\' + RUN;
const split = storagePath.split('\\');
const processIdentity = { pid: 101, startTicks: '639285000000000001', parentPid: 99, executable: d.NODE,
  workingDirectory: d.REPO + '\\backend', entrypoint: 'src/server.ts' };
const listener = { address: '0.0.0.0', port: 5000, pid: 101, startTicks: processIdentity.startTicks };
function fixtures() {
  return {
    catalog: { database: 'smart_agriculture', principal: 'offline_readonly_inspector', inRecovery: false, serverVersion: 170002, address: '127.0.0.1', port: 5432, systemId: d.SYSTEM_ID,
      pgdata: 'C:/Program Files/PostgreSQL/17/data', serverStartedAt: at(-86400000), readOnly: 'on', databaseOwner: 'postgres', schema: 'public', schemaOwner: 'pg_database_owner',
      relations: v.EXPECTED_RELATIONS.map(name => ({ name, kind: 'r', rls: false, forceRls: false })),
      columnFingerprint: '390c65cfe11f3b8695a6bc5ff21d94d4', constraintFingerprint: '2e5981464ef4017e1ad5a6854ba17cc2',
      commandColumns: [...v.REQUIRED_COLUMNS], conflicts: 0 },
    baseline: { database: 'smart_agriculture', principal: 'offline_readonly_inspector', inRecovery: false, address: '127.0.0.1', port: 5432, systemId: d.SYSTEM_ID, serverStartedAt: at(-86400000), readOnly: 'on',
      migrations: d.MIGRATIONS.map(([name,checksum]) => ({ name,checksum,finishedAt: at(-86400000),rolledBackAt: null })),
      commands: { total: '57', pending: '0' }, breakdown: [{ status: 'SUCCESS', count: '50' },{ status: 'FAILED', count: '7' }],
      actuators: [{ deviceCode: 'ESP32-GF-A-01', actuatorCode: 'PUMP_01', state: 'UNKNOWN', stateAt: null }] },
    process: { before: { complete: true, processes: [], listeners: [] }, after: { complete: true, processes: [], listeners: [] }, attempts: [] },
    broker: { endpoint: { host: '172.20.10.2', port: 1883 }, backendEndpoint: 'mqtt://172.20.10.2:1883', localAddresses: ['172.20.10.2'],
      process: { ...processIdentity, executable: v.BROKER.executable, workingDirectory: 'C:/mosquitto', entrypoint: 'mosquitto' },
      processAfter: { ...processIdentity, executable: v.BROKER.executable, workingDirectory: 'C:/mosquitto', entrypoint: 'mosquitto' },
      listeners: [{ ...listener, port: 1883 }], config: { path: v.BROKER.configPath, pathFromProcess: v.BROKER.configPath,
        approvedHash: HASH, observedHash: HASH, approvalReference: 'mock-broker-review', source: 'MOCK_REVIEWED_FILE' } },
    physical: { runId: RUN, operatorReference: 'mock-confirmation', confirmedAt: at(-500), adapterDisconnected: true, esp32Active: true, usbOnly: true },
    storage: { path: storagePath, operatorSid: sid, ownerSid: sid, protectedDacl: true,
      aces: [sid,'S-1-5-18'].map(s => ({ sid: s, type: 'Allow', rights: 'FullControl', inherited: false })),
      pathComponents: split.map((_,i) => ({ path: split.slice(0,i+1).join('\\') + (i === 0 ? '\\' : ''), reparse: false })),
      createNew: true, existingRunConflict: false, approval: { runId: RUN, reference: 'mock-storage-approval', dataHandlingApproved: true,
        residualRiskAccepted: true, cloudBackupScope: 'NOT_VERIFIED', knownCloudRoot: false } }
  };
}
function native(kind, raw = fixtures()[kind]) {
  return { fixtureSource: { kind: 'MOCK_FIXTURE', collectorId: c.IDS[kind], runId: RUN, target: c.target(kind,RUN) },
    collectedAt: NOW, exitCode: 0, error: null, signal: null, timedOut: false, durationMs: 5, stdout: JSON.stringify(raw), stderr: '' };
}
function session() { return c.createOfflineSession({ runId: RUN }); }
function collect(kind, raw, transportDelta = {}) {
  const s = session(); if (kind === 'baseline') s.collectMock('catalog',native('catalog'),NOW);
  return s.collectMock(kind,{ ...native(kind,raw), ...transportDelta },NOW);
}
function blocked(result, reason) { assert.equal(result.status,'BLOCKED'); assert.equal(result.productionAuthorized,false); if (reason) assert.ok(result.reasonCodes.includes(reason),JSON.stringify(result)); }
test('imports expose no side effects, default specification remains execution disabled', () => {
  assert.equal(q.planSql().executionEnabled,false); assert.equal(q.planSql().maxAttempts,1);
  assert.equal(q.planSql().connection.port,5432); assert.equal(q.planSql().autoRetry,false);
  for (const file of ['phase13-5d1e-readonly-sql.cjs','phase13-5d1e-validators.cjs','phase13-5d1e-evidence-collectors.cjs']) {
    const source = fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.doesNotMatch(source,/require\(['"](?:pg|mqtt|@prisma\/client|dotenv|node:(?:fs|net|http|https|child_process))['"]\)|fetch\(|spawn\(|exec\(/);
    const exports = { exports: {} }, allowed = { './phase13-5d1d-contracts.cjs': d, './phase13-5d1e-readonly-sql.cjs': q, './phase13-5d1e-validators.cjs': v, 'node:crypto': crypto };
    const req = key => { assert.ok(Object.hasOwn(allowed,key)); return allowed[key]; };
    vm.runInNewContext(source,{ module: exports, require: req });
  }
});
test('live execution always denied, arbitrary production tokens do not unlock', () => {
  for (const options of [{},{ mode: 'LIVE', approval: 'APPROVED' },{ port: 55433 },{ port: 55434 }]) assert.throws(() => c.executeLive(options),/NOT_AUTHORIZED/);
  assert.throws(() => c.createOfflineSession({ runId: RUN, execute: true }),/OFFLINE_SESSION_REQUIRED/);
});
test('six complete mocks pass without establishing live trust or command permission', () => {
  const s = session();
  for (const kind of Object.keys(c.TTL)) { const item = s.collectMock(kind,native(kind),NOW); assert.equal(item.verification,'OFFLINE_VALIDATED_ONLY'); assert.equal(item.productionAuthorized,false); }
  assert.equal(s.evaluate(NOW).status,'OFFLINE_COLLECTORS_PASS'); assert.equal(s.evaluate(NOW).liveEvidenceVerified,false);
});
for (const stage of ['catalog','baseline']) test(`${stage} SQL is fixed READ ONLY and bounded`, () => {
  const sql = q.QUERIES[stage]; assert.ok(q.validateSql(stage,sql)); assert.match(sql,/^BEGIN READ ONLY;/); assert.match(sql,/COMMIT;\n$/);
  assert.match(sql,/statement_timeout = '3000ms'/); assert.match(sql,/lock_timeout = '500ms'/); assert.match(sql,/idle_in_transaction_session_timeout = '5000ms'/);
  assert.match(sql,/SET LOCAL search_path = pg_catalog/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|DO|CALL|EXECUTE|INTO|LOCK|pg_sleep|dblink|lo_import|set_config|pg_advisory_lock)\b/i);
  assert.doesNotMatch(sql,/(?:^|\W)(?:public\.)?(?:password|passwd|rolpassword|jwt|value|message|description|logs)(?:\W|$)/i);
  // Every called function is an explicitly catalog-qualified reviewed built-in.
  const functions = [...sql.matchAll(/pg_catalog\.([a-z_]+)\s*\(/g)].map(m => m[1]);
  const allowed = new Set(['json_build_object','current_database','current_setting','host','inet_server_addr','inet_server_port','pg_control_system','pg_postmaster_start_time','pg_is_in_recovery','json_agg','md5','string_agg','replace','format_type','pg_get_constraintdef','count']);
  assert.ok(functions.length > 5); functions.forEach(name => assert.ok(allowed.has(name),name));
});
const forbiddenSql = ['BEGIN; SELECT 1; COMMIT;','BEGIN READ ONLY; SELECT public.side_effect(); COMMIT;',
  'BEGIN READ ONLY; CREATE TEMP TABLE x(a int); COMMIT;','BEGIN READ ONLY; SELECT pg_catalog.pg_advisory_lock(1); COMMIT;',
  'BEGIN READ ONLY; SELECT pg_catalog.set_config(\'transaction_read_only\',\'off\',true); COMMIT;',
  'BEGIN READ ONLY; SELECT 1 INTO x; COMMIT;','BEGIN READ ONLY; UPDATE public.devices SET status=\'ACTIVE\'; COMMIT;',
  'BEGIN READ ONLY; GRANT ALL ON public.devices TO public; COMMIT;', 'BEGIN READ ONLY; SELECT pg_catalog.pg_sleep(100); COMMIT;'];
for (const [i,sql] of forbiddenSql.entries()) test(`forbidden SQL ${i+1} never reaches a collector result`, () => {
  assert.equal(q.validateSql('catalog',sql),false); blocked(session().collectMock('catalog',native('catalog'),NOW,sql),'SQL_NOT_ALLOWLISTED');
});
test('even whitespace, comments, extra statements or unknown query stage refused', () => {
  for (const sql of [q.QUERIES.catalog+'SELECT 1;', ' '+q.QUERIES.catalog, q.QUERIES.catalog+'-- harmless']) assert.equal(q.validateSql('catalog',sql),false);
  assert.equal(q.validateSql('unknown',q.QUERIES.catalog),false);
});
const negatives = [
  ['catalog','wrong DB',r => { r.database='other'; }], ['catalog','test port',r => { r.port=55433; }], ['catalog','recovery port',r => { r.port=55434; }],
  ['catalog','wrong systemID',r => { r.systemId='7699532241714573532'; }], ['catalog','PG16',r => { r.serverVersion=160000; }],
  ['catalog','replica not primary',r => { r.inRecovery=true; }], ['catalog','unknown principal',r => { r.principal=''; }], ['catalog','future server start',r => { r.serverStartedAt=at(1); }],
  ['catalog','wrong address',r => { r.address='192.168.1.4'; }], ['catalog','wrong PGDATA',r => { r.pgdata='test'; }],
  ['catalog','wrong owner',r => { r.databaseOwner='other'; }], ['catalog','wrong schema',r => { r.schema='other'; }],
  ['catalog','wrong schema owner',r => { r.schemaOwner='other'; }], ['catalog','read write',r => { r.readOnly='off'; }],
  ['catalog','column drift',r => { r.columnFingerprint='x'; }], ['catalog','constraint drift',r => { r.constraintFingerprint='x'; }],
  ['catalog','missing Phase12 columns',r => { r.commandColumns.pop(); }], ['catalog','unexpected ledger object',r => { r.conflicts=1; }],
  ['catalog','table replaced by view',r => { r.relations[0].kind='v'; }], ['catalog','RLS user function risk',r => { r.relations[0].rls=true; }],
  ['catalog','missing relation',r => { r.relations.pop(); }], ['catalog','self PASS',r => { r.status='PASS'; }],
  ['baseline','checksum drift',r => { r.migrations[0].checksum=HASH; }], ['baseline','missing migration',r => { r.migrations.pop(); }],
  ['baseline','duplicate migration',r => { r.migrations[0]=copy(r.migrations[1]); }], ['baseline','unfinished migration',r => { r.migrations[0].finishedAt=null; }],
  ['baseline','rolled back migration',r => { r.migrations[0].rolledBackAt=NOW; }], ['baseline','PENDING',r => { r.commands.pending='1'; }],
  ['baseline','unsafe integer',r => { r.commands.total='9007199254740992'; }], ['baseline','breakdown mismatch',r => { r.breakdown[0].count='49'; }],
  ['baseline','missing actuator',r => { r.actuators=[]; }], ['baseline','wrong actuator',r => { r.actuators[0].actuatorCode='OTHER'; }],
  ['baseline','relay ON',r => { r.actuators[0].state='ON'; }], ['baseline','OFF without time',r => { r.actuators[0].state='OFF'; }],
  ['baseline','server restarted',r => { r.serverStartedAt=at(-10000); }],
  ['baseline','principal changed',r => { r.principal='other'; }],
  ['broker','wrong endpoint',r => { r.endpoint.host='192.168.1.4'; }], ['broker','backend endpoint differs',r => { r.backendEndpoint='mqtt://127.0.0.1:1883'; }],
  ['broker','LAN IP not present',r => { r.localAddresses=[]; }], ['broker','loopback instance',r => { r.listeners[0].address='127.0.0.1'; }],
  ['broker','wrong PID',r => { r.listeners[0].pid=999; }], ['broker','PID reuse',r => { r.processAfter.startTicks='639285000000000002'; }],
  ['broker','wrong executable',r => { r.process.executable='other'; r.processAfter.executable='other'; }],
  ['broker','config unreviewed',r => { r.config.approvalReference=''; }], ['broker','config hash drift',r => { r.config.observedHash='b'.repeat(64); }],
  ['broker','config path mismatch',r => { r.config.pathFromProcess='other'; }],
  ['physical','adapter connected',r => { r.adapterDisconnected=false; }], ['physical','not USB only',r => { r.usbOnly=false; }],
  ['physical','historical confirmation',r => { r.confirmedAt=at(-120001); }], ['physical','future confirmation',r => { r.confirmedAt=at(1); }],
  ['physical','wrong run',r => { r.runId='old-run'; }], ['physical','operator absent',r => { r.operatorReference=''; }],
  ['storage','missing approval',r => { delete r.approval; }], ['storage','unapproved data handling',r => { r.approval.dataHandlingApproved=false; }],
  ['storage','wrong approval run',r => { r.approval.runId='old-run'; }], ['storage','unaccepted cloud risk',r => { r.approval.residualRiskAccepted=false; }],
  ['storage','cloud scope upgraded',r => { r.approval.cloudBackupScope='VERIFIED'; }], ['storage','cloud root',r => { r.approval.knownCloudRoot=true; }],
  ['storage','inherited ACL',r => { r.aces[0].inherited=true; }], ['storage','Everyone ACL',r => { r.aces[0].sid='S-1-1-0'; }],
  ['storage','extra ACE',r => { r.aces.push(copy(r.aces[0])); }], ['storage','wrong owner',r => { r.ownerSid='S-1-5-18'; }],
  ['storage','unprotected DACL',r => { r.protectedDacl=false; }], ['storage','reparse parent',r => { r.pathComponents[1].reparse=true; }],
  ['storage','missing ancestor inspection',r => { r.pathComponents.pop(); }], ['storage','overwrite permitted',r => { r.createNew=false; }],
  ['storage','existing run',r => { r.existingRunConflict=true; }], ['storage','repo path',r => { r.path=d.REPO+'\\build'; }]
];
for (const [kind,name,mutate] of negatives) test(`${kind}: ${name} blocks`, () => { const raw=fixtures()[kind]; mutate(raw); blocked(collect(kind,raw)); });
test('command totals are observed, not hardcoded to historical43', () => {
  const raw=fixtures().baseline; raw.commands.total='0'; raw.breakdown=[]; assert.equal(collect('baseline',raw).verification,'OFFLINE_VALIDATED_ONLY');
  assert.equal(collect('baseline',fixtures().baseline).value.commands.total,'57');
});
test('baseline cannot run without fresh successful catalog stage', () => {
  blocked(session().collectMock('baseline',native('baseline'),NOW),'CATALOG_REQUIRED_FIRST');
  const s=session(); s.collectMock('catalog',native('catalog'),NOW); blocked(s.collectMock('baseline',{ ...native('baseline'),collectedAt: at(30001) },at(30001)),'CATALOG_REQUIRED_FIRST');
});
test('old observed UNKNOWN/OFF baseline is not promoted to fresh OFF', () => {
  const raw=fixtures().baseline; raw.actuators[0]={ ...raw.actuators[0],state: 'OFF',stateAt: at(-86400000) };
  const result=collect('baseline',raw); assert.equal(result.value.actuators[0].stateAt,at(-86400000)); assert.equal(result.liveEvidenceVerified,false);
});
function processRaw(processes, listeners=[], attempts=[]) { const s={ complete: true,processes,listeners }; return { before: copy(s),after: copy(s),attempts }; }
const attempt = { runId: 'prior-run',pid: 101,startTicks: processIdentity.startTicks,state: 'STARTING',updatedAt: at(-500),exitCode: null };
test('process classifier separates absent, running, starting, no-listener', () => {
  for (const [raw,classification] of [[fixtures().process,'BACKEND_ABSENT'],[processRaw([processIdentity]),'BACKEND_PRESENT_NO_LISTENER'],
    [processRaw([processIdentity],[listener]),'BACKEND_RUNNING_IDENTITY_MATCHED'],[processRaw([processIdentity],[],[attempt]),'STARTUP_IN_PROGRESS']]) {
    assert.equal(collect('process',raw).value.classification,classification);
  }
});
const processNegatives = [
  ['wrong start time',r => { r.after.processes[0].startTicks='639285000000000002'; }],
  ['wrong listener owner',r => { r.before.listeners[0].pid=999; r.after=copy(r.before); }],
  ['wrong listener start',r => { r.before.listeners[0].startTicks='639285000000000002'; r.after=copy(r.before); }],
  ['duplicate backend',r => { r.before.processes.push({ ...processIdentity,pid: 102 }); r.after=copy(r.before); }],
  ['unknown Node',r => { r.before.processes[0].entrypoint='unknown'; r.after=copy(r.before); }],
  ['wrong node executable',r => { r.before.processes[0].executable='C:\\Other\\node.exe'; r.after=copy(r.before); }],
  ['unknown startup wrapper',r => { r.before.processes[0].executable='C:\\Windows\\cmd.exe'; r.after=copy(r.before); }],
  ['incomplete process scope',r => { r.before.complete=false; r.after=copy(r.before); }]
];
for (const [name,mutate] of processNegatives) test(`process: ${name} blocks`, () => { const r=processRaw([processIdentity],[listener]); mutate(r); blocked(collect('process',r)); });
test('stale RUNNING file cannot authorize, PID reuse and unresolved missing process block', () => {
  blocked(collect('process',processRaw([processIdentity],[listener],[{ ...attempt,state: 'VERIFIED',updatedAt: at(-20000) }])),'STALE_UNRESOLVED_ATTEMPT');
  blocked(collect('process',processRaw([processIdentity],[listener],[{ ...attempt,startTicks: '639285000000000002' }])),'PID_REUSED');
  blocked(collect('process',processRaw([],[],[attempt])),'STALE_UNRESOLVED_ATTEMPT');
});
test('a fresh STARTING record cannot hide a later unresolved stale attempt', () => {
  blocked(collect('process',processRaw([processIdentity],[],[attempt,{ ...attempt,runId: 'older',pid: 303,updatedAt: at(-90000) }])));
});
test('running backend identity still blocks pre-start', () => {
  const s=session(); for (const kind of Object.keys(c.TTL)) s.collectMock(kind,native(kind,kind === 'process' ? processRaw([processIdentity],[listener]) : fixtures()[kind]),NOW);
  blocked(s.evaluate(NOW),'BACKEND_NOT_ABSENT');
});
for (const kind of Object.keys(c.TTL)) {
  test(`${kind} missing prevents aggregate readiness`, () => {
    const s=session(); for (const k of Object.keys(c.TTL).filter(k => k !== kind)) s.collectMock(k,native(k),NOW); blocked(s.evaluate(NOW));
  });
  test(`${kind} stale/future collection or expanded TTL rejected`, () => {
    blocked(collect(kind,fixtures()[kind],{ collectedAt: at(-c.TTL[kind]-1) }),'COLLECTION_TIME_INVALID');
    blocked(collect(kind,fixtures()[kind],{ collectedAt: at(1) }),'COLLECTION_TIME_INVALID');
    blocked(collect(kind,fixtures()[kind],{ ttlMs: 99999999 }),'NATIVE_ENVELOPE_INVALID');
  });
}
const nativeFailures=[['error', { error: 'ETIMEDOUT' }],['nonzero', { exitCode: 7 }],['timeout', { timedOut: true }],
  ['signal', { signal: 'SIGTERM' }],['duration', { durationMs: 8001 }],['stderr', { stderr: 'SYNTHETIC_PASSWORD_CANARY' }],
  ['partial JSON', { stdout: '{"database":' }],['extra JSON', { stdout: '{}\n{}' }],['output limit', { stdout: 'x'.repeat(1048577) }]];
for (const [name,delta] of nativeFailures) test(`native ${name} blocks without exposing raw diagnostics`, () => {
  const r=collect('catalog',fixtures().catalog,delta); blocked(r); assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_PASSWORD|ETIMEDOUT|database/);
});
test('fixture source must attest collector/run/target, never caller PASS or LIVE', () => {
  for (const mutate of [n => { delete n.fixtureSource; },n => { n.fixtureSource.kind='LIVE'; },n => { n.fixtureSource.collectorId='OTHER'; },
    n => { n.fixtureSource.runId='old-run'; },n => { n.fixtureSource.target.port=55434; },n => { n.status='PASS'; }]) {
    const n=native('catalog'); mutate(n); blocked(session().collectMock('catalog',n,NOW));
  }
});
test('issued evidence immutable, forged/cloned/replayed envelopes are not attestation', () => {
  const s=session(), item=s.collectMock('catalog',native('catalog'),NOW);
  assert.equal(s.inspect(item,NOW).status,'OFFLINE_ITEM_VALID'); assert.throws(() => { item.expiresAt=at(999999); },TypeError);
  blocked(s.inspect(copy(item),NOW),'EVIDENCE_NOT_ISSUED_HERE'); blocked(session().inspect(item,NOW),'EVIDENCE_NOT_ISSUED_HERE');
  blocked(s.inspect(item,at(30000)),'EVIDENCE_STALE_OR_FUTURE'); blocked(s.inspect(item,at(-1)),'EVIDENCE_STALE_OR_FUTURE');
});
test('physical confirmation expiry is not extended by collection time', () => {
  const s=session(), raw=fixtures().physical; raw.confirmedAt=at(-119999);
  const item=s.collectMock('physical',native('physical',raw),NOW); blocked(s.inspect(item,at(1)),'EVIDENCE_STALE_OR_FUTURE');
});
test('failures latch session and duplicate collection never retries', () => {
  const s=session(); blocked(s.collectMock('catalog',{ ...native('catalog'),exitCode: 7 },NOW)); blocked(s.collectMock('catalog',native('catalog'),NOW),'SESSION_LATCHED_NO_RETRY');
  const s2=session(); s2.collectMock('catalog',native('catalog'),NOW); blocked(s2.collectMock('catalog',native('catalog'),NOW),'DUPLICATE_COLLECTION_NO_RETRY');
});
test('sanitizer is allowlist-based; nested credentials/paths/messages never exported', () => {
  const secret='SYNTHETIC_SECRET_CANARY'; const result=c.sanitize({ status: 'BLOCKED',productionAuthorized: true,password: secret,DATABASE_URL: secret,
    raw: { config: secret },message: secret,reasonCodes: [secret,'DB_IDENTITY_MISMATCH'] });
  assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_SECRET/); assert.equal(result.productionAuthorized,false);
  assert.deepEqual(result.reasonCodes,['DB_IDENTITY_MISMATCH']);
  const raw=fixtures().catalog; raw.password=secret; const rejected=collect('catalog',raw); blocked(rejected); assert.doesNotMatch(JSON.stringify(rejected),/SYNTHETIC_SECRET/);
});
test('baseline local migration source hashes still match all11 pins', () => {
  for (const [name,checksum] of d.MIGRATIONS) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../backend/prisma/migrations',name,'migration.sql'))).digest('hex'),checksum);
});
test('D.1C and D.1D artifacts remain unchanged', () => {
  const expected={
    'phase13-5d1c-launcher.cjs':'051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A',
    'phase13-5d1c-console-host.ps1':'C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3',
    'phase13-5d1c-synthetic-child.cjs':'DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF',
    'phase13-5d1c-launcher.test.cjs':'990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10',
    'phase13-5d1d-contracts.cjs':'22E12B76C328EA9E2B6A93564F2FCEF2BA0F2CD56B77817265A6092521030B86',
    'phase13-5d1d-recovery-adapter.cjs':'1AEC6EB4A1A6CA866CCD396372D4BA80ACFEFBB74549A3F3E56BC1BA5B62261E',
    'phase13-5d1d-recovery-adapter.test.cjs':'6E80C0F000E0B9A4F4310FDFE1FE628542CD83867F50B16FF02860835AC58C7E'
  };
  for (const [file,hash] of Object.entries(expected)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex').toUpperCase(),hash);
});
