// Approved test instance only. No production URL/env imports and no cleanup/drop.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const root = 'C:\\DATN\\test-instances\\phase13-3b';
const bin = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const db = 'smart_agriculture_test_phase13_3b', schema = 'phase13_test_phase13_3b';
const normal = p => path.resolve(p).replaceAll('\\', '/').toLowerCase();
const url = (user, password, database, namespace = 'public') => `postgresql://${user}:${password}@127.0.0.1:55433/${database}?schema=${namespace}`;
function command(executable, args) {
  const r = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true, ...(path.basename(executable) === 'pg_ctl.exe' ? { stdio: 'ignore' } : {}) });
  if (r.status !== 0) throw Error('TEST_TOOL_FAILED_' + path.basename(executable));
  return r.stdout;
}
async function identity(client, database, role, expectedSchema) {
  const [i] = await client.$queryRawUnsafe(`SELECT current_database() AS db, current_user AS role, inet_server_addr()::text AS host, inet_server_port() AS port, current_schema() AS schema, current_setting('data_directory') AS data`);
  if (i.db !== database || i.role !== role || i.host !== '127.0.0.1/32' || i.port !== 55433 || (expectedSchema && i.schema !== expectedSchema) || normal(i.data) !== normal(path.join(root, 'data'))) throw Error('TEST_IDENTITY_MISMATCH_STOP');
  return { database: i.db, role: i.role, host: i.host, port: i.port, schema: i.schema, data: i.data };
}
async function main() {
  if (process.argv[2] !== '--approved-phase13-3b') throw Error('EXPLICIT_APPROVAL_REQUIRED');
  const resume = process.argv.includes('--resume-started-cluster');
  if (fs.existsSync(root) && !resume) throw Error('TEST_ROOT_ALREADY_EXISTS_STOP');
  let secrets;
  if (!resume) {
  await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', () => reject(Error('TEST_PORT_OCCUPIED_STOP'))); server.listen(55433, '127.0.0.1', () => server.close(resolve)); });
  fs.mkdirSync(root, { recursive: true });
  const account = command('whoami.exe', []).trim();
  command('icacls.exe', [root, '/inheritance:r', '/grant:r', `${account}:(OI)(CI)F`]);
  fs.mkdirSync(path.join(root, 'logs'));
  secrets = { admin: crypto.randomBytes(32).toString('hex'), migrator: crypto.randomBytes(32).toString('hex'), app: crypto.randomBytes(32).toString('hex') };
  fs.writeFileSync(path.join(root, 'credentials.json'), JSON.stringify(secrets), { flag: 'wx' });
  const pw = path.join(root, 'admin.passwd'); fs.writeFileSync(pw, secrets.admin + '\n', { flag: 'wx' });
  const init = command(path.join(bin, 'initdb.exe'), ['-D', path.join(root, 'data'), '-U', 'phase13_test_admin', '--pwfile', pw, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--encoding=UTF8', '--locale=C']);
  fs.writeFileSync(path.join(root, 'logs/initdb.log'), init);
  fs.appendFileSync(path.join(root, 'data/postgresql.conf'), "\n# Approved Phase13.3B isolated test overrides\nlisten_addresses='127.0.0.1'\nport=55433\nmax_connections=30\nshared_buffers='32MB'\nlog_statement='none'\nlog_min_error_statement='panic'\npassword_encryption='scram-sha-256'\n");
  command(path.join(bin, 'pg_ctl.exe'), ['-D', path.join(root, 'data'), '-l', path.join(root, 'logs/postgres.log'), '-w', 'start']);
  } else secrets = JSON.parse(fs.readFileSync(path.join(root, 'credentials.json'), 'utf8'));
  const admin = new PrismaClient({ datasourceUrl: url('phase13_test_admin', secrets.admin, 'postgres') });
  try {
    const checks = [];
    async function ddl(sql) { checks.push(await identity(admin, 'postgres', 'phase13_test_admin', 'public')); await admin.$executeRawUnsafe(sql); }
    await ddl(`CREATE ROLE phase13_test_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${secrets.migrator}'`);
    await ddl(`CREATE ROLE phase13_test_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${secrets.app}'`);
    await ddl(`CREATE DATABASE ${db} OWNER phase13_test_migrator`);
    const owner = new PrismaClient({ datasourceUrl: url('phase13_test_migrator', secrets.migrator, db) });
    // Separate proof of PGDATA uses admin on same endpoint; non-admin migrator cannot SHOW it.
    try {
      await identity(admin, 'postgres', 'phase13_test_admin', 'public');
      const [i] = await owner.$queryRawUnsafe(`SELECT current_database() AS db, current_user AS role, inet_server_port() AS port, current_schema() AS schema`);
      if (i.db !== db || i.role !== 'phase13_test_migrator' || i.port !== 55433 || i.schema !== 'public') throw Error('BOOTSTRAP_OWNER_MISMATCH');
      await owner.$executeRawUnsafe(`CREATE SCHEMA ${schema} AUTHORIZATION phase13_test_migrator`);
    } finally { await owner.$disconnect(); }
    // Verify directory before role settings DDL too.
    await ddl(`ALTER ROLE phase13_test_migrator IN DATABASE ${db} SET search_path TO ${schema}, pg_catalog`);
    await ddl(`ALTER ROLE phase13_test_app IN DATABASE ${db} SET search_path TO ${schema}, pg_catalog`);
    fs.writeFileSync(path.join(root, 'bootstrap-evidence.json'), JSON.stringify({ at: new Date().toISOString(), checks, clusterCreated: true, productionConnected: false }, null, 2));
    console.log(JSON.stringify({ clusterCreated: true, port: 55433, data: path.join(root, 'data'), database: db, schema, secretsPrinted: false }));
  } finally { await admin.$disconnect(); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'STOP', reason: error.message.startsWith('TEST_') || error.message.startsWith('EXPLICIT_') || error.message.startsWith('BOOTSTRAP_') ? error.message : 'BOOTSTRAP_FAILED_DETAILS_REDACTED', code: error.code })); process.exitCode = 1; });
