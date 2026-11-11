// Offline review only. No startup, credentials, network or process execution.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function validPin(pin){assert.match(pin,/^[a-f0-9]{64}$/,'INVALID_SHA256_PIN');return pin;}
function historicalProvenance({facts,verification,manifest,source,binaryHash}){
 validPin(binaryHash);
 assert.ok(facts&&verification&&manifest&&source,'PROVENANCE_MISSING');
 const f=JSON.parse(facts),v=JSON.parse(verification),m=JSON.parse(manifest);
 assert.equal(sha(source),m.preflightHash.toLowerCase(),'HISTORICAL_SOURCE_DRIFT');
 const pin=source.toString('utf8').match(/'postgres\.exe':'([A-Fa-f0-9]+)'/)?.[1]?.toLowerCase();
 assert.equal(pin,binaryHash,'HISTORICAL_SOURCE_BINARY_MISMATCH');
 assert.equal(f.binaries['postgres.exe'].toLowerCase(),binaryHash,'HISTORICAL_FACTS_MISMATCH');
 assert.equal(f.systemId,'7698826681383327460');assert.equal(f.state,'shut down');
 assert.equal(v.systemId,f.systemId);assert.equal(v.state,f.state);
 assert.equal(v.result,'D_ALL_NATIVE_EXITS_ZERO');
 assert.equal(v.outer.nativeExitCode,0);assert.equal(v.outer.nativeExitObserved,true);
 assert.equal(v.node.exitCode,0);assert.equal(v.children.length,2);
 for(const r of [v.outer,v.node,...v.children]){
  assert.ok(Number.isInteger(r.pid)&&r.pid>0);assert.equal(r.timeout,false);assert.equal(r.signal,null);
  assert.ok(!r.error&&!r.errorCode);assert.equal(r.stderrBytes,0);
 }
 for(const r of v.children)assert.equal(r.nativeExitCode,0);
 assert.deepEqual(v.children.map(r=>r.kind).sort(),['control','ntfs-listeners']);
 return{verified:true,binaryHash,sourceHash:sha(source),factsHash:sha(facts),verificationHash:sha(verification),manifestHash:sha(manifest),basis:'LOCAL_HISTORICAL_PREFLIGHT_CONTINUITY_NOT_VENDOR_ATTESTATION'};
}
function auditPins({root,manifest,runtimePins,requiredSources,readSource,canonicalSource,readBinary,provenance}){
 assert.equal(manifest.purpose,'SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL');
 const entries=Object.entries(manifest.sourceHashes);assert.equal(entries.length,250);
 const seen=new Set();
 for(const [file,pin]of entries){
  validPin(pin);assert.ok(!path.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(x=>!x||x==='.'||x==='..'),'INVALID_SOURCE_PATH');
  const absolute=path.resolve(root,file);assert.ok(path.relative(root,absolute)&&!path.relative(root,absolute).startsWith('..'),'SOURCE_OUTSIDE_ROOT');
  const canonical=canonicalSource(absolute);assert.equal(canonical.toLowerCase(),absolute.toLowerCase(),'SOURCE_REPARSE');
  const key=canonical.toLowerCase();assert.ok(!seen.has(key),'DUPLICATE_CANONICAL_PATH');seen.add(key);
  assert.equal(sha(readSource(absolute)),pin,'SOURCE_DRIFT');
 }
 assert.deepEqual(Object.keys(manifest.sourceHashes).sort(),requiredSources.slice().sort(),'SOURCE_SET_MISMATCH');
 assert.deepEqual(manifest.runtimeHashes,runtimePins,'RUNTIME_MANIFEST_MISMATCH');
 for(const [file,pin]of Object.entries(runtimePins)){validPin(pin);assert.equal(sha(readBinary(file)),pin,'BINARY_DRIFT');}
 const postgres=Object.entries(runtimePins).find(([f])=>path.basename(f)==='postgres.exe');assert.ok(postgres);
 assert.equal(provenance?.verified,true,'PROVENANCE_MISSING');assert.equal(provenance.binaryHash,postgres[1],'PROVENANCE_BINARY_MISMATCH');
 return{sourceCount:250,runtimeCount:Object.keys(runtimePins).length,executionApproved:false};
}
module.exports={sha,validPin,historicalProvenance,auditPins};
