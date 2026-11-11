// Offline structural/lexical validation only. Does not execute SQL or open a socket.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build,qualify,roles,prerequisites}=require('./phase13-5b-prepare.cjs');
const {ledgers}=require('./phase13-5b-inventory.cjs');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'backend/prisma/proposals/production/20261022_irrigation_v1_v2');
const boot=fs.readFileSync(path.join(dir,'00-prerequisites.review.sql'),'utf8'),sql=fs.readFileSync(path.join(dir,'01-ledgers.review.sql'),'utf8');
const finalize=fs.readFileSync(path.join(dir,'02-finalize-dba.review.sql'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
function uncomment(s){return s.replace(/--[^\n]*/g,'');}
test('SQL review files are outside auto-applied Prisma migration directory',()=>{assert(!dir.includes(path.sep+'migrations'+path.sep));assert.equal(manifest.sqlExecuted,false);assert.equal(manifest.reviewOnly,true);});
test('SQL hashes and production schema unchanged match manifest',()=>{
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  assert.equal(hash(boot),manifest.files.find(f=>f.kind==='bootstrap').sha256);assert.equal(hash(sql),manifest.files.find(f=>f.kind==='migration').sha256);
  assert.equal(hash(finalize),manifest.files.find(f=>f.kind==='finalize').sha256);
  assert.equal(hash(fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'))),manifest.productionSchemaSha256);
});
test('qualified six tables and six new enums, no legacy tables created',()=>{
  assert.deepEqual([...sql.matchAll(/CREATE TABLE public\."([^"]+)"/g)].map(m=>m[1]).sort(),[...ledgers].sort());
  assert.equal([...sql.matchAll(/CREATE TYPE public\./g)].length,6);
  assert(!/CREATE TABLE (?!public\.)/.test(uncomment(sql)));
});
test('every FK/ALTER/ON table reference is public qualified',()=>{
  assert(!/\b(?:REFERENCES|ALTER TABLE|ON) (?:"|irrigation_|phase13_)/.test(uncomment(sql)));
  for(const t of ledgers)assert(sql.includes('public.'+t)||sql.includes('public."'+t+'"'));
  assert(!/"(?:mode|phase|status|source|outcome|reported_state)" "(?:Irrigation\w+|ActuatorState)"/.test(sql));
});
test('no test target, destructive statements, legacy DML, dispatch or trigger disabling',()=>{
  for(const text of [boot,sql,finalize]){
    assert(!/55433|phase13_test_|DATABASE_URL/.test(text));
    assert(!/(?:^|\n)\s*(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/i.test(uncomment(text)));
    assert(!/DISABLE TRIGGER|session_replication_role|CREATE EXTENSION|SECURITY DEFINER|ON CONFLICT/i.test(text));
  }
});
test('explicit identity, approval, migration and drift gates exist before DDL',()=>{
  for(const s of [boot,sql])for(const gate of ['migration_approval','smart_agriculture','5432','127.0.0.1/32','7472695863566132416','PRISMA_BASELINE_DRIFT','LEGACY_COLUMN_DRIFT','LEGACY_CONSTRAINT_DRIFT','LEDGER_OBJECT_CONFLICT_STOP_NO_IF_NOT_EXISTS'])assert(s.includes(gate),gate);
  assert(sql.indexOf('$guard$;')<sql.indexOf('CREATE TYPE'));
  assert(boot.includes('PGDATA_MISMATCH'));assert(!/CREATE\s+(?:TABLE|TYPE|(?:UNIQUE\s+)?INDEX)\s+IF NOT EXISTS/i.test(uncomment(sql)));
});
test('transaction and bounded locks cover all changes; no default rollback pretending commit',()=>{
  for(const s of [boot,sql,finalize]){assert.equal((s.match(/^BEGIN;/gm)||[]).length,1);assert.equal((s.match(/^COMMIT;/gm)||[]).length,1);assert(s.includes("lock_timeout='3s'"));assert(s.trim().endsWith('COMMIT;'));}
});
test('DBA owns prerequisite indexes, migrator only checks them',()=>{
  for(const [name,table]of prerequisites){assert(boot.includes('CREATE UNIQUE INDEX "'+name+'" ON public."'+table+'"'));assert(!sql.includes('CREATE UNIQUE INDEX "'+name+'"'));assert(sql.includes('PREREQUISITE_INDEX_MISMATCH_'+name));}
  assert(sql.includes('i.indisunique AND i.indisvalid AND i.indisready'));assert(sql.includes('WITH ORDINALITY'));
});
test('all 14 FK mappings retain RESTRICT both ways',()=>{
  const fks=[...sql.matchAll(/FOREIGN KEY[^;]+;/g)].map(m=>m[0]);assert.equal(fks.length,14);
  for(const fk of fks)assert(fk.endsWith('ON DELETE RESTRICT ON UPDATE RESTRICT;'));
});
test('idempotency, open cycle/intent, budget and expiry constraints preserved',()=>{
  for(const s of ['irrigation_one_open_cycle','irrigation_one_open_intent','mode_idempotency_key_key','evaluation_key_key','cycle_id_pulse_index_key','correlation_id_key','irrigation_budget_bounds','irrigation_intent_bounds','irrigation_shadow_one_second',"interval '30 seconds'",'irrigation_v2_settlement','irrigation_v2_dispatch_order'])assert(sql.includes(s),s);
});
test('audit row and statement guards remain enabled; app append/read only',()=>{
  for(const s of ['BEFORE UPDATE OR DELETE','FOR EACH ROW','BEFORE TRUNCATE','FOR EACH STATEMENT','IRRIGATION_AUDIT_APPEND_ONLY','REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER','GRANT SELECT,INSERT ON public.irrigation_decision_logs'])assert(sql.includes(s),s);
  assert(!/GRANT[^;]*(?:UPDATE|DELETE|TRUNCATE)[^;]*ON public.irrigation_decision_logs/.test(sql));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.irrigation_v2_deny_audit_mutation() FROM PUBLIC,'+roles.app));
});
test('defaults fail closed, latches and clock high water remain durable',()=>{
  for(const s of ['"fault_latched" BOOLEAN NOT NULL DEFAULT true','"emergency_stop" BOOLEAN NOT NULL DEFAULT true',"NOT NULL DEFAULT 'UNKNOWN'",'"manual_override_until"','"last_accepted_server_time"','"budget_day_high_water"'])assert(sql.includes(s),s);
});
test('deployment fences forbid ACTIVE and unverified LIVE source in every ledger',()=>{
  assert.equal((sql.match(/_shadow_fence CHECK \(mode IN \('DISABLED','SHADOW'\)\)/g)||[]).length,6);
  assert(sql.includes("CHECK (source IN ('FIXTURE','MOCK'))"));
});
test('roles separated, no passwords, app ownership or schema CREATE',()=>{
  assert.equal((boot.match(/NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS/g)||[]).length,2);
  assert(!/PASSWORD|GRANT .*migrator TO .*app|GRANT.*CREATE ON SCHEMA public TO sa_irrigation_app/i.test(boot));
  assert(sql.includes('UNSAFE_ROLE_TOPOLOGY'));assert(finalize.includes('REVOKE CREATE ON SCHEMA public FROM '+roles.migrator));
});
test('DBA, not grantee, grants legacy privileges and revokes temporary deployment grants',()=>{
  assert(boot.includes('GRANT USAGE ON TYPE public."ActuatorState" TO '+roles.app));
  assert(boot.includes('GRANT SELECT ON public.devices,public.actuators'));
  assert(!sql.includes('GRANT USAGE ON TYPE public."ActuatorState"'));
  assert(!sql.includes('GRANT SELECT ON public.devices'));
  assert(!sql.includes('REVOKE CREATE ON SCHEMA public'));
  assert(finalize.includes("current_user<>'postgres'"));assert(finalize.includes('FINALIZE_SIX_OWNED_LEDGERS_REQUIRED'));
  assert(finalize.includes('MIGRATOR_CREATE_STILL_GRANTED'));assert(finalize.includes('FINALIZE_UNSAFE_APP_PRIVILEGES'));
});
test('no production adapter imported by startup; isolated guards remain intact',()=>{
  const server=fs.readFileSync(path.join(root,'backend/src/server.ts'),'utf8');assert(!/phase13-5b|production-irrigation|postgres-test\.repository/.test(server));
  const repo=fs.readFileSync(path.join(root,'backend/src/services/irrigation-persistence/postgres-test.repository.ts'),'utf8');
  for(const gate of ['smart_agriculture_test_phase13_3b','55433','TEST_SQL_IDENTITY_MISMATCH_STOP','expectedServerStart'])assert(repo.includes(gate));
  const foundation=fs.readFileSync(path.join(root,'backend/src/services/irrigation-persistence/foundation.ts'),'utf8');assert(foundation.includes('ISOLATED_SHADOW_REPOSITORY_REQUIRED'));
});
for(const [name,mutate] of [
  ['migration mismatch',i=>i.migrationMatch=false],['existing ledger',i=>i.ledgersPresent=[{relname:ledgers[0]}]],
  ['wrong server',i=>i.identity.system_id='other'],['index collision',i=>i.relations.push({relname:'irrigation_index_collision'})],
  ['role collision',i=>i.roles.push({rolname:roles.app})],
])test('builder fails closed: '+name,()=>{
  const inv=JSON.parse(fs.readFileSync(path.join(root,'report/phase13-5b-production-inventory.json'),'utf8'));mutate(inv);
  assert.throws(()=>build(inv,'CREATE UNIQUE INDEX "irrigation_index_collision" ON "irrigation_cycles"("id");','ALTER TABLE phase13_test_phase13_3b.irrigation_cycles ADD CONSTRAINT c CHECK (version>=0);\nCOMMIT;'));
});
test('qualifier preserves index names and qualifies enum columns and referenced tables',()=>{
  const s=qualify('CREATE TABLE "irrigation_cycles" ("mode" "IrrigationPersistenceMode");\nCREATE UNIQUE INDEX "i" ON "irrigation_cycles"("id");\nALTER TABLE "irrigation_cycles" ADD FOREIGN KEY ("id") REFERENCES "devices"("id");');
  assert(s.includes('CREATE TABLE public."irrigation_cycles"'));assert(s.includes('"mode" public."IrrigationPersistenceMode"'));assert(s.includes('INDEX "i" ON public.'));assert(s.includes('REFERENCES public."devices"'));
});
test('legacy fingerprints normalize public-only deparser qualification under safe search_path',()=>{
  const {columnFingerprintSql,constraintFingerprintSql}=require('./phase13-5b-inventory.cjs');
  for(const q of [columnFingerprintSql,constraintFingerprintSql])assert(q.includes("pg_catalog.replace(")&&q.includes(",'public.','')"));
  assert(sql.includes(columnFingerprintSql));assert(sql.includes(constraintFingerprintSql));
  assert(sql.includes('SET LOCAL search_path=pg_catalog;'));
});
