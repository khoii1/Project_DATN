'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const api=require('./phase13-5d1g-r21-lifecycle.cjs');
const prefix='r21-tests-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex');
const results=[];
const expected={success:['SYNTHETIC_PASS','SYNTHETIC_CONFIRMED',0],mismatch:['BLOCKED','CONFIRMATION_MISMATCH',23],missing:['BLOCKED','MISSING_INPUT',23],
 'operator-cancel':['CANCEL_VERIFIED','CONTROLLED_CANCEL_SUCCESS',0],'supervisor-cancel':['CANCEL_VERIFIED','CONTROLLED_CANCEL_SUCCESS',0],timeout:['CANCEL_VERIFIED','CONTROLLED_CANCEL_SUCCESS',0],
 'loss-before':['BLOCKED','CONSOLE_LOST_RECOVERED',23],'loss-during':['BLOCKED','CONSOLE_LOST_RECOVERED',23],
 'already-exited':['BLOCKED','CHILD_ALREADY_EXITED',0],'ignore-cancel':['BLOCKED','GRACEFUL_STOP_TIMEOUT',23],
 'supervisor-disappears':['BLOCKED','SUPERVISOR_LOST_CANCELLED',23],'wrong-pid':['BLOCKED','CANCEL_REFUSED_IDENTITY_OR_MEMBERS',23],
 'wrong-start':['BLOCKED','CANCEL_REFUSED_IDENTITY_OR_MEMBERS',23],'pid-reuse':['BLOCKED','CANCEL_REFUSED_IDENTITY_OR_MEMBERS',23],
 'extra-member':['BLOCKED','CANCEL_REFUSED_IDENTITY_OR_MEMBERS',23],exit7:['BLOCKED','NATIVE_NONZERO',7]};
for(const scenario of api.SCENARIOS)test('actual supervised lifecycle: '+scenario,async()=>{
 const r=await api.runSynthetic({runId:prefix+'-'+scenario,scenario});results.push(r);
 const [status,outcome,code]=expected[scenario];
 assert.equal(r.verdict.status,status,JSON.stringify(r));assert.equal(r.verdict.outcome,outcome,JSON.stringify(r));
 assert.equal(r.evidence.native.exitCode,code);assert.equal(r.evidence.native.independentNativeHandle,true);assert.equal(r.evidence.native.abnormalTestCleanup,false);
 assert.equal(r.evidence.terminal.pid,r.evidence.identity.childPid);assert.equal(r.evidence.native.startTicks,r.evidence.identity.childStartTicks);
 assert.equal(r.evidence.terminal.resourcesClosed,true);assert.equal(r.evidence.terminal.handlesReleased,true);assert.equal(r.evidence.nativeError,false);
 assert.equal(r.cleanup.matchingRemaining,0);assert.ok(r.cleanup.checked>=3);assert.equal(r.canaryInLogs,false);assert.equal(r.verdict.retry,false);assert.equal(r.verdict.secondInitdbAuthorized,false);
 if(status==='CANCEL_VERIFIED'){
  assert.equal(r.evidence.terminal.cancelIoSucceeded,true);assert.equal(r.evidence.terminal.modeRestored,true);assert.equal(r.evidence.terminal.ctrlCObserved,true);
  const signal=JSON.parse(fs.readFileSync(path.join(r.directory,'signal.json'),'utf8'));assert.equal(signal.members.length,2);assert.ok(signal.members.includes(r.evidence.identity.hostPid));assert.ok(signal.members.includes(r.evidence.identity.childPid));
 }
 if(scenario==='success'){assert.equal(r.evidence.terminal.echoDisabled,true);assert.equal(r.evidence.terminal.echoDetected,false);assert.equal(r.evidence.terminal.modeRestored,true);}
 if(scenario==='loss-during'){assert.equal(r.evidence.terminal.detached,true);assert.equal(r.evidence.terminal.cancelIoCalled,true);assert.equal(r.evidence.terminal.reason,'CONSOLE_LOST_DURING_READ');}
 if(scenario==='ignore-cancel'){assert.equal(r.evidence.terminal.outcome,'ABNORMAL_TEST_CLEANUP');assert.equal(r.evidence.supervisor.abnormalTestCleanup,true);assert.ok(fs.existsSync(path.join(r.directory,'deadline-exceeded.json')));}
 if(['wrong-pid','wrong-start','pid-reuse','extra-member'].includes(scenario)){
  assert.equal(r.evidence.supervisor.signalSent,false);assert.ok(fs.existsSync(path.join(r.directory,'signal-refused.json')));assert.equal(r.evidence.terminal.ctrlCObserved,false);
 }
 if(scenario==='extra-member'){const guest=JSON.parse(fs.readFileSync(path.join(r.directory,'guest-native-exit.json'),'utf8'));assert.equal(guest.exitCode,0);assert.equal(r.cleanup.checked,4);}
});
test('duplicate attempt does not overwrite or launch again',async()=>{
 const r=results.find(r=>r.scenario==='success'),file=path.join(r.directory,'attempt.json'),bytes=fs.readFileSync(file);
 await assert.rejects(api.runSynthetic({runId:path.basename(r.directory),scenario:'success'}),/ATTEMPT_EXISTS_NO_RETRY/);assert.deepEqual(fs.readFileSync(file),bytes);
});
test('unknown console loss, error despite exit0 and PID reuse never create success',()=>{
 const source=results.find(r=>r.scenario==='supervisor-cancel').evidence,clone=()=>JSON.parse(JSON.stringify(source));
 for(const mutate of [x=>{x.native=null;},x=>{x.terminal=null;},x=>{x.nativeError='ETIMEDOUT';},x=>{x.native.startTicks='639000000000000000';},x=>{x.terminal.pid++;},x=>{x.native.nonce='other';}]){
  const e=clone();mutate(e);const r=api.classify(e);assert.equal(r.status,'BLOCKED');assert.equal(r.outcome,'CONSOLE_LOST_UNKNOWN');assert.equal(r.retry,false);
 }
});
test('no API-call/terminal self-PASS, no resources or wrong native exit never count graceful',()=>{
 const base=results.find(r=>r.scenario==='supervisor-cancel').evidence;
 for(const mutate of [x=>{x.terminal.resourcesClosed=false;},x=>{x.terminal.modeRestored=false;},x=>{x.terminal.cancelIoSucceeded=false;},x=>{x.native.exitCode=7;},x=>{x.supervisor.exitCode=7;}]){
  const e=JSON.parse(JSON.stringify(base));mutate(e);assert.notEqual(api.classify(e).status,'CANCEL_VERIFIED');
 }
});
test('abnormal forced cleanup is never graceful or password success',()=>{
 const e=JSON.parse(JSON.stringify(results[0].evidence));e.native.abnormalTestCleanup=true;
 assert.deepEqual(api.classify(e),{secondInitdbAuthorized:false,retry:false,realInitdbInputVerified:false,status:'BLOCKED',outcome:'ABNORMAL_TEST_CLEANUP'});
});
test('initdb and arbitrary process launch options remain unavailable',async()=>{
 assert.throws(()=>api.executeInitdb({approval:'APPROVED'}),/NOT_AUTHORIZED/);
 for(const o of [{runId:'../x',scenario:'success'},{runId:prefix,scenario:'unknown'},{runId:prefix,scenario:'success',executable:'initdb.exe'}])await assert.rejects(api.runSynthetic(o),/OPTIONS_ONLY/);
});
test('PowerShell AST and no user-console/global process-group signaling path',()=>{
 const ps='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
 for(const name of ['phase13-5d1g-r21-supervisor.ps1','phase13-5d1g-r21-observer.ps1']){
  const file=path.join(__dirname,name),command="$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('"+file.replace(/'/g,"''")+"',[ref]$t,[ref]$e);if($e.Count){exit 2};'AST_PASS'";
  const r=spawnSync(ps,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:4000,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'},maxBuffer:1048576});assert.equal(r.error,undefined);assert.equal(r.status,0);assert.match(r.stdout,/AST_PASS/);
 }
 const source=fs.readFileSync(path.join(__dirname,'phase13-5d1g-r21-supervisor.ps1'),'utf8');
 assert.match(source,/\$count -eq 2/);assert.match(source,/\$requestedTicks -ceq \$childTicks/);assert.match(source,/GenerateConsoleCtrlEvent\(0,0\)/);
 assert.doesNotMatch(source,/taskkill|Stop-Process|RunAs|Set-Acl|pg_ctl|initdb\.exe/);
});
test('original R2 failure and accepted root evidence are retained, not retried/relabelled',()=>{
 const sha=x=>crypto.createHash('sha256').update(x).digest('hex').toUpperCase();
 assert.equal(sha(fs.readFileSync(path.resolve(__dirname,'../build/phase13-5d1g-r2-offline/r2-tests-1793108557125-c8fcd5-disconnect/result.json'))),'AD796A274DF1D11E684EFB41B37152BBF7476B6ED2946DD4AFEA29D606EDF15B');
 assert.equal(sha(fs.readFileSync('C:\\DATN\\test-instances\\phase13-5d1g\\initdb-attempt.json')),'43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C');
 assert.equal(sha(fs.readFileSync(path.join(__dirname,'phase13-5d1g-r2-console-fixture.ps1'))),'C464A8B51B04FDF0CE7E7FD973266FC8DCCF459C5BDB823DB26537BA66036837');
});
