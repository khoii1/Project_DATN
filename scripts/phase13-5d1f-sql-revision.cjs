'use strict';
// Controlled candidate revision. D.1E SQL bytes are unchanged; this module never executes SQL.
const { QUERIES } = require('./phase13-5d1e-readonly-sql.cjs');
const relations = Object.freeze(['_prisma_migrations','devices','actuators','sensor_readings','device_commands','automation_rules']);
function selectBody(text) {
  const at = text.indexOf('SELECT pg_catalog.json_build_object(');
  if (at < 0 || !text.endsWith('COMMIT;\n')) throw Error('PINNED_SQL_STRUCTURE_CHANGED');
  return text.slice(at,-'COMMIT;\n'.length).trim().replace(/;$/,'');
}
const catalog = selectBody(QUERIES.catalog), baseline = selectBody(QUERIES.baseline);
const frame = `SELECT pg_catalog.json_build_object(
 'backendPid',pg_catalog.pg_backend_pid(),
 'snapshot',pg_catalog.pg_current_snapshot()::text,
 'isolation',pg_catalog.current_setting('transaction_isolation'),
 'readOnly',pg_catalog.current_setting('transaction_read_only'),
 'protectedRelations',(SELECT pg_catalog.count(DISTINCT c.oid)::integer
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_locks l ON l.relation=c.oid AND l.database=(SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database())
 WHERE n.nspname='public' AND c.relname IN ('_prisma_migrations','devices','actuators','sensor_readings','device_commands','automation_rules')
 AND l.pid=pg_catalog.pg_backend_pid() AND l.granted AND l.mode='AccessShareLock')
) AS transaction_frame`;
// \\gset stores only a computed boolean, never untrusted SQL/string fragments. No shell meta-commands.
const gate = `WITH checked AS (${catalog})
SELECT COALESCE(
 (evidence->>'database')='smart_agriculture' AND (evidence->>'address')='127.0.0.1' AND (evidence->>'port')='5432'
 AND (evidence->>'systemId')='7472695863566132416' AND (evidence->>'inRecovery')='false'
 AND (evidence->>'readOnly')='on' AND (evidence->>'schema')='public' AND (evidence->>'databaseOwner')='postgres'
 AND (evidence->>'schemaOwner') IN ('postgres','pg_database_owner')
 AND (evidence->>'pgdata')='C:/Program Files/PostgreSQL/17/data'
 AND (evidence->>'serverVersion')::integer BETWEEN 170000 AND 179999
 AND (evidence->>'columnFingerprint')='390c65cfe11f3b8695a6bc5ff21d94d4'
 AND (evidence->>'constraintFingerprint')='2e5981464ef4017e1ad5a6854ba17cc2'
 AND (evidence->>'conflicts')='0' AND pg_catalog.json_array_length(evidence->'commandColumns')=5
 AND pg_catalog.json_array_length(evidence->'relations')=6
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.json_array_elements(evidence->'relations') r
 WHERE r->>'kind'<>'r' OR r->>'rls'<>'false' OR r->>'forceRls'<>'false'),false) AS d1f_catalog_ok FROM checked
\\gset
\\if :d1f_catalog_ok
`;
const guard = gate;
const locks = relations.map(name => `SELECT 1 FROM public.${name} LIMIT 0;`).join('\n');
const SQL = `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '3000ms';
SET LOCAL lock_timeout = '500ms';
SET LOCAL idle_in_transaction_session_timeout = '5000ms';
${frame};
${guard}${catalog};
${locks}
${guard}${catalog};
${baseline};
${guard}${catalog};
${frame};
COMMIT;
\\else
\\quit 3
\\endif
\\else
\\quit 3
\\endif
\\else
\\quit 3
\\endif
`;
module.exports = Object.freeze({ revision: '13.5D.1F-R1', SQL, relations });
