// File/datamodel-only builder. NEVER connects to PostgreSQL or executes generated SQL.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync}=require('node:child_process');
const {columnFingerprintSql,constraintFingerprintSql,ledgers}=require('./phase13-5b-inventory.cjs');
const root=path.resolve(__dirname,'../..');
const version='20261022_irrigation_v1_v2';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const quote=s=>"'"+s.replace(/'/g,"''")+"'";
const roles={migrator:'sa_irrigation_migrator',app:'sa_irrigation_app'};
const prerequisites=[
  ['actuators_id_device_id_key','actuators',['id','device_id']],
  ['device_commands_id_actuator_id_key','device_commands',['id','actuator_id']],
  ['automation_rules_id_actuator_id_key','automation_rules',['id','actuator_id']],
];
function guard(inventory,who){
  const migrationRows=inventory.migrations.map(m=>`(${quote(m.migration_name)},${quote(m.checksum)})`).join(',\n');
  return `DO $guard$
DECLARE actual_fingerprint text;
BEGIN
  IF current_setting('smart_agriculture.migration_approval',true) IS DISTINCT FROM '${version}'
    OR current_database() <> 'smart_agriculture' OR current_schema() <> 'pg_catalog' OR to_regnamespace('public') IS NULL
    OR inet_server_port() IS DISTINCT FROM 5432 OR inet_server_addr()::text IS DISTINCT FROM '127.0.0.1/32'
    OR current_user <> '${who}'
    OR (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) <> '${inventory.identity.system_id}' THEN
    RAISE EXCEPTION 'PRODUCTION_MIGRATION_TARGET_OR_APPROVAL_MISMATCH';
  END IF;
  SELECT fingerprint INTO actual_fingerprint FROM (${columnFingerprintSql}) AS expected_columns;
  IF actual_fingerprint IS DISTINCT FROM '${inventory.fingerprint}' THEN RAISE EXCEPTION 'LEGACY_COLUMN_DRIFT'; END IF;
  SELECT fingerprint INTO actual_fingerprint FROM (${constraintFingerprintSql}) AS expected_constraints;
  IF actual_fingerprint IS DISTINCT FROM '${inventory.constraintFingerprint}' THEN RAISE EXCEPTION 'LEGACY_CONSTRAINT_DRIFT'; END IF;
  IF (SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)::text FROM pg_catalog.pg_enum e
    WHERE e.enumtypid=to_regtype('public."ActuatorState"')) IS DISTINCT FROM ${quote(inventory.enums.find(e=>e.typname==='ActuatorState').labels)} THEN
    RAISE EXCEPTION 'ACTUATOR_STATE_ENUM_DRIFT';
  END IF;
  IF EXISTS(SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL)
    OR (SELECT count(*) FROM public._prisma_migrations) <> ${inventory.migrations.length}
    OR EXISTS(SELECT 1 FROM (VALUES ${migrationRows}) AS e(name,checksum)
      LEFT JOIN public._prisma_migrations m ON m.migration_name=e.name AND m.checksum=e.checksum WHERE m.id IS NULL) THEN
    RAISE EXCEPTION 'PRISMA_BASELINE_DRIFT';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN (${ledgers.map(quote).join(',')}))
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' AND t.typname LIKE 'Irrigation%')
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='irrigation_v2_deny_audit_mutation') THEN
    RAISE EXCEPTION 'LEDGER_OBJECT_CONFLICT_STOP_NO_IF_NOT_EXISTS';
  END IF;
END
$guard$;
`;
}
function qualify(sql){
  // Input is generated from the validated datamodel and all identifiers are known.
  sql=sql.replace(/\b(CREATE TYPE|CREATE TABLE|ALTER TABLE|REFERENCES|ON) "([A-Za-z_][A-Za-z0-9_]*)"/g,'$1 public."$2"');
  sql=sql.replace(/("[a-z_]+"\s+)"(Irrigation[A-Za-z]+|ActuatorState)"/g,'$1public."$2"');
  return sql.replace(/\b(ALTER TABLE|ON) (irrigation_[a-z_]+)/g,'$1 public.$2');
}
function build(inventory,baseSql,v2){
  if(!inventory.migrationMatch||inventory.ledgersPresent.length||inventory.identity.system_id!=='7472695863566132416')throw Error('INVENTORY_NOT_READY');
  const generatedNames=[...baseSql.matchAll(/CREATE (?:UNIQUE )?INDEX (?:"([^"]+)"|([a-z_]+))/g)].map(m=>m[1]||m[2]);
  if(generatedNames.some(n=>inventory.relations.some(r=>r.relname===n)))throw Error('INDEX_NAME_CONFLICT');
  if(inventory.roles.some(r=>Object.values(roles).includes(r.rolname)))throw Error('ROLE_ALREADY_EXISTS_REVIEW_REQUIRED');
  const banner=`-- REVIEW ARTIFACT ONLY ${version}. NOT in prisma/migrations. NOT applied.
-- Separate explicit production approval, verified backup/restore and maintenance window REQUIRED.
-- Execute only using psql ON_ERROR_STOP; never through backend startup. No secrets here.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=pg_catalog;
`;
  // All application objects explicitly use public; pg_catalog-only prevents shadowed functions.
  const preamble=banner;
  const indexes=prerequisites.map(([name,table,cols])=>`CREATE UNIQUE INDEX "${name}" ON public."${table}"(${cols.map(c=>'"'+c+'"').join(', ')});`).join('\n');
  const bootstrap=preamble+guard(inventory,'postgres')+`
DO $roles$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('${roles.migrator}','${roles.app}')) THEN RAISE EXCEPTION 'ROLE_CONFLICT_STOP'; END IF;
  IF current_setting('data_directory') <> ${quote(inventory.identity.pgdata)} THEN RAISE EXCEPTION 'PGDATA_MISMATCH'; END IF;
END $roles$;
CREATE ROLE ${roles.migrator} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ${roles.app} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE smart_agriculture TO ${roles.migrator},${roles.app};
GRANT USAGE,CREATE ON SCHEMA public TO ${roles.migrator};
GRANT USAGE ON SCHEMA public TO ${roles.app};
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO ${roles.migrator};
GRANT SELECT ON public._prisma_migrations TO ${roles.migrator};
${prerequisites.map(([,t,cols])=>`GRANT REFERENCES (${cols.join(',')}) ON public.${t} TO ${roles.migrator};`).join('\n')}
GRANT REFERENCES (id) ON public.devices,public.actuators,public.sensor_readings TO ${roles.migrator};
GRANT USAGE ON TYPE public."ActuatorState" TO ${roles.app};
GRANT SELECT ON public.devices,public.actuators,public.sensor_readings,public.device_commands,public.automation_rules TO ${roles.app};
${indexes}
COMMIT;
`;
  // Legacy indexes are DBA-owned prerequisites, never silently removed or rewritten.
  let ledger=baseSql.replace(/CREATE UNIQUE INDEX "(?:actuators_id_device_id_key|device_commands_id_actuator_id_key|automation_rules_id_actuator_id_key)"[^;]+;/g,'');
  ledger=qualify(ledger);
  const hardening=qualify(v2.slice(v2.indexOf('ALTER TABLE '),v2.lastIndexOf('COMMIT;')).replace(/phase13_test_phase13_3b\./g,'public.').replace(/phase13_test_app/g,roles.app));
  const prerequisiteGuard=`DO $prerequisites$ BEGIN
${prerequisites.map(([name,t,cols])=>`  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_index i WHERE i.indexrelid=to_regclass('public.${name}') AND i.indrelid='public.${t}'::regclass AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnatts=${cols.length}
    AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum)=ARRAY[${cols.map(quote).join(',')}]::text[])
    THEN RAISE EXCEPTION 'PREREQUISITE_INDEX_MISMATCH_${name}'; END IF;`).join('\n')}
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='${roles.migrator}' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolcanlogin))
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='${roles.app}' AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolcanlogin)
    OR pg_has_role('${roles.app}','${roles.migrator}','MEMBER') THEN RAISE EXCEPTION 'UNSAFE_ROLE_TOPOLOGY'; END IF;
END $prerequisites$;
`;
  const fences=ledgers.map(t=>`ALTER TABLE public.${t} ADD CONSTRAINT ${t.replace('irrigation_','irr_')}_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));`).join('\n')+`
ALTER TABLE public.irrigation_decision_logs ADD CONSTRAINT irrigation_unverified_source_fence CHECK (source IN ('FIXTURE','MOCK'));
`;
  const grants=ledgers.map(t=>`REVOKE ALL ON public.${t} FROM PUBLIC;
GRANT SELECT,INSERT${t==='irrigation_decision_logs'?'':',UPDATE'} ON public.${t} TO ${roles.app};`).join('\n')+`
REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.irrigation_decision_logs FROM ${roles.app};
REVOKE ALL ON FUNCTION public.irrigation_v2_deny_audit_mutation() FROM PUBLIC,${roles.app};
${[...baseSql.matchAll(/CREATE TYPE "([^"]+)"/g)].map(m=>`REVOKE ALL ON TYPE public."${m[1]}" FROM PUBLIC;\nGRANT USAGE ON TYPE public."${m[1]}" TO ${roles.app};`).join('\n')}
COMMIT;
`;
  // Only the DBA/grantor can reliably revoke temporary privileges on DBA-owned objects.
  // A grantee's self-REVOKE without grant option can merely warn and leave grants intact.
  const finalize=preamble+`DO $finalize$ BEGIN
  IF current_setting('smart_agriculture.migration_approval',true) IS DISTINCT FROM '${version}'
    OR current_database()<>'smart_agriculture' OR inet_server_port() IS DISTINCT FROM 5432
    OR inet_server_addr()::text IS DISTINCT FROM '127.0.0.1/32' OR current_user<>'postgres'
    OR (SELECT system_identifier::text FROM pg_catalog.pg_control_system())<>'${inventory.identity.system_id}' THEN
    RAISE EXCEPTION 'FINALIZE_IDENTITY_OR_APPROVAL_MISMATCH'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind='r'
    AND r.rolname='${roles.migrator}' AND c.relname IN (${ledgers.map(quote).join(',')}))<>6 THEN
    RAISE EXCEPTION 'FINALIZE_SIX_OWNED_LEDGERS_REQUIRED'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid='public.irrigation_decision_logs'::regclass
    AND tgname IN ('irrigation_v2_append_only','irrigation_v2_no_truncate') AND tgenabled='O')<>2 THEN
    RAISE EXCEPTION 'FINALIZE_AUDIT_TRIGGERS_REQUIRED'; END IF;
  IF has_table_privilege('${roles.app}','public.irrigation_decision_logs','UPDATE')
    OR has_table_privilege('${roles.app}','public.irrigation_decision_logs','DELETE')
    OR has_table_privilege('${roles.app}','public.irrigation_decision_logs','TRUNCATE')
    OR has_schema_privilege('${roles.app}','public','CREATE') THEN RAISE EXCEPTION 'FINALIZE_UNSAFE_APP_PRIVILEGES'; END IF;
END $finalize$;
REVOKE CREATE ON SCHEMA public FROM ${roles.migrator};
REVOKE EXECUTE ON FUNCTION pg_catalog.pg_control_system() FROM ${roles.migrator};
REVOKE SELECT ON public._prisma_migrations FROM ${roles.migrator};
${prerequisites.map(([,t,cols])=>`REVOKE REFERENCES (${cols.join(',')}) ON public.${t} FROM ${roles.migrator};`).join('\n')}
REVOKE REFERENCES (id) ON public.devices,public.actuators,public.sensor_readings FROM ${roles.migrator};
DO $verify$ BEGIN
  IF has_schema_privilege('${roles.migrator}','public','CREATE') THEN RAISE EXCEPTION 'MIGRATOR_CREATE_STILL_GRANTED'; END IF;
END $verify$;
COMMIT;
`;
  return {bootstrap,migration:preamble+guard(inventory,roles.migrator)+prerequisiteGuard+ledger+'\n'+hardening+'\n'+fences+'\n'+grants,finalize};
}
function main(){
  const inventory=JSON.parse(fs.readFileSync(path.join(root,'report/phase13-5b-production-inventory.json'),'utf8'));
  const original=fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'),'utf8');
  let composed=original;
  const extensions={Actuator:'persistenceCycles IrrigationCycle[]\n persistenceDecisions IrrigationDecisionLog[]\n persistenceBudgets IrrigationDailyBudget[]\n persistenceSafety IrrigationSafetyState[]\n @@unique([id, deviceId])',Device:'persistenceCycles IrrigationCycle[]',AutomationRule:'persistenceCycles IrrigationCycle[]\n @@unique([id, actuatorId])',SensorReading:'persistenceDecisions IrrigationDecisionLog[]',DeviceCommand:'persistenceIntent CommandIntent?\n @@unique([id, actuatorId])'};
  for(const [model,fields] of Object.entries(extensions))composed=composed.replace(new RegExp('(model '+model+' \\{[\\s\\S]*?)(\\r?\\n\\})'),'$1\n '+fields+'$2');
  composed+='\n'+fs.readFileSync(path.join(root,'backend/prisma/proposals/irrigation-persistence.prisma'),'utf8');
  const dir=path.join(root,'build/phase13-5b-schema');fs.mkdirSync(dir,{recursive:true});
  const schema=path.join(dir,'schema.prisma');fs.writeFileSync(schema,composed);
  const env={...process.env,DATABASE_URL:'postgresql://offline:NOT_A_CREDENTIAL@127.0.0.1:1/offline_schema_only',PRISMA_GENERATE_SKIP_AUTOINSTALL:'1'};
  function prisma(args){const r=spawnSync(process.execPath,[path.join(root,'backend/node_modules/prisma/build/index.js'),...args],{cwd:dir,env,encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error('OFFLINE_PRISMA_VALIDATION_FAILED');return r.stdout;}
  prisma(['validate','--schema',schema]);
  const diff=prisma(['migrate','diff','--from-schema-datamodel',path.join(root,'backend/prisma/schema.prisma'),'--to-schema-datamodel',schema,'--script']);
  if(/(?:^|\n)\s*(?:DROP|TRUNCATE|DELETE|UPDATE)\b/i.test(diff))throw Error('UNEXPECTED_DESTRUCTIVE_DIFF');
  const baseSql=diff+'\n'+fs.readFileSync(path.join(root,'backend/prisma/proposals/irrigation-constraints.sql'),'utf8');
  const v2=fs.readFileSync(path.join(root,'backend/prisma/proposals/irrigation-v2-isolated-apply.sql'),'utf8');
  const files=build(inventory,baseSql,v2),out=path.join(root,'backend/prisma/proposals/production',version);fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'00-prerequisites.review.sql'),files.bootstrap);
  fs.writeFileSync(path.join(out,'01-ledgers.review.sql'),files.migration);
  fs.writeFileSync(path.join(out,'02-finalize-dba.review.sql'),files.finalize);
  const all=files.bootstrap+files.migration+files.finalize;
  if(all.includes('55433')||all.includes('phase13_test_'))throw Error('TEST_TARGET_LEAK');
  if(sha(original)!==sha(fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'),'utf8')))throw Error('PRODUCTION_SCHEMA_CHANGED');
  const manifest={version,generatedAt:new Date().toISOString(),reviewOnly:true,sqlExecuted:false,datamodelValidation:'PASS',productionSchemaSha256:sha(original),inventorySha256:sha(fs.readFileSync(path.join(root,'report/phase13-5b-production-inventory.json'))),v2Sha256:sha(v2),files:Object.entries(files).map(([kind,sql])=>({kind,sha256:sha(sql)})),tables:ledgers,requiresSeparateApproval:true,sqlExecutionOnIsolatedTarget:'NOT_VERIFIED_FOR_THIS_ARTIFACT'};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
}
module.exports={build,qualify,guard,roles,prerequisites};
if(require.main===module)try{main();}catch(e){console.error(/^[A-Z_]+$/.test(e.message)?e.message:'PREPARATION_FAILED_REDACTED');process.exitCode=1;}
