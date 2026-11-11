'use strict';
// Explicit D.1G approval ONLY. No production environment, URLs, data, archive or gateway imports.
const fs=require('node:fs'),path=require('node:path'),{spawnSync,spawn}=require('node:child_process'),crypto=require('node:crypto');
const {mappedSql,sha,DATA}=require('./phase13-5d1g-mapping.cjs');
const {MIGRATIONS}=require('./phase13-5d1d-contracts.cjs');
const ROOT='C:\\DATN\\test-instances\\phase13-5d1g',BIN='C:\\Program Files\\PostgreSQL\\17\\bin',REPO=path.resolve(__dirname,'..');
const PGDATA=path.join(ROOT,'data'),DB='smart_agriculture_d1g';
const evidence={phase:'13.5D.1G',startedAt:new Date().toISOString(),target:{host:'127.0.0.1',port:55435,data:DATA,database:DB},operations:[],tests:[],productionConnected:false,initdbAttempts:0};
let sequence=0,systemId=null,startAttempted=false,initialized=false;
let excludedSystemIds=['7472695863566132416','7699532241714573532'];
const passwords={d1g_dba:crypto.randomBytes(32).toString('hex'),d1g_reader:crypto.randomBytes(32).toString('hex'),d1g_other:crypto.randomBytes(32).toString('hex')};
const baseEnv={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:process.env.TEMP,TMP:process.env.TMP,PGCLIENTENCODING:'UTF8',PGTZ:'UTC',PGDATESTYLE:'ISO, YMD',PGCONNECT_TIMEOUT:'3'};
function writeNew(file,value){fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2),{flag:'wx'});}
function native(tool,args,input,label,timeout=10000,role) {
 if(!['initdb','pg_ctl','pg_controldata','psql'].includes(tool)||!/^[a-z0-9-]+$/.test(label))throw Error('TOOL_OR_LABEL_NOT_ALLOWLISTED');
 const stem=String(++sequence).padStart(3,'0')+'-'+label,out=path.join(ROOT,'logs',stem+'.stdout.log'),err=path.join(ROOT,'logs',stem+'.stderr.log');
 const outFd=fs.openSync(out,'wx');let errFd,r;const at=Date.now();
 try{errFd=fs.openSync(err,'wx');r=spawnSync(path.join(BIN,tool+'.exe'),args,{windowsHide:true,timeout,env:{...baseEnv,...(role?{PGPASSWORD:passwords[role]}:{})},input,
  encoding:'utf8',stdio:[input===undefined?'ignore':'pipe',outFd,errFd]});}finally{fs.closeSync(outFd);if(errFd!==undefined)fs.closeSync(errFd);}
 const stdoutBytes=fs.statSync(out).size,stderrBytes=fs.statSync(err).size;
 const meta={label,tool,exitCode:r.status,errorCode:r.error?.code||null,signal:r.signal||null,elapsedMs:Date.now()-at,stdoutBytes,stderrBytes,logStem:stem};
 evidence.operations.push(meta);writeNew(path.join(ROOT,'logs',stem+'.native.json'),meta);
 if(stdoutBytes>1048576||stderrBytes>1048576)throw Error('NATIVE_OUTPUT_LIMIT_STOP');
 return {...meta,stdout:fs.readFileSync(out,'utf8').replace(/^\uFEFF/,''),stderr:fs.readFileSync(err,'utf8').replace(/^\uFEFF/,'')};
}
function clean(r){if(r.errorCode||r.signal||r.exitCode!==0)throw Error('NATIVE_UNEXPECTED_OUTCOME_STOP_'+r.label);return r;}
function psql(sql,label,database=DB,role='d1g_dba') {
 if(!/^smart_agriculture_d1g(?:_(?:before|held|drift|pending|missing|object|principal|oid))?$/.test(database)&&database!=='postgres')throw Error('DATABASE_NOT_ALLOWLISTED');
 if(!Object.hasOwn(passwords,role))throw Error('ROLE_NOT_ALLOWLISTED');
 return native('psql',['-X','-w','-q','-A','-t','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h','127.0.0.1','-p','55435','-U',role,'-d',database,'-f','-'],sql,label,10000,role);
}
function control(){const r=clean(native('pg_controldata',[PGDATA],undefined,'control'));const id=r.stdout.match(/Database system identifier:\s*(\d+)/)?.[1],state=r.stdout.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim();if(!id||!state)throw Error('CONTROL_UNREADABLE_STOP');return{id,state};}
function identity(database=DB,role='d1g_dba') {
 const r=clean(psql("BEGIN READ ONLY; SELECT pg_catalog.json_build_object('database',current_database(),'role',current_user,'port',inet_server_port(),'address',host(inet_server_addr()),'data',current_setting('data_directory'),'systemId',(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),'version',current_setting('server_version_num')::integer,'startedAt',pg_postmaster_start_time(),'inRecovery',pg_is_in_recovery()); COMMIT;",'identity',database,role));
 const i=JSON.parse(r.stdout.trim());if(i.database!==database||i.role!==role||i.port!==55435||i.address!=='127.0.0.1'||i.data!==DATA||i.systemId!==systemId||i.version<170000||i.version>=180000||i.inRecovery!==false)throw Error('ISOLATED_SQL_IDENTITY_MISMATCH_STOP');return i;
}
function ddl(sql,label,database=DB){identity(database);return clean(psql(sql,label,database));}
function safeCreateRoot() {
 if(fs.existsSync(ROOT)||path.resolve(ROOT)!==ROOT)throw Error('TARGET_EXISTS_OR_NONCANONICAL_STOP');
 for(const p of ['C:\\','C:\\DATN','C:\\DATN\\test-instances'])if(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==p.replace(/\\$/,'').toLowerCase()&&p!=='C:\\')throw Error('ANCESTOR_REPARSE_STOP');
 const ps=`$ErrorActionPreference='Stop';$p='${ROOT}';if(Test-Path -LiteralPath $p){throw 'TARGET_EXISTS'};if(@(Get-NetTCPConnection -State Listen -LocalPort 55435 -ErrorAction SilentlyContinue).Count){throw 'PORT_OCCUPIED'};$s=[Security.Principal.WindowsIdentity]::GetCurrent().User;$null=New-Item -ItemType Directory -Path $p;$a=New-Object Security.AccessControl.DirectorySecurity;$a.SetOwner($s);$a.SetAccessRuleProtection($true,$false);foreach($id in @($s.Value,'S-1-5-18')){$r=New-Object Security.AccessControl.FileSystemAccessRule($id,'FullControl','ContainerInherit,ObjectInherit','None','Allow');$a.AddAccessRule($r)};Set-Acl -LiteralPath $p -AclObject $a;$b=Get-Acl -LiteralPath $p;if(-not $b.AreAccessRulesProtected -or $b.Access.Count -ne 2 -or $b.Owner -ne $s.Translate([Security.Principal.NTAccount]).Value){throw 'NTFS_FAILED'};'ROOT_NTFS_VERIFIED'`;
 const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:10000,env:baseEnv});
 if(r.error||r.status!==0||!r.stdout.includes('ROOT_NTFS_VERIFIED'))throw Error('ROOT_CREATION_OR_NTFS_STOP');
 fs.mkdirSync(path.join(ROOT,'logs'));writeNew(path.join(ROOT,'attempt.json'),{phase:'13.5D.1G',approval:'USER_D1G_ISOLATED_ONLY',at:new Date().toISOString(),initdbMaximum:1,production:false});
}
function acceptExistingResumeRoot() {
 const startedAt=new Date().toISOString(),runReference='d1g-resume-r1-'+crypto.randomUUID();
 const helper=path.join(__dirname,'phase13-5d1g-resume-root.ps1');
 const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-File',helper,'-Mode','APPLY_APPROVED_RESUME'],{encoding:'utf8',timeout:10000,maxBuffer:1048576,env:baseEnv});
 let result=null;try{result=JSON.parse((r.stdout||'').trim());}catch{/* unknown remains blocked */}
 const safeKeys=['status','runReference','checkpoint','startedAt','endedAt','ownerSid','protectedDacl','aceSids','empty','unexpectedReparse','parentAclUnchanged','targetProcessMatches','unrelatedProcessMetadataUnavailable','unknownOutcome','category','exceptionType','reason'];
 const projected=result?Object.fromEntries(safeKeys.filter(k=>Object.hasOwn(result,k)).map(k=>[k,result[k]])):null;
 const capture={phase:'13.5D.1G-R1',runReference,startedAt,endedAt:new Date().toISOString(),nativeExitCode:r.status,nativeErrorCode:r.error?.code||null,nativeSignal:r.signal||null,
  stderrPresent:!!r.stderr,helperSha256:sha(fs.readFileSync(helper)),result:projected,unknownOutcome:!!r.error||!!r.signal||!projected||projected.unknownOutcome===true};
 writeNew(path.join(REPO,'report',runReference+'-bootstrap.json'),capture); // sanitized only, never raw pre-ACL output
 evidence.bootstrap=capture;evidence.runReference=runReference;
 if(r.error||r.signal||r.status!==0||r.stderr||result?.status!=='ROOT_NTFS_VERIFIED'||result.protectedDacl!==true||result.parentAclUnchanged!==true||result.empty!==true||capture.unknownOutcome){console.log(JSON.stringify(capture));throw Error('RESUME_ROOT_NTFS_GATE_STOP');}
 fs.mkdirSync(path.join(ROOT,'logs'));writeNew(path.join(ROOT,'resume-r1-bootstrap.json'),capture);
 writeNew(path.join(ROOT,'attempt.json'),{phase:'13.5D.1G-R1',runReference,approval:'USER_CONTROLLED_EXISTING_EMPTY_ROOT_RESUME',at:new Date().toISOString(),initdbMaximum:1,production:false});
}
function setupSchema() {
 let sql='BEGIN;\nCREATE TABLE public._prisma_migrations(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0);\n';
 for(const [index,[name,checksum]]of MIGRATIONS.entries()){
  const bytes=fs.readFileSync(path.join(REPO,'backend/prisma/migrations',name,'migration.sql'));if(sha(bytes).toLowerCase()!==checksum)throw Error('MIGRATION_SOURCE_HASH_DRIFT_STOP');
  sql+=bytes.toString('utf8')+`\nINSERT INTO public._prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES('synthetic-${index}','${checksum}','2026-01-01T00:00:00Z','${name}','2026-01-01T00:00:00Z',1);\n`;
 }
 sql+=`INSERT INTO public.users(id,full_name,email,password_hash,role,updated_at) VALUES('d1g-user','Synthetic User','synthetic@example.invalid','SYNTHETIC_NOT_A_CREDENTIAL','FARM_OWNER',now());
 INSERT INTO public.farms(id,owner_id,name,updated_at) VALUES('d1g-farm','d1g-user','Synthetic Farm',now());
 INSERT INTO public.zones(id,farm_id,name,updated_at) VALUES('d1g-zone','d1g-farm','Synthetic Zone',now());
 INSERT INTO public.devices(id,zone_id,device_code,name,type,updated_at) VALUES('d1g-device','d1g-zone','ESP32-GF-A-01','Synthetic Device','CONTROLLER',now());
 INSERT INTO public.actuators(id,device_id,actuator_code,name,type,current_state,last_state_changed_at,updated_at) VALUES('d1g-actuator','d1g-device','PUMP_01','Synthetic Pump','PUMP','OFF',now(),now());
 INSERT INTO public.device_commands(id,actuator_id,command,source,status,correlation_id,transport,max_run_seconds) VALUES('d1g-command','d1g-actuator','TURN_OFF','MANUAL','SUCCESS','d1g-synthetic-correlation','MQTT',1);
 COMMIT;`;
 ddl(sql,'synthetic-schema');
}
function stats(database=DB){return JSON.parse(clean(psql("BEGIN READ ONLY; SELECT json_build_object('commands',(SELECT count(*) FROM public.device_commands),'pending',(SELECT count(*) FROM public.device_commands WHERE status='PENDING'),'migrationRows',(SELECT count(*) FROM public._prisma_migrations),'relations',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r')); COMMIT;",'stats',database)).stdout.trim());}
function validateMappedTranscript(r,mapping) {
 if(r.errorCode||r.signal||r.exitCode!==0||r.stderr.trim())throw Error('R1_BASELINE_NATIVE_FAILURE_STOP');
 const lines=r.stdout.trim().split(/\r?\n/);if(lines.length!==6)throw Error('R1_SIX_RECORD_CONTRACT_FAILURE_STOP');
 const rows=lines.map(JSON.parse),[first,pre,locked,commands,after,last]=rows;
 for(const x of [pre,locked,after,commands])if(x.database!==mapping.database||x.systemId!==systemId||x.port!==55435||x.address!=='127.0.0.1'||x.principal!=='d1g_reader'||x.readOnly!=='on')throw Error('R1_TRANSCRIPT_IDENTITY_STOP');
 if(pre.pgdata!==DATA||pre.databaseOwner!=='d1g_dba'||pre.schema!=='public'||pre.columnFingerprint!=='390c65cfe11f3b8695a6bc5ff21d94d4'||pre.constraintFingerprint!=='2e5981464ef4017e1ad5a6854ba17cc2')throw Error('R1_CATALOG_CONTRACT_STOP');
 if(first.backendPid!==last.backendPid||first.snapshot!==last.snapshot||last.protectedRelations!==6||first.isolation!=='repeatable read'||last.isolation!=='repeatable read'||first.readOnly!=='on'||last.readOnly!=='on')throw Error('R1_SNAPSHOT_LOCK_CONTRACT_STOP');
 if(JSON.stringify(pre)!==JSON.stringify(locked)||JSON.stringify(locked)!==JSON.stringify(after)||commands.commands.pending!=='0'||commands.migrations.length!==11||!MIGRATIONS.every(([name,checksum])=>commands.migrations.some(m=>m.name===name&&m.checksum===checksum&&m.finishedAt&&m.rolledBackAt===null)))throw Error('R1_BASELINE_CONTRACT_STOP');
 return {records:6,backendPid:first.backendPid,snapshot:first.snapshot,protectedRelations:last.protectedRelations,commands:Number(commands.commands.total),pending:Number(commands.commands.pending),migrationRows:commands.migrations.length,catalogDigest:sha(JSON.stringify(pre)),actuatorState:commands.actuators[0]?.state};
}
function cloneDatabase(suffix){const database=DB+'_'+suffix;ddl(`CREATE DATABASE ${database} OWNER d1g_dba TEMPLATE ${DB};`,'clone-'+suffix,'postgres');identity(database);return database;}
function negativeR1(database,label,role='d1g_reader') {
 const mapping=mappedSql(systemId,database),r=psql(mapping.sql,label,database,role);
 if(r.errorCode||r.signal)throw Error('NATIVE_UNKNOWN_NEGATIVE_STOP');
 let rejected=false,reason;try{validateMappedTranscript(r,mapping);}catch(error){rejected=true;reason=error.message;}
 evidence.tests.push({name:label,status:rejected?'PASS':'FAIL',nativeExit:r.exitCode,sqlStates:[...r.stderr.matchAll(/\b([0-9A-Z]{5}):/g)].map(m=>m[1]),rejection:reason||null,logStem:r.logStem});
 if(!rejected)throw Error('NEGATIVE_R1_UNEXPECTED_ACCEPTANCE_STOP');
}
async function pausedR1(database,beforeProbe,action,label) {
 identity(database,'d1g_reader');const mapping=mappedSql(systemId,database),sql=mapping.sql;
 const offset=beforeProbe?sql.indexOf('SELECT 1 FROM public._prisma_migrations LIMIT 0;'):sql.lastIndexOf('SELECT pg_catalog.json_build_object(',sql.indexOf(" 'migrations',"));
 if(offset<0)throw Error('R1_STREAM_BOUNDARY_NOT_FOUND');
 const stem=String(++sequence).padStart(3,'0')+'-'+label,stdoutFile=path.join(ROOT,'logs',stem+'.stdout.log'),stderrFile=path.join(ROOT,'logs',stem+'.stderr.log');
 const out=fs.openSync(stdoutFile,'wx'),err=fs.openSync(stderrFile,'wx');let stdout='',stderr='',errorCode=null,child;
 const at=Date.now();let exitCode=null,signal=null,exited=false;
 const args=['-X','-w','-q','-A','-t','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h','127.0.0.1','-p','55435','-U','d1g_reader','-d',database,'-f','-'];
 try{
  child=spawn(path.join(BIN,'psql.exe'),args,{windowsHide:true,env:{...baseEnv,PGPASSWORD:passwords.d1g_reader},stdio:['pipe','pipe','pipe']});
  child.on('error',e=>{errorCode=e.code||'UNKNOWN';exited=true;});child.on('close',(code,sig)=>{exitCode=code;signal=sig;exited=true;});
  child.stdout.on('data',b=>{fs.writeSync(out,b);stdout+=b.toString('utf8');if(Buffer.byteLength(stdout)>1048576){errorCode='OUTPUT_LIMIT';child.stdin.end();}});
  child.stderr.on('data',b=>{fs.writeSync(err,b);stderr+=b.toString('utf8');if(Buffer.byteLength(stderr)>1048576){errorCode='OUTPUT_LIMIT';child.stdin.end();}});
  child.stdin.on('error',()=>{errorCode='STDIN_ERROR';});child.stdin.write(sql.slice(0,offset));
  const records=beforeProbe?2:3;
  while(!exited&&stdout.trim().split(/\r?\n/).filter(Boolean).length<records&&Date.now()-at<4000)await new Promise(r=>setTimeout(r,25));
  if(exited||errorCode||stdout.trim().split(/\r?\n/).filter(Boolean).length<records)throw Error('R1_PAUSE_UNKNOWN_OUTCOME_STOP');
  await action();child.stdin.end(sql.slice(offset));
  while(!exited&&Date.now()-at<9000)await new Promise(r=>setTimeout(r,25));
  if(!exited)throw Error('R1_ASYNC_DEADLINE_STOP');
 }finally{
  if(child&&!exited){child.stdin.end();const wait=Date.now();while(!exited&&Date.now()-wait<6500)await new Promise(r=>setTimeout(r,25));}
  if(!exited)errorCode='UNKNOWN_OWNED_CLIENT_OUTCOME';
  fs.closeSync(out);fs.closeSync(err);evidence.operations.push({label,tool:'psql-streamed',exitCode,errorCode,signal,elapsedMs:Date.now()-at,logStem:stem,streamedBytes:Buffer.byteLength(sql),streamedSha256:sha(sql)});
 }
 return {stdout,stderr,exitCode,errorCode,signal,logStem:stem,mapping};
}
async function additionalTests() {
 for(const[suffix,sql,label]of [
  ['pending',"UPDATE public.device_commands SET status='PENDING';",'pending-rejected'],
  ['drift','ALTER TABLE public.devices ADD COLUMN d1g_drift integer;','schema-drift-rejected'],
  ['missing','ALTER TABLE public.automation_rules RENAME TO d1g_saved_automation_rules;','missing-relation-rejected'],
  ['object','CREATE TABLE public.irrigation_unexpected(id integer);','unexpected-object-rejected'],
  ['oid','ALTER TABLE public.devices RENAME TO d1g_saved_devices; CREATE TABLE public.devices(LIKE public.d1g_saved_devices INCLUDING ALL);','replacement-object-rejected']
 ]){const db=cloneDatabase(suffix);ddl(sql,'fixture-'+suffix,db);negativeR1(db,label);}
 negativeR1(DB,'wrong-principal-rejected','d1g_other');
 const held=cloneDatabase('held');
 const heldResult=await pausedR1(held,false,async()=>{
  const r=psql("SET lock_timeout='500ms'; ALTER TABLE public.devices ADD COLUMN d1g_locked integer;",'ddl-held-lock',held);
  if(r.errorCode||r.signal||r.exitCode!==3||!r.stderr.includes('55P03'))throw Error('EXPECTED_DDL_LOCK_TIMEOUT_NOT_OBSERVED');
  evidence.tests.push({name:'AccessShareLock_blocks_concurrent_DDL',status:'PASS',nativeExit:r.exitCode,sqlState:'55P03',logStem:r.logStem});
 },'r1-held-lock');
 evidence.tests.push({name:'R1_after_expected_DDL_lock_timeout',status:'PASS',...validateMappedTranscript(heldResult,heldResult.mapping)});
 const before=cloneDatabase('before');let concurrentDdl;
 const beforeResult=await pausedR1(before,true,async()=>{concurrentDdl=ddl('ALTER TABLE public.devices ADD COLUMN d1g_race_before integer;','ddl-before-probe',before);},'r1-before-probe');
 let accepted=false;try{validateMappedTranscript(beforeResult,beforeResult.mapping);accepted=true;}catch(error){if(beforeResult.errorCode||beforeResult.signal)throw Error('NATIVE_UNKNOWN_RACE_OUTCOME_STOP');}
 evidence.tests.push({name:'DDL_before_probe_detected',status:accepted?'FAIL':'PASS',r1Exit:beforeResult.exitCode,ddlExit:concurrentDdl.exitCode,logStem:beforeResult.logStem,acceptedStaleCatalog:accepted});
 if(accepted)throw Error('R1_ACCEPTED_CONCURRENT_SCHEMA_DRIFT_STOP');
}
async function main(resume=false) {
 if(process.argv.length!==3||process.argv[2]!== (resume?'--approved-isolated-d1g-resume':'--approved-isolated-d1g'))throw Error('EXPLICIT_D1G_APPROVAL_REQUIRED');
 if(resume)evidence.phase='13.5D.1G-R1';
 const binaries={initdb:'94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC',pg_ctl:'FC644446B0236E623E3E6FE2699446259EFB8E61BD9ABA838D6394A2BE6987B8',psql:'462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A',pg_controldata:'6896F8A705AFB5CBAAD843017D6D8AED5F5D76E32B3179E66750AAA5F193CC40'};
 for(const[name,digest]of Object.entries(binaries))if(sha(fs.readFileSync(path.join(BIN,name+'.exe')))!==digest)throw Error('POSTGRES_BINARY_DRIFT_STOP');
 evidence.binaryHashes=binaries;
 mappedSql('7777777777777777777'); // Prove literal whitelist/counts/reversal BEFORE creation/initdb.
 if(resume)acceptExistingResumeRoot();else safeCreateRoot();
 try {
  const peerData='C:\\DATN\\test-instances\\phase13-3b\\data';
  const peer=clean(native('pg_controldata',[peerData],undefined,'existing-test-control'));
  const peerId=peer.stdout.match(/Database system identifier:\s*(\d+)/)?.[1];
  if(!peerId||peerData===PGDATA)throw Error('EXISTING_TEST_IDENTITY_UNREADABLE_STOP');
  excludedSystemIds.push(peerId);evidence.excludedSystemIds=[...excludedSystemIds];
  evidence.initdbAttempts=1;writeNew(path.join(ROOT,'initdb-attempt.json'),{at:new Date().toISOString(),attempt:1});
  clean(native('initdb',['-D',PGDATA,'-U','d1g_dba','--pwfile=-','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C'],passwords.d1g_dba+'\n','initdb',30000));initialized=true;
  if(fs.readFileSync(path.join(PGDATA,'PG_VERSION'),'utf8').trim()!=='17')throw Error('NEW_CLUSTER_PG_VERSION_STOP');
  const c=control();systemId=c.id;if(c.state!=='shut down'||excludedSystemIds.includes(systemId))throw Error('NEW_CLUSTER_IDENTITY_STOP');evidence.target.systemId=systemId;
  const config=path.join(PGDATA,'postgresql.conf');fs.appendFileSync(config,"\n# D.1G approved isolated synthetic instance only\nlisten_addresses='127.0.0.1'\nport=55435\nmax_connections=20\nshared_buffers='32MB'\nlog_statement='none'\nlog_min_error_statement='panic'\npassword_encryption='scram-sha-256'\n");
  startAttempted=true;clean(native('pg_ctl',['-D',PGDATA,'-l',path.join(ROOT,'logs','server.log'),'-w','-t','20','start'],undefined,'start',25000));
  evidence.initialIdentity=identity('postgres');
  ddl(`CREATE DATABASE ${DB} OWNER d1g_dba TEMPLATE template0;`,'create-database','postgres');
  setupSchema();
  for(const role of ['d1g_reader','d1g_other'])ddl(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${passwords[role]}'; GRANT pg_read_all_data,pg_read_all_settings TO ${role}; GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO ${role};`,'create-'+role);
  evidence.readerIdentity=identity(DB,'d1g_reader');evidence.before=stats();
  const mapping=mappedSql(systemId);writeNew(path.join(ROOT,'mapping.json'),mapping);evidence.mapping={sourceSha256:mapping.sourceSha256,mappedSha256:mapping.mappedSha256,reverseSha256:mapping.reverseSha256,mappings:mapping.mappings};
  writeNew(path.join(ROOT,'mapped-r1.sql'),mapping.sql);identity(DB,'d1g_reader');
  const r=psql(mapping.sql,'r1-baseline',DB,'d1g_reader');evidence.r1Native={exitCode:r.exitCode,errorCode:r.errorCode,signal:r.signal,logStem:r.logStem,sqlStates:[...r.stderr.matchAll(/\b([0-9A-Z]{5}):/g)].map(m=>m[1])};
  try{evidence.r1=validateMappedTranscript(r,mapping);evidence.tests.push({name:'R1_actual_baseline',status:'PASS',...evidence.r1});}catch(error){evidence.tests.push({name:'R1_actual_baseline',status:'FAIL',reason:error.message});throw error;}
  evidence.after=stats();if(JSON.stringify(evidence.before)!==JSON.stringify(evidence.after))throw Error('UNEXPECTED_WRITES_STOP');
  await additionalTests();
  evidence.verdict='PHASE13_5D1G_ISOLATED_SQL_INTEGRATION_PARTIAL';
 } catch(error){evidence.failure=error.message;evidence.verdict='PHASE13_5D1G_ISOLATED_SQL_INTEGRATION_PARTIAL/BLOCKED';process.exitCode=1;}
 finally {
  if(initialized&&startAttempted){try{const c=control();if(c.id!==systemId)throw Error('SHUTDOWN_SYSTEM_ID_MISMATCH_STOP');if(c.state!=='shut down')clean(native('pg_ctl',['-D',PGDATA,'-w','-t','20','-m','fast','stop'],undefined,'stop',25000));evidence.shutdown=control();evidence.stoppedGracefully=evidence.shutdown.state==='shut down';}catch(error){evidence.shutdownFailure=error.message;process.exitCode=1;}}
  evidence.endedAt=new Date().toISOString();writeNew(path.join(ROOT,resume?'resume-r1-outcome.json':'outcome.json'),evidence);
  console.log(JSON.stringify({verdict:evidence.verdict,failure:evidence.failure||null,systemId,initdbAttempts:evidence.initdbAttempts,stoppedGracefully:evidence.stoppedGracefully||false,tests:evidence.tests,productionConnected:false}));
 }
}
if(require.main===module)main().catch(error=>{console.error(JSON.stringify({status:'STOP',reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'ISOLATED_RUN_FAILED_REDACTED',productionConnected:false}));process.exitCode=1;});
module.exports={validateMappedTranscript,runApprovedResume:()=>main(true)};
