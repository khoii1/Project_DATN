'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../build/phase13-5d1g-r21-offline');
const PS='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SCENARIOS=Object.freeze(['success','mismatch','missing','operator-cancel','supervisor-cancel','timeout','loss-before','loss-during','already-exited','ignore-cancel','supervisor-disappears','wrong-pid','wrong-start','pid-reuse','extra-member','exit7']);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{return null;}}
function write(file,obj){fs.writeFileSync(file,JSON.stringify(obj,null,2),{flag:'wx'});}
function classify(e){
 const base={secondInitdbAuthorized:false,retry:false,realInitdbInputVerified:false};
 const id=e.identity,n=e.native,t=e.terminal,s=e.supervisor;
 if(!id||!n||!t||!n.independentNativeHandle||n.nonce!==id.nonce||n.pid!==id.childPid||n.startTicks!==id.childStartTicks||t.nonce!==id.nonce||t.pid!==id.childPid||t.startTicks!==id.childStartTicks||n.exitCode!==t.intendedExitCode||e.nativeError)
  return {...base,status:'BLOCKED',outcome:'CONSOLE_LOST_UNKNOWN'};
 if(n.abnormalTestCleanup||e.forcedCleanup)return {...base,status:'BLOCKED',outcome:'ABNORMAL_TEST_CLEANUP'};
 if(s&&(s.pid!==id.childPid||s.startTicks!==id.childStartTicks||s.exitCode!==n.exitCode))return {...base,status:'BLOCKED',outcome:'CONSOLE_LOST_UNKNOWN'};
 if(s?.decision==='GRACEFUL_STOP_TIMEOUT')return {...base,status:'BLOCKED',outcome:'GRACEFUL_STOP_TIMEOUT'};
 if(s?.decision==='CANCEL_REFUSED_IDENTITY_OR_MEMBERS')return {...base,status:'BLOCKED',outcome:'CANCEL_REFUSED_IDENTITY_OR_MEMBERS'};
 if(t.outcome==='SYNTHETIC_CONFIRMED'&&n.exitCode===0&&s&&t.resourcesClosed&&t.echoDisabled&&!t.echoDetected&&t.modeRestored)return {...base,status:'SYNTHETIC_PASS',outcome:t.outcome};
 if(t.outcome==='CONTROLLED_CANCEL_SUCCESS'&&n.exitCode===0&&s&&t.resourcesClosed&&t.modeRestored&&t.cancelIoCalled&&t.cancelIoSucceeded)return {...base,status:'CANCEL_VERIFIED',outcome:t.outcome};
 if(t.outcome==='CONSOLE_LOST_RECOVERED'&&t.resourcesClosed&&t.detached&&n.exitCode===23)return {...base,status:'BLOCKED',outcome:'CONSOLE_LOST_RECOVERED'};
 if(['MISSING_INPUT','CONFIRMATION_MISMATCH','CHILD_ALREADY_EXITED','NATIVE_NONZERO','SUPERVISOR_LOST_CANCELLED','ABNORMAL_TEST_CLEANUP'].includes(t.outcome))return {...base,status:'BLOCKED',outcome:t.outcome};
 return {...base,status:'BLOCKED',outcome:'CONSOLE_LOST_UNKNOWN'};
}
async function runSynthetic(options){
 if(!options||Object.keys(options).length!==2||!/^[a-z0-9-]{1,80}$/.test(options.runId||'')||!SCENARIOS.includes(options.scenario))throw Error('SYNTHETIC_OPTIONS_ONLY');
 for(let p=ROOT;;p=path.dirname(p)){if(fs.existsSync(p)&&(fs.lstatSync(p).isSymbolicLink()||path.resolve(fs.realpathSync.native(p)).toLowerCase()!==path.resolve(p).toLowerCase()))throw Error('REPARSE_REFUSED');if(path.dirname(p)===p)break;}
 fs.mkdirSync(ROOT,{recursive:true});const dir=path.join(ROOT,options.runId);if(fs.existsSync(dir))throw Error('ATTEMPT_EXISTS_NO_RETRY');fs.mkdirSync(dir);
 const nonce=crypto.randomBytes(16).toString('hex'),sourceHash=sha(fs.readFileSync(path.join(__dirname,'phase13-5d1g-r21-child.cs')));
 write(path.join(dir,'attempt.json'),{phase:'13.5D.1G-R2.1',runId:options.runId,scenario:options.scenario,nonce,sourceHash,maxAttempts:1,secondInitdbAuthorized:false});
 const env={SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:dir,TMP:dir};
 function launch(script,args,label){const out=fs.openSync(path.join(dir,label+'.stdout.log'),'wx'),err=fs.openSync(path.join(dir,label+'.stderr.log'),'wx');
  let child;try{child=spawn(PS,['-NoLogo','-NoProfile','-NonInteractive','-File',path.join(__dirname,script),'-RunDirectory',dir,...args],{env,windowsHide:true,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const record={pid:child.pid,exitCode:null,error:null,exited:false,process:child};
  child.on('error',e=>{record.error=e.code||'UNKNOWN';record.exited=true;});child.on('exit',(code,signal)=>{record.exitCode=code;record.signal=signal;record.exited=true;write(path.join(dir,label+'-wrapper-exit.json'),{pid:child.pid,code,signal});});return record;
 }
 const host=launch('phase13-5d1g-r21-supervisor.ps1',['-Scenario',options.scenario,'-Nonce',nonce,'-SourceHash',sourceHash],'supervisor');
 let observer=null,identity=null,forcedCleanup=false;const start=Date.now();
 while(Date.now()-start<18000){
  if(!identity)identity=read(path.join(dir,'identity.json'));
  if(identity&&!observer)observer=launch('phase13-5d1g-r21-observer.ps1',[],'observer');
  if(host.exited&&(!observer||observer.exited))break;
  await sleep(30);
 }
 for(const owned of [host,observer].filter(Boolean))if(!owned.exited){forcedCleanup=true;owned.process.kill();}
 if(forcedCleanup){write(path.join(dir,'outer-abnormal-cleanup.json'),{classification:'ABNORMAL_TEST_CLEANUP',retry:false});await sleep(500);}
 const evidence={identity,terminal:read(path.join(dir,'child-terminal.json')),native:read(path.join(dir,'observer-native-exit.json')),supervisor:read(path.join(dir,'supervisor-native-exit.json')),
  nativeError:host.error||observer?.error||host.exitCode!==0||observer?.exitCode!==0,forcedCleanup};
 const verdict=classify(evidence);
 // Read-only post-test exact PID/start-time census; never signal by a bare PID.
 const targets=identity?[{pid:identity.childPid,ticks:identity.childStartTicks},{pid:identity.hostPid,ticks:identity.hostStartTicks}]:[];
 const obs=read(path.join(dir,'observer-ready.json'));if(obs)targets.push({pid:obs.observerPid,ticks:obs.observerStartTicks});
 const guest=read(path.join(dir,'guest-identity.json'));if(guest)targets.push({pid:guest.pid,ticks:guest.startTicks});
 const ps='$targets=\''+JSON.stringify(targets).replace(/'/g,"''")+'\'|ConvertFrom-Json;$alive=@();foreach($t in $targets){$p=Get-Process -Id $t.pid -ErrorAction SilentlyContinue;if($p -and $p.StartTime.ToUniversalTime().Ticks.ToString() -ceq $t.ticks){$alive+=$p.Id}};@{matchingRemaining=$alive.Count;checked=$targets.Count}|ConvertTo-Json -Compress';
 const check=spawnSync(PS,['-NoProfile','-NonInteractive','-Command',ps],{env,encoding:'utf8',timeout:4000,maxBuffer:1048576,windowsHide:true});
 let cleanup=null;try{if(check.status===0&&!check.error)cleanup=JSON.parse(check.stdout);}catch{}
 if(!cleanup||cleanup.matchingRemaining!==0) {verdict.status='BLOCKED';verdict.outcome='PROCESS_CLEANUP_NOT_VERIFIED';}
 const logs=fs.readdirSync(dir).filter(f=>/\.log$/.test(f));const canaryInLogs=logs.some(f=>/SYNTHETIC_INPUT_CANARY_R21_NOT_A_PASSWORD/.test(fs.readFileSync(path.join(dir,f),'utf8')));
 if(canaryInLogs){verdict.status='BLOCKED';verdict.outcome='CANARY_IN_LOGS';}
 const result={phase:'13.5D.1G-R2.1',scenario:options.scenario,evidence,verdict,cleanup,canaryInLogs,hostExit:host.exitCode,observerExit:observer?.exitCode};
 write(path.join(dir,'result.json'),result);return {directory:dir,...result};
}
function executeInitdb(){throw Error('SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED');}
module.exports={runSynthetic,classify,SCENARIOS,executeInitdb};
if(require.main===module){console.log(JSON.stringify({mode:'PLAN_ONLY',secondInitdbAuthorized:false}));if(process.argv.length>2)process.exitCode=2;}
