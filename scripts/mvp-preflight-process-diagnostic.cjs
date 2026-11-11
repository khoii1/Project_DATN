// One-shot read-only preflight instrumentation. Never starts a cluster or connects to DB/MQTT.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='C:\\DATN\\test-instances\\phase13-3b';
const NODE='C:\\Program Files\\nodejs\\node.exe',PS='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2),{flag:'wx'});
const closed=()=>({SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0',TEMP:'C:\\Windows\\Temp',TMP:'C:\\Windows\\Temp'});
function instrument(native,emit,{parentPid,stopped=()=>false,now=()=>new Date().toISOString()}={}){
 let count=0;
 function spawnSync(exe,args,options){
  assert.ok(!stopped(),'DIAGNOSTIC_STOP_REQUESTED');
  const kind=path.basename(exe)==='pg_controldata.exe'?'control':exe==='powershell.exe'?'ntfs-listeners':null;
  assert.equal(kind,count===0?'control':count===1?'ntfs-listeners':null,'UNEXPECTED_NATIVE_CHILD');assert.ok(kind,'EXTRA_CHILD_REFUSED');
  if(kind==='control')assert.deepEqual(args,['C:\\DATN\\test-instances\\phase13-3b\\data']);
  else assert.deepEqual(args.slice(0,3),['-NoProfile','-NonInteractive','-Command']);
  assert.ok(!options.timeout&&!options.killSignal,'NO_TIMEOUT_KILL_ALLOWED');
  count++;const ordinal=count,requestedAt=now();emit({event:'child-start',kind,ordinal,parentPid,spawnRequestUTC:requestedAt,deadlineMs:15000});
  let result;
  try{result=native(exe,args,options);}catch(e){emit({event:'child-launch-error',kind,ordinal,parentPid,errorCode:e.code||null,errorName:e.name,endedAt:now()});throw Error('CHILD_NATIVE_THROW');}
  emit({event:'child-end',kind,ordinal,parentPid,pid:result.pid||null,spawnRequestUTC:requestedAt,endedAt:now(),nativeExitCode:result.status,signal:result.signal||null,errorCode:result.error?.code||null,stdoutBytes:Buffer.byteLength(result.stdout||''),stderrBytes:Buffer.byteLength(result.stderr||''),timeout:false});
  // Preserve original output/status and all original safety assertions. Do not fabricate success.
  assert.ok(!stopped(),'DIAGNOSTIC_STOP_REQUESTED');return result;
 }
 return{spawnSync,count:()=>count};
}
function validate(dir){
 assert.equal(path.dirname(dir),BASE);assert.match(path.basename(dir),/^preflight-process-diagnostic-\d+-[a-f0-9]+$/);
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 assert.equal(plan.preflightHash,'A23A8AA468B967BC34366A575AB29902222AF6A340F865A7FF1A09B194F4917E');
 assert.equal(sha(path.join(__dirname,'mvp-dev-direct.cjs')),plan.preflightHash);
 assert.equal(sha(path.join(__dirname,'mvp-native-exit.cjs')),'361ABC7FA7CA32D65B7A0EDA34B7608277CA9BA5774B95EDA0C0F4358078310F');
 for(const [file,hash]of Object.entries(plan.hashes))assert.equal(sha(file),hash,'DIAGNOSTIC_SOURCE_DRIFT');
 return plan;
}
async function nodePreflight(dir){
 validate(dir);const trace=path.join(dir,'node-trace.jsonl'),emit=value=>fs.appendFileSync(trace,JSON.stringify(value)+'\n');
 emit({event:'node-start',pid:process.pid,parentPid:process.ppid,recordedAt:new Date().toISOString()});
 const cp=require('node:child_process'),original=cp.spawnSync;
 const tap=instrument(original,emit,{parentPid:process.pid,stopped:()=>fs.existsSync(path.join(dir,'stop.request'))});
 cp.spawnSync=tap.spawnSync;
 try{
  const facts=require('./mvp-dev-direct.cjs').preflight();assert.equal(tap.count(),2);
  write(path.join(dir,'safety-facts.json'),facts);
  emit({event:'checks-returned',pid:process.pid,at:new Date().toISOString(),checksPassed:true});
 }catch(e){emit({event:'checks-failed',pid:process.pid,at:new Date().toISOString(),errorName:e.name,errorCode:e.code||null});process.exitCode=1;}
 finally{cp.spawnSync=original;}
 // A natural process exit is required. No process.exit(0) or forced success.
}
async function observer(dir){
 const plan=validate(dir);write(path.join(dir,'attempt.json'),{at:new Date().toISOString(),observerPid:process.pid,observerParentPid:process.ppid,onePreflightOnly:true,approvalHash:plan.approvalHash});
 const cp=require('node:child_process');
 const startedAt=new Date().toISOString(),child=cp.spawn(PS,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'mvp-preflight-outer-diagnostic.ps1'),'-RunDirectory',dir],{cwd:ROOT,env:closed(),stdio:['ignore','pipe','pipe'],windowsHide:true});
 write(path.join(dir,'observer-start.json'),{observerPid:process.pid,observerParentPid:process.ppid,outerPid:child.pid,outerParentPid:process.pid,spawnRequestUTC:startedAt,outerDeadlineMs:45000,childDeadlineMs:15000});
 let stdoutBytes=0,stderrBytes=0;child.stdout.on('data',b=>stdoutBytes+=b.length);child.stderr.on('data',b=>stderrBytes+=b.length);
 let finished=false,watch,timer;
 const stop=()=>{try{fs.writeFileSync(path.join(dir,'stop.request'),'STOP_NO_RETRY',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}};
 const result=await new Promise(resolve=>{
  const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(watch);resolve(value);};
  child.once('error',e=>finish({nativeExitCode:null,errorCode:e.code,signal:null,timeout:false}));
  child.once('exit',(code,signal)=>finish({nativeExitCode:code,signal,errorCode:null,timeout:false,nativeExitObserved:true}));
  timer=setTimeout(()=>{stop();finish({nativeExitCode:null,signal:null,errorCode:null,timeout:true,reason:'OUTER_DEADLINE_NO_KILL'});},45000);
  watch=setInterval(()=>{
   const file=path.join(dir,'node-trace.jsonl');if(!fs.existsSync(file))return;
   let rows;try{rows=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);}catch{return;}
   const active=rows.filter(x=>x.event==='child-start').find(s=>!rows.some(x=>['child-end','child-launch-error'].includes(x.event)&&x.ordinal===s.ordinal));
   if(active&&Date.now()-Date.parse(active.spawnRequestUTC)>15000){stop();finish({nativeExitCode:null,signal:null,errorCode:null,timeout:true,reason:'CHILD_DEADLINE_NO_KILL',kind:active.kind});}
  },100);
 });
 write(path.join(dir,'outer-native-exit.json'),{pid:child.pid,parentPid:process.pid,startedAt,endedAt:new Date().toISOString(),...result,stdoutBytes,stderrBytes});
 write(path.join(dir,'observer-outcome.json'),{at:new Date().toISOString(),observerPid:process.pid,outerNativeExit:result,readOnly:true,liveConnects:0,noServiceStartup:true});
 if(result.nativeExitCode!==0||result.timeout||result.errorCode)process.exitCode=1;
 // Unknown child ownership is retained; no force kill, retry, or stream destruction.
}
function classify({outer,node,children,checksPassed}){
 if(outer?.timeout||node?.timeout||children.some(x=>x.timeout))return 'TIMEOUT_BLOCKED';
 if(children.some(x=>x.kind==='ntfs-listeners'&&(x.nativeExitCode!==0||x.signal||x.errorCode)))return 'B_CHILD_POWERSHELL_FAILURE';
 if(children.some(x=>x.kind==='control'&&(x.nativeExitCode!==0||x.signal||x.errorCode))||node?.exitCode!==0)return 'C_NODE_OR_CONTROL_FAILURE';
 if(children.length!==2||!checksPassed)return 'INCOMPLETE_BLOCKED';
 if(outer?.nativeExitCode!==0||outer.signal||outer.errorCode)return 'A_OUTER_HOST_FAILURE';
 return 'D_ALL_NATIVE_EXITS_ZERO';
}
module.exports={instrument,classify};
if(require.main===module)(async()=>{
 const [mode,target,...extra]=process.argv.slice(2);assert.equal(extra.length,0);const dir=path.resolve(target||'');
 if(mode==='--observe')return observer(dir);if(mode==='--node-preflight')return nodePreflight(dir);throw Error('EXPLICIT_DIAGNOSTIC_MODE_REQUIRED');
})().catch(()=>{console.error('DIAGNOSTIC_STOP_NO_RETRY');process.exitCode=1;});
