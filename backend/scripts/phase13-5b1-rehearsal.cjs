// Explicitly approved rehearsal ONLY. Fixed isolated instance; never reads .env/DATABASE_URL.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash,randomUUID,randomBytes}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const ctx=require('./phase13-3b-test-context.cjs');
const {columnFingerprintSql,constraintFingerprintSql,ledgers}=require('./phase13-5b-inventory.cjs');
const root=path.resolve(__dirname,'../..'),bin='C:\\Program Files\\PostgreSQL\\17\\bin',pgdata=path.join(ctx.root,'data');
const source=path.join(root,'backend/prisma/proposals/production/20261022_irrigation_v1_v2');
const runId=new Date().toISOString().replace(/\D/g,'').slice(0,14)+'_'+randomBytes(3).toString('hex');
const evidence={runId,startedAt:new Date().toISOString(),startedCluster:false,stoppedCluster:false,cases:[],environments:[],commandsIssued:0,productionMutation:false};
const dir=path.join(ctx.root,'rehearsal-13-5b1-'+runId),report=path.join(root,'report/phase13-5b1-run-'+runId+'.json');
const norm=s=>path.resolve(s).replaceAll('\\','/').toLowerCase(),quote=s=>"'"+String(s).replaceAll("'","''")+"'",sha=s=>createHash('sha256').update(s).digest('hex');
const testCredentials=()=>JSON.parse(fs.readFileSync(path.join(ctx.root,'credentials.json'),'utf8'));
let admin,startedAt;
const clients=[];
function save(){fs.writeFileSync(report,JSON.stringify(evidence,null,2));}
function control(){const r=spawnSync(path.join(bin,'pg_controldata.exe'),[pgdata],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);return {systemId:r.stdout.match(/Database system identifier:\s*(\d+)/)?.[1],state:r.stdout.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim()};}
const listening=()=>new Promise(r=>{const s=net.connect({host:'127.0.0.1',port:55433});s.once('connect',()=>{s.destroy();r(true);});s.once('error',()=>r(false));});
function pgctl(action){const args=['-D',pgdata,'-w','-t','30'];if(action==='start')args.push('-l',path.join(dir,'postgres.log'));else args.push('-m','fast');args.push(action);const r=spawnSync(path.join(bin,'pg_ctl.exe'),args,{stdio:'ignore',windowsHide:true,timeout:35000});if(r.status!==0)throw Error('TEST_PG_CTL_FAILED');}
function connection(user,password,database){
  if(!/^phase13_test_admin$|^p135b1_[a-z0-9_]+$/.test(user)||!/^postgres$|^smart_agriculture_rehearsal_[a-z0-9_]+$/.test(database))throw Error('TEST_CONNECTION_IDENTITY_REFUSED');
  const u=new URL('postgresql://127.0.0.1:55433/'+database);u.username=user;u.password=password;u.searchParams.set('schema','public');u.searchParams.set('connection_limit','2');
  const c=new PrismaClient({datasourceUrl:u.href});clients.push(c);return c;
}
async function verify(c=admin,database='postgres',user='phase13_test_admin'){
  const [i]=await c.$queryRawUnsafe("SELECT current_database() AS db,current_user AS role,session_user AS session_role,inet_server_addr()::text AS host,inet_server_port() AS port,pg_postmaster_start_time()::text AS started");
  if(i.db!==database||i.role!==user||i.port!==55433||i.host!=='127.0.0.1/32'||(startedAt&&i.started!==startedAt))throw Error('TEST_SQL_IDENTITY_MISMATCH');
  const [proof]=await admin.$queryRawUnsafe("SELECT current_setting('data_directory') AS pgdata,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) AS system_id");
  if(norm(proof.pgdata)!==norm(pgdata)||proof.system_id!=='7698826681383327460')throw Error('TEST_SYSTEM_IDENTITY_MISMATCH');
  return {...i,...proof};
}
function rawPsql(database,user,password,sql,logFile,secret=false){
  if(!/^postgres$|^smart_agriculture_rehearsal_[a-z0-9_]+$/.test(database)||!/^phase13_test_admin$|^p135b1_[a-z0-9_]+$/.test(user))throw Error('PSQL_TARGET_REFUSED');
  const r=spawnSync(path.join(bin,'psql.exe'),['-X','-w','-h','127.0.0.1','-p','55433','-U',user,'-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{
    input:sql,encoding:'utf8',windowsHide:true,timeout:75000,maxBuffer:4*1024*1024,
    env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|^DATABASE_URL$/i.test(k))),DATABASE_URL:'',PGHOST:'127.0.0.1',PGPORT:'55433',PGDATABASE:database,PGUSER:user,PGPASSWORD:password,PGOPTIONS:'-c search_path=public,pg_catalog'}});
  if(!secret)fs.writeFileSync(logFile,(r.stdout||'')+(r.stderr||''));
  return {exitCode:r.status,sqlstate:r.stderr?.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/)?.[1]||null,stdout:secret?'REDACTED':r.stdout,stderr:secret?'REDACTED':r.stderr};
}
async function psql(env,step,sql,asRole){
  await verify(admin);await verify(env.db,env.name);
  const text="SET smart_agriculture.migration_approval='20261022_irrigation_v1_v2';\n"+(asRole?'SET ROLE '+asRole+';\n':'')+sql;
  const log=path.join(dir,env.label+'-'+step+'.log'),r=rawPsql(env.name,'phase13_test_admin',testCredentials().admin,text,log);
  evidence.operations??=[];evidence.operations.push({database:env.name,step,role:asRole||'phase13_test_admin',exitCode:r.exitCode,sqlstate:r.sqlstate,sha256:sha(sql),log:path.relative(ctx.root,log)});save();return r;
}
async function runCase(name,fn){const before=Date.now();try{const details=await fn();evidence.cases.push({name,status:'PASS',elapsedMs:Date.now()-before,details});console.log('PASS '+name);}catch(e){evidence.cases.push({name,status:'FAIL',code:e.code||null,sqlstate:e.meta?.code||null,reason:e.name});throw e;}finally{save();}}
async function expectedSqlError(fn,state,fragment){try{await fn();throw Error('EXPECTED_SQL_ERROR_NOT_RAISED');}catch(e){const msg=String(e.message),actual=e.meta?.code||(/\b(42501|23503|23514|P0001|55P03)\b/.exec(msg)||[])[1];if(state&&!((Array.isArray(state)?state:[state]).includes(actual)))throw e;if(fragment&&!msg.includes(fragment))throw e;return {sqlstate:actual||null,expectedFragment:fragment||null};}}
async function oldEvidence(){
  const c=new PrismaClient({datasourceUrl:ctx.testUrl('admin')});clients.push(c);
  // Existing phase database: SELECT only, never grant/change/archive fixtures.
  const rows=await c.$queryRawUnsafe(`SELECT c.relname,pg_catalog.pg_get_userbyid(c.relowner) AS owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='phase13_test_phase13_3b' AND c.relkind='r' ORDER BY c.relname`);
  const counts={};for(const t of ledgers)counts[t]=(await c.$queryRawUnsafe(`SELECT count(*)::int AS n FROM phase13_test_phase13_3b.${t}`))[0].n;
  const audit=(await c.$queryRawUnsafe("SELECT md5(string_agg(row_to_json(a)::text,'|' ORDER BY id)) AS hash FROM phase13_test_phase13_3b.irrigation_decision_logs a"))[0].hash;
  return {rows,counts,audit};
}
function mapSql(original,env){
  const replacements=[['7472695863566132416','7698826681383327460'],['C:/Program Files/PostgreSQL/17/data',pgdata.replaceAll('\\','/')],
    ["'smart_agriculture'",quote(env.name)],['ON DATABASE smart_agriculture ','ON DATABASE '+env.name+' '],
    ['5432','55433'],["'postgres'","'phase13_test_admin'"],['sa_irrigation_migrator',env.migrator],['sa_irrigation_app',env.app]];
  let mapped=original;const changes=[];
  for(const [from,to]of replacements){const n=mapped.split(from).length-1;if(n){mapped=mapped.split(from).join(to);changes.push({from,to,occurrences:n});}}
  // Enforce reversible identity-only mapping; DDL/constraints/permission logic unchanged.
  let reversed=mapped;for(const [from,to]of [...replacements].reverse())reversed=reversed.split(to).join(from);
  assert.equal(reversed,original,'NON_REVERSIBLE_SQL_MAPPING');
  return {sql:mapped,changes,sourceSha256:sha(original),mappedSha256:sha(mapped),reversible:true};
}
async function createEnvironment(label){
  await verify();const suffix=runId.replaceAll('_','').slice(-12)+'_'+label;
  const name='smart_agriculture_rehearsal_'+suffix,migrator='p135b1_'+suffix+'_m',app='p135b1_'+suffix+'_a';
  assert.equal((await admin.$queryRawUnsafe('SELECT count(*)::int AS n FROM pg_catalog.pg_database WHERE datname=$1',name))[0].n,0);
  assert.equal((await admin.$queryRawUnsafe('SELECT count(*)::int AS n FROM pg_catalog.pg_roles WHERE rolname IN ($1,$2)',migrator,app))[0].n,0);
  await verify();await admin.$executeRawUnsafe(`CREATE DATABASE ${name} OWNER phase13_test_admin TEMPLATE template0`);
  const db=connection('phase13_test_admin',testCredentials().admin,name);await verify(db,name);
  const env={label,name,migrator,app,db,mapped:{}};evidence.environments.push({label,name,migrator,app,created:true});save();
  env.baselineControlPublicExecute=(await db.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='pg_catalog.pg_control_system()'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE') AS allowed`))[0].allowed;
  const migrationPath=path.join(root,'backend/prisma/migrations'),names=fs.readdirSync(migrationPath,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();assert.equal(names.length,11);
  const base=names.map(n=>fs.readFileSync(path.join(migrationPath,n,'migration.sql'),'utf8')).join('\n');
  const history=`CREATE TABLE public._prisma_migrations (id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0);\n`+
    names.map(n=>`INSERT INTO public._prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES (${quote(randomUUID())},${quote(sha(fs.readFileSync(path.join(migrationPath,n,'migration.sql'))))},now(),${quote(n)},1);`).join('\n');
  const r=await psql(env,'baseline','BEGIN;\n'+base+'\n'+history+'\nCOMMIT;');assert.equal(r.exitCode,0,'BASELINE_MIGRATION_FAILED');
  for(const file of ['00-prerequisites.review.sql','01-ledgers.review.sql','02-finalize-dba.review.sql']){
    env.mapped[file]=mapSql(fs.readFileSync(path.join(source,file),'utf8'),env);
    fs.writeFileSync(path.join(dir,label+'-'+file),env.mapped[file].sql);
  }
  fs.writeFileSync(path.join(dir,label+'-mapping.json'),JSON.stringify(env.mapped,null,2));
  evidence.environments.at(-1).mapping=Object.fromEntries(Object.entries(env.mapped).map(([file,m])=>[file,{...m,sql:undefined}]));
  // Same schema/history expected as production from local migrations, not copied production rows.
  env.fingerprints={columns:(await db.$queryRawUnsafe(columnFingerprintSql))[0].fingerprint,constraints:(await db.$queryRawUnsafe(constraintFingerprintSql))[0].fingerprint};
  const originalInventory=JSON.parse(fs.readFileSync(path.join(root,'report/phase13-5b-production-inventory.json')));
  assert.equal(env.fingerprints.columns,originalInventory.fingerprint);assert.equal(env.fingerprints.constraints,originalInventory.constraintFingerprint);
  return env;
}
async function catalog(env){
  await verify(env.db,env.name);
  const tables=await env.db.$queryRawUnsafe("SELECT c.relname,r.rolname AS owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'irrigation_%' ORDER BY c.relname");
  const constraints=await env.db.$queryRawUnsafe("SELECT c.relname,k.conname,k.contype,k.convalidated,k.confdeltype,k.confupdtype,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid WHERE c.relnamespace='public'::regnamespace AND c.relname LIKE 'irrigation_%' ORDER BY c.relname,k.conname");
  const indexes=await env.db.$queryRawUnsafe("SELECT c.relname AS table_name,i.relname AS index_name,x.indisvalid,pg_get_indexdef(i.oid) AS definition FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid JOIN pg_catalog.pg_class c ON c.oid=x.indrelid WHERE c.relnamespace='public'::regnamespace ORDER BY i.relname");
  const enums=await env.db.$queryRawUnsafe("SELECT t.typname,array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS labels FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid WHERE t.typnamespace='public'::regnamespace AND t.typname LIKE 'Irrigation%' GROUP BY t.typname ORDER BY t.typname");
  const triggers=await env.db.$queryRawUnsafe("SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass('public.irrigation_decision_logs') AND NOT tgisinternal ORDER BY tgname");
  return {tables,constraints,indexes,enums,triggers};
}
async function main(){
  if(process.argv[2]!=='--approved-phase13-5b1')throw Error('EXPLICIT_REHEARSAL_APPROVAL_REQUIRED');
  const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));
  const files={bootstrap:'00-prerequisites.review.sql',migration:'01-ledgers.review.sql',finalize:'02-finalize-dba.review.sql'};
  for(const m of manifest.files)assert.equal(sha(fs.readFileSync(path.join(source,files[m.kind]))),m.sha256,'SOURCE_SQL_HASH_MISMATCH');evidence.sourceManifest=manifest;
  for(const p of ['C:\\DATN','C:\\DATN\\test-instances',ctx.root,pgdata])if(norm(fs.realpathSync.native(p))!==norm(p)||fs.lstatSync(p).isSymbolicLink())throw Error('UNEXPECTED_REPARSE_POINT');
  assert.equal(fs.readFileSync(path.join(pgdata,'PG_VERSION'),'utf8').trim(),'17');
  evidence.controlBefore=control();assert.equal(evidence.controlBefore.systemId,'7698826681383327460');assert.equal(evidence.controlBefore.state,'shut down');assert.equal(await listening(),false);
  const conf=fs.readFileSync(path.join(pgdata,'postgresql.conf'),'utf8');assert(/^[ \t]*port\s*=\s*55433\s*$/m.test(conf));assert(/^[ \t]*listen_addresses\s*=\s*'127\.0\.0\.1'\s*$/m.test(conf));
  fs.mkdirSync(dir,{recursive:false});save();
  try{
    pgctl('start');evidence.startedCluster=true;save();
    admin=connection('phase13_test_admin',testCredentials().admin,'postgres');evidence.identity=await verify();startedAt=evidence.identity.started;
    const existingRoles=await admin.$queryRawUnsafe('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolcanlogin FROM pg_roles WHERE rolname IN (\'phase13_test_admin\',\'phase13_test_migrator\',\'phase13_test_app\') ORDER BY rolname');
    assert.equal(existingRoles.length,3);assert(existingRoles.find(r=>r.rolname==='phase13_test_admin').rolsuper);evidence.existingRoles=existingRoles;
    evidence.oldPhaseBefore=await oldEvidence();
    const inspect=process.argv.find(a=>a.startsWith('--inspect-run='))?.split('=')[1];
    if(inspect){
      if(!/^\d{14}_[a-f0-9]{6}$/.test(inspect))throw Error('INSPECT_RUN_REFUSED');
      const previous=JSON.parse(fs.readFileSync(path.join(root,'report/phase13-5b1-run-'+inspect+'.json'))),e=previous.environments[0];
      const db=connection('phase13_test_admin',testCredentials().admin,e.name);await verify(db,e.name);
      evidence.inspection=await db.$queryRawUnsafe(`SELECT has_schema_privilege($1,'public','CREATE') AS create_schema,has_table_privilege($1,'public._prisma_migrations','SELECT') AS history_select,
        has_any_column_privilege($1,'public.actuators','REFERENCES') AS actuator_reference,has_any_column_privilege($1,'public.device_commands','REFERENCES') AS command_reference,
        has_any_column_privilege($1,'public.automation_rules','REFERENCES') AS rule_reference,has_any_column_privilege($1,'public.sensor_readings','REFERENCES') AS reading_reference,
        has_function_privilege($1,'pg_catalog.pg_control_system()','EXECUTE') AS control_execute,
        (SELECT proacl::text FROM pg_proc WHERE oid='pg_catalog.pg_control_system()'::regprocedure) AS function_acl`,e.migrator);
      console.log(JSON.stringify({inspect,evidence:evidence.inspection}));return;
    }
    await runCase('isolated identity, source hashes and preserved existing phase database',async()=>({systemId:evidence.identity.system_id,port:55433,oldAuditRows:evidence.oldPhaseBefore.counts.irrigation_decision_logs}));
    const env=await createEnvironment('main');
    await runCase('file00 prerequisites commits with real role/index catalog',async()=>{
      const r=await psql(env,'00',env.mapped[files.bootstrap].sql);assert.equal(r.exitCode,0,'PREREQUISITES_FAILED');
      const indexes=await env.db.$queryRawUnsafe("SELECT c.relname,x.indisunique,x.indisvalid FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class c ON c.oid=x.indexrelid WHERE c.relname IN ('actuators_id_device_id_key','device_commands_id_actuator_id_key','automation_rules_id_actuator_id_key')");assert.equal(indexes.length,3);return {indexes};
    });
    await runCase('file01 ledgers commits before DBA finalization',async()=>{
      const r=await psql(env,'01',env.mapped[files.migration].sql,env.migrator);assert.equal(r.exitCode,0,'LEDGERS_FAILED');
      const c=await catalog(env);assert.equal(c.tables.length,6);assert(c.tables.every(t=>t.owner===env.migrator));
      const [p]=await env.db.$queryRawUnsafe('SELECT has_schema_privilege($1,\'public\',\'CREATE\') AS migrator_create',env.migrator);assert.equal(p.migrator_create,true);evidence.catalogBeforeFinalize=c;return {checkpoint:'01_COMMITTED_02_NOT_RUN',...p};
    });
    await runCase('DBA file02 finalization commits and removes temporary grants',async()=>{
      const r=await psql(env,'02',env.mapped[files.finalize].sql);assert.equal(r.exitCode,0,'FINALIZATION_FAILED');
      const [p]=await env.db.$queryRawUnsafe(`SELECT has_schema_privilege($1,'public','CREATE') AS create_schema,has_table_privilege($1,'public._prisma_migrations','SELECT') AS history_select,
        has_any_column_privilege($1,'public.actuators','REFERENCES') AS actuator_reference,has_any_column_privilege($1,'public.device_commands','REFERENCES') AS command_reference,
        has_any_column_privilege($1,'public.automation_rules','REFERENCES') AS rule_reference,has_any_column_privilege($1,'public.sensor_readings','REFERENCES') AS reading_reference,
        has_function_privilege($1,'pg_catalog.pg_control_system()','EXECUTE') AS control_execute`,env.migrator);
      const [direct]=await env.db.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM pg_proc p,
        LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a JOIN pg_roles r ON r.oid=a.grantee
        WHERE p.oid='pg_catalog.pg_control_system()'::regprocedure AND r.rolname=$1 AND a.privilege_type='EXECUTE') AS direct_control_execute`,env.migrator);
      evidence.finalizationPrivileges={...p,...direct,baselineControlPublicExecute:env.baselineControlPublicExecute};save();
      assert(Object.entries(p).filter(([k])=>k!=='control_execute').every(([,v])=>v===false),'TEMPORARY_PRIVILEGE_RETAINED');
      assert.equal(direct.direct_control_execute,false);assert.equal(p.control_execute,env.baselineControlPublicExecute);return evidence.finalizationPrivileges;
    });
    await remainingTests(env,files);
    evidence.oldPhaseAfter=await oldEvidence();assert.deepEqual(evidence.oldPhaseAfter,evidence.oldPhaseBefore,'EXISTING_PHASE_DATA_CHANGED');
    evidence.catalogFinal=await catalog(env);evidence.pass=true;
  }finally{
    await Promise.all(clients.map(c=>c.$disconnect().catch(()=>{})));
    if(evidence.startedCluster){
      // Recheck process control identity before stopping ONLY the instance started here.
      if(control().systemId!=='7698826681383327460')throw Error('SHUTDOWN_IDENTITY_MISMATCH');
      pgctl('stop');evidence.stoppedCluster=!await listening()&&control().state==='shut down';
    }
    evidence.finishedAt=new Date().toISOString();save();
  }
  console.log(JSON.stringify({report,tests:evidence.cases.length,pass:evidence.pass,stopped:evidence.stoppedCluster}));
}
async function remainingTests(env,files){
  const c=await catalog(env);
  await runCase('six tables, six enums and 14 validated RESTRICT foreign keys',async()=>{
    assert.equal(c.tables.length,6);assert.equal(c.enums.length,6);
    const fks=c.constraints.filter(k=>k.contype==='f');assert.equal(fks.length,14);assert(fks.every(k=>k.confdeltype==='r'&&k.confupdtype==='r'&&k.convalidated));
    assert(c.indexes.every(i=>i.indisvalid));return {tables:c.tables,enums:c.enums,fkCount:fks.length,indexCount:c.indexes.length};
  });
  await runCase('v1/v2 constraints, exact expected indexes and append-only triggers match SQL',async()=>{
    const sourceSql=env.mapped[files.migration].sql;
    const expectedIndexes=[...sourceSql.matchAll(/CREATE (?:UNIQUE )?INDEX (?:"([^"]+)"|([a-z0-9_]+))/g)].map(m=>m[1]||m[2]);
    for(const name of expectedIndexes)assert(c.indexes.some(i=>i.index_name===name),name);
    const expectedConstraints=[...sourceSql.matchAll(/(?:ADD CONSTRAINT|CONSTRAINT) (?:"([^"]+)"|([a-z0-9_]+))/g)].map(m=>m[1]||m[2]);
    for(const name of expectedConstraints)assert(c.constraints.some(k=>k.conname===name),name);
    assert.equal(c.triggers.length,2);assert(c.triggers.every(t=>t.tgenabled==='O'&&t.definition.includes('irrigation_v2_deny_audit_mutation')));
    assert.equal(c.constraints.filter(k=>k.conname.endsWith('_shadow_fence')).length,6);return {expectedIndexes:expectedIndexes.length,expectedConstraints:expectedConstraints.length,triggers:c.triggers};
  });
  // Fresh disposable test LOGIN principals, never modify existing test/production credentials.
  const appLogin=env.app+'_login',migratorLogin=env.migrator+'_login',appPass=randomBytes(32).toString('hex'),migratorPass=randomBytes(32).toString('hex');
  await verify();
  const loginSql=`SET log_statement='none'; SET log_min_error_statement='panic';
CREATE ROLE ${appLogin} LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${quote(appPass)};
CREATE ROLE ${migratorLogin} LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${quote(migratorPass)};
GRANT ${env.app} TO ${appLogin}; GRANT ${env.migrator} TO ${migratorLogin};`;
  const provision=rawPsql(env.name,'phase13_test_admin',testCredentials().admin,loginSql,null,true);assert.equal(provision.exitCode,0,'TEST_PRINCIPAL_CREATION_FAILED');
  const app=connection(appLogin,appPass,env.name),owner=connection(migratorLogin,migratorPass,env.name);
  evidence.testLogins={app:appLogin,migrator:migratorLogin,secrets:'GENERATED_TEST_ONLY_RAM_NOT_PERSISTED'};
  await runCase('effective app/migrator identities use separate non-admin authenticated connections',async()=>{
    const identities=[await verify(app,env.name,appLogin),await verify(owner,env.name,migratorLogin)];
    assert(identities.every(i=>i.role===i.session_role));
    const [p]=await app.$queryRawUnsafe(`SELECT has_schema_privilege(current_user,'public','CREATE') AS create_schema,
      pg_has_role(current_user,$1,'MEMBER') AS app_member,pg_has_role(current_user,$2,'MEMBER') AS migrator_member,
      (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls FROM pg_roles WHERE rolname=current_user) AS unsafe,
      EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'irrigation_%' AND pg_has_role(current_user,relowner,'USAGE')) AS owns_ledger`,env.app,env.migrator);
    assert.deepEqual(p,{create_schema:false,app_member:true,migrator_member:false,unsafe:false,owns_ledger:false});return {identities,privileges:p};
  });
  for(const [label,sql]of [
    ['CREATE schema object','CREATE TABLE public.forbidden_app_object(id int)'],
    ['INSERT DeviceCommand','INSERT INTO public.device_commands DEFAULT VALUES'],
    ['UPDATE DeviceCommand',"UPDATE public.device_commands SET status='FAILED' WHERE false"],
    ['UPDATE audit',"UPDATE public.irrigation_decision_logs SET reason_code='FORBIDDEN' WHERE false"],
    ['DELETE audit','DELETE FROM public.irrigation_decision_logs WHERE false'],
    ['TRUNCATE audit','TRUNCATE public.irrigation_decision_logs'],
  ])await runCase('real app denied '+label,()=>expectedSqlError(()=>app.$executeRawUnsafe(sql),'42501'));
  await runCase('effective privilege matrix includes inherited group and PUBLIC grants',async()=>{
    const matrix=[];
    for(const t of ledgers){const [p]=await app.$queryRawUnsafe(`SELECT has_table_privilege(current_user,$1,'SELECT') AS read,has_table_privilege(current_user,$1,'INSERT') AS insert,
      has_table_privilege(current_user,$1,'UPDATE') AS update,has_table_privilege(current_user,$1,'DELETE') AS delete,has_table_privilege(current_user,$1,'TRUNCATE') AS truncate`, 'public.'+t);
      assert.equal(p.read,true);assert.equal(p.insert,true);assert.equal(p.update,t!=='irrigation_decision_logs');assert.equal(p.delete,false);assert.equal(p.truncate,false);matrix.push({table:t,...p});}
    return matrix;
  });
  const user=await env.db.user.create({data:{fullName:'SYNTHETIC REHEARSAL ONLY',email:runId+'@rehearsal.invalid',passwordHash:'NOT_A_LOGIN_HASH',role:'FARM_OWNER'}});
  const farm=await env.db.farm.create({data:{ownerId:user.id,name:'SYNTHETIC'}}),zone=await env.db.zone.create({data:{farmId:farm.id,name:'SYNTHETIC'}});
  const device=await env.db.device.create({data:{zoneId:zone.id,deviceCode:'SYNTHETIC-13-5B1',name:'NOT REAL ESP32',type:'CONTROLLER'}});
  const actuator=await env.db.actuator.create({data:{deviceId:device.id,actuatorCode:'PUMP_SYNTHETIC',name:'NO MQTT',type:'PUMP'}});
  const sensor=await env.db.sensor.create({data:{deviceId:device.id,sensorCode:'SOIL_SYNTHETIC',name:'SYNTHETIC',type:'SOIL_MOISTURE'}});
  const reading=await env.db.sensorReading.create({data:{sensorId:sensor.id,value:12,source:'SIMULATOR',recordedAt:new Date()}});
  const cycleSql=`INSERT INTO public.irrigation_cycles(id,actuator_id,device_id,policy_key,policy_version,policy_snapshot,mode,session_generation,session_started_at,updated_at)
VALUES ('cycle0',${quote(actuator.id)},${quote(device.id)},'synthetic',1,'{}','SHADOW','synthetic-session',now(),now())`;
  const budgetSql=(id,day)=>`INSERT INTO public.irrigation_daily_budgets(id,actuator_id,mode,local_day,max_runs,max_seconds) VALUES (${quote(id)},${quote(actuator.id)},'SHADOW',DATE ${quote(day)},3,3)`;
  const auditSql=(id,source='FIXTURE')=>`INSERT INTO public.irrigation_decision_logs(id,evaluation_key,cycle_id,actuator_id,sensor_reading_id,reading_reference,policy_key,policy_version,mode,source,outcome,reason_code,evidence,evaluated_at)
VALUES (${quote(id)},${quote('eval-'+id)},'cycle0',${quote(actuator.id)},${quote(reading.id)},'SYNTHETIC_ONLY','synthetic',1,'SHADOW',${quote(source)},'BLOCKED','SYNTHETIC_ONLY','{}',now())`;
  const intentSql=(id,cycle='cycle0',status='RESERVED')=>`INSERT INTO public.irrigation_command_intents(id,idempotency_key,fingerprint,actuator_id,cycle_id,mode,pulse_index,correlation_id,session_generation,status,max_run_seconds,issued_at,expires_at)
VALUES (${quote(id)},${quote('key-'+id)},'synthetic',${quote(actuator.id)},${quote(cycle)},'SHADOW',${id==='intent0'?0:1},${quote('corr-'+id)},'synthetic-session',${quote(status)},1,now(),now()+interval '10 seconds')`;
  await runCase('app can append audit and mutate only intended ledger tables using synthetic fixture',async()=>{
    await app.$executeRawUnsafe(cycleSql);await app.$executeRawUnsafe(budgetSql('budget0','2026-12-01'));await app.$executeRawUnsafe(auditSql('audit0'));
    assert.equal((await app.$queryRawUnsafe("SELECT count(*)::int AS n FROM public.irrigation_decision_logs WHERE id='audit0'"))[0].n,1);return {fixtureOnly:true};
  });
  for(const [op,sql]of [['UPDATE',"UPDATE public.irrigation_decision_logs SET reason_code='FORBIDDEN' WHERE id='audit0'"],['DELETE',"DELETE FROM public.irrigation_decision_logs WHERE id='audit0'"],['TRUNCATE','TRUNCATE public.irrigation_decision_logs']])
    await runCase('owner connection blocked by append-only trigger: '+op,()=>expectedSqlError(()=>owner.$executeRawUnsafe(sql),'P0001','IRRIGATION_AUDIT_APPEND_ONLY'));
  await runCase('audit row unchanged after all rejected mutations',async()=>{const rows=await app.$queryRawUnsafe("SELECT id,reason_code FROM public.irrigation_decision_logs ORDER BY id");assert.deepEqual(rows,[{id:'audit0',reason_code:'SYNTHETIC_ONLY'}]);return rows;});
  await runCase('SHADOW-only mode fence enforced by PostgreSQL',()=>expectedSqlError(()=>app.$executeRawUnsafe("UPDATE public.irrigation_daily_budgets SET mode='ACTIVE' WHERE id='budget0'"),'23514','shadow_fence'));
  await runCase('VERIFIED_LIVE source fence enforced even with valid reading FK',()=>expectedSqlError(()=>app.$executeRawUnsafe(auditSql('untrusted-live','VERIFIED_LIVE')),'23514','irrigation_unverified_source_fence'));
  await runCase('14 RESTRICT FKs protect referenced legacy fixture from DELETE',()=>expectedSqlError(()=>env.db.$executeRawUnsafe('DELETE FROM public.devices WHERE id=$1',device.id),'23503'));
  await runCase('ledger FK violation rejected on independent app SQL connection',()=>expectedSqlError(()=>app.$executeRawUnsafe(intentSql('missing-cycle','absent-cycle','CANCELLED')),'23503'));
  await app.$executeRawUnsafe(intentSql('intent0'));
  await app.$executeRawUnsafe(`INSERT INTO public.irrigation_budget_reservations(id,budget_id,actuator_id,mode,cycle_id,intent_id,seconds) VALUES ('reservation0','budget0',${quote(actuator.id)},'SHADOW','cycle0','intent0',1)`);
  await runCase('v2 settlement rejects CHARGED without settled_at',()=>expectedSqlError(()=>app.$executeRawUnsafe("UPDATE public.irrigation_budget_reservations SET status='CHARGED' WHERE id='reservation0'"),'23514','irrigation_v2_settlement'));
  await runCase('v2 dispatch ordering rejects publish without claim',()=>expectedSqlError(()=>app.$executeRawUnsafe("UPDATE public.irrigation_command_intents SET published_at=now() WHERE id='intent0'"),'23514','irrigation_v2_dispatch_order'));
  await runCase('quota CHECK rejects budget beyond policy',()=>expectedSqlError(()=>app.$executeRawUnsafe("UPDATE public.irrigation_daily_budgets SET reserved_seconds=4 WHERE id='budget0'"),'23514','irrigation_budget_bounds'));
  await runCase('transaction SQL error rolls back budget and appended audit together',async()=>{
    const error=await expectedSqlError(()=>app.$transaction(async tx=>{await tx.$executeRawUnsafe(budgetSql('atomic-budget','2026-12-02'));await tx.$executeRawUnsafe(auditSql('atomic-audit'));await tx.$executeRawUnsafe(intentSql('atomic-intent','absent-cycle','CANCELLED'));}),'23503');
    assert.equal((await app.$queryRawUnsafe("SELECT count(*)::int AS n FROM public.irrigation_daily_budgets WHERE id='atomic-budget'"))[0].n,0);
    assert.equal((await app.$queryRawUnsafe("SELECT count(*)::int AS n FROM public.irrigation_decision_logs WHERE id='atomic-audit'"))[0].n,0);return error;
  });
  await runCase('initial safety defaults fail closed; no automatic DeviceCommand generated',async()=>{
    await app.$executeRawUnsafe(`INSERT INTO public.irrigation_safety_states(actuator_id,device_id,mode,updated_at) VALUES (${quote(actuator.id)},${quote(device.id)},'SHADOW',now())`);
    const [s]=await app.$queryRawUnsafe('SELECT emergency_stop,fault_latched,reported_state::text AS reported_state FROM public.irrigation_safety_states');
    assert.deepEqual(s,{emergency_stop:true,fault_latched:true,reported_state:'UNKNOWN'});assert.equal(await env.db.deviceCommand.count(),0);return s;
  });
  await runCase('wrong role stops migration before DDL',async()=>{const r=await psql(env,'wrong-role',env.mapped[files.migration].sql,env.app);assert.notEqual(r.exitCode,0);assert(['P0001','42501'].includes(r.sqlstate));return {sqlstate:r.sqlstate};});
  await runCase('wrong database identity stops mapped script before DDL',async()=>{
    await verify();const r=rawPsql('postgres','phase13_test_admin',testCredentials().admin,"SET smart_agriculture.migration_approval='20261022_irrigation_v1_v2';\n"+env.mapped[files.bootstrap].sql,path.join(dir,'wrong-database.log'));
    assert.notEqual(r.exitCode,0);assert.equal(r.sqlstate,'P0001');return {database:'postgres',sqlstate:r.sqlstate};
  });
  const fail=await createEnvironment('rollback');
  await runCase('checkpoint 00 COMMIT then injected file01 SQL failure preserves only prerequisites',async()=>{
    assert.equal((await psql(fail,'00',fail.mapped[files.bootstrap].sql)).exitCode,0);
    const injected=fail.mapped[files.migration].sql.replace(/COMMIT;\s*$/,"SELECT 1/0;\nCOMMIT;\n");
    const r=await psql(fail,'01-injected-fault',injected,fail.migrator);assert.notEqual(r.exitCode,0);assert.equal(r.sqlstate,'22012');
    const cat=await catalog(fail);assert.equal(cat.tables.length,0);assert.equal(cat.enums.length,0);assert.equal(cat.indexes.filter(i=>['actuators_id_device_id_key','device_commands_id_actuator_id_key','automation_rules_id_actuator_id_key'].includes(i.index_name)).length,3);
    return {checkpoint00Committed:true,checkpoint01RolledBack:true,retained:cat};
  });
  await runCase('explicit duplicate checkpoint00 attempt fails rather than replaying COMMIT',async()=>{
    const r=await psql(fail,'duplicate-00',fail.mapped[files.bootstrap].sql);assert.notEqual(r.exitCode,0);assert.equal(r.sqlstate,'P0001');assert(r.stderr.includes('ROLE_CONFLICT_STOP'));return {sqlstate:r.sqlstate,automaticRetry:false};
  });
  const conflict=await createEnvironment('conflict');
  await runCase('duplicate prerequisite index causes rollback including new roles',async()=>{
    await verify(conflict.db,conflict.name);await conflict.db.$executeRawUnsafe('CREATE INDEX actuators_id_device_id_key ON public.actuators(id)');
    const r=await psql(conflict,'00-index-conflict',conflict.mapped[files.bootstrap].sql);assert.notEqual(r.exitCode,0);assert.equal(r.sqlstate,'42P07');
    assert.equal((await admin.$queryRawUnsafe('SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ($1,$2)',conflict.migrator,conflict.app))[0].n,0);assert.equal((await catalog(conflict)).tables.length,0);return {sqlstate:r.sqlstate,rolesRolledBack:true};
  });
  const locked=await createEnvironment('lock');
  await runCase('CREATE INDEX ShareLock waits for writer lock then respects 3-second lock_timeout',async()=>{
    let unlock,ready;const readyPromise=new Promise(r=>ready=r),release=new Promise(r=>unlock=r);
    const holder=connection('phase13_test_admin',testCredentials().admin,locked.name);await verify(holder,locked.name);
    const holding=holder.$transaction(async tx=>{await tx.$executeRawUnsafe('LOCK TABLE public.device_commands IN ROW EXCLUSIVE MODE');ready();await release;},{timeout:20000});
    await readyPromise;
    try{
      const held=await locked.db.$queryRawUnsafe("SELECT l.mode,l.granted,a.pid FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE a.datname=current_database() AND l.relation='public.device_commands'::regclass AND l.mode='RowExclusiveLock' AND l.granted");assert.equal(held.length,1);
      const at=Date.now(),r=await psql(locked,'00-lock-timeout',locked.mapped[files.bootstrap].sql),elapsedMs=Date.now()-at;
      assert.notEqual(r.exitCode,0);assert.equal(r.sqlstate,'55P03');assert(elapsedMs>=2800&&elapsedMs<15000);assert.equal((await catalog(locked)).tables.length,0);
      assert.equal((await admin.$queryRawUnsafe('SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ($1,$2)',locked.migrator,locked.app))[0].n,0);
      return {sqlstate:r.sqlstate,elapsedMs,heldLocks:held,syntheticOnly:true};
    }finally{unlock();await holding;}
  });
  await runCase('all rehearsal migrations leave legacy DeviceCommand and AutomationRule rows untouched',async()=>{
    const rows=[];for(const e of [env,fail,conflict,locked]){const commandCount=await e.db.deviceCommand.count(),automationCount=await e.db.automationRule.count();assert.equal(commandCount,0);assert.equal(automationCount,0);rows.push({database:e.name,commandCount,automationCount});}return rows;
  });
  // Retained test databases remain inspectable; random test LOGIN secrets are not persisted.
  await verify();await admin.$executeRawUnsafe(`ALTER ROLE ${appLogin} NOLOGIN`);await admin.$executeRawUnsafe(`ALTER ROLE ${migratorLogin} NOLOGIN`);
  evidence.testLogins.disabledAfterTests=true;
}
if(require.main===module)main().catch(e=>{evidence.failure={name:e.name,code:e.code||null,reason:/^[A-Z_]+$/.test(e.message)?e.message:'REHEARSAL_ASSERTION_OR_SQL_FAILURE_SEE_PRIVATE_LOG'};evidence.finishedAt=new Date().toISOString();if(fs.existsSync(dir))save();console.error(JSON.stringify({report,failure:evidence.failure,stopped:evidence.stoppedCluster}));process.exitCode=1;});
module.exports={mapSql};
