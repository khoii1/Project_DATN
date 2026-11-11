'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const policy=require('./phase13-5d1g-r24-policy.cjs');
const BASE=path.resolve(__dirname,'../build/phase13-5d1g-r24');
const SOURCE=['phase13-5d1g-r22-native.cs','phase13-5d1g-r24-native.cs','phase13-5d1g-r24-runtime.cs','phase13-5d1g-r24-fixture.cs','phase13-5d1g-r24-gate.cs','phase13-5d1g-r24-policy.cjs','phase13-5d1g-r24-executor.cjs','phase13-5d1g-r24-executor.test.cjs'];
const SCENARIOS=['success','visible-console','nonzero','restricted','descendant','wrong-descendant','outside-job','unexpected-console','missing-child','early-exit','wrong-pid','wrong-time','wrong-hash','observer-loss','host-loss','pre-failure','post-failure','unknown'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2),{flag:'wx'});
const read=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));}catch{return null;}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function testRules(dir,h){return [{role:'root',parentRole:null,path:path.join(dir,'fixture.exe'),hash:h,depth:0,restricted:false},{role:'reexec-simulation',parentRole:'root',path:path.join(dir,'fixture.exe'),hash:h,depth:1,restricted:false},{role:'backend-simulation',parentRole:'reexec-simulation',path:path.join(dir,'fixture.exe'),hash:h,depth:2,restricted:false}];}
function canonical(f){for(let p=path.resolve(f);;p=path.dirname(p)){if(fs.existsSync(p)&&(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==p.toLowerCase()))throw Error('REPARSE_REFUSED');if(path.dirname(p)===p)break;}}
function previousResolved(){if(!fs.existsSync(BASE))return true;for(const n of fs.readdirSync(BASE).filter(n=>/^r24-[a-z0-9-]+$/.test(n))){const dir=path.join(BASE,n);canonical(dir);if(!fs.existsSync(path.join(dir,'attempt.json')))continue;const file=path.join(dir,'result.json'),r=read(file);let census=r?.census;
 if(!census&&r){const proof=read(path.join(BASE,'legacy-native-census.json'))?.byRun?.[n];if(proof&&proof.sourceResultSha256===hash(file)&&proof.nativeExitCode===0&&proof.signal===null)census=proof.rows;}
 const native=r?.observer||r?.host;
 if(!r||r.exit?.code!==0||r.exit?.signal!==null||!Array.isArray(census)||!census.length||!census.every(x=>Number.isInteger(x.pid)&&x.pid>0&&/^\d+$/.test(x.expected)&&['ABSENT','EXITED','DIFFERENT_IDENTITY'].includes(x.status))||native?.jobActive!==0||native?.flags!==0||native?.root?.nativeHandleObserved!==true||native?.root?.pid!==r.identity?.pid||native?.root?.startFileTime!==r.identity?.startFileTime)throw Error('PREVIOUS_NATIVE_OUTCOME_UNRESOLVED_STOP');}return true;}
function prepare(scenario){if(!SCENARIOS.includes(scenario))throw Error('SYNTHETIC_SCENARIO_REQUIRED');canonical(BASE);previousResolved();fs.mkdirSync(BASE,{recursive:true});const runId='r24-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex'),dir=path.join(BASE,runId);fs.mkdirSync(dir);
 const csc='C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',sources=['phase13-5d1g-r22-native.cs','phase13-5d1g-r24-native.cs','phase13-5d1g-r24-runtime.cs','phase13-5d1g-r24-fixture.cs','phase13-5d1g-r24-gate.cs'].map(n=>path.join(__dirname,n));
 for(const [file,main] of [['supervisor.exe','BMain'],['fixture.exe','BFixture']]){const r=spawnSync(csc,['/nologo','/r:System.Web.Extensions.dll','/r:System.Security.dll','/main:'+main,'/out:'+path.join(dir,file),...sources],{encoding:'utf8',timeout:10000,windowsHide:true,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});write(path.join(dir,file+'.compile.json'),{exitCode:r.status,error:r.error?.code||null,signal:r.signal,stdout:r.stdout,stderr:r.stderr});if(r.error||r.signal||r.status!==0)throw Error('COMPILE_FAILED_'+dir);}
 fs.copyFileSync(path.join(dir,'fixture.exe'),path.join(dir,'foreign.exe'),fs.constants.COPYFILE_EXCL);
 const fixtureHash=hash(path.join(dir,'fixture.exe')),sourcesMap=Object.fromEntries(SOURCE.map(n=>[n,hash(path.join(__dirname,n))]));const manifest={mode:'OFFLINE_ONLY',realExecutionEnabled:false,historicalApprovalToken:null,runId,scenario,nonce:crypto.randomBytes(16).toString('hex'),fixtureHash,supervisorHash:hash(path.join(dir,'supervisor.exe')),rules:testRules(dir,fixtureHash),sources:sourcesMap,bundleHash:crypto.createHash('sha256').update(JSON.stringify(sourcesMap)).digest('hex').toUpperCase()};
 write(path.join(dir,'manifest.json'),manifest);return {directory:dir,manifestHash:hash(path.join(dir,'manifest.json'))};
}
function verify(p){canonical(p.directory);if(path.dirname(path.resolve(p.directory))!==BASE||!/^r24-[a-z0-9-]+$/.test(path.basename(p.directory))||hash(path.join(p.directory,'manifest.json'))!==p.manifestHash)throw Error('RUN_OR_HASH_REFUSED');const m=read(path.join(p.directory,'manifest.json'));if(m.mode!=='OFFLINE_ONLY'||m.realExecutionEnabled!==false||m.historicalApprovalToken!==null||!SCENARIOS.includes(m.scenario)||m.runId!==path.basename(p.directory)||JSON.stringify(m.rules)!==JSON.stringify(testRules(p.directory,m.fixtureHash)))throw Error('EXECUTION_MODE_REFUSED');if(JSON.stringify(Object.keys(m.sources))!==JSON.stringify(SOURCE))throw Error('SOURCE_SET_REFUSED');for(const n of SOURCE)if(hash(path.join(__dirname,n))!==m.sources[n])throw Error('SOURCE_DRIFT');return m;}
function executeInitdb(){throw Error('R24_REAL_EXECUTION_REQUIRES_NEW_APPROVAL_USE_RUN_BOUND_RELEASE');}
function prepareRealProposal(){
 const p=prepare('success'),file=path.join(p.directory,'manifest.json'),m=read(file);
 // Convert only a freshly prepared, never-launched draft. Publish a new manifest file, not overwrite old evidence.
 if(fs.existsSync(path.join(p.directory,'attempt.json')))throw Error('DRAFT_ALREADY_ATTEMPTED');
 const sourceFile=path.join(p.directory,'offline-draft.json');fs.renameSync(file,sourceFile);
 m.mode='REAL_INITDB_LOCKED';m.scenario='REAL_INITDB';m.plan=policy.plan();m.postgresHash=hash('C:\\Program Files\\PostgreSQL\\17\\bin\\postgres.exe');m.cmdHash=hash('C:\\Windows\\System32\\cmd.exe');m.rules=policy.liveRules(m);write(file,m);
 return {...p,manifestHash:hash(file),runId:m.runId,bundleHash:m.bundleHash,mode:m.mode,releaseIssued:false};
}
function validateRealProposal(p){
 canonical(p.directory);if(path.dirname(path.resolve(p.directory))!==BASE||!/^r24-[a-z0-9-]+$/.test(path.basename(p.directory)))throw Error('REAL_RUN_SCOPE');const file=path.join(p.directory,'manifest.json'),m=read(file);if(hash(file)!==p.manifestHash||m.mode!=='REAL_INITDB_LOCKED'||m.historicalApprovalToken!==null)throw Error('APPROVED_RUN_HASH_REFUSED');
 if(fs.readdirSync(p.directory).some(n=>/\.config$|\.dll$|\.local$/i.test(n)))throw Error('UNAPPROVED_CODE_INJECTION_FILE');for(const n of SOURCE)if(hash(path.join(__dirname,n))!==m.sources[n])throw Error('SOURCE_DRIFT');if(hash(path.join(p.directory,'supervisor.exe'))!==m.supervisorHash)throw Error('REAL_EXECUTABLE_DRIFT');return m;
}
function issueRelease(p,reference){
 previousResolved();validateRealProposal(p);if(!/^R24-EXEC-[a-z0-9-]{8,80}$/.test(reference))throw Error('NEW_EXECUTION_REFERENCE_REQUIRED');
 // Future-only: native issuer still requires exact visible-console typed confirmation; CLI args alone cannot issue.
 return spawn(path.join(p.directory,'supervisor.exe'),['issue-release',p.manifestHash,reference],{windowsHide:false,stdio:'ignore',env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});
}
function launchApproved(p){
 previousResolved();
 const m=validateRealProposal(p);
 if(!fs.existsSync(path.join(p.directory,'execution-release.dpapi')))throw Error('REAL_INITDB_EXECUTION_REQUIRES_NEW_EXPLICIT_APPROVAL');
 // Native gate decrypts/binds the release again, then requires actual operator readiness and fresh target gates.
 const exe=path.join(p.directory,'supervisor.exe');
 return spawn(exe,['host',p.manifestHash],{windowsHide:false,stdio:'ignore',env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});
}
async function run(scenario){return resume(prepare(scenario));}
async function resume(p){const m=verify(p);if(fs.existsSync(path.join(p.directory,'attempt.json')))throw Error('DUPLICATE_ATTEMPT_NO_RETRY');
 const exe=path.join(p.directory,'supervisor.exe');if(hash(exe)!==m.supervisorHash)throw Error('SUPERVISOR_HASH_DRIFT');const out=fs.openSync(path.join(p.directory,'host.stdout.log'),'wx'),err=fs.openSync(path.join(p.directory,'host.stderr.log'),'wx');
 const c=spawn(exe,['host',p.manifestHash],{windowsHide:true,stdio:['ignore',out,err],env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});fs.closeSync(out);fs.closeSync(err);let exit=null,error=null;c.on('exit',(code,signal)=>exit={code,signal});c.on('error',e=>error=e.code);const start=Date.now();while(!exit&&!error&&Date.now()-start<20000)await wait(25);if(!exit||error)throw Error('HOST_NATIVE_UNKNOWN_STOP_'+p.directory);
 let observer=null;const at=Date.now();while(!observer&&Date.now()-at<4000){observer=read(path.join(p.directory,'observer-native.json'));if(!observer&&(m.scenario==='observer-loss'||m.scenario==='early-exit'))break;if(!observer)await wait(25);}
 const result={...p,scenario:m.scenario,exit,outcome:read(path.join(p.directory,'outcome.json')),identity:read(path.join(p.directory,'identity.json')),host:read(path.join(p.directory,'host-native.json')),observer,observerError:read(path.join(p.directory,'observer-error.json'))};
 const native=observer||result.host;if(!native||native.jobActive!==0||native.flags!==0)throw Error('UNRESOLVED_FIXTURE_STOP_'+p.directory);
 const ids=[];for(const group of [result.host?.rows||[],observer?.rows||[],[result.identity], [read(path.join(p.directory,'observer-created.json'))],[read(path.join(p.directory,'outside-member.json'))]])for(const row of group)if(row)ids.push({pid:row.pid,start:row.startFileTime});
 ids.push({pid:result.identity.hostPid,start:result.identity.hostStart});if(!ids.every(x=>Number.isInteger(x.pid)&&/^\d+$/.test(x.start)))throw Error('CENSUS_IDENTITY_INVALID');await wait(100);
 const census=spawnSync(path.join(p.directory,'fixture.exe'),['census',...ids.map(x=>x.pid+':'+x.start)],{encoding:'utf8',windowsHide:true,timeout:5000,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});write(path.join(p.directory,'census-native.json'),{exitCode:census.status,error:census.error?.code||null,signal:census.signal});if(census.error||census.signal||census.status!==0||census.stderr)throw Error('CENSUS_UNKNOWN_STOP');result.census=JSON.parse(census.stdout);if(result.census.some(x=>x.status==='MATCHING_ACTIVE'))throw Error('MATCHING_PROCESS_REMAINS_STOP');
 write(path.join(p.directory,'result.json'),result);return result;
}
module.exports={prepare,prepareRealProposal,validateRealProposal,issueRelease,launchApproved,verify,executeInitdb,run,resume,previousResolved,SCENARIOS,SOURCE,BASE,hash,policy};
if(require.main===module){console.log(JSON.stringify(policy.plan()));if(process.argv.length>2)process.exitCode=2;}
