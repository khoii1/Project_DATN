const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {sha,validPin,historicalProvenance,auditPins}=require('./mvp-ui-only-pin-audit.cjs');
const {RUNTIME,sourceFiles}=require('./mvp-ui-only-runtime.cjs');
const {supervise}=require('./mvp-ui-only-supervisor.cjs');
const ROOT=path.resolve(__dirname,'..'),POSTGRES='C:\\Program Files\\PostgreSQL\\17\\bin\\postgres.exe';
function fixture(){
 const root=path.resolve('SYNTHETIC_ROOT_NOT_CREATED'),files=Object.fromEntries(Array.from({length:250},(_,i)=>['src/file'+i+'.ts',Buffer.from('SYNTHETIC_SOURCE_'+i)]));
 const binary=Buffer.from('SYNTHETIC_NOT_EXECUTABLE'),pins={[POSTGRES]:sha(binary)};
 const manifest={purpose:'SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL',sourceHashes:Object.fromEntries(Object.entries(files).map(([f,b])=>[f,sha(b)])),runtimeHashes:{...pins}};
 return{root,manifest,runtimePins:pins,requiredSources:Object.keys(files),readSource:f=>files[path.relative(root,f).replaceAll('\\','/')],canonicalSource:f=>f,readBinary:()=>binary,provenance:{verified:true,binaryHash:sha(binary)}};
}
test('synthetic correct 64-character pin accepts; no execution authorization produced',()=>{assert.equal(validPin('a'.repeat(64)),'a'.repeat(64));assert.deepEqual(auditPins(fixture()),{sourceCount:250,runtimeCount:1,executionApproved:false});});
for(const [name,pin]of [['length65','a'.repeat(65)],['nonhex','g'.repeat(64)],['uppercase','A'.repeat(64)]])test('reject invalid SHA256 '+name,()=>{assert.throws(()=>validPin(pin),/INVALID_SHA256_PIN/);const f=fixture();f.manifest.runtimeHashes[POSTGRES]=f.runtimePins[POSTGRES]=pin;assert.throws(()=>auditPins(f));});
test('wrong valid-length hash rejects actual bytes',()=>{const f=fixture();f.manifest.runtimeHashes[POSTGRES]=f.runtimePins[POSTGRES]='0'.repeat(64);assert.throws(()=>auditPins(f),/BINARY_DRIFT/);});
test('runtime constant/manifest mismatch rejected',()=>{const f=fixture();f.manifest.runtimeHashes[POSTGRES]='0'.repeat(64);assert.throws(()=>auditPins(f),/RUNTIME_MANIFEST_MISMATCH/);});
test('altered source rejects',()=>{const f=fixture();f.readSource=()=>Buffer.from('CHANGED');assert.throws(()=>auditPins(f),/SOURCE_DRIFT/);});
test('canonical duplicate rejects',()=>{const f=fixture(),hash=f.manifest.sourceHashes['src/file0.ts'];delete f.manifest.sourceHashes['src/file249.ts'];f.manifest.sourceHashes['src/FILE0.ts']=hash;f.requiredSources=Object.keys(f.manifest.sourceHashes);const old=f.readSource;f.readSource=p=>old(p.replace('FILE0.ts','file0.ts'));assert.throws(()=>auditPins(f),/DUPLICATE_CANONICAL_PATH/);});
test('traversal rejects',()=>{const f=fixture();delete f.manifest.sourceHashes['src/file249.ts'];f.manifest.sourceHashes['../escape.ts']='0'.repeat(64);assert.throws(()=>auditPins(f),/INVALID_SOURCE_PATH/);});
test('reparse rejects',()=>{const f=fixture();f.canonicalSource=()=>path.resolve('OUTSIDE');assert.throws(()=>auditPins(f),/SOURCE_REPARSE/);});
test('unexpected source-set drift rejects',()=>{const f=fixture();f.requiredSources[0]='new-source';assert.throws(()=>auditPins(f),/SOURCE_SET_MISMATCH/);});
test('missing binary provenance blocks',()=>{const f=fixture();delete f.provenance;assert.throws(()=>auditPins(f),/PROVENANCE_MISSING/);assert.throws(()=>historicalProvenance({binaryHash:'a'.repeat(64)}),/PROVENANCE_MISSING/);});
test('source pins do not constitute approval; invalid binary gate precedes attempt/startup',async()=>{
 let actions=0;const m=fixture().manifest;
 await assert.rejects(supervise(m,{}));
 const bytes=Buffer.from('SYNTHETIC_APPROVAL'),source=Buffer.from('SYNTHETIC_SOURCE');
 const plan={scope:'ONE_DEV_UI_ONLY_HISTORICAL_SESSION',approved:true,maxSessions:1,manualSeconds:30,expiresAt:new Date(Date.now()+60000).toISOString(),userApprovalFile:'SYNTHETIC_NEW',userApprovalSha256:sha(bytes),allowExistingDevCredentialDecrypt:true,sourceHashes:{synthetic:sha(source)},runtimeHashes:{synthetic:'a'.repeat(65)}};
 const d={now:Date.now,read:()=>bytes,readSource:()=>source,requiredSources:()=>['synthetic'],verifyRuntime:p=>validPin(p.synthetic),consumeApproval:()=>actions++,prepareRun:()=>actions++,startCluster:()=>actions++};
 await assert.rejects(supervise(plan,d),/INVALID_SHA256_PIN/);assert.equal(actions,0);
});
function runtimeMock(){
 const code=fs.readFileSync(path.join(__dirname,'mvp-ui-only-runtime.cjs'),'utf8'),mod={exports:{}},reads=[];
 const fakeFs={readdirSync:()=>['fixture.ts'],lstatSync:()=>({isSymbolicLink:()=>false,isDirectory:()=>false}),readFileSync:f=>{reads.push(f);return Buffer.from('SYNTHETIC:'+f);}};
 const deny=()=>{throw Error('NATIVE_START_FORBIDDEN');};
 const supervisor=require('./mvp-ui-only-supervisor.cjs');
 // VM arrays have different prototypes. Normalize the injected source-list
 // boundary into the host realm without changing the production validator.
 const supervisorBoundary={...supervisor,validateApproval:(plan,io)=>supervisor.validateApproval(plan,{...io,requiredSources:()=>Array.from(io.requiredSources())})};
 const modules={'node:fs':fakeFs,'node:path':path,'node:crypto':require('node:crypto'),'node:assert/strict':assert,'./mvp-ui-only-supervisor.cjs':supervisorBoundary,'./mvp-native-exit.cjs':{observeNativeExit:deny}};
 vm.runInNewContext(code,{require:n=>{assert.ok(Object.hasOwn(modules,n),'UNEXPECTED_DEPENDENCY');return modules[n];},module:mod,__dirname,Date,Buffer},{timeout:1000});
 const r=mod.exports;
 // In-memory fixture constants only; actual runtime source/file unchanged.
 for(const f of Object.keys(r.RUNTIME))r.RUNTIME[f]=sha(Buffer.from('SYNTHETIC:'+f));
 const plan={scope:'ONE_DEV_UI_ONLY_HISTORICAL_SESSION',approved:true,maxSessions:1,manualSeconds:30,expiresAt:new Date(Date.now()+60000).toISOString(),userApprovalFile:'SYNTHETIC_NEW_APPROVAL',userApprovalSha256:sha(Buffer.from('SYNTHETIC:SYNTHETIC_NEW_APPROVAL')),allowExistingDevCredentialDecrypt:true,sourceHashes:Object.fromEntries(r.sourceFiles().map(f=>[f,sha(Buffer.from('SYNTHETIC:'+path.join(ROOT,f)))])),runtimeHashes:r.RUNTIME};
 return{r,plan,reads};
}
test('actual runtime checkPlan accepts matching synthetic hashes without startup',()=>{const f=runtimeMock();assert.equal(f.r.checkPlan(f.plan),true);});
test('actual runtime checkPlan rejects 65-character pinned hash',()=>{const f=runtimeMock();f.r.RUNTIME[POSTGRES]='a'.repeat(65);assert.throws(()=>f.r.checkPlan(f.plan));});
test('actual runtime checkPlan rejects mismatched manifest runtime constant',()=>{const f=runtimeMock();f.plan.runtimeHashes={...f.r.RUNTIME,[POSTGRES]:'0'.repeat(64)};assert.throws(()=>f.r.checkPlan(f.plan));});
test('real filesystem: 250 source entries and four binary hashes; historical provenance; no binary execution',()=>{
 const base='C:/DATN/test-instances/phase13-3b/preflight-process-diagnostic-1793621385609-f8d159/';
 const source=fs.readFileSync(path.join(__dirname,'mvp-dev-direct.cjs'));
 const provenance=historicalProvenance({facts:fs.readFileSync(base+'safety-facts.json'),verification:fs.readFileSync(base+'verification.json'),manifest:fs.readFileSync(base+'manifest.json'),source,binaryHash:sha(fs.readFileSync(POSTGRES))});
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json'),'utf8'));
 const result=auditPins({root:ROOT,manifest,runtimePins:RUNTIME,requiredSources:sourceFiles(),readSource:fs.readFileSync,readBinary:fs.readFileSync,canonicalSource:f=>{
  for(let p=f;;p=path.dirname(p)){assert.ok(!fs.lstatSync(p).isSymbolicLink(),'SOURCE_REPARSE');if(p===ROOT)break;}
  return fs.realpathSync.native(f);
 },provenance});assert.equal(result.sourceCount,250);assert.equal(result.runtimeCount,4);
 const bad={facts:fs.readFileSync(base+'safety-facts.json'),verification:fs.readFileSync(base+'verification.json'),manifest:fs.readFileSync(base+'manifest.json'),source:Buffer.from('CHANGED_SOURCE'),binaryHash:provenance.binaryHash};
 assert.throws(()=>historicalProvenance(bad),/HISTORICAL_SOURCE_DRIFT/);
});
test('revision2 preserved exactly; only postgres pin and corresponding runtime source entry changed in revision3',()=>{
 const oldBytes=fs.readFileSync(path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev2.json'));
 assert.equal(sha(oldBytes),'9f3d8e6115975d8739996e461187249c39a44f969c5c31b18045bbfa7bb6bf59');
 const old=JSON.parse(oldBytes),now=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev3.json'),'utf8'));
 assert.equal(old.revision,2);assert.equal(now.revision,3);assert.deepEqual(Object.keys(now.sourceHashes),Object.keys(old.sourceHashes));
 assert.deepEqual(Object.keys(now.sourceHashes).filter(k=>now.sourceHashes[k]!==old.sourceHashes[k]),['scripts/mvp-ui-only-runtime.cjs']);
 assert.deepEqual(Object.keys(now.runtimeHashes).filter(k=>now.runtimeHashes[k]!==old.runtimeHashes[k]),[POSTGRES]);
 assert.deepEqual(now.offlineTestHashes,old.offlineTestHashes);assert.equal(now.previousManifestSha256,sha(oldBytes));
 assert.equal(now.runtimeHashes[POSTGRES],old.runtimeHashes[POSTGRES].slice(0,47)+old.runtimeHashes[POSTGRES].slice(48));
});
