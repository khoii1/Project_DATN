'use strict';
// Inspection specifications only. No SQL driver, filesystem access or execution capability.
const prefix = `BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '3000ms';
SET LOCAL lock_timeout = '500ms';
SET LOCAL idle_in_transaction_session_timeout = '5000ms';
`;
const CATALOG_SQL = prefix + `SELECT pg_catalog.json_build_object(
 'database', pg_catalog.current_database(),
 'principal', current_user,
 'inRecovery', pg_catalog.pg_is_in_recovery(),
 'serverVersion', pg_catalog.current_setting('server_version_num')::integer,
 'address', pg_catalog.host(pg_catalog.inet_server_addr()),
 'port', pg_catalog.inet_server_port(),
 'systemId', (SELECT system_identifier::text FROM pg_catalog.pg_control_system()),
 'pgdata', pg_catalog.current_setting('data_directory'),
 'serverStartedAt', pg_catalog.pg_postmaster_start_time(),
 'readOnly', pg_catalog.current_setting('transaction_read_only'),
 'databaseOwner', (SELECT r.rolname FROM pg_catalog.pg_database d JOIN pg_catalog.pg_roles r ON r.oid=d.datdba WHERE d.datname=pg_catalog.current_database()),
 'schema', (SELECT n.nspname FROM pg_catalog.pg_namespace n WHERE n.nspname='public'),
 'schemaOwner', (SELECT r.rolname FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner WHERE n.nspname='public'),
 'relations', (SELECT pg_catalog.json_agg(pg_catalog.json_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity) ORDER BY c.relname)
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('_prisma_migrations','devices','actuators','sensor_readings','device_commands','automation_rules')),
 'columnFingerprint', (SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || a.attname || ':' || pg_catalog.replace(pg_catalog.format_type(a.atttypid,a.atttypmod),'public.','') || ':' || a.attnotnull::text, '|' ORDER BY c.relname,a.attnum))
   FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules') AND a.attnum>0 AND NOT a.attisdropped),
 'constraintFingerprint', (SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || k.conname || ':' || pg_catalog.replace(pg_catalog.pg_get_constraintdef(k.oid),'public.','') || ':' || k.convalidated::text, '|' ORDER BY c.relname,k.conname))
   FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules')),
 'commandColumns', (SELECT pg_catalog.json_agg(a.attname ORDER BY a.attname) FROM pg_catalog.pg_attribute a
   JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='device_commands' AND a.attnum>0 AND NOT a.attisdropped
   AND a.attname IN ('transport','expires_at','max_run_seconds','acknowledged_at','correlation_id')),
 'conflicts', (SELECT pg_catalog.count(*)::integer FROM (
   SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'irrigation_%'
   UNION ALL SELECT t.oid FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND (t.typname LIKE 'Irrigation%' OR t.typname LIKE 'irrigation_%')
   UNION ALL SELECT p.oid FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'irrigation_%'
 ) conflicts)
) AS evidence;
COMMIT;
`;
// Stage two must only be considered after stage one's identity/catalog validation.
const BASELINE_SQL = prefix + `SELECT pg_catalog.json_build_object(
 'database', pg_catalog.current_database(),
 'principal', current_user,
 'inRecovery', pg_catalog.pg_is_in_recovery(),
 'address', pg_catalog.host(pg_catalog.inet_server_addr()),
 'port', pg_catalog.inet_server_port(),
 'systemId', (SELECT system_identifier::text FROM pg_catalog.pg_control_system()),
 'serverStartedAt', pg_catalog.pg_postmaster_start_time(),
 'readOnly', pg_catalog.current_setting('transaction_read_only'),
 'migrations', (SELECT pg_catalog.json_agg(pg_catalog.json_build_object('name',migration_name,'checksum',checksum,'finishedAt',finished_at,'rolledBackAt',rolled_back_at) ORDER BY migration_name) FROM public._prisma_migrations),
 'commands', (SELECT pg_catalog.json_build_object('total',pg_catalog.count(*)::text,'pending',pg_catalog.count(*) FILTER (WHERE status='PENDING')::text) FROM public.device_commands),
 'breakdown', (SELECT pg_catalog.json_agg(pg_catalog.json_build_object('status',s.status,'count',s.n) ORDER BY s.status) FROM (SELECT status::text AS status,pg_catalog.count(*)::text AS n FROM public.device_commands GROUP BY status) s),
 'actuators', (SELECT pg_catalog.json_agg(pg_catalog.json_build_object('deviceCode',d.device_code,'actuatorCode',a.actuator_code,'state',a.current_state,'stateAt',a.last_state_changed_at)) FROM public.actuators a JOIN public.devices d ON d.id=a.device_id WHERE d.device_code='ESP32-GF-A-01' AND a.actuator_code='PUMP_01')
) AS evidence;
COMMIT;
`;
const QUERIES = Object.freeze({ catalog: CATALOG_SQL, baseline: BASELINE_SQL });
function validateSql(stage, sql) {
  // Exact reviewed statement allowlist, NOT a general-purpose SQL safety parser.
  return Object.hasOwn(QUERIES, stage) && typeof sql === 'string' && sql === QUERIES[stage];
}
function planSql() {
  return Object.freeze({ mode: 'PLAN_ONLY', executionEnabled: false, maxAttempts: 1, autoRetry: false,
    nativeDeadlineMs: 8000, maxOutputBytes: 1048576, searchPath: 'pg_catalog',
    connection: Object.freeze({ host: '127.0.0.1', port: 5432, database: 'smart_agriculture', schema: 'public', systemId: '7472695863566132416' }),
    stages: Object.freeze(['catalog','baseline']), queries: QUERIES });
}
module.exports = { QUERIES, validateSql, planSql };
