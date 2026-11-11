// Approved Phase13.5C.6: EXACT single recovery cluster and single DB restore.
// No .env, production credentials, gateway, server startup, reference DB or fallback.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{PrismaClient}=require('@prisma/client');
const c=require('./phase13-5c5-recovery-contract.cjs'),copy=require('./phase13-5c6-archive-compare.cjs');
const p=c.PLAN,bin='C:/Program Files/PostgreSQL/17/bin',repo=path.resolve(__dirname,'../..');
const isResume=process.argv[2]==='--approved-phase13-5c6-resume';
const privateFile=path.join(p.evidence,isResume?'restore-result-resume-01.private.json':'restore-result.private.json'),publicFile=path.join(repo,isResume?'report/phase13-5c6-resume-01-outcome.json':'report/phase13-5c6-outcome.json');
const q=s=>"'"+String(s).replaceAll("'","''")+"'", sha=s=>createHash('sha256').update(s).digest('hex');
// Windows PowerShell 5 Set-Content -Encoding UTF8 emits BOM; accept it explicitly.
function parseJson(text){return JSON.parse(String(text).replace(/^\uFEFF/,''));}
function assertNativeResult(result,label){if(result.error||result.status!==0)throw Error('NATIVE_FAILED_'+label);}
const e={startedAt:new Date().toISOString(),operations:[],checks:[],restoreAttempted:false,restoreExit:null,clusterStarted:false,clusterStopped:false,cloudBackupScope:'NOT_VERIFIED',sourceSnapshotIndependentEquality:'NOT_VERIFIED',physicalPumpTriggered:false};
let password,registered,startProof,productionProof,startedByThisSession=false,sessionOutputSafe=false;const clients=[];
function save(){fs.writeFileSync(privateFile,JSON.stringify(e,null,2));}
function native(exe,args,label,{input,privateStdout=true,timeout=120000}={}){
 const at=Date.now(),env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|^DATABASE_URL$/i.test(k)));
 Object.assign(env,{PGHOST:p.host,PGPORT:String(p.port),PGUSER:p.admin,PGPASSWORD:password,PGCLIENTENCODING:'UTF8',PGOPTIONS:'-c timezone=UTC -c datestyle=ISO -c intervalstyle=postgres -c extra_float_digits=3'});
 const r=spawnSync(path.join(bin,exe),args,{input,encoding:'utf8',windowsHide:true,timeout,maxBuffer:128*1024*1024,env});delete env.PGPASSWORD;
 const entry={label,executable:exe,exitCode:r.status,elapsedMs:Date.now()-at,timedOut:r.error?.code==='ETIMEDOUT'};e.operations.push(entry);
 const logLabel=(isResume?'resume-01-':'')+label;
 if(privateStdout)fs.writeFileSync(path.join(p.logs,logLabel+'.stdout.private.log'),r.stdout||'',{flag:'wx'});
 fs.writeFileSync(path.join(p.logs,logLabel+'.stderr.private.log'),r.stderr||'',{flag:'wx'});save();
 assertNativeResult(r,label);return r.stdout;
}
function control(requireShutdown=false){const out=native('pg_controldata.exe',[p.pgdata],'control-'+e.operations.length);const id=out.match(/Database system identifier:\s*(\d+)/)?.[1];if(!id||[c.PRODUCTION_SYSTEM,c.SYNTHETIC_TEST_SYSTEM].includes(id)||(isResume&&id!=='7699532241714573532'))throw Error('RECOVERY_CONTROL_ID_INVALID');if(requireShutdown&&!/Database cluster state:\s*shut down\s*(?:\r?\n|$)/.test(out))throw Error('RECOVERY_NOT_SHUT_DOWN');return id;}
function client(database){if(!['postgres',p.database].includes(database))throw Error('RECOVERY_DATABASE_REFUSED');const u=new URL(`postgresql://${p.host}:${p.port}/${database}`);u.username=p.admin;u.password=password;u.searchParams.set('schema','public');u.searchParams.set('connection_limit','1');const db=new PrismaClient({datasourceUrl:u.href});clients.push(db);return db;}
async function verify(db,database){
 if(productionProof){process.kill(productionProof.ListenerBefore,0);const h=await (await fetch('http://127.0.0.1:5000/api/health',{signal:AbortSignal.timeout(5000)})).json();if(h.data?.database!=='connected'||h.data?.mqtt!=='connected')throw Error('PRODUCTION_HEALTH_CHANGED_STOP');}
 const [i]=await db.$queryRawUnsafe(c.IDENTITY_SQL);const a={systemId:i.system_id,host:i.host,port:i.port,pgdata:i.pgdata,schema:i.schema,user:i.user,versionNum:i.version_num,inRecovery:i.in_recovery,database:i.database};
 // Only maintenance DB is allowed during provisioning; use the same fixed identity checks.
 c.assertIdentity({...a,database:p.database},registered);
 if(a.database!==database||!['postgres',p.database].includes(database))throw Error('ACTUAL_DATABASE_MISMATCH');
 const [{started}]=await db.$queryRawUnsafe('SELECT pg_postmaster_start_time()::text AS started');if(startProof&&startProof!==started)throw Error('RECOVERY_SERVER_CHANGED');startProof=started;
 return a;
}
async function check(name,work){const value=await work();e.checks.push({name,status:'PASS'});save();return value;}
function listen(){return new Promise(resolve=>{const s=net.connect({host:p.host,port:p.port});s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>resolve(false));});}
async function main(){
 if(!['--approved-phase13-5c6','--approved-phase13-5c6-resume'].includes(process.argv[2]))throw Error('EXPLICIT_PHASE_APPROVAL_REQUIRED');
 if(fs.existsSync(privateFile)||fs.existsSync(publicFile))throw Error('SESSION_EVIDENCE_ALREADY_EXISTS_NO_OVERWRITE');
 sessionOutputSafe=true;
 if(isResume){
  const approval=parseJson(fs.readFileSync(path.join(p.evidence,'resume-01.approval.private.json'),'utf8'));
  if(approval.reference!=='USER_APPROVED_CONTROLLED_RESTORE_RESUME_7699532241714573532'||approval.expectedSystemId!=='7699532241714573532')throw Error('EXACT_RESUME_APPROVAL_REQUIRED');
  if(fs.existsSync(privateFile)||fs.existsSync(publicFile)||fs.existsSync(path.join(p.evidence,'restore.attempt.private.json')))throw Error('RESUME_OR_RESTORE_ALREADY_ATTEMPTED');
 }
 const credentials=parseJson(fs.readFileSync(0,'utf8'));password=credentials.password;
 if(typeof password!=='string'||password.length<12||/[\r\n\0]/.test(password))throw Error('NEW_LOCAL_RECOVERY_CREDENTIAL_REQUIRED');
 if(await listen())throw Error('RECOVERY_PORT_ALREADY_OCCUPIED');
 const provision=parseJson(fs.readFileSync(path.join(p.evidence,'provision.private.json'),'utf8'));
 if(provision.approval!=='PHASE13.5C.6_USER_ATTACHMENT_98f24106'||provision.initdbExitCode!==0||provision.ntfsVerified!==true)throw Error('APPROVED_INITDB_EVIDENCE_REQUIRED');
 productionProof=parseJson(fs.readFileSync(path.join(p.evidence,isResume?'production-before-resume-01.private.json':'production-before.private.json'),'utf8'));
 if(productionProof.Runtime.commandsEnabled!==false||productionProof.Runtime.automationEnabled!==false||productionProof.Runtime.testMode!==true||productionProof.Runtime.effectiveMaxRunSeconds!==1)throw Error('UNSAFE_PRODUCTION_BASELINE');
 registered=control(true);e.registeredSystemId=registered;fs.writeFileSync(path.join(p.evidence,'registered-identity.private.json'),JSON.stringify({systemId:registered,pgdata:p.pgdata,port:p.port,approval:provision.approval,registeredAt:new Date().toISOString()},null,2),{flag:'wx'});
 if(fs.readFileSync(path.join(p.pgdata,'PG_VERSION'),'utf8').trim()!=='17')throw Error('PG17_REQUIRED');
 if(sha(fs.readFileSync(p.dump)).toUpperCase()!==p.sha256)throw Error('BACKUP_HASH_MISMATCH');
 const manifest=parseJson(fs.readFileSync(path.join(path.dirname(p.dump),'backup-manifest.private.json'),'utf8'));
 startedByThisSession=true;native('pg_ctl.exe',['-D',p.pgdata,'-w','-t','30','-l',path.join(p.logs,isResume?'postgres-resume-01.private.log':'postgres.private.log'),'start'],'start',{timeout:35000});e.clusterStarted=true;save();
 const admin=client('postgres');e.maintenanceIdentity=await verify(admin,'postgres');
 await check('loopback SCRAM and port configuration',async()=>{const settings=await admin.$queryRawUnsafe("SELECT name,setting FROM pg_settings WHERE name IN ('listen_addresses','port','password_encryption') ORDER BY name");assert.deepEqual(settings,[{name:'listen_addresses',setting:'127.0.0.1'},{name:'password_encryption',setting:'scram-sha-256'},{name:'port',setting:'55434'}]);const hba=await admin.$queryRawUnsafe('SELECT type,address,auth_method,error FROM pg_hba_file_rules');assert(hba.every(r=>!r.error&&r.auth_method==='scram-sha-256'&&(r.type==='local'||r.address==='127.0.0.1')));});
 await check('fresh role and database names',async()=>{assert.equal((await admin.$queryRawUnsafe("SELECT rolname FROM pg_roles WHERE rolname IN ('postgres','sa_recovery_probe')")).length,0);assert.equal((await admin.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',p.database)).length,0);});
 await verify(admin,'postgres');
 await admin.$executeRawUnsafe('CREATE ROLE postgres NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
 const props=manifest.Identity.database_properties;
 if(props.encoding!=='UTF8'||props.collate!=='English_United States.1252'||props.ctype!==props.collate||props.owner!=='postgres')throw Error('ARCHIVE_LOCALE_OR_OWNER_NOT_REVIEWED');
 await verify(admin,'postgres');await admin.$executeRawUnsafe(`CREATE DATABASE "${p.database}" OWNER postgres TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER libc LC_COLLATE ${q(props.collate)} LC_CTYPE ${q(props.ctype)}`);
 const db=client(p.database);const identity=await verify(db,p.database);
 const [emptiness]=await db.$queryRawUnsafe(`SELECT
 (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema') AS "userRelations",
 (SELECT count(*)::int FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema') AS "userRoutines",
 (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema') AS "userTypes",
 (SELECT count(*)::int FROM pg_extension WHERE extname<>'plpgsql') AS "nonDefaultExtensions",
 (SELECT array_agg(nspname::text ORDER BY nspname) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema') AS "userSchemas"`);
 const args=c.restoreArgs({...identity,...emptiness},registered,p.dump,{restoreApproved:true,archiveSha256:p.sha256});e.emptyTarget=emptiness;e.targetIdentity=identity;save();
 // Role/DB ACL explicit mapping, no replay of globals and no production credential.
 await verify(db,p.database);await db.$executeRawUnsafe(`REVOKE ALL ON DATABASE "${p.database}" FROM PUBLIC`);
 await db.$executeRawUnsafe(`SET ROLE postgres`);try{await db.$executeRawUnsafe(`GRANT CONNECT,TEMPORARY ON DATABASE "${p.database}" TO PUBLIC`);}finally{await db.$executeRawUnsafe('RESET ROLE');}
 fs.writeFileSync(path.join(p.evidence,'restore.attempt.private.json'),JSON.stringify({approval:provision.approval,systemId:registered,database:p.database,archiveSha256:p.sha256,at:new Date().toISOString()}),{flag:'wx'});
 await verify(db,p.database);e.restoreAttempted=true;save();const restoreAt=Date.now();native('pg_restore.exe',args,'restore',{timeout:180000});e.restoreExit=0;e.restoreElapsedMs=Date.now()-restoreAt;save();
 await verify(db,p.database);
 const pre=parseJson(fs.readFileSync(path.join(repo,'report/phase13-5c4-production-inventory.json'),'utf8'));
 const post=parseJson(fs.readFileSync(path.join(repo,'report/phase13-5c4-production-inventory-after.json'),'utf8'));
 const snapshot=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
  const columns=await tx.$queryRawUnsafe("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('devices','actuators','sensor_readings','device_commands','automation_rules') ORDER BY table_name,ordinal_position");
  const constraints=await tx.$queryRawUnsafe("SELECT c.relname AS table_name,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname");
  const indexes=await tx.$queryRawUnsafe("SELECT t.relname AS table_name,c.relname AS name,i.indisunique,i.indisvalid,pg_get_indexdef(c.oid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY c.relname");
  const enums=await tx.$queryRawUnsafe("SELECT t.typname,array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS labels FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname");
  const relations=await tx.$queryRawUnsafe("SELECT c.relname,c.relkind,r.rolname AS owner,c.relacl::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' ORDER BY c.relname");
  const functions=await tx.$queryRawUnsafe("SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname");
  const triggers=await tx.$queryRawUnsafe("SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY c.relname,t.tgname");
  const migrations=await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
  const properties=(await tx.$queryRawUnsafe("SELECT pg_get_userbyid(datdba) AS owner,pg_encoding_to_char(encoding) AS encoding,datcollate AS collate,datctype AS ctype,datconnlimit AS connection_limit,datallowconn AS allow_connections FROM pg_database WHERE datname=current_database()"))[0];
  const acl=await tx.$queryRawUnsafe("SELECT pg_get_userbyid(a.grantor) AS grantor,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type AS privilege,a.is_grantable AS grantable FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a WHERE datname=current_database()");
  return {columns,constraints,indexes,enums,relations,functions,triggers,migrations,properties,acl};
 },{timeout:30000,isolationLevel:'RepeatableRead'});
 for(const key of ['columns','constraints','indexes','enums','functions'])await check('archive-era stable catalog '+key,async()=>{assert.deepEqual(pre[key],post[key]);assert.deepEqual(snapshot[key],pre[key]);});
 await check('all public object names and owners',async()=>{const norm=r=>r.map(({acl,...x})=>x);assert.deepEqual(norm(snapshot.relations),norm(pre.relations));assert(snapshot.relations.every(r=>r.owner==='postgres'));});
 await check('all indexes valid and constraints validated',async()=>{assert(snapshot.indexes.every(i=>i.indisvalid));assert(snapshot.constraints.every(k=>k.convalidated));});
 await check('11 archive migration rows and checksums',async()=>{const norm=rows=>rows.map(r=>({...r,finished_at:r.finished_at?new Date(r.finished_at).toISOString():null,rolled_back_at:r.rolled_back_at?new Date(r.rolled_back_at).toISOString():null}));assert.equal(snapshot.migrations.length,11);assert.deepEqual(norm(snapshot.migrations),norm(manifest.Identity.migrations));});
 await check('database properties and normalized ACL mapping',async()=>{const {acl,...expected}=props;assert.deepEqual(snapshot.properties,expected);const sort=a=>a.map(x=>JSON.stringify(x)).sort();assert.deepEqual(sort(snapshot.acl),sort(acl));});
 await check('all relation ACLs normalized, not skipped',async()=>{
  assert.deepEqual(pre.relations,post.relations);
  for(const r of pre.relations){const [match]=await db.$queryRawUnsafe(`SELECT
   (SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce(c.relacl,acldefault('r'::"char",c.relowner))) a)
   IS NOT DISTINCT FROM
   (SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce($1::aclitem[],acldefault('r'::"char",c.relowner))) a) AS equal
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname=$2`,r.acl,r.relname);assert.equal(match.equal,true);}
 });
 // Read-only archive extraction has no connection/target: NOT a second restore.
 const archiveData=native('pg_restore.exe',['--data-only','--file=-',p.dump],'archive-data-readonly',{privateStdout:false});
 const tables=copy.parseCopy(archiveData);assert(tables.length>0);e.data=[];
 const actualTables=snapshot.relations.filter(r=>r.relkind==='r').map(r=>r.relname).sort();assert.deepEqual(tables.map(t=>t.table).sort(),actualTables);
 for(const table of tables){await verify(db,p.database);const timestampFields=await db.$queryRawUnsafe("SELECT a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relnamespace='public'::regnamespace AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped AND a.atttypid='timestamptz'::regtype",table.table);const timestampColumns=table.columns.map((name,i)=>timestampFields.some(f=>f.attname===name)?i:-1).filter(i=>i>=0);const cols=table.columns.map(x=>'"'+x+'"').join(',');const sql=`BEGIN READ ONLY; SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle='ISO'; SET LOCAL intervalstyle='postgres'; SET LOCAL extra_float_digits=3; COPY public."${table.table}" (${cols}) TO STDOUT; COMMIT;`;const text=native('psql.exe',['-X','-q','-w','-h',p.host,'-p',String(p.port),'-U',p.admin,'-d',p.database,'-v','ON_ERROR_STOP=1','-c',sql],'copy-'+table.table,{privateStdout:false});e.data.push(copy.compareRows(table,text,{timestampColumns}));save();}
 await check('every archive COPY table data digest matches target',async()=>assert.equal(e.data.length,actualTables.length));
 await verify(db,p.database);await db.$executeRawUnsafe('CREATE ROLE sa_recovery_probe NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
 await check('non-admin role effective privileges and actual SELECT denied',async()=>{
  await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');const roles=await tx.$queryRawUnsafe("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname='sa_recovery_probe'");assert(Object.values(roles[0]).every(x=>x===false));const privileges=await tx.$queryRawUnsafe("SELECT has_database_privilege('sa_recovery_probe',current_database(),'CONNECT') AS connect,has_table_privilege('sa_recovery_probe','public.users','SELECT') AS read_users,has_table_privilege('sa_recovery_probe','public.device_commands','INSERT') AS write_commands,pg_has_role('sa_recovery_probe','postgres','MEMBER') AS owner_member");assert.equal(privileges[0].connect,true);assert.equal(privileges[0].read_users,false);assert.equal(privileges[0].write_commands,false);assert.equal(privileges[0].owner_member,false);});
  let denied=false;try{await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe('SET LOCAL ROLE sa_recovery_probe');await tx.$queryRawUnsafe('SELECT count(*)::int FROM public.users');});}catch(err){denied=err.meta?.code==='42501';}assert(denied);
 });
 e.catalogSummary={tables:actualTables.length,columns:snapshot.columns.length,constraints:snapshot.constraints.length,indexes:snapshot.indexes.length,enums:snapshot.enums.length,functions:snapshot.functions.length,triggers:snapshot.triggers.length,migrations:11,totalRows:e.data.reduce((n,x)=>n+x.rows,0)};
 fs.writeFileSync(path.join(p.evidence,isResume?'restored-catalog-resume-01.private.json':'restored-catalog.private.json'),JSON.stringify(snapshot,null,2),{flag:'wx'});e.status='PRODUCTION_DATA_RESTORE_PASS';e.comparison='PARTIAL_NO_ORIGINAL_SNAPSHOT_CATALOG_DIGEST_FULL_COLUMN_AND_TRIGGER_REFERENCE';save();
}
async function finish(){for(const db of clients)await db.$disconnect();if(startedByThisSession){try{if(control()!==registered)throw Error('STOP_IDENTITY_MISMATCH');native('pg_ctl.exe',['-D',p.pgdata,'-w','-t','30','-m','fast','stop'],'stop',{timeout:35000});e.clusterStopped=!(await listen());}catch{e.clusterStopped=false;e.stopError='RECOVERY_STOP_NOT_VERIFIED';}}password=null;if(sessionOutputSafe&&fs.existsSync(p.evidence)){save();const summary={startedAt:e.startedAt,endedAt:new Date().toISOString(),status:e.status||'NOT_VERIFIED',error:e.error,systemId:e.registeredSystemId,restoreAttempted:e.restoreAttempted,restoreExit:e.restoreExit,restoreElapsedMs:e.restoreElapsedMs,clusterStarted:e.clusterStarted,clusterStopped:e.clusterStopped,checks:e.checks,catalogSummary:e.catalogSummary,comparison:e.comparison,cloudBackupScope:'NOT_VERIFIED',physicalPumpTriggered:false};fs.writeFileSync(publicFile,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));}}
if(require.main===module)main().catch(err=>{e.error={type:err.name,code:err.code||null,reason:/^[A-Z0-9_]+$/.test(err.message)?err.message:'VERIFICATION_FAILED_REDACTED'};e.status='STOPPED_NO_RETRY';process.exitCode=1;}).finally(finish);
module.exports={parseJson,assertNativeResult};
