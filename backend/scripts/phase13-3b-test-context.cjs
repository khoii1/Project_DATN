// Fixed approved endpoint; never loads .env or production DATABASE_URL.
const fs = require('node:fs');
const path = require('node:path');
const root = 'C:\\DATN\\test-instances\\phase13-3b';
const database = 'smart_agriculture_test_phase13_3b', schema = 'phase13_test_phase13_3b';
const normalize = value => path.resolve(value).replaceAll('\\', '/').toLowerCase();
function credentials() { return JSON.parse(fs.readFileSync(path.join(root, 'credentials.json'), 'utf8')); }
function testUrl(kind, namespace = schema, db = database) {
  if (!['admin', 'migrator', 'app'].includes(kind) || ![database, 'postgres'].includes(db) || ![schema, 'public'].includes(namespace)) throw Error('UNAPPROVED_TEST_CONTEXT');
  return `postgresql://phase13_test_${kind}:${credentials()[kind]}@127.0.0.1:55433/${db}?schema=${namespace}&connection_limit=2`;
}
async function verify(client, role, db = database, namespace = schema, admin) {
  if (admin) {
    const [proof] = await admin.$queryRawUnsafe("SELECT current_setting('data_directory') AS data, inet_server_port() AS port, current_database() AS db, current_user AS role");
    if (normalize(proof.data) !== normalize(path.join(root, 'data')) || proof.port !== 55433 || proof.db !== 'postgres' || proof.role !== 'phase13_test_admin') throw Error('PGDATA_IDENTITY_MISMATCH');
  }
  const [i] = await client.$queryRawUnsafe("SELECT current_database() AS db, current_user AS role, inet_server_addr()::text AS host, inet_server_port() AS port, current_schema() AS schema, pg_postmaster_start_time()::text AS started");
  if (i.db !== db || i.role !== role || i.host !== '127.0.0.1/32' || i.port !== 55433 || i.schema !== namespace) throw Error('SQL_TEST_IDENTITY_MISMATCH');
  return i;
}
module.exports = { root, database, schema, testUrl, verify };
