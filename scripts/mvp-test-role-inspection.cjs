// TEST-only offline backup + single-user READ ONLY role inspection. No reset branch.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');const assert=require('node:assert/strict');
const {preflight}=require('./mvp-dev-direct.cjs');
const ROOT='C:\\DATN\\test-instances\\phase13-3b',DATA=path.join(ROOT,'data'),BIN='C:\\Program Files\\PostgreSQL\\17\\bin';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2),{flag:'wx'});
function environment(){return {SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:process.env.TEMP||'C:\\Windows\\Temp',TMP:process.env.TMP||'C:\\Windows\\Temp'};}
function inventory(root){const out=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),stat=fs.lstatSync(file);if(stat.isSymbolicLink()||fs.realpathSync.native(file).toLowerCase()!==file.toLowerCase())throw Error('BACKUP_REPARSE_REFUSED');if(stat.isDirectory())walk(file);else if(stat.isFile())out.push({name:path.relative(root,file),bytes:stat.size,sha256:sha(file)});else throw Error('BACKUP_NONREGULAR_FILE');}}walk(root);return out.sort((a,b)=>a.name.localeCompare(b.name));}
function main(){
 if(process.argv.length!==3||process.argv[2]!=='--original-credential-unusable-confirmed')throw Error('OPERATOR_ORIGINAL_CREDENTIAL_DECISION_REQUIRED');
 const before=preflight();const prior='C:\\DATN\\test-instances\\phase13-3b\\mvp-direct-1793188378758-fa3d70';
 const history=Object.fromEntries(['summary.json','native-outcome.json','final-control-and-auth-evidence.json','direct-psql.stderr.log'].map(n=>[n,sha(path.join(prior,n))]));
 const ending=JSON.parse(fs.readFileSync(path.join(prior,'summary.json'),'utf8'));assert.equal(ending.clusterDisposition,'STOPPED_GRACEFULLY');assert.equal(ending.directPsqlNativeExit.code,2);
 const run=path.join(ROOT,'test-auth-recovery-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'));fs.mkdirSync(run);
 const summary={run,startedAt:new Date().toISOString(),preflight:before,originalCredentialDecision:'OPERATOR_CONFIRMED_ORIGINAL_TEST_CREDENTIAL_UNUSABLE',priorRun:prior,priorEvidenceHashes:history,sourceHash:sha(__filename),passwordResetPerformed:false,serverStarted:false};
 let stage='BACKUP';try{
  const source=inventory(DATA);const size=source.reduce((n,x)=>n+x.bytes,0),space=fs.statfsSync(DATA);assert.ok(space.bavail*space.bsize>size*2+268435456,'BACKUP_FREE_SPACE_INSUFFICIENT');
  assert.equal(fs.readdirSync(path.join(DATA,'pg_tblspc')).length,0,'EXTERNAL_TABLESPACES_REQUIRE_SEPARATE_REVIEW');
  const backup=path.join(run,'offline-backup','data');fs.mkdirSync(backup,{recursive:true});
  for(const file of source){const target=path.join(backup,file.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(DATA,file.name),target,fs.constants.COPYFILE_EXCL);}
  const copied=inventory(backup),after=inventory(DATA);assert.deepEqual(copied,source,'BACKUP_CONTENT_MISMATCH');assert.deepEqual(after,source,'SOURCE_CHANGED_DURING_OFFLINE_BACKUP');preflight();
  const proof={pgdata:DATA,backup,files:source.length,bytes:size,sha256Verified:true,sourceUnchanged:true,manifest:source};write(path.join(run,'offline-backup-manifest.json'),proof);summary.backup={path:backup,files:source.length,bytes:size,sha256Verified:true};
  stage='SINGLE_USER_READ_ONLY';write(path.join(run,'catalog-inspection.attempt.json'),{at:new Date().toISOString(),executable:path.join(BIN,'postgres.exe'),executableSha256:sha(path.join(BIN,'postgres.exe')),pgdata:DATA,database:'postgres',readOnly:true,passwordReset:false,maxAttempts:1});
  const sql="BEGIN READ ONLY; SELECT 'MVP_TEST_ROLE:' || json_build_object('matched',(SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'role',(SELECT rolname FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'canLogin',(SELECT rolcanlogin FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'superuser',(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'createDB',(SELECT rolcreatedb FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'createRole',(SELECT rolcreaterole FROM pg_catalog.pg_roles WHERE rolname='phase13_test_admin'),'systemId',(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),'dataDirectory',current_setting('data_directory'),'database',current_database(),'version',current_setting('server_version_num'),'readOnly',current_setting('transaction_read_only'))::text; ROLLBACK;\n";
  const args=['--single','-D',DATA,'-c','default_transaction_read_only=on','-c','search_path=pg_catalog','-c','logging_collector=off','-c','log_destination=stderr','-c','log_statement=none','-c','log_min_error_statement=panic','-c','log_min_messages=warning','-c','statement_timeout=5000','-c','lock_timeout=1000','postgres'];
  const r=spawnSync(path.join(BIN,'postgres.exe'),args,{cwd:run,env:environment(),windowsHide:true,encoding:'utf8',input:sql,maxBuffer:262144});
  fs.writeFileSync(path.join(run,'catalog-inspection.stdout.log'),r.stdout||'',{flag:'wx'});fs.writeFileSync(path.join(run,'catalog-inspection.stderr.log'),r.stderr||'',{flag:'wx'});
  summary.native={pid:r.pid,exitCode:r.status,signal:r.signal,error:r.error?.code||null};assert.equal(r.status,0);assert.ok(!r.error&&!r.signal);assert.doesNotMatch(r.stderr,/\b(?:ERROR|FATAL|PANIC):/);
  const payload=r.stdout.match(/MVP_TEST_ROLE:(\{[^\r\n]+\})/);assert.ok(payload,'SINGLE_USER_CATALOG_RESULT_NOT_PARSEABLE');const role=JSON.parse(payload[1]);summary.role=role;write(path.join(run,'role-catalog-evidence.json'),role);
  assert.equal(role.systemId,'7698826681383327460');assert.equal(role.dataDirectory.replaceAll('\\','/'),'C:/DATN/test-instances/phase13-3b/data');assert.equal(role.database,'postgres');assert.equal(role.readOnly,'on');
  const final=preflight();summary.finalControl=final;
  if(Number(role.matched)!==1)summary.status='ROLE_ABSENT_STOP_NO_CREATE';
  else if(!role.canLogin||!(role.superuser||(role.createDB&&role.createRole)))summary.status='ROLE_PRIVILEGES_INSUFFICIENT_STOP_NO_GRANT';
  else summary.status='ROLE_VALID_AWAIT_OPERATOR_RESET_CONFIRMATION';
 }catch(e){summary.status='BLOCKED';summary.failure={stage,code:e.code||e.message};}
 summary.endedAt=new Date().toISOString();write(path.join(run,'inspection-summary.json'),summary);
 console.log(JSON.stringify({run,status:summary.status,backup:summary.backup,role:summary.role,native:summary.native,failure:summary.failure,passwordResetPerformed:false}));
}
if(require.main===module){try{main();}catch{console.error('TEST_ROLE_INSPECTION_STOPPED_NO_RETRY');process.exitCode=1;}}
module.exports={inventory};
