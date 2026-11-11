'use strict';
// R2.3 explicit approval only. No SQL/client/server start paths, credential loading or retry.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const ROOT='C:\\DATN\\test-instances\\phase13-5d1g',PGDATA=ROOT+'\\data',BASE=path.resolve(__dirname,'../build/phase13-5d1g-r23');
const INITDB='C:\\Program Files\\PostgreSQL\\17\\bin\\initdb.exe',HASH='94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC';
const APPROVAL='C:\\Users\\Acer Swift3\\.codex\\attachments\\84e2c1ff-0de0-4a92-9933-8c1b01ea36f7\\Pasted text.txt';
const SOURCE=['phase13-5d1g-r22-native.cs','phase13-5d1g-r22-root-state.cjs','phase13-5d1g-r23-native.cs','phase13-5d1g-r23-executor.cjs','phase13-5d1g-r23-common.ps1','phase13-5d1g-r23-host.ps1','phase13-5d1g-r23-observer.ps1','phase13-5d1g-r23-fixture.cs'];
const OLD={
 'attempt.json':'340E68213302E57314182A697CD1DA4255DE47AB1E39A0E21AFE6077104E0DD8',
 'initdb-attempt.json':'43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C',
 'resume-r1-bootstrap.json':'1BE7D9C6EF1ECEA589A13410E6E05B5C2D6C8BCBD007FDDA3D263A64D6967AED',
 'resume-r1-outcome.json':'03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138',
 'logs/001-existing-test-control.native.json':'45E76EA8E10EC2AD36E1BB3F827B8F7AB4DF490096509EF42C2B116EE54A5F5A',
 'logs/001-existing-test-control.stderr.log':'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
 'logs/001-existing-test-control.stdout.log':'0578A6EA37DE1830AAEFEFB24ECD3863F7BFC719DD41816E31134F22034D4009',
 'logs/002-initdb.native.json':'D7A3567A6A02CFA6C5A6CC93B6989B966F78E414DC6F21DEB24D291AC9CDACF6',
 'logs/002-initdb.stderr.log':'ABEE310125548325C54B852B616E137B2369500B584AC030122835ED500D7B8B',
 'logs/002-initdb.stdout.log':'111F41271A9E4FF20103757D03F1AEAB6E053914487C3830A76D2C78AD3965C6'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase(),hash=f=>sha(fs.readFileSync(f));
function canonical(file){for(let p=path.resolve(file);;p=path.dirname(p)){if(fs.existsSync(p)&&(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==path.resolve(p).toLowerCase()))throw Error('REPARSE_OR_CANONICAL_REFUSED');if(path.dirname(p)===p)break;}}
function runPath(dir){canonical(dir);if(path.dirname(path.resolve(dir))!==BASE||!/^r23-[a-z0-9-]{1,60}$/.test(path.basename(dir)))throw Error('RUN_SCOPE_REFUSED');return path.resolve(dir);}
function fixedPlan(kind,runId){if(!['LIVE','TEST'].includes(kind)||!/^r23-[a-z0-9-]{1,60}$/.test(runId))throw Error('PLAN_SCOPE_REFUSED');return {phase:'13.5D.1G-R2.3',kind,runId,root:ROOT,pgdata:PGDATA,initdb:INITDB,initdbHash:HASH,args:['-D',PGDATA,'-U','d1g_dba','--pwprompt','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C','--no-clean'],marker:ROOT+'\\initdb-attempt-r23-'+runId+'.json',futurePort:55435,maxAttempts:1,deadlineMs:120000,forceKill:false,retry:false,stdinPipe:false,passwordFile:false,passwordEnvironment:false,passwordRecording:false,visible:kind==='LIVE'};}
function verifyOld(){for(const [name,h] of Object.entries(OLD)){const f=path.join(ROOT,name);canonical(f);if(hash(f)!==h)throw Error('OLD_EVIDENCE_HASH_DRIFT');}return true;}
function preflight(){
 if(hash(path.join(__dirname,'phase13-5d1g-r22-root-state.cjs'))!=='786CE08BFFECDFC4658C366F8C120807DB2F5F46C6CEE5CED95823B5026D94EA')throw Error('READONLY_GUARD_DRIFT');
 const root=require('./phase13-5d1g-r22-root-state.cjs').inspectRoot();delete root.newInitdbApproved;verifyOld();if(fs.existsSync(PGDATA))throw Error('PGDATA_EXISTS');if(hash(INITDB)!==HASH)throw Error('INITDB_BINARY_DRIFT');
 const inspections=[];for(const arg of ['--version','--help']){const r=spawnSync(INITDB,[arg],{encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:1048576,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});if(r.error||r.signal||r.status!==0||r.stderr)throw Error('BINARY_INSPECTION_UNKNOWN');inspections.push({arg,exitCode:r.status,stdoutSha256:sha(r.stdout),stdout:r.stdout});}
 if(!inspections[0].stdout.includes('17.2')||!inspections[1].stdout.includes('--pwprompt'))throw Error('BINARY_OPTIONS_DRIFT');
 return {root,inspections,oldEvidenceVerified:true,targetServerAbsentByUninitializedPGDATA:true,targetDataNeverInitialized:true,readOnly:true};
}
function prepare(kind,scenario='success'){
 if(!['LIVE','TEST'].includes(kind)||!['success','exit7'].includes(scenario))throw Error('PREPARE_SCOPE_REFUSED');
 const baseline=kind==='LIVE'?preflight():null;canonical(BASE);fs.mkdirSync(BASE,{recursive:true});const runId='r23-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex'),dir=path.join(BASE,runId);fs.mkdirSync(dir);
 const manifest={...fixedPlan(kind,runId),nonce:crypto.randomBytes(16).toString('hex'),scenario,approvalId:kind==='LIVE'?'USER-R23-84e2c1ff-0de0-4a92-9933-8c1b01ea36f7':null,approvalSha256:kind==='LIVE'?hash(APPROVAL):null,nodeExecutable:process.execPath,controlHash:hash('C:\\Program Files\\PostgreSQL\\17\\bin\\pg_controldata.exe'),postgresHash:hash('C:\\Program Files\\PostgreSQL\\17\\bin\\postgres.exe'),sources:Object.fromEntries(SOURCE.map(n=>[n,hash(path.join(__dirname,n))])),baseline};
 const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify(manifest,null,2),{flag:'wx'});return {directory:dir,manifestSha256:hash(file),runId};
}
function readRun(dir,manifestHash){dir=runPath(dir);const file=path.join(dir,'manifest.json');if(hash(file)!==manifestHash)throw Error('MANIFEST_HASH_DRIFT');const m=JSON.parse(fs.readFileSync(file,'utf8'));
 const expected=fixedPlan(m.kind,m.runId);for(const [key,value] of Object.entries(expected))if(JSON.stringify(m[key])!==JSON.stringify(value))throw Error('PLAN_FIELD_DRIFT');
 if(m.runId!==path.basename(dir)||m.nodeExecutable!==process.execPath||!/^[0-9a-f]{32}$/.test(m.nonce)||!['success','exit7'].includes(m.scenario))throw Error('RUN_IDENTITY_DRIFT');
 if(JSON.stringify(Object.keys(m.sources))!==JSON.stringify(SOURCE))throw Error('SOURCE_SET_DRIFT');for(const n of SOURCE)if(hash(path.join(__dirname,n))!==m.sources[n])throw Error('SOURCE_HASH_DRIFT');
 if(m.kind==='LIVE'&&(m.approvalId!=='USER-R23-84e2c1ff-0de0-4a92-9933-8c1b01ea36f7'||hash(APPROVAL)!==m.approvalSha256))throw Error('APPROVAL_LINEAGE_DRIFT');return m;
}
function classify({native,observer,unknown,jobActive,filesVerified}){if(unknown||!native||!observer||native.nativeError||native.timeout||!native.nativeHandleObserved||!observer.independentNativeHandle||observer.supervisorLost||native.pid!==observer.pid||native.startFileTime!==observer.startFileTime||native.nonce!==observer.nonce||native.exitCode!==observer.exitCode||native.exitAt!==observer.exitAt)return 'UNKNOWN_NATIVE_OUTCOME';if(native.exitCode!==0)return 'INITDB_NONZERO';if(jobActive!==0||observer.jobFlags!==0||!filesVerified)return 'INITDB_PARTIAL';return 'INITDB_PASS';}
function postcheck(dir,manifestHash){
 const m=readRun(dir,manifestHash);if(m.kind!=='LIVE')throw Error('POSTCHECK_SCOPE_REFUSED');verifyOld();canonical(PGDATA);
 const native=JSON.parse(fs.readFileSync(path.join(dir,'host-native-exit.json'),'utf8')),observer=JSON.parse(fs.readFileSync(path.join(dir,'observer-native-exit.json'),'utf8'));
 if(classify({native,observer,unknown:false,jobActive:observer.jobActive,filesVerified:true})!=='INITDB_PASS'||observer.jobFlags!==0)throw Error('POSTCHECK_NATIVE_GATE_FAILED');
 const required=['PG_VERSION','global/pg_control','base','pg_wal','pg_xact','postgresql.conf','pg_hba.conf','pg_ident.conf'];
 for(const rel of required){canonical(path.join(PGDATA,rel));if(!fs.existsSync(path.join(PGDATA,rel)))throw Error('CLUSTER_FILE_MISSING');}
 if(fs.readFileSync(path.join(PGDATA,'PG_VERSION'),'utf8').trim()!=='17'||fs.existsSync(path.join(PGDATA,'postmaster.pid')))throw Error('CLUSTER_VERSION_OR_RUNNING_STATE');
 const rules=fs.readFileSync(path.join(PGDATA,'pg_hba.conf'),'utf8').split(/\r?\n/).map(l=>l.replace(/#.*/,'').trim()).filter(Boolean).map(l=>l.split(/\s+/));
 if(rules.length<4||rules.some(r=>!['local','host','hostssl','hostnossl'].includes(r[0])||r[r[0]==='local'?3:4]!=='scram-sha-256'))throw Error('AUTHENTICATION_NOT_SCRAM');
 const control='C:\\Program Files\\PostgreSQL\\17\\bin\\pg_controldata.exe';if(hash(control)!==m.controlHash)throw Error('CONTROL_BINARY_DRIFT');
 const r=spawnSync(control,[PGDATA],{encoding:'utf8',timeout:5000,maxBuffer:1048576,windowsHide:true,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',LC_ALL:'C'}});
 if(r.error||r.signal||r.status!==0||r.stderr)throw Error('CONTROL_NATIVE_UNKNOWN');
 const id=r.stdout.match(/Database system identifier:\s*(\d+)/)?.[1],state=r.stdout.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim();
 if(!id||['7472695863566132416','7698826681383327460','7699532241714573532'].includes(id)||state!=='shut down')throw Error('NEW_SYSTEM_ID_OR_SHUTDOWN_GATE');
 const allowed=new Set(['attempt.json','initdb-attempt.json','resume-r1-bootstrap.json','resume-r1-outcome.json','logs','data',path.basename(m.marker)]);
 if(fs.readdirSync(ROOT).some(n=>!allowed.has(n))||fs.readdirSync(path.join(ROOT,'logs')).length!==6)throw Error('POST_ROOT_WHITELIST_FAILED');
 return {pgdata:PGDATA,pgVersion:'17',systemId:id,clusterState:state,controlExitCode:r.status,controlSignal:r.signal,requiredFilesVerified:true,authenticationMethods:['scram-sha-256'],ruleCount:rules.length,oldEvidenceVerified:true,descendantJobActive:observer.jobActive,descendantJobFlags:observer.jobFlags,serverStarted:false,sqlConnections:0};
}
module.exports={fixedPlan,preflight,prepare,readRun,verifyOld,classify,postcheck,hash,OLD,SOURCE,ROOT,BASE,PGDATA};
if(require.main===module){try{const [command,dir,h,...extra]=process.argv.slice(2);if(!command){console.log(JSON.stringify({mode:'PLAN_ONLY',launch:false}));}
 else if(command==='prepare-live'&&!dir){console.log(JSON.stringify(prepare('LIVE')));}
 else if(['verify-run','inspect','postcheck'].includes(command)&&dir&&h&&!extra.length){const manifest=readRun(dir,h);console.log(JSON.stringify(command==='inspect'?{manifest,preflight:manifest.kind==='LIVE'?preflight():null}:command==='postcheck'?postcheck(dir,h):{manifest}));}
 else throw Error('CLI_SCOPE_REFUSED');}catch(e){console.error(e.message);process.exitCode=2;}}
