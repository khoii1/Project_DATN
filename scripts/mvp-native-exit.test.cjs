const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {observeNativeExit}=require('./mvp-native-exit.cjs');
test('native parent exit is observed while a descendant still holds stdout open',async()=>{
 const fixture=process.env.MVP_LIFECYCLE_FIXTURE_EXE;assert.ok(fixture,'COMPILED_SYNTHETIC_FIXTURE_REQUIRED');
 const result=await observeNativeExit({executable:fixture,args:[],environment:process.env,deadline:4000});
 assert.equal(result.code,0);assert.equal(result.nativeExitObserved,true);assert.equal(result.pipeClosed,false);assert.match(result.stdout,/SYNTHETIC_PARENT_OK/);
 // Child closes itself; no forced termination and no leaked fixture process after test.
 await new Promise(r=>setTimeout(r,1500));
});
test('native nonzero exit is preserved without retry',async()=>{const r=await observeNativeExit({executable:process.execPath,args:['-e',"console.error('SYNTHETIC_ERROR');process.exit(7)"],environment:process.env});assert.equal(r.code,7);assert.equal(r.nativeExitObserved,true);assert.match(r.stderr,/SYNTHETIC_ERROR/);});
test('missing executable is a known launch failure, not synthetic success',async()=>{const r=await observeNativeExit({executable:'C:\\nonexistent-mvp-synthetic.exe',args:[],environment:process.env,deadline:1000});assert.equal(r.error,'ENOENT');assert.notEqual(r.code,0);});
test('deadline produces unknown outcome and does not kill or retry child',async()=>{const r=await observeNativeExit({executable:process.execPath,args:['-e','setTimeout(()=>process.exit(0),200)'],environment:process.env,deadline:5});assert.equal(r.unknown,true);assert.equal(r.code,null);await new Promise(r=>setTimeout(r,400));});
