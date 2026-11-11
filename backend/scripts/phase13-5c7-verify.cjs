// Approved verification-only. Existing recovery database; no provisioning or restore-to-DB.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {PrismaClient}=require('@prisma/client'),c=require('./phase13-5c5-recovery-contract.cjs'),copy=require('./phase13-5c6-archive-compare.cjs'),ddl=require('./phase13-5c7-schema.cjs'),native=require('./phase13-5c7-native.cjs');
const p=c.PLAN,repo=path.resolve(__dirname,'../..'),bin='C:/Program Files/PostgreSQL/17/bin',tag='verification-c7-01',systemId='7699532241714573532';
const resultFile=path.join(p.evidence,tag+'.private.json'),reportFile=path.join(repo,'report/phase13-5c7-outcome.json');
const parse=s=>JSON.parse(s.replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const e={startedAt:new Date().toISOString(),operations:[],checks:[],data:[],identityVerified:false,startupCapturePass:false,clusterStopped:false,additionalRestoreCalls:0,sourceSnapshotEquality:'NOT_VERIFIED',cloudBackupScope:'NOT_VERIFIED',physicalPumpTriggered:false};
let password,db,production,began=false,maySave=false,startProof;
const save=()=>fs.writeFileSync(resultFile,JSON.stringify(e,null,2));
function listening(){return new Promise(resolve=>{const socket=net.connect({host:p.host,port:p.port});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));});}
function run(exe,args,label,timeout=60000){
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|^DATABASE_URL$/i.test(k)));
 Object.assign(env,{PGHOST:p.host,PGPORT:String(p.port),PGUSER:p.admin,PGPASSWORD:password,PGCLIENTENCODING:'UTF8',PGOPTIONS:'-c default_transaction_read_only=on -c timezone=UTC -c datestyle=ISO -c intervalstyle=postgres -c extra_float_digits=3'});
 const r=native.run(path.join(bin,exe),args,{directory:p.logs,label:tag+'-'+label,env,timeout});delete env.PGPASSWORD;
 e.operations.push({label,executable:exe,...r.metadata});save();native.assertResult(r.result);return r.stdout;
}
function control(shutdown=false){const s=run('pg_controldata.exe',[p.pgdata],'control-'+e.operations.length);if(!new RegExp('Database system identifier:\\s*'+systemId+'\\b').test(s))throw Error('RECOVERY_SYSTEM_ID_MISMATCH');if(shutdown&&!/Database cluster state:\s*shut down\s*(?:\r?\n|$)/.test(s))throw Error('RECOVERY_NOT_SHUT_DOWN');}
async function productionHealth(){process.kill(production.ListenerBefore,0);const r=await fetch('http://127.0.0.1:5000/api/health',{signal:AbortSignal.timeout(5000)});const h=await r.json();if(!r.ok||h.data?.database!=='connected'||h.data?.mqtt!=='connected')throw Error('PRODUCTION_HEALTH_CHANGED_STOP');}
async function read(work){return db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");return work(tx);},{timeout:60000,isolationLevel:'RepeatableRead'});}
async function identity(){await productionHealth();const i=await read(async tx=>{const [r]=await tx.$queryRawUnsafe(c.IDENTITY_SQL);const [{started}]=await tx.$queryRawUnsafe('SELECT pg_postmaster_start_time()::text AS started');if(startProof&&started!==startProof)throw Error('RECOVERY_PROCESS_CHANGED');startProof=started;return {systemId:r.system_id,host:r.host,port:r.port,pgdata:r.pgdata,schema:r.schema,user:r.user,versionNum:r.version_num,inRecovery:r.in_recovery,database:r.database};});c.assertIdentity(i,systemId);return i;}
async function check(name,fn){await identity();const detail=await fn();e.checks.push({name,status:'PASS',...(detail?{detail}:{})});save();}
const canon=x=>JSON.stringify(x),sortRows=rows=>rows.map(canon).sort();
async function main(){
 if(process.argv[2]!=='--approved-phase13-5c7')throw Error('EXPLICIT_VERIFICATION_APPROVAL_REQUIRED');
 if(fs.existsSync(resultFile)||fs.existsSync(reportFile))throw Error('VERIFICATION_EVIDENCE_EXISTS_NO_RETRY');maySave=true;
 const approval=parse(fs.readFileSync(path.join(p.evidence,tag+'.approval.private.json'),'utf8'));if(approval.reference!=='PHASE13.5C.7_ATTACHMENT_22ba947c'||approval.systemId!==systemId)throw Error('VERIFICATION_APPROVAL_MISMATCH');
 const credentials=parse(fs.readFileSync(0,'utf8'));password=credentials.password;if(typeof password!=='string'||password.length<12||/[\r\n\0]/.test(password))throw Error('RECOVERY_CREDENTIAL_INVALID');
 production=parse(fs.readFileSync(path.join(p.evidence,tag+'.production-before.private.json'),'utf8'));
 if(production.Runtime.commandsEnabled!==false||production.Runtime.automationEnabled!==false||production.Runtime.testMode!==true||production.Runtime.effectiveMaxRunSeconds!==1)throw Error('UNSAFE_PRODUCTION_FLAGS');
 const previous=parse(fs.readFileSync(path.join(repo,'report/phase13-5c6-resume-01-outcome.json'),'utf8'));
 const registered=parse(fs.readFileSync(path.join(p.evidence,'registered-identity.private.json'),'utf8')),marker=parse(fs.readFileSync(path.join(p.evidence,'restore.attempt.private.json'),'utf8'));
 if(previous.restoreExit!==0||!previous.clusterStopped||registered.systemId!==systemId||marker.systemId!==systemId||marker.database!==p.database||marker.archiveSha256!==p.sha256)throw Error('COMPLETED_RESTORE_EVIDENCE_MISMATCH');
 if(hash(fs.readFileSync(p.dump))!==p.sha256||fs.readFileSync(path.join(p.pgdata,'PG_VERSION'),'utf8').trim()!=='17'||await listening())throw Error('RECOVERY_PREFLIGHT_FAILED');
 control(true);await productionHealth();
 began=true;run('pg_ctl.exe',['-D',p.pgdata,'-w','-t','30','-l',path.join(p.logs,tag+'-postgres.private.log'),'start'],'start',35000);
 const url=new URL(`postgresql://${p.host}:${p.port}/${p.database}`);url.username=p.admin;url.password=password;url.searchParams.set('schema','public');url.searchParams.set('connection_limit','1');db=new PrismaClient({datasourceUrl:url.href});
 e.identity=await identity();e.identityVerified=true;
 await check('startup SQL config and exact database identity after clean native capture',async()=>read(async tx=>{const settings=await tx.$queryRawUnsafe("SELECT name,setting FROM pg_settings WHERE name IN ('listen_addresses','port','password_encryption') ORDER BY name");assert.deepEqual(settings,[{name:'listen_addresses',setting:'127.0.0.1'},{name:'password_encryption',setting:'scram-sha-256'},{name:'port',setting:'55434'}]);const hba=await tx.$queryRawUnsafe('SELECT address,auth_method,error FROM pg_hba_file_rules');assert(hba.length>0&&hba.every(r=>!r.error&&r.address==='127.0.0.1'&&r.auth_method==='scram-sha-256'));}));
 e.startupCapturePass=true;save();
 const manifest=parse(fs.readFileSync(path.join(path.dirname(p.dump),'backup-manifest.private.json'),'utf8'));
 const schemaSql=run('pg_restore.exe',['--schema-only','--file=-',p.dump],'archive-schema-readonly');
 const expectedTables=ddl.tables(schemaSql),expectedConstraints=ddl.constraints(schemaSql),expectedEnums=ddl.enums(schemaSql);
 const archiveData=run('pg_restore.exe',['--data-only','--file=-',p.dump],'archive-copy-readonly');const expectedData=copy.parseCopy(archiveData);
 const snapshot=await read(async tx=>{
  const columns=await tx.$queryRawUnsafe("SELECT c.relname AS table,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,pg_get_expr(d.adbin,d.adrelid) AS default,a.attnotnull AS \"notNull\",a.atttypid='timestamptz'::regtype AS is_timestamp FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum");
  const constraints=await tx.$queryRawUnsafe("SELECT c.relname AS table,k.conname AS name,pg_get_constraintdef(k.oid) AS definition,k.contype,k.convalidated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname,k.conname");
  const indexes=await tx.$queryRawUnsafe("SELECT t.relname AS table_name,c.relname AS name,i.indisunique,i.indisvalid,pg_get_indexdef(c.oid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname");
  const relations=await tx.$queryRawUnsafe("SELECT c.relname,c.relkind,r.rolname AS owner,c.relacl::text AS acl FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname");
  const enums=await tx.$queryRawUnsafe("SELECT t.typname AS name,array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typnamespace='public'::regnamespace GROUP BY t.typname ORDER BY t.typname");
  const functions=await tx.$queryRawUnsafe("SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY p.proname");
  const triggers=await tx.$queryRawUnsafe("SELECT t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY t.tgname");
  const migrations=await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
  const properties=(await tx.$queryRawUnsafe("SELECT pg_get_userbyid(datdba) AS owner,pg_encoding_to_char(encoding) AS encoding,datcollate AS collate,datctype AS ctype,datconnlimit AS connection_limit,datallowconn AS allow_connections FROM pg_database WHERE datname=current_database()"))[0];
  const databaseAcl=await tx.$queryRawUnsafe("SELECT pg_get_userbyid(a.grantor) AS grantor,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type AS privilege,a.is_grantable AS grantable FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a WHERE datname=current_database()");
  return {columns,constraints,indexes,relations,enums,functions,triggers,migrations,properties,databaseAcl};
 });
 await check('all 15 tables and every column/type/default/nullability match archive DDL',async()=>{const names=expectedTables.map(t=>t.table).sort();assert.deepEqual(snapshot.relations.filter(r=>r.relkind==='r').map(r=>r.relname).sort(),names);const expected=expectedTables.flatMap(t=>t.columns.map(col=>({table:t.table,...col})));const actual=snapshot.columns.map(({is_timestamp,...x})=>({...x,type:ddl.norm(x.type),default:x.default===null?null:ddl.norm(x.default)}));assert.deepEqual(sortRows(actual),sortRows(expected));});
 await check('every PK/FK/UNIQUE/CHECK matches archive and is validated',async()=>{assert(snapshot.constraints.every(r=>r.convalidated));assert.deepEqual(sortRows(snapshot.constraints.map(({table,name,definition})=>({table,name,definition:ddl.norm(definition)}))),sortRows(expectedConstraints));});
 const pre=parse(fs.readFileSync(path.join(repo,'report/phase13-5c4-production-inventory.json'),'utf8')),post=parse(fs.readFileSync(path.join(repo,'report/phase13-5c4-production-inventory-after.json'),'utf8'));
 await check('indexes definitions and validity match stable archive-era metadata',async()=>{assert.deepEqual(pre.indexes,post.indexes);assert.deepEqual(snapshot.indexes,pre.indexes);assert(snapshot.indexes.every(r=>r.indisvalid));});
 await check('all enums match archive DDL',async()=>assert.deepEqual(sortRows(snapshot.enums),sortRows(expectedEnums)));
 await check('function/trigger inventories match archive DDL',async()=>{const f=[...schemaSql.matchAll(/^CREATE (?:OR REPLACE )?FUNCTION /gm)].length,t=[...schemaSql.matchAll(/^CREATE TRIGGER /gm)].length;if(f||t)throw Error('NONEMPTY_FUNCTION_TRIGGER_DDL_REQUIRES_EXTENDED_PARSER');assert.equal(snapshot.functions.length,f);assert.equal(snapshot.triggers.length,t);});
 await check('all object owners and relation ACL semantics preserved',async()=>{
  assert.deepEqual(pre.relations,post.relations);assert.deepEqual(snapshot.relations.map(({acl,...x})=>x),pre.relations.map(({acl,...x})=>x));
  await read(async tx=>{for(const r of pre.relations){const [v]=await tx.$queryRawUnsafe(`SELECT
   (SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce(c.relacl,acldefault('r'::"char",c.relowner))) a)
   IS NOT DISTINCT FROM
   (SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce($1::aclitem[],acldefault('r'::"char",c.relowner))) a) AS equal
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname=$2`,r.acl,r.relname);assert.equal(v.equal,true);}});
 });
 await check('public schema and enum type ownership/ACL semantics',async()=>read(async tx=>{
  const schema=pre.schemaPrivileges.find(s=>s.nspname==='public');assert(schema);
  const [v]=await tx.$queryRawUnsafe(`SELECT pg_get_userbyid(n.nspowner) AS owner,
   (SELECT jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce(n.nspacl,acldefault('n'::"char",n.nspowner))) a)
   IS NOT DISTINCT FROM
   (SELECT jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY a.grantee,a.privilege_type,a.grantor) FROM aclexplode(coalesce($1::aclitem[],acldefault('n'::"char",n.nspowner))) a) AS equal
   FROM pg_namespace n WHERE n.nspname='public'`,schema.acl);assert.equal(v.owner,schema.owner);assert.equal(v.equal,true);
  if(/^(?:GRANT|REVOKE).*ON TYPE /m.test(schemaSql))throw Error('EXPLICIT_TYPE_ACL_REQUIRES_EXTENDED_PARSER');
  const types=await tx.$queryRawUnsafe("SELECT pg_get_userbyid(t.typowner) AS owner,coalesce(t.typacl,acldefault('T'::\"char\",t.typowner))=acldefault('T'::\"char\",t.typowner) AS default_acl FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typtype='e'");assert(types.every(t=>t.owner==='postgres'&&t.default_acl));
  const triggers=await tx.$queryRawUnsafe("SELECT t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND t.tgisinternal");assert(triggers.every(t=>t.tgenabled==='O'));
 }));
 await check('database properties and normalized ACL match manifest',async()=>{const {acl,...expected}=manifest.Identity.database_properties;assert.deepEqual(snapshot.properties,expected);assert.deepEqual(sortRows(snapshot.databaseAcl),sortRows(acl));});
 await check('11 Prisma migrations names/checksums/timestamps match snapshot manifest',async()=>{const norm=a=>a.map(r=>({...r,finished_at:r.finished_at?new Date(r.finished_at).toISOString():null,rolled_back_at:r.rolled_back_at?new Date(r.rolled_back_at).toISOString():null}));assert.equal(snapshot.migrations.length,11);assert.deepEqual(norm(snapshot.migrations),norm(manifest.Identity.migrations));});
 assert.deepEqual(expectedData.map(t=>t.table).sort(),expectedTables.map(t=>t.table).sort());
 for(const table of expectedData){await identity();const columns=snapshot.columns.filter(col=>col.table===table.table);assert.deepEqual(table.columns,columns.map(col=>col.name));const timestampColumns=columns.map((col,i)=>col.is_timestamp?i:-1).filter(i=>i>=0);const sql=`BEGIN READ ONLY; SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle='ISO'; SET LOCAL intervalstyle='postgres'; SET LOCAL extra_float_digits=3; COPY public."${table.table}" (${table.columns.map(x=>'"'+x+'"').join(',')}) TO STDOUT; COMMIT;`;
  const actual=run('psql.exe',['-X','-q','-w','-h',p.host,'-p',String(p.port),'-U',p.admin,'-d',p.database,'-v','ON_ERROR_STOP=1','-c',sql],'copy-'+table.table);
  try{e.data.push(copy.compareRows(table,actual,{timestampColumns}));}catch{e.mismatch={table:table.table,type:'COPY_TYPED_DIGEST_MISMATCH',typedTimestampColumnNames:columns.filter(col=>col.is_timestamp).map(col=>col.name),archiveRows:table.rows.length};throw Error('DATA_DIGEST_MISMATCH_NO_RAW_VALUES');}save();
 }
 await check('all tables COPY counts and typed SHA256 data digests equal archive',async()=>assert.equal(e.data.length,expectedData.length));
 await check('existing non-admin roles effective privileges read-only',async()=>read(async tx=>{const roles=await tx.$queryRawUnsafe("SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','pg_read_all_stats') ORDER BY rolname");assert.equal(roles.length,2);assert(roles.every(r=>!r.rolcanlogin&&!r.rolsuper&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolbypassrls));const [v]=await tx.$queryRawUnsafe("SELECT has_table_privilege('postgres','public.users','SELECT') AS owner_read,has_table_privilege('pg_read_all_stats','public.users','SELECT') AS monitor_read,has_table_privilege('pg_read_all_stats','public.device_commands','INSERT') AS monitor_write,pg_has_role('pg_read_all_stats','postgres','MEMBER') AS owner_member");assert.deepEqual(v,{owner_read:true,monitor_read:false,monitor_write:false,owner_member:false});}));
 await check('actual SELECT owner allowed and existing monitor role denied',async()=>{await read(async tx=>{await tx.$executeRawUnsafe('SET LOCAL ROLE postgres');await tx.$queryRawUnsafe('SELECT count(*)::int AS n FROM public.users');});let denied=false;try{await read(async tx=>{await tx.$executeRawUnsafe('SET LOCAL ROLE pg_read_all_stats');await tx.$queryRawUnsafe('SELECT count(*)::int AS n FROM public.users');});}catch(err){denied=err.meta?.code==='42501';}assert(denied);});
 e.summary={tables:e.data.length,totalRows:e.data.reduce((n,t)=>n+t.rows,0),columns:snapshot.columns.length,constraints:snapshot.constraints.length,indexes:snapshot.indexes.length,enums:snapshot.enums.length,functions:snapshot.functions.length,triggers:snapshot.triggers.length,migrations:snapshot.migrations.length};
 fs.writeFileSync(path.join(p.evidence,tag+'-catalog.private.json'),JSON.stringify(snapshot,null,2),{flag:'wx'});e.status='EXISTING_RESTORE_VERIFICATION_PASS';save();
}
async function finish(){if(db)await db.$disconnect();if(began){try{control();run('pg_ctl.exe',['-D',p.pgdata,'-w','-t','30','-m','fast','stop'],'stop',35000);control(true);e.clusterStopped=!(await listening());}catch{e.stopError='RECOVERY_SHUTDOWN_NOT_VERIFIED';}}password=null;if(maySave){e.endedAt=new Date().toISOString();save();const publicSummary={startedAt:e.startedAt,endedAt:e.endedAt,status:e.status||'STOPPED_NO_RETRY',error:e.error,mismatch:e.mismatch,identity:e.identity,identityVerified:e.identityVerified,startupCapturePass:e.startupCapturePass,checks:e.checks,summary:e.summary,clusterStopped:e.clusterStopped,additionalRestoreCalls:0,sourceSnapshotEquality:'NOT_VERIFIED',cloudBackupScope:'NOT_VERIFIED',physicalPumpTriggered:false};fs.writeFileSync(reportFile,JSON.stringify(publicSummary,null,2),{flag:'wx'});console.log(JSON.stringify(publicSummary));}}
if(require.main===module)main().catch(err=>{e.error={type:err.name,code:err.code||null,reason:/^[A-Z0-9_]+$/.test(err.message)?err.message:'VERIFICATION_ERROR_REDACTED'};e.status='STOPPED_NO_RETRY';process.exitCode=1;}).finally(finish);
