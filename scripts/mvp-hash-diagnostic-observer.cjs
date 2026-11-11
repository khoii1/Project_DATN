const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,PS,checkRun,writeNew}=require('./mvp-hash-diagnostic-policy.cjs');
const {classifyBoundary}=require('./mvp-ui-native-boundary.cjs');
function known(r){return r?.independentNativeExit===true&&Number.isInteger(r.pid)&&r.pid>0&&Number.isInteger(r.code)&&!r.timeout&&!r.signal&&!r.error;}
function classifyChain({launcherPid,observer,outer,target,tool}={}){
 if(!Number.isInteger(launcherPid)||launcherPid<=0||!observer||!Number.isInteger(observer.pid)||observer.pid<=0||observer.parentPid!==launcherPid)return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
 const innerLinked=!!outer&&Number.isInteger(outer.pid)&&outer.pid>0&&outer.parentPid===observer.pid&&!!target&&target.parentPid===outer.pid;
 const inner=classifyBoundary({outer,node:target,relationshipVerified:innerLinked});
 if(inner==='NATIVE_CHILD_FAILURE_CONFIRMED')return'NODE_TARGET_NATIVE_FAILURE_CONFIRMED';
 // Exit4 is the wrapper's unknown-outcome policy, not evidence that the timed
 // out child exited nonzero. Keep the unresolved boundary explicit.
 if(observer.timeout||outer?.timeout||target?.timeout)return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
 if(known(outer)&&outer.parentPid===observer.pid&&outer.code!==0)return'POWERSHELL_OUTER_NATIVE_FAILURE_CONFIRMED';
 if(known(observer)&&observer.code!==0)return'OBSERVER_NATIVE_FAILURE_CONFIRMED';
 if(!known(observer)||!known(outer)||!known(target)||!innerLinked)return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
 if(!tool?.linked||!Number.isInteger(tool.code))return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';if(tool.code!==0)return'TOOL_HOST_FAILURE_CONFIRMED';
 return'ALL_OBSERVED_NATIVE_EXITS_ZERO';
}
function makeObserver(d){let used=false;return async run=>{
 if(used)throw Error('NO_RETRY');used=true;const{receipt}=d.checkRun(run);assert.equal(receipt.launcherPid,d.parentPid);d.write(run,'observer-attempt.json',{pid:d.pid,parentPid:d.parentPid,startedAt:d.now(),maximumAttempts:1});
 let outerStart;const r=await d.observe({executable:PS,args:['-NoProfile','-NonInteractive','-File',path.join(ROOT,'scripts/mvp-hash-diagnostic-outer.ps1'),'-RunDirectory',run],cwd:run,environment:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32',TEMP:run,TMP:run},deadline:40000,onSpawn:pid=>{outerStart={pid,parentPid:d.pid,spawnObserved:true,startedAt:d.now()};d.write(run,'outer-start.json',outerStart);}});
 // The real adapter below writes spawn metadata directly from ChildProcess.pid
 // before awaiting native completion; no inference from stdout.
 const outer={pid:r.pid,parentPid:d.pid,code:r.code??null,signal:r.signal||null,error:r.error?true:null,timeout:!!r.unknown,independentNativeExit:r.nativeExitObserved===true,endedAt:d.now(),spawnObserved:!!outerStart};d.write(run,'outer-native-exit.json',outer);
 let target;try{target=d.readTarget(run);}catch{target=null;}
 const targetLinked=target&&target.parentPid===outer.pid&&target.independentNativeExit===true;
 const provisional={observerPid:d.pid,observerParentPid:d.parentPid,outer,target:target?{pid:target.pid,parentPid:target.parentPid,code:target.code,signal:target.signal||null,timeout:!!target.timeout,error:target.error?true:null,independentNativeExit:target.independentNativeExit===true}:null,observerNativeExit:'AWAITING_LAUNCHER_HANDLE',completedAt:d.now()};d.write(run,'observer-outcome.json',provisional);
 return known(outer)&&outer.code===0&&outer.spawnObserved&&targetLinked&&known(target)&&target.code===0?0:outer.timeout?4:3;
};}
// Native observer equivalent to the reviewed helper, with a spawn callback.
// Keeps the direct ChildProcess handle; no shell, fallback, retry or kill.
async function observeOuter(o){
 const{spawn}=require('node:child_process');const child=spawn(o.executable,o.args,{cwd:o.cwd,env:o.environment,windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.once('spawn',()=>o.onSpawn(child.pid));let out=0,err=0;child.stdout.on('data',b=>out+=b.length);child.stderr.on('data',b=>err+=b.length);
 return new Promise(resolve=>{let settled=false;const finish=r=>{if(settled)return;settled=true;clearTimeout(timer);resolve({pid:child.pid,stdoutBytes:out,stderrBytes:err,...r});};const timer=setTimeout(()=>finish({code:null,unknown:true}),o.deadline);child.once('error',e=>finish({code:null,error:e.code||'SPAWN_ERROR'}));child.once('exit',(code,signal)=>finish({code,signal,nativeExitObserved:true}));});
}
module.exports={classifyChain,makeObserver,observeOuter};
if(require.main===module){const[mode,run,...extra]=process.argv.slice(2);if(mode!=='--approved-run'||!run||extra.length){console.error('EXPLICIT_FRESH_DIAGNOSTIC_APPROVAL_REQUIRED');process.exitCode=3;}else makeObserver({checkRun,write:writeNew,pid:process.pid,parentPid:process.ppid,now:()=>new Date().toISOString(),observe:observeOuter,readTarget:r=>JSON.parse(fs.readFileSync(path.join(r,'target-native-exit.json'),'utf8'))})(run).then(code=>{process.exitCode=code;}).catch(()=>{console.error('HASH_DIAGNOSTIC_BLOCKED_NO_RETRY');process.exitCode=3;});}
