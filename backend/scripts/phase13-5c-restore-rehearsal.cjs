// Explicit approved TEST backup/restore. Fixed existing cluster; never loads .env.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{randomBytes,createHash}=require('node:crypto');
const {PrismaClient}=require('@prisma/client'),ctx=require('./phase13-3b-test-context.cjs');
const contract=require('./phase13-5c-backup-contract.cjs');
const root=path.resolve(__dirname,'../..'),bin='C:\\Program Files\\PostgreSQL\\17\\bin',pgdata=path.join(ctx.root,'data');
const runId=new Date().toISOString().replace(/\D/g,'').slice(0,14)+'_'+randomBytes(3).toString('hex');
const directory=path.join(ctx.root,'backup-restore-13-5c-'+runId),report=path.join(root,'report/phase13-5c-run-'+runId+'.json');
const restoreDb='smart_agriculture_restore_13_5c_'+runId,evidence={runId,startedAt:new Date().toISOString(),source:contract.SOURCE,restoreDb,tests:[],operations:[],startedCluster:false,stoppedCluster:false,productionBackupPerformed:false};
const clients=[],creds=()=>JSON.parse(fs.readFileSync(path.join(ctx.root,'credentials.json'),'utf8'));
const norm=s=>path.resolve(s).replaceAll('\\','/').toLowerCase(),quote=s=>"'"+String(s).replaceAll("'","''")+"'",sha=s=>createHash('sha256').update(s).digest('hex');
let admin,startProof,appLogin;
function save(){fs.writeFileSync(report,JSON.stringify(evidence,null,2));}
function control(){const r=spawnSync(path.join(bin,'pg_controldata.exe'),[pgdata],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);return {systemId:r.stdout.match(/Database system identifier:\s*(\d+)/)?.[1],state:r.stdout.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim()};}
const listening=()=>new Promise(r=>{const s=net.connect({host:'127.0.0.1',port:55433});s.once('connect',()=>{s.destroy();r(true);});s.once('error',()=>r(false));});
function pgctl(action){const args=['-D',pgdata,'-w','-t','30'];if(action==='start')args.push('-l',path.join(directory,'test-postgres.log'));else args.push('-m','fast');args.push(action);assert.equal(spawnSync(path.join(bin,'pg_ctl.exe'),args,{stdio:'ignore',windowsHide:true,timeout:35000}).status,0,'TEST_PG_CTL_FAILED');}
function client(database,user='phase13_test_admin',password=creds().admin){
  if(!['postgres',contract.SOURCE,restoreDb].includes(database)||!(user==='phase13_test_admin'||/^p135c_[a-z0-9_]+$/.test(user)))throw Error('TEST_CLIENT_TARGET_REFUSED');
  const url=new URL('postgresql://127.0.0.1:55433/'+database);url.username=user;url.password=password;url.searchParams.set('schema','public');url.searchParams.set('connection_limit','1');
  const c=new PrismaClient({datasourceUrl:url.href});clients.push(c);return c;
}
async function verify(c,database){
  const [i]=await c.$queryRawUnsafe("SELECT current_database() AS db,current_user AS role,inet_server_addr()::text AS host,inet_server_port() AS port,current_setting('data_directory') AS pgdata,(SELECT system_identifier::text FROM pg_control_system()) AS system_id,pg_postmaster_start_time()::text AS started");
  contract.testIdentity(i,database);if(startProof&&i.started!==startProof)throw Error('TEST_PROCESS_CHANGED');return i;
}
function native(executable,args,label,{sql,secret=false,password=creds().admin}={}){
  // Do not propagate libpq service overrides; password exists in child memory only.
  const started=Date.now(),r=spawnSync(path.join(bin,executable),args,{encoding:'utf8',input:sql,windowsHide:true,timeout:120000,maxBuffer:16*1024*1024,
    env:{...Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|^DATABASE_URL$/i.test(k))),DATABASE_URL:'',PGPASSWORD:password,PGHOST:'127.0.0.1',PGPORT:'55433',PGUSER:'phase13_test_admin'}});
  const item={label,executable,exitCode:r.status,elapsedMs:Date.now()-started,sqlstate:r.stderr?.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/)?.[1]||null};
  if(!secret){item.log=path.join(directory,label+'.log');fs.writeFileSync(item.log,(r.stdout||'')+(r.stderr||''));}
  evidence.operations.push(item);save();return {...item,stdout:secret?'REDACTED':r.stdout,stderr:secret?'REDACTED':r.stderr};
}
async function run(name,work){try{const details=await work();evidence.tests.push({name,status:'PASS',details});console.log('PASS '+name);}catch(e){evidence.tests.push({name,status:'FAIL',code:e.code||null,sqlstate:e.meta?.code||null,reason:e.name});throw e;}finally{save();}}
async function rejected(work,state,fragment){try{await work();throw Error('EXPECTED_REJECTION_MISSING');}catch(e){if(e.meta?.code!==state||fragment&&!String(e.message).includes(fragment))throw e;return {sqlstate:state,constraint:fragment||null};}}
// NULL ACL means PostgreSQL defaults, not no privileges. Compare expanded semantics.
function aclSql(column,owner,kind){return `(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable)
 ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,pg_get_userbyid(a.grantor)) FROM aclexplode(coalesce(${column},acldefault('${kind}',${owner}))) a)`;}
async function snapshot(c){
  return c.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
    const tables=await tx.$queryRawUnsafe(`SELECT c.relname,pg_get_userbyid(c.relowner) AS owner,${aclSql('c.relacl','c.relowner','r')} AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`);
    const data=[];for(const t of tables){if(!/^[a-z_]+$/.test(t.relname))throw Error('TABLE_IDENTIFIER_REFUSED');const [d]=await tx.$queryRawUnsafe(`SELECT count(*)::int AS rows,md5(coalesce(string_agg(j,'|' ORDER BY j),'')) AS data_hash FROM (SELECT row_to_json(t)::text AS j FROM public."${t.relname}" t) q`);data.push({table:t.relname,...d});}
    const columns=await tx.$queryRawUnsafe("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
    const constraints=await tx.$queryRawUnsafe("SELECT c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname,k.conname");
    const indexes=await tx.$queryRawUnsafe("SELECT c.relname AS name,i.indisvalid,pg_get_indexdef(c.oid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname");
    const enums=await tx.$queryRawUnsafe(`SELECT t.typname,pg_get_userbyid(t.typowner) AS owner,${aclSql('t.typacl','t.typowner','T')} AS acl,
      (SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)::text FROM pg_enum e WHERE e.enumtypid=t.oid) AS labels FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typtype='e' ORDER BY t.typname`);
    const triggers=await tx.$queryRawUnsafe("SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY c.relname,t.tgname");
    const functions=await tx.$queryRawUnsafe(`SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,${aclSql('p.proacl','p.proowner','f')} AS acl,pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY p.proname`);
    const schema=await tx.$queryRawUnsafe(`SELECT nspname,pg_get_userbyid(nspowner) AS owner,${aclSql('nspacl','nspowner','n')} AS acl FROM pg_namespace WHERE nspname='public'`);
    const database=await tx.$queryRawUnsafe(`SELECT pg_get_userbyid(datdba) AS owner,${aclSql('datacl','datdba','d')} AS acl FROM pg_database WHERE datname=current_database()`);
    const migrations=await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
    return {tables,data,columns,constraints,indexes,enums,triggers,functions,schema,database,migrations};
  },{timeout:30000,isolationLevel:'RepeatableRead'});
}
async function main(){
  if(process.argv[2]!=='--approved-phase13-5c-test')throw Error('EXPLICIT_TEST_REHEARSAL_APPROVAL_REQUIRED');
  contract.restoreTarget(restoreDb);
  for(const p of ['C:\\DATN','C:\\DATN\\test-instances',ctx.root,pgdata])if(norm(fs.realpathSync.native(p))!==norm(p)||fs.lstatSync(p).isSymbolicLink())throw Error('TEST_REPARSE_REFUSED');
  assert.equal(fs.readFileSync(path.join(pgdata,'PG_VERSION'),'utf8').trim(),'17');evidence.controlBefore=control();assert.deepEqual(evidence.controlBefore,{systemId:contract.TEST_SYSTEM,state:'shut down'});assert.equal(await listening(),false);
  const conf=fs.readFileSync(path.join(pgdata,'postgresql.conf'),'utf8');assert(/^[ \t]*port\s*=\s*55433\s*$/m.test(conf));assert(/^[ \t]*listen_addresses\s*=\s*'127\.0\.0\.1'\s*$/m.test(conf));
  fs.mkdirSync(directory,{recursive:false});save();
  try{
    pgctl('start');evidence.startedCluster=true;admin=client('postgres');evidence.identity=await verify(admin,'postgres');startProof=evidence.identity.started;
    const previous=JSON.parse(fs.readFileSync(path.join(root,'report/phase13-5b1-run-20261022070417_4deb58.json'),'utf8'));assert(previous.pass&&previous.stoppedCluster);
    const sourceEnv=previous.environments.find(e=>e.name===contract.SOURCE);assert(sourceEnv);
    const source=client(contract.SOURCE);await verify(source,contract.SOURCE);
    await run('source is approved synthetic rehearsal only, no DeviceCommand/MQTT readings',async()=>{
      assert.equal(await source.deviceCommand.count(),0);assert.equal(await source.automationRule.count(),0);assert.equal(await source.sensorReading.count({where:{source:'MQTT'}}),0);
      assert.equal(await source.device.count({where:{deviceCode:{not:'SYNTHETIC-13-5B1'}}}),0);return {source:contract.SOURCE,productionDataCopied:false};
    });
    evidence.sourceBefore=await snapshot(source);
    const dump=path.join(directory,'synthetic-rehearsal.dump');
    await run('pg_dump17 custom-format test backup exit0',async()=>{
      await verify(source,contract.SOURCE);assert(!fs.existsSync(dump));const r=native('pg_dump.exe',contract.dumpArgs(dump),'pg-dump');assert.equal(r.exitCode,0,'TEST_DUMP_FAILED');
      assert(fs.statSync(dump).size>0);assert.equal(fs.readFileSync(dump).subarray(0,5).toString(),'PGDMP');evidence.archive={path:dump,bytes:fs.statSync(dump).size,sha256:sha(fs.readFileSync(dump))};return evidence.archive;
    });
    await run('archive SHA256 stable and pg_restore --list exit0 with data/ACL/trigger entries',async()=>{
      const r=native('pg_restore.exe',['--list',dump],'archive-list');assert.equal(r.exitCode,0);for(const marker of ['TABLE DATA public irrigation_decision_logs','TRIGGER public irrigation_decision_logs','ACL public TABLE irrigation_decision_logs'])assert(r.stdout.includes(marker),marker);
      assert.equal(sha(fs.readFileSync(dump)),evidence.archive.sha256);return {sha256:evidence.archive.sha256,listExitCode:0};
    });
    await run('role metadata captured without passwords; identity role mapping prerequisites available',async()=>{
      const roles=await admin.$queryRawUnsafe('SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname IN ($1,$2,$3) ORDER BY rolname','phase13_test_admin',sourceEnv.migrator,sourceEnv.app);
      assert.equal(roles.length,3);const membership=await admin.$queryRawUnsafe('SELECT r.rolname AS role,m.rolname AS member,a.admin_option FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member WHERE r.rolname IN ($1,$2) ORDER BY r.rolname,m.rolname',sourceEnv.migrator,sourceEnv.app);
      fs.writeFileSync(path.join(directory,'roles-no-passwords.json'),JSON.stringify({roles,membership,mapping:'IDENTITY_ROLES_EXIST_ON_SAME_ISOLATED_CLUSTER'},null,2));return {roleNames:roles.map(r=>r.rolname),mapping:'IDENTITY',globalRoleRestorePerformed:false};
    });
    await run('test pg_dumpall roles-only excludes role passwords and captures native exit/hash',async()=>{
      await verify(admin,'postgres');const globals=path.join(directory,'test-roles-no-passwords.sql');
      const r=native('pg_dumpall.exe',['-h','127.0.0.1','-p','55433','-U','phase13_test_admin','-w','-l',contract.SOURCE,'--roles-only','--no-role-passwords','-f',globals],'test-role-globals');
      assert.equal(r.exitCode,0);const bytes=fs.readFileSync(globals);assert(bytes.length>0);assert(!/\bPASSWORD\s+'/i.test(bytes.toString('utf8')));
      evidence.globals={path:globals,bytes:bytes.length,sha256:sha(bytes),exitCode:r.exitCode,rolePasswordsIncluded:false,restored:false};return evidence.globals;
    });
    await run('create distinct empty restore database only after identity/existence gates',async()=>{
      await verify(admin,'postgres');assert.equal((await admin.$queryRawUnsafe('SELECT count(*)::int AS n FROM pg_database WHERE datname=$1',restoreDb))[0].n,0);
      await admin.$executeRawUnsafe(`CREATE DATABASE ${restoreDb} OWNER phase13_test_admin TEMPLATE template0`);return {restoreDb};
    });
    const restored=client(restoreDb);await verify(restored,restoreDb);
    assert.equal((await restored.$queryRawUnsafe("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'"))[0].n,0);
    await run('new restore database owner and CONNECT/TEMP/CREATE ACL mapping equals source',async()=>{
      // pg_restore without --create intentionally does not recreate the original DB name.
      // Restore DB-level properties explicitly ONLY on this verified fresh test DB.
      assert.equal(evidence.sourceBefore.database[0].owner,'phase13_test_admin');await verify(restored,restoreDb);
      await restored.$executeRawUnsafe(`REVOKE ALL ON DATABASE ${restoreDb} FROM PUBLIC`);
      for(const ace of evidence.sourceBefore.database[0].acl){
        assert(['CONNECT','TEMPORARY','CREATE'].includes(ace.privilege));assert(ace.grantor==='phase13_test_admin');
        assert(ace.grantee==='PUBLIC'||ace.grantee==='phase13_test_admin'||ace.grantee===sourceEnv.migrator||ace.grantee===sourceEnv.app);
        await restored.$executeRawUnsafe(`GRANT ${ace.privilege} ON DATABASE ${restoreDb} TO ${ace.grantee}${ace.grantable?' WITH GRANT OPTION':''}`);
      }
      return {owner:'phase13_test_admin',databaseNameMapped:true,acl:evidence.sourceBefore.database[0].acl,existingDatabaseModified:false};
    });
    await run('actual pg_restore preserves owners/ACLs, single transaction, exit0',async()=>{
      await verify(restored,restoreDb);const r=native('pg_restore.exe',contract.restoreArgs(restoreDb,dump),'pg-restore');assert.equal(r.exitCode,0,'TEST_RESTORE_FAILED');evidence.restoreElapsedMs=r.elapsedMs;return {exitCode:r.exitCode,elapsedMs:r.elapsedMs,noClean:true,ownersAndAclsPreserved:true};
    });
    evidence.restoredBeforeProbes=await snapshot(restored);
    for(const key of ['tables','data','columns','constraints','indexes','enums','triggers','functions','schema','database','migrations'])await run('restored '+key+' equals original source snapshot',async()=>{assert.deepEqual(evidence.restoredBeforeProbes[key],evidence.sourceBefore[key]);return {equal:true,count:evidence.sourceBefore[key].length};});
    await run('restore contains six ledgers, 14 RESTRICT FK and v2 checks',async()=>{
      const fks=evidence.restoredBeforeProbes.constraints.filter(k=>k.relname.startsWith('irrigation_')&&k.contype==='f');assert.equal(fks.length,14);assert(fks.every(k=>k.convalidated&&k.definition.includes('ON UPDATE RESTRICT ON DELETE RESTRICT')));
      for(const name of ['irrigation_v2_settlement','irrigation_v2_dispatch_order'])assert(evidence.restoredBeforeProbes.constraints.some(k=>k.conname===name));return {fkCount:fks.length};
    });
    appLogin='p135c_'+runId.replaceAll('_','')+'_app';const appPass=randomBytes(32).toString('hex');await verify(admin,'postgres');
    const loginSql=`SET log_statement='none'; SET log_min_error_statement='panic'; CREATE ROLE ${appLogin} LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${quote(appPass)}; GRANT ${sourceEnv.app} TO ${appLogin};`;
    const provision=native('psql.exe',['-X','-w','-h','127.0.0.1','-p','55433','-U','phase13_test_admin','-d',restoreDb,'-v','ON_ERROR_STOP=1'],'test-login',{sql:loginSql,secret:true});assert.equal(provision.exitCode,0,'TEST_APP_PROVISION_FAILED');
    const app=client(restoreDb,appLogin,appPass);
    await run('restored app has real non-admin login, no ownership/CREATE/migrator membership',async()=>{
      const [i]=await app.$queryRawUnsafe(`SELECT current_database() AS db,current_user AS role,session_user AS session_role,inet_server_port() AS port,
        has_schema_privilege(current_user,'public','CREATE') AS create_schema,pg_has_role(current_user,$1,'MEMBER') AS owner_member,
        (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls FROM pg_roles WHERE rolname=current_user) AS unsafe`,sourceEnv.migrator);
      assert.equal(i.db,restoreDb);assert.equal(i.port,55433);assert.equal(i.role,appLogin);assert.equal(i.session_role,appLogin);assert.equal(i.create_schema,false);assert.equal(i.owner_member,false);assert.equal(i.unsafe,false);return i;
    });
    for(const [name,sql]of [['audit UPDATE',"UPDATE public.irrigation_decision_logs SET reason_code='FORBIDDEN' WHERE id='audit0'"],['audit DELETE',"DELETE FROM public.irrigation_decision_logs WHERE id='audit0'"],['audit TRUNCATE','TRUNCATE public.irrigation_decision_logs'],['legacy command INSERT','INSERT INTO public.device_commands DEFAULT VALUES'],['legacy command UPDATE',"UPDATE public.device_commands SET status='SUCCESS' WHERE false"],['CREATE schema object','CREATE TABLE public.forbidden_restore_app(id int)']])
      await run('restored effective app denied '+name,()=>rejected(()=>app.$executeRawUnsafe(sql),'42501'));
    await run('restored SHADOW fence blocks ACTIVE',()=>rejected(()=>app.$executeRawUnsafe("UPDATE public.irrigation_daily_budgets SET mode='ACTIVE' WHERE id='budget0'"),'23514','shadow_fence'));
    await run('restored settlement CHECK blocks invalid charge',()=>rejected(()=>app.$executeRawUnsafe("UPDATE public.irrigation_budget_reservations SET status='CHARGED' WHERE id='reservation0'"),'23514','irrigation_v2_settlement'));
    await run('restored dispatch-order CHECK blocks publish without claim',()=>rejected(()=>app.$executeRawUnsafe("UPDATE public.irrigation_command_intents SET published_at=now() WHERE id='intent0'"),'23514','irrigation_v2_dispatch_order'));
    await run('restored audit trigger blocks owner even beyond app ACL denial',async()=>{
      await verify(restored,restoreDb);return rejected(()=>restored.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL ROLE '+sourceEnv.migrator);await tx.$executeRawUnsafe("UPDATE public.irrigation_decision_logs SET reason_code='FORBIDDEN' WHERE id='audit0'");}),'P0001','IRRIGATION_AUDIT_APPEND_ONLY');
    });
    await run('all rejected probes leave restored data and original source unchanged',async()=>{
      const after=await snapshot(restored),sourceAfter=await snapshot(source);assert.deepEqual(after,evidence.restoredBeforeProbes);assert.deepEqual(sourceAfter,evidence.sourceBefore);evidence.sourceUnchanged=true;return {sourceUnchanged:true,restoreUnchanged:true};
    });
    await run('corrupted custom archive detected without connecting a restore target',async()=>{
      const corrupted=path.join(directory,'synthetic-corrupt-header.dump'),bytes=fs.readFileSync(dump);bytes[0]=0;fs.writeFileSync(corrupted,bytes);
      const r=native('pg_restore.exe',['--list',corrupted],'corrupt-archive-rejected');assert.notEqual(r.exitCode,0);return {exitCode:r.exitCode,databaseConnected:false};
    });
    evidence.pass=true;
  }finally{
    if(admin&&appLogin){try{await verify(admin,'postgres');await admin.$executeRawUnsafe('ALTER ROLE '+appLogin+' NOLOGIN');evidence.testLoginDisabled=true;}catch{evidence.testLoginDisabled=false;}}
    await Promise.all(clients.map(c=>c.$disconnect().catch(()=>{})));
    if(evidence.startedCluster){assert.equal(control().systemId,contract.TEST_SYSTEM);pgctl('stop');evidence.stoppedCluster=!await listening()&&control().state==='shut down';}
    evidence.finishedAt=new Date().toISOString();save();
  }
  console.log(JSON.stringify({report,passed:evidence.tests.filter(t=>t.status==='PASS').length,pass:evidence.pass,clusterStopped:evidence.stoppedCluster}));
}
if(require.main===module)main().catch(e=>{evidence.failure={name:e.name,code:e.code||null,reason:/^[A-Z_]+$/.test(e.message)?e.message:'REHEARSAL_SQL_OR_ASSERTION_FAILURE_REDACTED'};if(fs.existsSync(directory))save();console.error(JSON.stringify({report,failure:evidence.failure,clusterStopped:evidence.stoppedCluster}));process.exitCode=1;});
module.exports={aclSql};
