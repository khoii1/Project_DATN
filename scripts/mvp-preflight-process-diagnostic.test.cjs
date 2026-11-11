const test=require('node:test'),assert=require('node:assert/strict');
const {instrument,classify}=require('./mvp-preflight-process-diagnostic.cjs');
const args=['C:\\DATN\\test-instances\\phase13-3b\\data'];
const exe='C:\\Program Files\\PostgreSQL\\17\\bin\\pg_controldata.exe';
test('instrumentation passes exact native output/status and records process tree metadata',()=>{
 const events=[],r={pid:100,status:0,signal:null,stdout:'synthetic',stderr:''};const t=instrument(()=>r,e=>events.push(e),{parentPid:99});
 assert.equal(t.spawnSync(exe,args,{}),r);assert.equal(events[1].pid,100);assert.equal(events[1].parentPid,99);assert.equal(events[1].nativeExitCode,0);assert.ok(!JSON.stringify(events).includes('synthetic'));
 const second={pid:101,status:0};const t2=instrument(()=>second,()=>{},{});t2.spawnSync(exe,args,{});t2.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','SYNTHETIC'],{});assert.equal(t2.count(),2);
});
test('nonzero/signal/error remain unchanged, never replaced by success',()=>{
 for(const r of [{pid:100,status:-1073741819,signal:null},{pid:100,status:null,signal:'SIGTERM'},{status:null,error:{code:'ENOENT'}}]){
  const events=[],t=instrument(()=>r,e=>events.push(e));assert.equal(t.spawnSync(exe,args,{}),r);assert.equal(events[1].nativeExitCode,r.status);assert.equal(events[1].signal,r.signal||null);assert.equal(events[1].errorCode,r.error?.code||null);
 }
});
test('extra/unexpected child and PGDATA refused; no timeout force-kill option',()=>{
 const t=instrument(()=>({status:0}),()=>{});assert.throws(()=>t.spawnSync(exe,['OTHER'],{}));assert.throws(()=>t.spawnSync('cmd.exe',[],{}));assert.throws(()=>t.spawnSync(exe,args,{timeout:1}));
 t.spawnSync(exe,args,{});t.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','SYNTHETIC'],{});assert.throws(()=>t.spawnSync(exe,args,{}));
});
test('stop marker prevents native execution or continuation; native errors are redacted',()=>{
 let n=0;const t=instrument(()=>{n++;},()=>{},{stopped:()=>true});assert.throws(()=>t.spawnSync(exe,args,{}));assert.equal(n,0);
 const events=[],x=instrument(()=>{throw Object.assign(Error('SYNTHETIC_PRIVATE'),{code:'SYNTHETIC_CODE'});},e=>events.push(e));assert.throws(()=>x.spawnSync(exe,args,{}),/CHILD_NATIVE_THROW/);assert.ok(!JSON.stringify(events).includes('SYNTHETIC_PRIVATE'));
});
test('classification requires independent exits plus complete checks; covers A/B/C/D and unknown',()=>{
 const good=()=>({outer:{nativeExitCode:0},node:{exitCode:0},children:[{kind:'control',nativeExitCode:0},{kind:'ntfs-listeners',nativeExitCode:0}],checksPassed:true});
 assert.equal(classify(good()),'D_ALL_NATIVE_EXITS_ZERO');
 let x=good();x.outer.nativeExitCode=-1073741819;assert.equal(classify(x),'A_OUTER_HOST_FAILURE');
 x=good();x.children[1].nativeExitCode=-1073741819;assert.equal(classify(x),'B_CHILD_POWERSHELL_FAILURE');
 x=good();x.node.exitCode=-1073741819;assert.equal(classify(x),'C_NODE_OR_CONTROL_FAILURE');
 x=good();x.children[0].nativeExitCode=null;assert.equal(classify(x),'C_NODE_OR_CONTROL_FAILURE');
 x=good();x.outer.timeout=true;assert.equal(classify(x),'TIMEOUT_BLOCKED');
 x=good();x.checksPassed=false;assert.equal(classify(x),'INCOMPLETE_BLOCKED');
 x=good();x.children=[];assert.equal(classify(x),'INCOMPLETE_BLOCKED');
});
