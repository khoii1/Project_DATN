'use strict';
// Called only by the staged approved runtime. Import has no IO/startup actions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {observeNativeExit}=require('../mvp-native-exit.cjs');
const {createBridge}=require('./bridge.cjs');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function writeNew(f,v){fs.writeFileSync(f,JSON.stringify(v,null,2),{flag:'wx'});}
function summarizeNative(host){
 const rows=host.native||[],node=rows.find(r=>r.identity.pid===host.nodePid),edge=rows.find(r=>r.identity.pid===host.edgePid);
 return {handlesVerified:!!node&&!!edge,ownerVerified:host.ownerVerified===true,workerExited:node?.native.signaled===true,edgeExited:edge?.native.signaled===true,workerExitCode:node?.native.exitCode??null,edgeExitCode:edge?.native.exitCode??null,osExitTimeStatus:node?.native.osExitTimeStatus==='VALID'&&edge?.native.osExitTimeStatus==='VALID'?'VALID':'UNKNOWN',remaining:host.remainingTree?.length??null,foreignTargeted:host.foreignProcessesTargeted??null};
}
function independentScript(ids,nativeRun){
 assert.ok(Array.isArray(ids)&&ids.length>0&&ids.every(n=>Number.isSafeInteger(n)&&n>0));
 assert.match(nativeRun,/^C:\\Users\\Acer Swift3\\AppData\\Local\\SmartAgricultureBrowserSmoke\\edge-remediation-run-[a-f0-9]{32}$/);
 const profile=path.join(nativeRun,'tmp','user-data').replaceAll("'","''");
 return '$ids=@('+ids.join(',')+');$rows=@(Get-CimInstance -Query "SELECT ProcessId,ParentProcessId FROM Win32_Process" -ErrorAction Stop|Where-Object {$ids -contains [int]$_.ProcessId -or $ids -contains [int]$_.ParentProcessId});$profiles=@(Get-CimInstance Win32_Process -Filter "Name = \'msedge.exe\'" -ErrorAction Stop|Where-Object {$_.CommandLine -and $_.CommandLine.Contains(\''+profile+'\')});@{remaining=$rows.Count;profileMatches=$profiles.Count}|ConvertTo-Json -Compress';
}
function createLiveBridge({run,plan,credential,inspectRuntime,checkPlan,native=observeNativeExit,now=Date.now}){
 const base='C:\\Users\\Acer Swift3\\AppData\\Local\\SmartAgricultureBrowserSmoke';
 const hostFile=path.join(__dirname,'native-host.ps1'),workerFile=path.join(__dirname,'worker.cjs');
 return createBridge({now,inspectRuntime,verifyExecutionApproval:async p=>{
  assert.equal(p,plan);checkPlan(plan);assert.equal(plan.acceptanceMode,'AUTOMATED_BROWSER');assert.equal(plan.allowWebsiteCredentialReuseForBrowser,true);
  assert.equal(plan.automatedBrowser?.executionApproved,true);assert.equal(plan.automatedBrowser?.maxLaunches,1);
 },runWorker:async({session,nonce})=>{
  const nativeRun=path.join(base,'edge-remediation-run-'+crypto.randomBytes(16).toString('hex'));
  const browserPlan=path.join(run,'automated-browser-plan.json');
  const pins={};for(const [f,h]of Object.entries(plan.automationSourceHashes)){const absolute=path.resolve(__dirname,'../..',f);assert.equal(sha(absolute),h);pins[absolute]=h;}
  const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.equal(sha(edge),'d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b');
  Object.assign(pins,plan.browserBinaryHashes);pins[process.execPath]=plan.runtimeHashes[process.execPath];assert.equal(sha(process.execPath),pins[process.execPath]);
  writeNew(browserPlan,{scope:'ONE_AUTOMATED_HISTORICAL_BROWSER',executionApproved:true,supervisorPid:process.pid,runId:session.runId,nativeRun,workerFile,approvalFile:plan.userApprovalFile,approvalSha256:plan.userApprovalSha256,pins,session,sessionDeadlineUtc:new Date(session.deadline).toISOString(),maxLaunches:1});
  let c,payload,input;
  try{
   c=await credential();payload={session,credential:c};input=Buffer.from(JSON.stringify(payload),'utf8');
   const deadline=Math.max(1000,session.deadline-now());
   const host=await native({executable:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',args:['-NoLogo','-NoProfile','-NonInteractive','-File',hostFile,'-Run',nativeRun,'-PlanFile',browserPlan],cwd:run,environment:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'},input,deadline,limit:4096});
   writeNew(path.join(run,'automated-host-exit.json'),{pid:host.pid,code:host.code,signal:host.signal||null,unknown:!!host.unknown,nativeExitObserved:host.nativeExitObserved===true});
   assert.equal(host.nativeExitObserved,true,'HOST_EXIT_UNKNOWN');assert.ok(Number.isInteger(host.code)&&!host.signal&&!host.error);
   const receipt=JSON.parse(fs.readFileSync(path.join(nativeRun,'parent-native.json'),'utf8'));
   assert.equal(receipt.observerPid,host.pid);assert.equal(receipt.supervisorPid,process.pid);assert.equal(receipt.runId,session.runId);
   let result;try{result=JSON.parse(fs.readFileSync(path.join(nativeRun,'browser-result.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;result={workerPid:receipt.nodePid,sessionRunId:session.runId,evidence:{mode:'HISTORICAL_NOT_LIVE',status:'BLOCKED',matrix:require('./contract.cjs').matrix(),screenshots:[],operatorAttestationCreated:false,failure:{category:'WORKER_CRASH_BEFORE_EVIDENCE'}}};}
   assert.equal(result.workerPid,receipt.nodePid);assert.equal(result.sessionRunId,session.runId);
   const ids=[...new Set([receipt.nodePid,receipt.edgePid,...(receipt.unknownIds||[]),...(receipt.native||[]).map(r=>r.identity.pid)].filter(Number.isInteger))];
   const script=independentScript(ids,nativeRun);
   const independent=await native({executable:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',args:['-NoProfile','-NonInteractive','-Command',script],cwd:run,environment:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'},deadline:5000,limit:4096});
   assert.equal(independent.code,0);assert.equal(independent.nativeExitObserved,true);assert.equal(JSON.parse(independent.stdout).remaining,0);assert.equal(JSON.parse(independent.stdout).profileMatches,0);
   writeNew(path.join(run,'automated-independent-reconciliation.json'),{checkedIds:ids,remaining:0,nativeExitCode:independent.code,atUtc:new Date().toISOString()});
   writeNew(path.join(run,'automated-browser-evidence.json'),result.evidence);
   return {nonce,native:summarizeNative(receipt),evidence:result.evidence};
  }finally{if(input)input.fill(0);if(c)c.password='';payload=null;input=null;c=null;}
 }});
}
module.exports={createLiveBridge,summarizeNative,independentScript};
