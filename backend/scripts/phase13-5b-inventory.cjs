// Production SELECT-only catalog inventory. No authentication POST, DDL or gateway imports.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const legacy = ['devices','actuators','sensor_readings','device_commands','automation_rules'];
const ledgers = ['irrigation_cycles','irrigation_decision_logs','irrigation_daily_budgets','irrigation_budget_reservations','irrigation_command_intents','irrigation_safety_states'];
// Reused verbatim by the prospective migration guard; excludes new prerequisite indexes.
// Known public-only legacy objects: normalize optional public qualification emitted
// by PostgreSQL deparsers, so a pg_catalog-only migration search_path matches inventory.
const columnFingerprintSql = `SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || a.attname || ':' || pg_catalog.replace(pg_catalog.format_type(a.atttypid,a.atttypmod),'public.','') || ':' || a.attnotnull::text, '|' ORDER BY c.relname,a.attnum)) AS fingerprint
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules') AND a.attnum>0 AND NOT a.attisdropped`;
const constraintFingerprintSql = `SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || k.conname || ':' || pg_catalog.replace(pg_catalog.pg_get_constraintdef(k.oid),'public.','') || ':' || k.convalidated::text, '|' ORDER BY c.relname,k.conname)) AS fingerprint
FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules')`;
async function main() {
  const values = require('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')));
  const url = new URL(values.DATABASE_URL);
  if (!['localhost','127.0.0.1'].includes(url.hostname) || (url.port || '5432') !== '5432' || url.pathname !== '/smart_agriculture' || (url.searchParams.get('schema') || 'public') !== 'public') throw Error('READ_TARGET_REFUSED');
  // Force IPv4 without changing backend config or credentials.
  url.hostname='127.0.0.1';
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient({ datasourceUrl:url.toString() });
  let snapshot;
  try {
    snapshot = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [identity] = await tx.$queryRawUnsafe(`SELECT current_database() AS database,current_schema() AS schema,current_user AS role,inet_server_addr()::text AS host,inet_server_port() AS port,
        current_setting('transaction_read_only') AS read_only,current_setting('server_version') AS version,current_setting('data_directory') AS pgdata,
        pg_postmaster_start_time()::text AS started,(SELECT system_identifier::text FROM pg_control_system()) AS system_id`);
      if(identity.database!=='smart_agriculture'||identity.schema!=='public'||identity.port!==5432||identity.host!=='127.0.0.1/32'||identity.system_id!=='7472695863566132416'||identity.pgdata.replace(/\\/g,'/').toLowerCase()!=='c:/program files/postgresql/17/data'||identity.read_only!=='on') throw Error('PRODUCTION_IDENTITY_MISMATCH');
      const migrations = await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
      const local = fs.readdirSync(path.join(root,'backend/prisma/migrations'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>({name:e.name, checksum:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'backend/prisma/migrations',e.name,'migration.sql'))).digest('hex')}));
      const migrationMatch = migrations.length===local.length && local.every(f=>migrations.some(m=>m.migration_name===f.name&&m.checksum===f.checksum&&m.finished_at&&!m.rolled_back_at));
      const relations = await tx.$queryRawUnsafe(`SELECT c.relname,c.relkind,r.rolname AS owner,c.relacl::text AS acl FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' ORDER BY c.relname`);
      const columns = await tx.$queryRawUnsafe(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('devices','actuators','sensor_readings','device_commands','automation_rules') ORDER BY table_name,ordinal_position`);
      const constraints = await tx.$queryRawUnsafe(`SELECT c.relname AS table_name,k.conname,k.contype,k.convalidated,pg_catalog.pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname`);
      const indexes = await tx.$queryRawUnsafe(`SELECT t.relname AS table_name,c.relname AS name,i.indisunique,i.indisvalid,pg_catalog.pg_get_indexdef(i.indexrelid) AS definition FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid JOIN pg_catalog.pg_class t ON t.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY c.relname`);
      const enums = await tx.$queryRawUnsafe(`SELECT t.typname,array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS labels FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`);
      const functions = await tx.$queryRawUnsafe(`SELECT p.proname FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname`);
      const roles = await tx.$queryRawUnsafe('SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_catalog.pg_roles ORDER BY rolname');
      const memberships = await tx.$queryRawUnsafe('SELECT r.rolname AS role,m.rolname AS member,a.admin_option FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r ON r.oid=a.roleid JOIN pg_catalog.pg_roles m ON m.oid=a.member ORDER BY r.rolname,m.rolname');
      const schemaPrivileges = await tx.$queryRawUnsafe(`SELECT n.nspname,r.rolname AS owner,n.nspacl::text AS acl,has_schema_privilege(current_user,n.oid,'CREATE') AS current_can_create FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner WHERE n.nspname='public'`);
      const fingerprint = (await tx.$queryRawUnsafe(columnFingerprintSql))[0].fingerprint;
      const constraintFingerprint = (await tx.$queryRawUnsafe(constraintFingerprintSql))[0].fingerprint;
      const counts = { pending:await tx.deviceCommand.count({where:{status:'PENDING'}}),commands:await tx.deviceCommand.count(),automationRules:await tx.automationRule.count() };
      const capacity = process.argv.includes('--phase13-5c') ? {
        database:(await tx.$queryRawUnsafe("SELECT pg_database_size(current_database())::text AS bytes,pg_size_pretty(pg_database_size(current_database())) AS pretty,pg_is_in_recovery() AS in_recovery"))[0],
        largestTables:await tx.$queryRawUnsafe("SELECT relname,pg_total_relation_size(relid)::text AS bytes,n_live_tup::text AS estimated_rows FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(relid) DESC LIMIT 10"),
        recoverySettings:await tx.$queryRawUnsafe("SELECT name,setting FROM pg_settings WHERE name IN ('archive_mode','wal_level','full_page_writes','max_wal_senders') ORDER BY name")
      } : undefined;
      const device = await tx.device.findUnique({where:{deviceCode:'ESP32-GF-A-01'},select:{connectionStatus:true,lastSeenAt:true,actuators:{where:{actuatorCode:'PUMP_01'},select:{currentState:true,lastStateChangedAt:true}},sensors:{select:{sensorCode:true,readings:{where:{source:'MQTT'},orderBy:{recordedAt:'desc'},take:1,select:{value:true,recordedAt:true,receivedAt:true}}}}}});
      return { identity,migrations,local,migrationMatch,relations,columns,constraints,indexes,enums,functions,roles,memberships,schemaPrivileges,fingerprint,constraintFingerprint,counts,capacity,device,
        ledgersPresent:relations.filter(r=>ledgers.includes(r.relname)),legacyTables:legacy };
    },{timeout:20000});
  } finally {await db.$disconnect();}
  let health; try {health=await (await fetch('http://127.0.0.1:5000/api/health',{signal:AbortSignal.timeout(5000)})).json();} catch {health={status:'BACKEND_UNAVAILABLE_NOT_RESTARTED'};}
  const log = path.join(root,'build/phase13-5a3-controlled-20261022-01.stdout.log');
  const attestation=fs.existsSync(log)?fs.readFileSync(log,'utf8').match(/MQTT pump safety runtime:\s*(\{[^\r\n]+\})/):null;
  const evidence={checkedAt:new Date().toISOString(),...snapshot,health,startupAttestation:attestation?JSON.parse(attestation[1]):null,
    ddlExecuted:false,authenticationWrites:false,flagsCaveat:'Startup log only; PID must match current listener. No protected API login performed.'};
  const prefix=process.argv.includes('--phase13-5c4')?'phase13-5c4':process.argv.includes('--phase13-5c3')?'phase13-5c3':process.argv.includes('--phase13-5c1')?'phase13-5c1':process.argv.includes('--phase13-5c')?'phase13-5c':process.argv.includes('--phase13-5b1')?'phase13-5b1':'phase13-5b';
  const dest=path.join(root,'report/'+prefix+'-production-inventory'+(process.argv.includes('--after')?'-after':'')+'.json');
  fs.writeFileSync(dest,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({evidence:dest,identity:evidence.identity,migrationMatch:evidence.migrationMatch,migrations:evidence.migrations.length,ledgersPresent:evidence.ledgersPresent.length,counts:evidence.counts,device:evidence.device.connectionStatus,health:evidence.health,startupAttestation:evidence.startupAttestation}));
}
module.exports={columnFingerprintSql,constraintFingerprintSql,ledgers};
if(require.main===module)main().catch(()=>{console.error('INVENTORY_FAILED_REDACTED_NO_MUTATION');process.exitCode=1;});
