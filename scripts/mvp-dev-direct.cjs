const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawn, spawnSync, fork } = require('node:child_process');
const assert = require('node:assert/strict');
const {observeNativeExit}=require('./mvp-native-exit.cjs');
const REPO = path.resolve(__dirname, '..'), BASE = 'C:\\DATN\\test-instances\\phase13-3b';
const DATA = path.join(BASE, 'data'), BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const SYSTEM = '7698826681383327460', DB = 'smart_agriculture_mvp_dev';
const ROLE = { admin: 'phase13_test_admin', migrator: 'sa_mvp_dev_migrator', app: 'sa_mvp_dev_app' };
const SOURCES = ['mvp-dev-direct.cjs','mvp-dev-direct-psql.cjs','mvp-dev-backend.cjs','mvp-dev-frontend.mjs','mvp-dev-direct-protect.ps1','mvp-dev-direct-launch.ps1','mvp-dev-acceptance.cjs','mvp-native-exit.cjs'];
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const write = (f, value) => fs.writeFileSync(f, JSON.stringify(value, null, 2), { flag: 'wx' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function closed(extra={}) { return { SystemRoot:'C:\\Windows', WINDIR:'C:\\Windows', TEMP:process.env.TEMP || 'C:\\Windows\\Temp', TMP:process.env.TMP || 'C:\\Windows\\Temp', PATH:'C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0', ...extra }; }
function url(role, password) { if (!Object.values(ROLE).includes(role)) throw Error('DEV_ROLE_REFUSED'); return `postgresql://${role}:${encodeURIComponent(password)}@127.0.0.1:55433/${DB}?schema=public`; }
function canonical(p) { for(let f=path.resolve(p);;f=path.dirname(f)){if(fs.existsSync(f)&&(fs.lstatSync(f).isSymbolicLink()||fs.realpathSync.native(f).toLowerCase()!==f.toLowerCase()))throw Error('DEV_REPARSE_REFUSED');if(path.dirname(f)===f)break;} }
function preflight() {
  canonical(DATA); assert.equal(fs.readFileSync(path.join(DATA,'PG_VERSION'),'utf8').trim(),'17');
  assert.equal(fs.existsSync(path.join(DATA,'postmaster.pid')),false,'POSTMASTER_PID_PRESENT_STOP');
  const pins={'pg_ctl.exe':'FC644446B0236E623E3E6FE2699446259EFB8E61BD9ABA838D6394A2BE6987B8','pg_controldata.exe':'6896F8A705AFB5CBAAD843017D6D8AED5F5D76E32B3179E66750AAA5F193CC40','psql.exe':'462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A','postgres.exe':'94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746'};
  for(const [n,h] of Object.entries(pins))assert.equal(hash(path.join(BIN,n)),h,'DEV_BINARY_HASH');
  const r=spawnSync(path.join(BIN,'pg_controldata.exe'),[DATA],{encoding:'utf8',windowsHide:true,env:closed()});
  assert.equal(r.status,0);assert.ok(!r.stderr&&!r.signal);
  assert.equal(r.stdout.match(/Database system identifier:\s+(\d+)/)?.[1],SYSTEM);
  assert.equal(r.stdout.match(/Database cluster state:\s+([^\r\n]+)/)?.[1].trim(),'shut down');
  const ps=`$a=Get-Acl -LiteralPath '${BASE}';$b=Get-Acl -LiteralPath '${DATA}';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;$ports=@(Get-NetTCPConnection -State Listen -ErrorAction Stop|Where-Object LocalPort -in @(55433,55001,55173));@{operator=$sid;owner=$a.GetOwner([Security.Principal.SecurityIdentifier]).Value;protected=$a.AreAccessRulesProtected;rootSids=@($a.Access|ForEach-Object{$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value});dataSids=@($b.Access|ForEach-Object{$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value});ports=$ports.Count}|ConvertTo-Json -Compress`;
  const acl=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',windowsHide:true,env:closed()});
  assert.equal(acl.status,0);assert.equal(acl.stderr,'');const facts=JSON.parse(acl.stdout);
  assert.equal(facts.operator,'S-1-5-21-1432835263-483988321-3159128977-1001');assert.equal(facts.owner,facts.operator);assert.equal(facts.protected,true);assert.deepEqual(facts.rootSids,[facts.operator]);assert.deepEqual(facts.dataSids,[facts.operator]);assert.equal(facts.ports,0);
  return {systemId:SYSTEM,pgdata:DATA,state:'shut down',binaries:pins,ntfs:facts,at:new Date().toISOString()};
}
function migrations() {
  const approved=require('./phase13-5d1d-contracts.cjs').MIGRATIONS;
  assert.ok(Array.isArray(approved)&&approved.length===11,'BASELINE_MANIFEST_MISSING');
  const dir=path.join(REPO,'backend/prisma/migrations');
  assert.deepEqual(fs.readdirSync(dir).filter(n=>fs.statSync(path.join(dir,n)).isDirectory()).sort(),approved.map(x=>x[0]).sort());
  return approved.map(([name,checksum])=>{const file=path.join(dir,name,'migration.sql');assert.equal(hash(file).toLowerCase(),checksum);const sql=fs.readFileSync(file,'utf8');assert.doesNotMatch(sql,/\b(?:CREATE|ALTER|DROP)\s+(?:DATABASE|ROLE|USER)|smart_agriculture\b|\\connect|dblink|postgres_fdw/i);return{name,checksum,file};});
}
function prepare() {
  const before=preflight(), baseline=migrations();
  const prior=path.join(BASE,'test-auth-recovery-1793189718289-2f71e8');
  const clean=JSON.parse(fs.readFileSync(path.join(prior,'password-recovery-final-verified.json'),'utf8'));assert.equal(clean.status,'MVP_TEST_CREDENTIAL_RECOVERY_PASS');assert.equal(clean.finalControl.state,'shut down');assert.equal(clean.target.systemId,SYSTEM);
  const run=path.join(BASE,'mvp-direct-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'));fs.mkdirSync(run);fs.mkdirSync(path.join(run,'empty-env'));
  const sourceHashes=Object.fromEntries(SOURCES.map(n=>[n,hash(path.join(__dirname,n))]));
  for(const [n,h]of Object.entries(clean.evidenceHashes))assert.equal(hash(path.join(prior,n)),h,'RECOVERY_EVIDENCE_DRIFT');
  const previousEvidenceHashes=Object.fromEntries(['password-recovery-final-verified.json','verification-auth-result.json','verification-external-smart-stop.result.json'].map(n=>[n,hash(path.join(prior,n))]));
  const approvalFile='C:\\Users\\Acer Swift3\\.codex\\attachments\\0bc1639b-5f81-4355-aec7-17d21a4a7316\\Pasted text.txt';
  write(path.join(run,'prepared.json'),{before,baseline,sourceHashes,run,previousRun:prior,previousEvidenceHashes,approval:'USER_MVP_DEV_PROVISIONING_AND_LIVE_SOFTWARE_ACCEPTANCE',approvalFile,approvalSha256:hash(approvalFile),schemaSha256:hash(path.join(REPO,'backend/prisma/schema.prisma')),directPsqlPasswordPrompt:true,execute:false});console.log(JSON.stringify({prepared:run,systemId:SYSTEM,baseline:baseline.length}));return run;
}
function scram(password) {
  const salt=crypto.randomBytes(16),salted=crypto.pbkdf2Sync(password,salt,4096,32,'sha256');
  const client=crypto.createHmac('sha256',salted).update('Client Key').digest();
  const stored=crypto.createHash('sha256').update(client).digest('base64'),server=crypto.createHmac('sha256',salted).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored}:${server}`;
}
async function execute(run) {
  canonical(run);assert.equal(path.dirname(run),BASE);assert.match(path.basename(run),/^mvp-direct-[0-9]+-[a-f0-9]+$/);
  const plan=JSON.parse(fs.readFileSync(path.join(run,'prepared.json'),'utf8'));
  for(const [n,h] of Object.entries(plan.sourceHashes))assert.equal(hash(path.join(__dirname,n)),h,'DEV_SOURCE_DRIFT');
  const proof=preflight();const baseline=migrations();
  assert.equal(hash(plan.approvalFile),plan.approvalSha256,'APPROVAL_DRIFT');assert.equal(hash(path.join(REPO,'backend/prisma/schema.prisma')),plan.schemaSha256,'SCHEMA_DRIFT');
  for(const [n,h]of Object.entries(plan.previousEvidenceHashes))assert.equal(hash(path.join(plan.previousRun,n)),h,'PRIOR_FAILURE_EVIDENCE_DRIFT');
  for(const file of [path.join(require('os').homedir(),'AppData/Roaming/postgresql/pgpass.conf'),path.join(require('os').homedir(),'.pgpass')])assert.equal(fs.existsSync(file),false,'STORED_PASSWORD_FALLBACK_PRESENT_STOP');
  assert.ok(!Object.keys(process.env).some(k=>/^PGPASSWORD$|^PGPASSFILE$|^PGSERVICE|^DATABASE_URL$|^OSTYPE$/i.test(k)),'UNAPPROVED_AUTH_ENV');
  write(path.join(run,'execution.attempt.json'),{at:new Date().toISOString(),pid:process.pid,maxAttempts:1,systemId:SYSTEM});
  const credentials={migratorPassword:crypto.randomBytes(30).toString('base64url'),appPassword:crypto.randomBytes(30).toString('base64url'),userPassword:crypto.randomBytes(24).toString('base64url'),jwtSecret:crypto.randomBytes(48).toString('base64url')};
  const secrets=()=>Object.values(credentials);
  function clean(value) {let s=String(value);for(const x of secrets())if(x)s=s.split(x).join('[REDACTED]');return s.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi,'[DEV_CONNECTION_REDACTED]').replace(/SCRAM-SHA-256\$[^\s"']+/g,'[VERIFIER_REDACTED]').replace(/\$2[aby]\$[^\s"']+/g,'[HASH_REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[TOKEN_REDACTED]');}
  const events=[],children=[];let clusterStarted=false,unknownNative=false,adminAuthenticated=false,client=null,ingestionClient=null,direct=null,stage='INITIAL';
  const summary={run,kind:'DEV_SYNTHETIC_ONLY',target:{host:'127.0.0.1',port:55433,database:DB,systemId:SYSTEM},startedAt:new Date().toISOString(),preflight:proof,events};
  function event(name,data={}){const row={stage:name,at:new Date().toISOString(),...data};events.push(row);console.log(JSON.stringify(row));}
  async function native(label,exe,args,env,stdin='',deadline=60000) {
    const result=await observeNativeExit({executable:exe,args,cwd:run,environment:closed(env),input:stdin,deadline});
    fs.writeFileSync(path.join(run,label+'.stdout.log'),clean(result.stdout),{flag:'wx'});fs.writeFileSync(path.join(run,label+'.stderr.log'),clean(result.stderr),{flag:'wx'});
    event(label,{pid:result.pid,exitCode:result.code,signal:result.signal??null,outputCapped:result.outputCapped,nativeExitObserved:!!result.nativeExitObserved,pipeClosed:result.pipeClosed});
    if(result.unknown){unknownNative=true;throw Error('NATIVE_OUTCOME_UNKNOWN_'+label);}
    if(result.code!==0||result.signal||result.error||result.outputCapped)throw Error('NATIVE_FAILED_'+label);
    return result.stdout;
  }
  let sqlNumber=0;
  async function sql(database,role,password,text) {
    assert.ok(['postgres',DB].includes(database));assert.ok(Object.values(ROLE).includes(role));
    const label='sql-'+String(++sqlNumber).padStart(3,'0');
    if(role===ROLE.admin){
      assert.equal(database,'postgres');
      if(!direct){
        write(path.join(run,'direct-auth.attempt.json'),{at:new Date().toISOString(),maxAttempts:1,role:ROLE.admin,database:'postgres',port:55433,passwordMethod:'NATIVE_PSQL_CONIN_PROMPT',passwordInEnvironment:false});
        const {DirectTestPsql}=require('./mvp-dev-direct-psql.cjs');
        direct=new DirectTestPsql({executable:path.join(BIN,'psql.exe'),run,environment:closed({PGCONNECT_TIMEOUT:'3',PGCLIENTENCODING:'UTF8',PGAPPNAME:'mvp-direct-test-auth-only',PGOPTIONS:'-c statement_timeout=15000 -c lock_timeout=1500 -c idle_in_transaction_session_timeout=15000'}),onExit:row=>event('direct-psql-exit',row)});
        const diagnostic=await direct.query(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL search_path=pg_catalog;SELECT json_build_object('user',current_user,'database',current_database(),'port',inet_server_port(),'version',current_setting('server_version_num'),'superuser',r.rolsuper,'createdb',r.rolcreatedb,'createrole',r.rolcreaterole,'systemId',CASE WHEN has_function_privilege(current_user,'pg_catalog.pg_control_system()','EXECUTE') THEN (SELECT system_identifier::text FROM pg_control_system()) END,'pgdata',CASE WHEN r.rolsuper OR pg_has_role(current_user,'pg_read_all_settings','USAGE') THEN current_setting('data_directory') END,'databases',(SELECT json_agg(datname ORDER BY datname) FROM pg_database),'roles',(SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles),'readOnly',current_setting('transaction_read_only'),'checkedAt',clock_timestamp()) FROM pg_roles r WHERE r.rolname=current_user;ROLLBACK;`,120000);
        summary.authentication=JSON.parse(diagnostic);adminAuthenticated=true;summary.authentication.passwordMethod='NATIVE_PSQL_CONIN_PROMPT';
        write(path.join(run,'direct-auth-result.json'),summary.authentication);
        assert.equal(summary.authentication.user,ROLE.admin);assert.equal(summary.authentication.database,'postgres');assert.equal(summary.authentication.port,55433);assert.equal(summary.authentication.systemId,SYSTEM);assert.equal(summary.authentication.readOnly,'on');
        assert.ok(summary.authentication.superuser||(summary.authentication.createdb&&summary.authentication.createrole),'TEST_ROLE_INSUFFICIENT_PRIVILEGES_STOP');
      }
      const gate=`SELECT current_database()='postgres' AND current_user='${ROLE.admin}' AND inet_server_port()=55433 AND (SELECT system_identifier::text FROM pg_control_system())='${SYSTEM}' AND replace(current_setting('data_directory'),chr(92),'/')='C:/DATN/test-instances/phase13-3b/data' AS dev_identity_gate`;
      const prefix=`${gate}\n\\gset\n\\if :dev_identity_gate\n\\else\n\\quit 3\n\\endif\n`;
      const result=await direct.query(prefix+text);fs.writeFileSync(path.join(run,label+'.stdout.log'),clean(result),{flag:'wx'});event(label,{transport:'ONE_AUTHENTICATED_NATIVE_SESSION'});return result;
    }
    assert.equal(database,DB);
    // Newly generated DEV credentials only; no psql password environment or admin handoff.
    const exists=fs.existsSync,read=fs.readFileSync;const blocked=f=>typeof f==='string'&&path.resolve(f).toLowerCase().startsWith(REPO.toLowerCase()+path.sep)&&/^\.env(?:\.|$)/.test(path.basename(f));
    fs.existsSync=function(f){return blocked(f)?false:exists.apply(this,arguments);};fs.readFileSync=function(f){if(blocked(f))throw Error('DIRECT_PRODUCTION_ENV_REFUSED');return read.apply(this,arguments);};
    const {PrismaClient}=require(path.join(REPO,'backend/node_modules/@prisma/client'));const connection=new PrismaClient({datasourceUrl:url(role,password),log:[]});
    try{
      const [id]=await connection.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port');assert.equal(id.db,DB);assert.equal(id.role,role);assert.equal(id.port,55433);
      let result='';
      if(/^SELECT\s/i.test(text.trim())){const rows=await connection.$queryRawUnsafe(text);const value=Object.values(rows[0]||{})[0];result=typeof value==='object'?JSON.stringify(value):String(value);}
      else for(const statement of text.split(';').map(x=>x.trim()).filter(Boolean)){assert.match(statement,/^(?:GRANT|REVOKE)\s/);await connection.$executeRawUnsafe(statement);}
      fs.writeFileSync(path.join(run,label+'.stdout.log'),clean(result),{flag:'wx'});event(label,{transport:'NEW_DEV_ROLE_PRISMA',role});return result;
    }finally{await connection.$disconnect();}
  }
  try {
    stage='CLUSTER_START';write(path.join(run,'cluster-start.attempt.json'),{pgdata:DATA,at:new Date().toISOString()});
    await native('cluster-start',path.join(BIN,'pg_ctl.exe'),['start','-D',DATA,'-l',path.join(run,'postgres-startup.log'),'-o','-h 127.0.0.1 -p 55433 -c log_statement=none -c log_min_error_statement=panic -c log_connections=off -c log_disconnections=off','-w','-t','20'],{},'',30000);clusterStarted=true;stage='SQL_IDENTITY';
    const identity=JSON.parse((await sql('postgres',ROLE.admin,null,`SELECT json_build_object('systemId',(SELECT system_identifier::text FROM pg_control_system()),'pgdata',current_setting('data_directory'),'serverStartedAt',pg_postmaster_start_time(),'version',current_setting('server_version_num'),'role',current_user,'port',inet_server_port());`)).trim());
    assert.equal(identity.systemId,SYSTEM);adminAuthenticated=true;summary.serverIdentity=identity;
    stage='CATALOG_EMPTY';
    const existing=JSON.parse((await sql('postgres',ROLE.admin,null,`SELECT json_build_object('databaseExists',EXISTS(SELECT 1 FROM pg_database WHERE datname='${DB}'),'roleExists',EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('${ROLE.app}','${ROLE.migrator}')));`)).trim());
    assert.equal(existing.databaseExists,false,'DEV_DATABASE_ALREADY_EXISTS_STOP');assert.equal(existing.roleExists,false,'DEV_ROLE_ALREADY_EXISTS_STOP');
    await native('credential-protection','powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'mvp-dev-direct-protect.ps1'),'-OutputFile',path.join(run,'credentials.dpapi')],{},JSON.stringify(credentials),10000);
    stage='PROVISION';
    const absence=`SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('${ROLE.app}','${ROLE.migrator}')) AND NOT EXISTS(SELECT 1 FROM pg_database WHERE datname='${DB}') AS dev_absent\n\\gset\n\\if :dev_absent\n\\else\n\\quit 3\n\\endif\n`;
    await sql('postgres',ROLE.admin,null,absence+`BEGIN;CREATE ROLE ${ROLE.migrator} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${scram(credentials.migratorPassword)}';CREATE ROLE ${ROLE.app} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${scram(credentials.appPassword)}';COMMIT;`);
    await sql('postgres',ROLE.admin,null,`SELECT NOT EXISTS(SELECT 1 FROM pg_database WHERE datname='${DB}') AS db_absent\n\\gset\n\\if :db_absent\nCREATE DATABASE ${DB} OWNER ${ROLE.migrator} TEMPLATE template0;\n\\else\n\\quit 3\n\\endif\nREVOKE ALL ON DATABASE ${DB} FROM PUBLIC;GRANT CONNECT ON DATABASE ${DB} TO ${ROLE.app};`);
    const empty=JSON.parse((await sql(DB,ROLE.migrator,credentials.migratorPassword,`SELECT json_build_object('tables',count(*)) FROM pg_tables WHERE schemaname='public';`)).trim());assert.equal(Number(empty.tables),0,'NEW_DEV_TARGET_NOT_EMPTY');
    stage='MIGRATION';const schemaDir=path.join(run,'prisma');fs.mkdirSync(schemaDir);fs.copyFileSync(path.join(REPO,'backend/prisma/schema.prisma'),path.join(schemaDir,'schema.prisma'));fs.mkdirSync(path.join(schemaDir,'migrations'));
    fs.copyFileSync(path.join(REPO,'backend/prisma/migrations/migration_lock.toml'),path.join(schemaDir,'migrations/migration_lock.toml'));
    for(const m of baseline){const d=path.join(schemaDir,'migrations',m.name);fs.mkdirSync(d);fs.copyFileSync(m.file,path.join(d,'migration.sql'));}
    await native('prisma-migrate-deploy',process.execPath,[path.join(REPO,'backend/node_modules/prisma/build/index.js'),'migrate','deploy','--schema',path.join(schemaDir,'schema.prisma')],{DATABASE_URL:url(ROLE.migrator,credentials.migratorPassword)},'',120000);
    const applied=JSON.parse((await sql(DB,ROLE.migrator,credentials.migratorPassword,`SELECT json_agg(json_build_object('name',migration_name,'checksum',checksum,'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL) ORDER BY migration_name) FROM public._prisma_migrations;`)).trim());
    assert.equal(applied.length,11);for(const [i,m]of baseline.entries()){assert.equal(applied[i].name,m.name);assert.equal(applied[i].checksum,m.checksum);assert.equal(applied[i].finished,true);assert.equal(applied[i].rolledBack,false);}summary.migrations=applied;
    const schemaProof=JSON.parse((await sql(DB,ROLE.migrator,credentials.migratorPassword,`SELECT json_build_object('tables',(SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'),'primaryKeys',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='p'),'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f'),'unvalidated',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated),'indexes',(SELECT count(*) FROM pg_indexes WHERE schemaname='public'));`)).trim());
    assert.deepEqual(schemaProof.tables,['_prisma_migrations','activity_logs','actuators','alert_rules','alerts','automation_rules','crops','device_commands','devices','farm_staff_assignments','farms','sensor_readings','sensors','users','zones'].sort());assert.equal(Number(schemaProof.primaryKeys),15);assert.ok(Number(schemaProof.foreignKeys)>=10);assert.equal(Number(schemaProof.unvalidated),0);assert.ok(Number(schemaProof.indexes)>=15);summary.schema=schemaProof;
    await sql(DB,ROLE.migrator,credentials.migratorPassword,`GRANT USAGE ON SCHEMA public TO ${ROLE.app};GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE.app};GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE.app};REVOKE INSERT,UPDATE,DELETE ON public._prisma_migrations FROM ${ROLE.app};`);
    const roleProof=JSON.parse((await sql(DB,ROLE.app,credentials.appPassword,`SELECT json_build_object('role',current_user,'canLogin',rolcanlogin,'superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,'bypassrls',rolbypassrls,'replication',rolreplication,'schemaCreate',has_schema_privilege(current_user,'public','CREATE'),'migrationWrite',has_table_privilege(current_user,'public._prisma_migrations','INSERT,UPDATE,DELETE'),'ownsDatabase',(SELECT pg_get_userbyid(datdba)=current_user FROM pg_database WHERE datname=current_database()),'tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public')) FROM pg_roles WHERE rolname=current_user;`)).trim());
    for(const k of ['superuser','createdb','createrole','bypassrls','replication','schemaCreate','migrationWrite','ownsDatabase'])assert.equal(roleProof[k],false);assert.equal(roleProof.canLogin,true);assert.equal(Number(roleProof.tables),15);summary.appRole=roleProof;
    stage='DEV_RUNTIME';
    const env=closed({DATABASE_URL:url(ROLE.app,credentials.appPassword),NODE_ENV:'development',PORT:'55001',CLIENT_URL:'http://127.0.0.1:55173',JWT_SECRET:credentials.jwtSecret,JWT_EXPIRES_IN:'1h',MQTT_ENABLED:'false',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1',MQTT_BROKER_URL:'mqtt://127.0.0.1:1',AUTOMATION_COMMAND_COOLDOWN_SECONDS:'60',AUTOMATION_MANUAL_OVERRIDE_MINUTES:'15',AUTOMATION_MAX_READING_AGE_SECONDS:'300'});
    Object.assign(process.env,env);process.chdir(run);
    // Prevent Prisma's optional env discovery from reading repository environment files.
    const read=fs.readFileSync,exists=fs.existsSync;const blocked=f=>typeof f==='string'&&path.resolve(f).toLowerCase().startsWith(REPO.toLowerCase()+path.sep)&&/^\.env(?:\.|$)/.test(path.basename(f));
    fs.existsSync=function(f){return blocked(f)?false:exists.apply(this,arguments);};fs.readFileSync=function(f){if(blocked(f))throw Error('DEV_ENV_READ_REFUSED');return read.apply(this,arguments);};
    require(path.join(REPO,'backend/node_modules/tsx/dist/cjs/index.cjs'));
    const {PrismaClient}=require(path.join(REPO,'backend/node_modules/@prisma/client'));client=new PrismaClient({datasourceUrl:env.DATABASE_URL,log:[]});
    const [dbIdentity]=await client.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port');assert.equal(dbIdentity.db,DB);assert.equal(dbIdentity.role,ROLE.app);assert.equal(dbIdentity.port,55433);summary.appIdentity=dbIdentity;
    ingestionClient=require(path.join(REPO,'backend/src/config/database.ts')).prisma;
    const acceptance=require('./mvp-dev-acceptance.cjs');stage='SEED';const fixtures=await acceptance.seed(client,credentials.userPassword);summary.fixtures=fixtures;
    function start(label,file,environment){const child=fork(file,[],{cwd:run,env:environment,stdio:['pipe','pipe','pipe','ipc'],execArgv:[]});let out='',err='';child.stdout.on('data',x=>{if(out.length<524288)out+=clean(x);});child.stderr.on('data',x=>{if(err.length<524288)err+=clean(x);});const row={label,child,startedAt:new Date().toISOString(),exit:null,output:()=>out};child.on('exit',(code,signal)=>row.exit={code,signal});row.flush=()=>{fs.writeFileSync(path.join(run,label+'.stdout.log'),out,{flag:'wx'});fs.writeFileSync(path.join(run,label+'.stderr.log'),err,{flag:'wx'});};children.push(row);event(label,{pid:child.pid,startedAt:row.startedAt});return row;}
    stage='BACKEND';const backend=start('backend',path.join(__dirname,'mvp-dev-backend.cjs'),env);
    await acceptance.ready('http://127.0.0.1:55001/api/health',backend);summary.backendHealth=await acceptance.health();
    let attestation;const attestationDeadline=Date.now()+2000;do{attestation=backend.output().match(/MQTT pump safety runtime: (\{[^\r\n]+\})/);if(!attestation)await sleep(25);}while(!attestation&&!backend.exit&&Date.now()<attestationDeadline);assert.ok(attestation,'SERVING_RUNTIME_ATTESTATION_REQUIRED');summary.backendRuntime=JSON.parse(attestation[1]);assert.equal(summary.backendRuntime.pid,backend.child.pid);assert.equal(summary.backendRuntime.commandsEnabled,false);assert.equal(summary.backendRuntime.automationEnabled,false);assert.equal(summary.backendRuntime.testMode,true);assert.equal(summary.backendRuntime.effectiveMaxRunSeconds,1);
    stage='FRONTEND';const frontend=start('frontend',path.join(__dirname,'mvp-dev-frontend.mjs'),closed({VITE_API_BASE_URL:'http://127.0.0.1:55001/api',MVP_EMPTY_ENV_DIR:path.join(run,'empty-env')}));
    await acceptance.ready('http://127.0.0.1:55173',frontend);
    stage='ACCEPTANCE';summary.acceptance=await acceptance.run({client,credentials,fixtures,run,clean});
    stage='FINAL';summary.commands=await client.deviceCommand.count();assert.equal(summary.commands,0);summary.pending=await client.deviceCommand.count({where:{status:'PENDING'}});assert.equal(summary.pending,0);summary.status=summary.acceptance.failures.length?'PARTIAL':'PASS';
  } catch(error) {if(stage==='CLUSTER_START')unknownNative=true;summary.status='BLOCKED';summary.failure={stage,code:clean(error.code||error.message).slice(0,250)};event('STOP',{stage,code:summary.failure.code});}
  finally {
    if(ingestionClient)await ingestionClient.$disconnect().catch(()=>{});
    if(client)await client.$disconnect().catch(()=>{});
    summary.processes=[];
    for(const row of children.reverse()){
      if(!row.exit&&row.child.connected)row.child.send('STOP');const until=Date.now()+15000;while(!row.exit&&Date.now()<until)await sleep(100);
      row.flush();summary.processes.push({label:row.label,pid:row.child.pid,startedAt:row.startedAt,exit:row.exit,graceful:row.exit?.code===0&&!row.exit?.signal});
      if(!row.exit){summary.status='PARTIAL';summary.unresolvedProcess=true;}
    }
    if(clusterStarted&&!unknownNative&&!summary.unresolvedProcess){
      try {let active;
        if(adminAuthenticated&&direct&&!direct.exit)active=Number((await sql('postgres',ROLE.admin,null,"SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type='client backend';")).trim());
        else{const sockets=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-NetTCPConnection -State Established -ErrorAction Stop|Where-Object LocalPort -eq 55433).Count"],{encoding:'utf8',windowsHide:true,env:closed()});assert.equal(sockets.status,0);assert.equal(sockets.stderr,'');active=Number(sockets.stdout.trim());assert.ok(Number.isInteger(active));}
        if(direct){const terminal=await direct.finish();summary.directPsqlNativeExit=terminal;fs.writeFileSync(path.join(run,'direct-psql.stderr.log'),clean(direct.stderr),{flag:'wx'});if(!terminal){summary.clusterDisposition='LEFT_RUNNING_DIRECT_AUTH_UNKNOWN';summary.status='BLOCKED';unknownNative=true;throw Error('DIRECT_PSQL_STILL_ACTIVE_NO_KILL');}}
        if(active!==0){summary.clusterDisposition='LEFT_RUNNING_OTHER_CLIENTS';summary.status='PARTIAL';}
        else{await native('cluster-stop',path.join(BIN,'pg_ctl.exe'),['stop','-D',DATA,'-m','smart','-w','-t','20'],{},'',30000);summary.clusterDisposition='STOPPED_GRACEFULLY';summary.finalControl=preflight();}
      } catch(e){summary.clusterDisposition='NOT_VERIFIED_NO_FORCE_KILL';summary.status='PARTIAL';}
    } else summary.clusterDisposition=unknownNative?'UNKNOWN_NATIVE_STOP_NO_RETRY':clusterStarted?'LEFT_RUNNING_UNRESOLVED_PROCESS':'NOT_STARTED';
    summary.endedAt=new Date().toISOString();summary.safety={production5432Touched:false,production5000Started:false,realMqttCommandsSent:0,automationEnabled:false,physicalPumpTriggered:false,initdbPerformed:false};
    write(path.join(run,'summary.json'),summary);console.log(JSON.stringify({status:summary.status,stage,run,clusterDisposition:summary.clusterDisposition}));
    for(const key of Object.keys(credentials))credentials[key]=null;
    if(summary.status!=='PASS')process.exitCode=1;
  }
}
async function main(args){if(args.length===1&&args[0]==='--prepare')return prepare();if(args.length===2&&args[0]==='--execute')return execute(path.resolve(args[1]));throw Error('DEV_EXPLICIT_MODE_REQUIRED');}
module.exports={scram,url,migrations,preflight};
if(require.main===module)main(process.argv.slice(2)).catch(()=>{console.error('MVP_DEV_RUNNER_STOPPED_NO_RETRY');process.exitCode=1;});
