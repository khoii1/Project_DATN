'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const ROOT='C:\\DATN\\test-instances\\phase13-5d1g',PGDATA=ROOT+'\\data',OFFLINE=path.resolve(__dirname,'../build/phase13-5d1g-r22-offline');
const PS='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',INITDB='C:\\Program Files\\PostgreSQL\\17\\bin\\initdb.exe';
const INITDB_HASH='94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC';
const SCENARIOS=Object.freeze(['success','mismatch','missing','operator-cancel','exit7','console-loss','supervisor-loss','early-exit','wrong-pid','wrong-start','pid-reuse','timeout']);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex').toUpperCase();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const read=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));}catch{return null;}};
const write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2),{flag:'wx'});
function executionPlan(runId='not-approved'){
 if(!/^[a-z0-9-]{1,64}$/.test(runId))throw Error('INVALID_RUN_ID');
 return Object.freeze({phase:'13.5D.1G-R2.2',mode:'PLAN_ONLY',actualInitdbEnabled:false,executable:INITDB,binarySha256:INITDB_HASH,workingDirectory:ROOT,
  args:Object.freeze(['-D',PGDATA,'-U','d1g_dba','--pwprompt','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C','--no-clean']),
  operatorConsoleVisible:true,redirectPasswordStdin:false,passwordInjection:false,passwordFile:false,passwordEnvironment:false,recordConsoleInput:false,
  runId,newAttemptMarker:ROOT+'\\initdb-attempt-r22-'+runId+'.json',oldAttemptMarker:ROOT+'\\initdb-attempt.json',
  host:'127.0.0.1',futureServerPort:55435,portIsInitdbArgument:false,maxAttempts:1,automaticRetry:false,forceKill:false,
  independentNativeObserverRequired:true,launchSuspendedUntilObserverReady:true,promptDeadlineMs:120000,
  timeoutPolicy:'UNKNOWN_NO_RETRY_NO_FORCE_KILL_MANUAL_DISPOSITION',realInitdbInputVerified:false,credentialHandling:'OPERATOR_DIRECT_LOCAL_CONSOLE_ONLY'});
}
function validateCandidate(candidate,observedHash){return !!candidate&&JSON.stringify(candidate)===JSON.stringify(executionPlan(candidate.runId))&&observedHash===INITDB_HASH;}
function executeInitdb(){throw Error('SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED');}
function classify(e){
 const base={actualInitdbEnabled:false,retry:false,forceKill:false,realInitdbInputVerified:false};
 if(e.nativeError)return {...base,status:'BLOCKED',outcome:'NATIVE_ERROR_UNKNOWN_MANUAL'};
 const id=e.identity,n=e.native,h=e.host;
 if(h?.decision==='EARLY_EXIT_BEFORE_OBSERVER')return {...base,status:'BLOCKED',outcome:'EXIT_BEFORE_OBSERVER_READY'};
 if(h?.decision==='REQUEST_IDENTITY_REFUSED')return {...base,status:'BLOCKED',outcome:'PROCESS_IDENTITY_REFUSED'};
 if(e.supervisorLost)return {...base,status:'BLOCKED',outcome:'SUPERVISOR_LOST_UNKNOWN_MANUAL'};
 if(h?.decision==='TIMEOUT_UNKNOWN_MANUAL')return {...base,status:'BLOCKED',outcome:'TIMEOUT_UNKNOWN_MANUAL'};
 if(!id||!n||!h||h.decision!=='OBSERVING'||!n.independentNativeHandle||!h.nativeHandleObserved||n.pid!==id.pid||n.startFileTime!==id.startFileTime||n.nonce!==id.nonce||h.pid!==id.pid||h.startFileTime!==id.startFileTime||h.exitCode!==n.exitCode||typeof n.exitAt!=='string'||h.exitAt!==n.exitAt)return {...base,status:'BLOCKED',outcome:'NATIVE_IDENTITY_OR_EXIT_UNKNOWN_MANUAL'};
 if(e.fixture?.nonce!==id.nonce||e.fixture?.intendedExitCode!==n.exitCode)return {...base,status:'BLOCKED',outcome:'FIXTURE_OUTCOME_NOT_CORRELATED'};
 if(e.fixture?.outcome==='ABNORMAL_TEST_CLEANUP')return {...base,status:'BLOCKED',outcome:'ABNORMAL_TEST_CLEANUP'};
 if(n.exitCode!==0)return {...base,status:'BLOCKED',outcome:e.fixture?.outcome||'NATIVE_NONZERO'};
 if(e.fixture?.nonce!==id.nonce||e.fixture?.outcome!=='CONFIRMED'||e.fixture?.prompts!==2||e.fixture?.echoDisabled!==true||e.fixture?.screenNoEcho!==true||e.fixture?.modeRestored!==true)return {...base,status:'BLOCKED',outcome:'INPUT_NOT_VERIFIED'};
 return {...base,status:'SYNTHETIC_EXTERNAL_PASS',outcome:'CONFIRMED'};
}
async function runSynthetic(options){
 if(!options||Object.keys(options).length!==2||!/^[a-z0-9-]{1,80}$/.test(options.runId||'')||!SCENARIOS.includes(options.scenario))throw Error('SYNTHETIC_OPTIONS_ONLY');
 for(let p=OFFLINE;;p=path.dirname(p)){if(fs.existsSync(p)&&(fs.lstatSync(p).isSymbolicLink()||path.resolve(fs.realpathSync.native(p)).toLowerCase()!==path.resolve(p).toLowerCase()))throw Error('REPARSE_REFUSED');if(path.dirname(p)===p)break;}
 fs.mkdirSync(OFFLINE,{recursive:true});const dir=path.join(OFFLINE,options.runId);if(fs.existsSync(dir))throw Error('ATTEMPT_EXISTS_NO_RETRY');fs.mkdirSync(dir);
 const nonce=crypto.randomBytes(16).toString('hex'),nativeHash=sha(fs.readFileSync(path.join(__dirname,'phase13-5d1g-r22-native.cs'))),fixtureHash=sha(fs.readFileSync(path.join(__dirname,'phase13-5d1g-r22-fake-initdb.cs')));
 write(path.join(dir,'attempt.json'),{phase:'13.5D.1G-R2.2',runId:options.runId,nonce,scenario:options.scenario,nativeHash,fixtureHash,actualInitdbEnabled:false});
 const env={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:dir,TMP:dir};
 function launch(script,args,label){const out=fs.openSync(path.join(dir,label+'.stdout.log'),'wx'),err=fs.openSync(path.join(dir,label+'.stderr.log'),'wx');let child;
  try{child=spawn(PS,['-NoLogo','-NoProfile','-NonInteractive','-File',path.join(__dirname,script),'-RunDirectory',dir,...args],{windowsHide:true,env,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const state={pid:child.pid,exited:false,exitCode:null,error:null};child.on('error',e=>{state.error=e.code||'UNKNOWN';state.exited=true;});child.on('exit',(code,signal)=>{state.exitCode=code;state.signal=signal;state.exited=true;write(path.join(dir,label+'-wrapper-exit.json'),{pid:child.pid,code,signal});});return state;
 }
 const host=launch('phase13-5d1g-r22-host.ps1',['-Mode','SYNTHETIC','-Scenario',options.scenario,'-Nonce',nonce,'-NativeHash',nativeHash,'-FixtureHash',fixtureHash],'host');
 let observer=null,identity=null;const clock=Date.now();
 while(Date.now()-clock<18000){if(!identity)identity=read(path.join(dir,'identity.json'));if(identity&&!observer)observer=launch('phase13-5d1g-r22-observer.ps1',['-NativeHash',nativeHash],'observer');if(host.exited&&(!observer||observer.exited))break;await pause(30);}
 // No process termination or automatic retry: unresolved external native lifecycle is manual.
 const evidence={identity,native:read(path.join(dir,'observer-native-exit.json')),host:read(path.join(dir,'host-native-exit.json')),fixture:read(path.join(dir,'fixture-terminal.json')),
  supervisorLost:!!read(path.join(dir,'supervisor-lost.json')),nativeError:host.error||observer?.error||!host.exited||!!host.signal||host.exitCode!==0||((observer?.exitCode!==0)&&options.scenario!=='early-exit')};
 const verdict=classify(evidence);
 const ready=read(path.join(dir,'observer-ready.json'));
 let cleanup=null;
 if(identity){
  const members=[{name:'Child',pid:identity.pid,start:identity.startFileTime},{name:'Supervisor',pid:identity.supervisorPid,start:identity.supervisorStartFileTime}];
  if(ready)members.push({name:'Observer',pid:ready.observerPid,start:ready.observerStartFileTime});
  if(!members.every(m=>Number.isInteger(m.pid)&&m.pid>0&&/^\d+$/.test(m.start)))throw Error('CENSUS_IDENTITY_INVALID');
  const command='$result=@{};'+members.map(m=>'$p=Get-Process -Id '+m.pid+' -ErrorAction SilentlyContinue;$same=$false;if($p){$same=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -ceq \''+m.start+'\'};$result.same'+m.name+'Remaining=$same;').join('')+'$result|ConvertTo-Json -Compress';
  const r=spawnSync(PS,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:4000,maxBuffer:1048576,env,windowsHide:true});try{if(!r.error&&r.status===0)cleanup=JSON.parse(r.stdout);}catch{}
 }
 if(!cleanup||Object.values(cleanup).some(Boolean)){verdict.status='BLOCKED';verdict.outcome='PROCESS_OUTCOME_UNKNOWN_MANUAL';}
 const canaryInLogs=fs.readdirSync(dir).filter(n=>n.endsWith('.log')).some(n=>fs.readFileSync(path.join(dir,n),'utf8').includes('SYNTHETIC_R22_CONSOLE_INPUT_NOT_A_PASSWORD'));
 if(canaryInLogs){verdict.status='BLOCKED';verdict.outcome='CANARY_IN_LOGS';}
 const result={scenario:options.scenario,evidence,verdict,cleanup,hostExit:host.exitCode,observerExit:observer?.exitCode,canaryInLogs};write(path.join(dir,'result.json'),result);return{directory:dir,...result};
}
module.exports={executionPlan,validateCandidate,executeInitdb,classify,runSynthetic,SCENARIOS,INITDB_HASH};
if(require.main===module){console.log(JSON.stringify({phase:'13.5D.1G-R2.2',mode:'PLAN_ONLY',actualInitdbEnabled:false}));if(process.argv.length>2)process.exitCode=2;}
