// One approved TEST role password change. No production URL, credentials or provisioning.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {preflight}=require('./mvp-dev-direct.cjs');
const {DirectTestPsql}=require('./mvp-dev-direct-psql.cjs');
const ROOT='C:\\DATN\\test-instances\\phase13-3b',DATA=path.join(ROOT,'data'),BIN='C:\\Program Files\\PostgreSQL\\17\\bin';
const RUN=path.join(ROOT,'test-auth-recovery-1793189718289-2f71e8'),SYSTEM='7698826681383327460',ROLE='phase13_test_admin';
const CONFIRM='RESET TEST phase13_test_admin ONCE';
const SAFE_PATH='C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0';
let preparationStage='ARGUMENTS';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const write=(f,x)=>fs.writeFileSync(path.join(RUN,f),JSON.stringify(x,null,2),{flag:'wx'});
function environment(extra={}){return {SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:process.env.TEMP||'C:\\Windows\\Temp',TMP:process.env.TMP||'C:\\Windows\\Temp',PATH:SAFE_PATH,...extra};}
function scram(password,salt=crypto.randomBytes(16)){
 const p=Buffer.from(password,'utf8'),salted=crypto.pbkdf2Sync(p,salt,4096,32,'sha256');
 const client=crypto.createHmac('sha256',salted).update('Client Key').digest(),stored=crypto.createHash('sha256').update(client).digest();
 const server=crypto.createHmac('sha256',salted).update('Server Key').digest();
 try{return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored.toString('base64')}:${server.toString('base64')}`;}
 finally{p.fill(0);salted.fill(0);client.fill(0);stored.fill(0);server.fill(0);}
}
function input(value){assert.equal(value.confirmation,CONFIRM,'LOCAL_RESET_CONFIRMATION_REQUIRED');assert.equal(typeof value.password,'string');assert.match(value.password,/^[\x21-\x7e]{16,128}$/,'NEW_TEST_PASSWORD_MUST_BE_16_TO_128_PRINTABLE_ASCII_NO_SPACES');return value.password;}
function redact(value,secrets=[]){let s=String(value);for(const secret of secrets)if(secret)s=s.split(secret).join('[REDACTED]');return s.replace(/SCRAM-SHA-256\$[^\s"']+/g,'[VERIFIER_REDACTED]');}
function resetSql(verifier){
 assert.match(verifier,/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=$/);
 // All identity/role predicates run in the SAME exclusive single-user transaction as ALTER.
 return "BEGIN; DO $$ BEGIN IF (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) <> '"+SYSTEM+"' OR replace(current_setting('data_directory'),chr(92),'/') <> 'C:/DATN/test-instances/phase13-3b/data' OR current_database() <> 'postgres' OR current_setting('server_version_num') <> '170002' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='"+ROLE+"' AND rolcanlogin AND rolsuper AND rolcreatedb AND rolcreaterole) THEN RAISE EXCEPTION 'TEST_IDENTITY_OR_ROLE_GATE_FAILED'; END IF; END $$; ALTER ROLE phase13_test_admin PASSWORD '"+verifier+"'; COMMIT; SELECT 'MVP_RESET_COMMITTED:' || json_build_object('systemId',(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),'role',r.rolname,'canLogin',r.rolcanlogin,'superuser',r.rolsuper,'createDB',r.rolcreatedb,'createRole',r.rolcreaterole)::text FROM pg_catalog.pg_roles r WHERE r.rolname='phase13_test_admin';\n";
}
function native(label,exe,args,stdin='',secrets=[]){
 const r=spawnSync(exe,args,{cwd:RUN,env:environment(),windowsHide:true,encoding:'utf8',input:stdin,maxBuffer:524288});
 fs.writeFileSync(path.join(RUN,label+'.stdout.log'),redact(r.stdout||'',secrets),{flag:'wx'});
 fs.writeFileSync(path.join(RUN,label+'.stderr.log'),redact(r.stderr||'',secrets),{flag:'wx'});
 const result={pid:r.pid,exitCode:r.status,signal:r.signal,error:r.error?.code||null};write(label+'.result.json',result);
 assert.equal(r.status,0,label+'_NATIVE_NOT_ZERO');assert.ok(!r.error&&!r.signal,label+'_NATIVE_OUTCOME_UNKNOWN');
 return r;
}
function validateInspection(){
 const s=JSON.parse(fs.readFileSync(path.join(RUN,'inspection-summary.json'),'utf8'));
 assert.equal(s.status,'ROLE_VALID_AWAIT_OPERATOR_RESET_CONFIRMATION');assert.equal(s.passwordResetPerformed,false);
 assert.equal(s.role.systemId,SYSTEM);for(const k of ['canLogin','superuser','createDB','createRole'])assert.equal(s.role[k],true);
 const b=JSON.parse(fs.readFileSync(path.join(RUN,'offline-backup-manifest.json'),'utf8'));
 assert.equal(b.backup,path.join(RUN,'offline-backup','data'));assert.equal(b.sha256Verified,true);
 assert.equal(b.manifest.length,b.files);
 for(const f of b.manifest){const target=path.resolve(b.backup,f.name);assert.ok(target.startsWith(b.backup+path.sep));assert.equal(fs.lstatSync(target).isSymbolicLink(),false);assert.equal(fs.statSync(target).size,f.bytes);assert.equal(hash(target),f.sha256);}
 return {inspectionSha256:hash(path.join(RUN,'inspection-summary.json')),backupManifestSha256:hash(path.join(RUN,'offline-backup-manifest.json')),backupFiles:b.files,backupBytes:b.bytes};
}
async function main(){
 assert.equal(process.argv.length,3);assert.ok(['--execute-once','--offline-input-check'].includes(process.argv[2]));
 preparationStage='AUTH_ENVIRONMENT';
 assert.ok(!Object.keys(process.env).some(k=>/^PGPASSWORD$|^PGPASSFILE$|^PGSERVICE|^DATABASE_URL$|^OSTYPE$/i.test(k)),'AUTH_ENV_REFUSED');
 for(const f of [path.join(require('os').homedir(),'AppData/Roaming/postgresql/pgpass.conf'),path.join(require('os').homedir(),'.pgpass')])assert.equal(fs.existsSync(f),false,'STORED_AUTH_FALLBACK_REFUSED');
 preparationStage='PIPE_JSON';
 let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)throw Error('INPUT_SIZE_REFUSED');}
 let supplied=JSON.parse(raw);raw='';preparationStage='INPUT_VALIDATION';let password=input(supplied);supplied=null;
 preparationStage='READ_ONLY_PREFLIGHT';const proof=preflight();preparationStage='BACKUP_VALIDATION';const inspection=validateInspection();
 preparationStage='ONE_SHOT_GATE';
 assert.equal(fs.existsSync(path.join(RUN,'password-reset.attempt.json')),false,'ONE_RESET_ALREADY_ATTEMPTED');
 let verifier=scram(password),started=false,attempted=false,direct=null,postmaster=null;
 const summary={run:RUN,startedAt:new Date().toISOString(),before:proof,inspection,resetCount:0,authenticationAttempts:0,clusterStarts:0,sourceHashes:Object.fromEntries(['mvp-test-password-reset.cjs','mvp-test-password-reset.ps1','mvp-dev-direct.cjs','mvp-dev-direct-psql.cjs'].map(n=>[n,hash(path.join(__dirname,n))]))};
 if(process.argv[2]==='--offline-input-check'){password='';verifier='';console.log(JSON.stringify({status:'OFFLINE_INPUT_AND_READ_ONLY_GATES_PASS',resetPerformed:false,authenticationPerformed:false}));return;}
 try{
  write('password-reset.attempt.json',{at:new Date().toISOString(),operatorConfirmation:CONFIRM,scope:'ONE_EXISTING_TEST_ROLE_PASSWORD_ONLY',systemId:SYSTEM,pgdata:DATA,role:ROLE,maxAttempts:1});attempted=true;summary.resetCount=1;
  const args=['--single','-D',DATA,'-c','search_path=pg_catalog','-c','logging_collector=off','-c','log_destination=stderr','-c','log_statement=none','-c','log_min_error_statement=panic','-c','log_min_messages=warning','-c','log_duration=off','-c','log_min_duration_statement=-1','-c','log_min_duration_sample=-1','-c','log_transaction_sample_rate=0','-c','statement_timeout=5000','-c','lock_timeout=1000','postgres'];
  const r=native('password-reset',path.join(BIN,'postgres.exe'),args,resetSql(verifier),[password,verifier]);
  assert.doesNotMatch(r.stderr,/\b(?:ERROR|FATAL|PANIC):/,'RESET_NATIVE_ERROR');
  const match=r.stdout.match(/MVP_RESET_COMMITTED:(\{[^\r\n]+\})/);assert.ok(match,'RESET_OUTCOME_UNKNOWN_NO_RETRY');
  const result=JSON.parse(match[1]);assert.equal(result.systemId,SYSTEM);assert.equal(result.role,ROLE);for(const k of ['canLogin','superuser','createDB','createRole'])assert.equal(result[k],true);
  summary.reset={nativeExitCode:0,committed:true,attributesUnchanged:true};password='';verifier='';summary.afterReset=preflight();
  write('verification-start.attempt.json',{at:new Date().toISOString(),maxAttempts:1,pgdata:DATA,port:55433});summary.clusterStarts=1;
  native('verification-start',path.join(BIN,'pg_ctl.exe'),['start','-D',DATA,'-l',path.join(RUN,'verification-postgres.log'),'-o','-h 127.0.0.1 -p 55433 -c log_statement=none -c log_min_error_statement=panic -c log_connections=off -c log_disconnections=off','-w','-t','20']);started=true;
  const pidLines=fs.readFileSync(path.join(DATA,'postmaster.pid'),'utf8').split(/\r?\n/);postmaster=Number(pidLines[0]);assert.equal(path.resolve(pidLines[1]),DATA);assert.equal(Number(pidLines[3]),55433);
  summary.postmasterPid=postmaster;summary.authenticationAttempts=1;write('verification-auth.attempt.json',{at:new Date().toISOString(),role:ROLE,port:55433,maxAttempts:1,method:'NATIVE_PSQL_CONIN_PROMPT'});
  console.log('TEST reset committed. Enter the SAME NEW TEST password at the native PostgreSQL prompt below.');
  direct=new DirectTestPsql({executable:path.join(BIN,'psql.exe'),run:RUN,environment:environment({PGCONNECT_TIMEOUT:'3',PGCLIENTENCODING:'UTF8',PGAPPNAME:'mvp-test-recovery-verification-only',PGOPTIONS:'-c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000'}),onExit:r=>{summary.psqlNative=r;}});
  const sql="BEGIN READ ONLY; SET LOCAL search_path=pg_catalog; SELECT json_build_object('user',current_user,'database',current_database(),'port',inet_server_port(),'systemId',(SELECT system_identifier::text FROM pg_control_system()),'pgdata',current_setting('data_directory'),'version',current_setting('server_version_num'),'canLogin',r.rolcanlogin,'superuser',r.rolsuper,'createDB',r.rolcreatedb,'createRole',r.rolcreaterole,'readOnly',current_setting('transaction_read_only'),'otherClients',(SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid())) FROM pg_roles r WHERE rolname=current_user; ROLLBACK;";
  const auth=JSON.parse(await direct.query(sql,180000));
  assert.equal(auth.user,ROLE);assert.equal(auth.database,'postgres');assert.equal(auth.port,55433);assert.equal(auth.systemId,SYSTEM);assert.equal(auth.pgdata.replaceAll('\\','/'),'C:/DATN/test-instances/phase13-3b/data');assert.equal(auth.version,'170002');assert.equal(auth.readOnly,'on');assert.equal(Number(auth.otherClients),0);for(const k of ['canLogin','superuser','createDB','createRole'])assert.equal(auth[k],true);
  summary.authentication=auth;write('verification-auth-result.json',auth);
  const end=await direct.finish();assert.equal(end?.code,0,'PSQL_EXIT_UNKNOWN_OR_ERROR');summary.authenticationPass=true;
 }catch(e){summary.failure=redact(e.code||e.message,[password,verifier]);summary.status='MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED';}
 finally{
  password='';verifier='';
  if(direct){await direct.finish();fs.writeFileSync(path.join(RUN,'verification-psql.stderr.log'),redact(direct.stderr),{flag:'wx'});}
  if(started){
   try{const p=fs.readFileSync(path.join(DATA,'postmaster.pid'),'utf8').split(/\r?\n/);assert.equal(Number(p[0]),postmaster,'POSTMASTER_CHANGED_STOP');assert.equal(path.resolve(p[1]),DATA);assert.equal(Number(p[3]),55433);native('verification-smart-stop',path.join(BIN,'pg_ctl.exe'),['stop','-D',DATA,'-m','smart','-w','-t','20']);summary.finalControl=preflight();summary.clusterDisposition='STOPPED_GRACEFULLY';}
   catch(e){summary.cleanupFailure=e.code||e.message;summary.clusterDisposition='NOT_VERIFIED_NO_FORCE_OR_RETRY';}
  }else if(attempted){try{summary.finalControl=preflight();summary.clusterDisposition='SHUT_DOWN';}catch{summary.clusterDisposition='UNKNOWN';}}
  if(summary.authenticationPass&&summary.clusterDisposition==='STOPPED_GRACEFULLY')summary.status='MVP_TEST_CREDENTIAL_RECOVERY_PASS';else summary.status='MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED';
  summary.endedAt=new Date().toISOString();write('password-recovery-summary.json',summary);console.log(JSON.stringify({status:summary.status,resetCount:summary.resetCount,authenticationAttempts:summary.authenticationAttempts,clusterDisposition:summary.clusterDisposition,failure:summary.failure,cleanupFailure:summary.cleanupFailure}));process.exitCode=summary.status.endsWith('_PASS')?0:1;
 }
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({status:'TEST_RECOVERY_STOPPED_NO_AUTOMATIC_RETRY',stage:preparationStage,errorCode:typeof e.code==='string'?e.code:'PREPARATION_ERROR',...(preparationStage==='READ_ONLY_PREFLIGHT'&&process.argv[2]==='--offline-input-check'?{predicate:e.operator,actual:e.actual,expected:e.expected}:{}),resetAttemptMarkerPresent:fs.existsSync(path.join(RUN,'password-reset.attempt.json'))}));process.exitCode=1;});
module.exports={scram,input,redact,resetSql,CONFIRM};
