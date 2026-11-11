// Explicit Phase13.5A.1 approval. Existing cluster ONLY; no initdb/new roles/DB.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawnSync, spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { PrismaClient } = require('../../build/phase13-3b-client');
const ctx = require('./phase13-3b-test-context.cjs');
const root = path.resolve(__dirname, '../..'), bin = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const pgdata = path.join(ctx.root, 'data'), runId = randomUUID();
const out = path.join(root, 'report/phase13-5a1-sql-run-' + runId + '.json');
const evidence = { runId, startedAt: new Date().toISOString(), startedByAgent: false, migrationCommitted: false, testsPassed: false, testClusterStopped: false };
const normal = p => path.resolve(p).replaceAll('\\', '/').toLowerCase();
function control() {
  const r = spawnSync(path.join(bin, 'pg_controldata.exe'), [pgdata], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw Error('TEST_CONTROL_UNREADABLE');
  return { systemId: r.stdout.match(/Database system identifier:\s*(\d+)/)?.[1], state: r.stdout.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim() };
}
const listening = () => new Promise(resolve => { const s = net.connect({ host: '127.0.0.1', port: 55433 }); s.once('connect', () => { s.destroy(); resolve(true); }); s.once('error', () => resolve(false)); });
function pgctl(action) {
  const args = ['-D', pgdata, '-w', '-t', '30'];
  if (action === 'start') args.push('-l', path.join(ctx.root, 'logs/phase13-5a1-' + runId + '.log'));
  else args.push('-m', 'fast');
  args.push(action);
  const r = spawnSync(path.join(bin, 'pg_ctl.exe'), args, { stdio: 'ignore', windowsHide: true, timeout: 35000 });
  if (r.status !== 0) throw Error('TEST_PG_CTL_' + action.toUpperCase() + '_FAILED');
}
async function verify() {
  const admin = new PrismaClient({ datasourceUrl: ctx.testUrl('admin', 'public', 'postgres') });
  const owner = new PrismaClient({ datasourceUrl: ctx.testUrl('migrator') });
  const app = new PrismaClient({ datasourceUrl: ctx.testUrl('app') });
  try {
    const identity = await ctx.verify(owner, 'phase13_test_migrator', ctx.database, ctx.schema, admin);
    await ctx.verify(app, 'phase13_test_app');
    const [system] = await admin.$queryRawUnsafe("SELECT system_identifier::text AS system_id FROM pg_control_system()");
    if (system.system_id !== evidence.control.systemId || system.system_id === evidence.production.system_id) throw Error('SERVER_SYSTEM_ID_MISMATCH');
    if (evidence.identity && evidence.identity.started !== identity.started) throw Error('TEST_SERVER_REPLACED_STOP');
    const [role] = await app.$queryRawUnsafe("SELECT rolsuper, rolcreatedb, rolcreaterole, (SELECT tableowner FROM pg_tables WHERE schemaname='phase13_test_phase13_3b' AND tablename='irrigation_decision_logs') AS audit_owner FROM pg_roles WHERE rolname=current_user");
    if (role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.audit_owner === 'phase13_test_app') throw Error('APP_ROLE_PRIVILEGE_UNSAFE');
    return { identity, role };
  } finally { await Promise.all([admin.$disconnect(), owner.$disconnect(), app.$disconnect()]); }
}
async function sql(file, label) {
  await verify(); // PGDATA + system identifier + all three connection identities before DDL.
  const url = new URL(ctx.testUrl('migrator'));
  const r = spawnSync(path.join(bin, 'psql.exe'), ['-X', '-w', '-h', '127.0.0.1', '-p', '55433', '-U', 'phase13_test_migrator', '-d', ctx.database, '-v', 'ON_ERROR_STOP=1', '-f', file],
    { encoding: 'utf8', windowsHide: true, timeout: 30000, env: { ...process.env, DATABASE_URL: '', PGHOST: '127.0.0.1', PGPORT: '55433', PGDATABASE: ctx.database,
      PGUSER: 'phase13_test_migrator', PGPASSWORD: decodeURIComponent(url.password), PGOPTIONS: '-c search_path=phase13_test_phase13_3b,pg_catalog' } });
  // SQL is public proposal text and synthetic data only; no credential in args/output.
  fs.writeFileSync(path.join(ctx.root, 'logs/phase13-5a1-' + runId + '-' + label + '.log'), (r.stdout || '') + (r.stderr || ''));
  evidence[label] = { exitCode: r.status, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
  if (r.status !== 0) throw Error('ISOLATED_SQL_' + label.toUpperCase() + '_FAILED');
}
async function suite() {
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'phase13-5a1-integration.cjs'), '--approved-phase13-5a1'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: '', MQTT_COMMANDS_ENABLED: 'false', MQTT_AUTOMATION_COMMANDS_ENABLED: 'false', MQTT_PUMP_TEST_MODE: 'true' } });
    const log = fs.createWriteStream(path.join(ctx.root, 'logs/phase13-5a1-' + runId + '-suite.log'));
    p.stdout.on('data', b => { log.write(b); process.stdout.write(b); });
    p.stderr.on('data', b => log.write(b));
    const timeout = setTimeout(() => p.kill(), 120000);
    p.on('error', reject); p.on('exit', code => { clearTimeout(timeout); log.end(); code === 0 ? resolve() : reject(Error('SQL_INTEGRATION_FAILED_SEE_REDACTED_EVIDENCE')); });
  });
}
async function main() {
  if (process.argv[2] !== '--approved-phase13-5a1') throw Error('APPROVAL_REQUIRED');
  const before = JSON.parse(fs.readFileSync(path.join(root, 'report/phase13-5a1-runtime-before.json')));
  evidence.production = before.identity;
  if (!before.systemIdentifiersDistinct || !before.identity.system_id || before.identity.port !== 5432) throw Error('PRODUCTION_IDENTITY_PROOF_REQUIRED');
  for (const directory of ['C:\\DATN', 'C:\\DATN\\test-instances', ctx.root, pgdata]) {
    if (normal(fs.realpathSync.native(directory)) !== normal(directory) || fs.lstatSync(directory).isSymbolicLink()) throw Error('UNEXPECTED_TEST_REPARSE');
  }
  if (fs.readFileSync(path.join(pgdata, 'PG_VERSION'), 'utf8').trim() !== '17') throw Error('TEST_PG_VERSION_MISMATCH');
  evidence.control = control();
  if (evidence.control.state !== 'shut down' || !evidence.control.systemId || evidence.control.systemId === before.identity.system_id || normal(before.identity.data) === normal(pgdata)) throw Error('TEST_CLUSTER_NOT_SAFE_TO_START');
  const config = fs.readFileSync(path.join(pgdata, 'postgresql.conf'), 'utf8');
  if (!/^[ \t]*port[ \t]*=[ \t]*55433[ \t]*$/m.test(config) || !/^[ \t]*listen_addresses[ \t]*=[ \t]*'127\.0\.0\.1'[ \t]*$/m.test(config) || await listening()) throw Error('TEST_BINDING_OR_PORT_GATE_FAILED');
  try {
    pgctl('start'); evidence.startedByAgent = true;
    const verified = await verify(); evidence.identity = verified.identity; evidence.appRole = verified.role;
    fs.writeFileSync(path.join(root, 'report/phase13-5a1-sql-identity.json'), JSON.stringify({ identity: verified.identity, pgdata, systemId: evidence.control.systemId, productionSystemId: before.identity.system_id, runId }, null, 2));
    const owner = new PrismaClient({ datasourceUrl: ctx.testUrl('migrator') });
    try {
      const constraints = await owner.$queryRawUnsafe("SELECT conname FROM pg_constraint WHERE connamespace='phase13_test_phase13_3b'::regnamespace");
      const names = new Set(constraints.map(x => x.conname));
      for (const name of ['irrigation_cycle_counts', 'irrigation_budget_bounds', 'irrigation_intent_bounds', 'irrigation_shadow_one_second', 'irrigation_safety_version']) if (!names.has(name)) throw Error('V1_CONSTRAINT_PRECONDITION_MISSING');
      evidence.v1ConstraintCount = constraints.length;
      const existing = await owner.$queryRawUnsafe("SELECT tgname FROM pg_trigger WHERE tgrelid='phase13_test_phase13_3b.irrigation_decision_logs'::regclass AND NOT tgisinternal");
      if (names.has('irrigation_v2_settlement') || names.has('irrigation_v2_dispatch_order') || existing.length) {
        const resume = process.argv.find(x => x.startsWith('--resume-committed-v2='))?.split('=')[1];
        if (!resume || !/^[0-9a-f-]{36}$/.test(resume)) throw Error('V2_ALREADY_PRESENT_REVIEW_REQUIRED');
        const previous = JSON.parse(fs.readFileSync(path.join(root, 'report/phase13-5a1-sql-run-' + resume + '.json')));
        const hash = createHash('sha256').update(fs.readFileSync(path.join(root, 'backend/prisma/proposals/irrigation-v2-isolated-apply.sql'))).digest('hex');
        if (!previous.migrationCommitted || previous.control.systemId !== evidence.control.systemId || previous.committedV2?.sha256 !== hash) throw Error('COMMITTED_V2_PROOF_MISMATCH');
        const c = await owner.$queryRawUnsafe("SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='phase13_test_phase13_3b'::regnamespace AND conname IN ('irrigation_v2_settlement','irrigation_v2_dispatch_order')");
        const t = await owner.$queryRawUnsafe("SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='phase13_test_phase13_3b.irrigation_decision_logs'::regclass AND NOT tgisinternal");
        const f = await owner.$queryRawUnsafe("SELECT prosrc, prosecdef FROM pg_proc WHERE oid='phase13_test_phase13_3b.irrigation_v2_deny_audit_mutation()'::regprocedure");
        if (c.length !== 2 || !c.every(x=>x.convalidated) || t.length !== 2 || !t.every(x=>x.tgenabled==='O' && x.definition.includes('irrigation_v2_deny_audit_mutation')) || f.length!==1 || f[0].prosecdef || !f[0].prosrc.includes("RAISE EXCEPTION 'IRRIGATION_AUDIT_APPEND_ONLY'")) throw Error('COMMITTED_V2_CATALOG_MISMATCH');
        evidence.reusedCommittedV2 = { runId: resume, sha256: hash, constraints: c, triggers: t };
        evidence.migrationCommitted = true;
      }
    } finally { await owner.$disconnect(); }
    if (!evidence.reusedCommittedV2) {
      await sql(path.join(root, 'backend/prisma/proposals/irrigation-v2-isolated-review.sql'), 'syntaxDryRun');
      await sql(path.join(root, 'backend/prisma/proposals/irrigation-v2-isolated-apply.sql'), 'committedV2'); evidence.migrationCommitted = true;
    }
    await suite(); evidence.testsPassed = true;
  } finally {
    if (evidence.startedByAgent) {
      await verify(); pgctl('stop');
      evidence.testClusterStopped = !await listening() && control().state === 'shut down';
      if (!evidence.testClusterStopped) throw Error('TEST_CLUSTER_SHUTDOWN_NOT_VERIFIED');
    }
    evidence.finishedAt = new Date().toISOString(); fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ evidence: out, testClusterStopped: evidence.testClusterStopped, testsPassed: evidence.testsPassed }));
  }
}
main().catch(e => { evidence.failure = { code: e.code, reason: /^[A-Z_]+$/.test(e.message) ? e.message : 'ISOLATED_RUN_FAILED_REDACTED' }; evidence.finishedAt = new Date().toISOString(); fs.writeFileSync(out, JSON.stringify(evidence, null, 2)); console.error(JSON.stringify(evidence.failure)); process.exitCode = 1; });
