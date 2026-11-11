'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const FILES=Object.freeze([...['adapter.cjs','contract.cjs','policy.cjs','credential-source.cjs','bridge.cjs','live-provider.cjs','worker.cjs','browser-environment.cjs','native-host.ps1','assertions.cjs','source-contract.cjs'].map(n=>'scripts/frontend-acceptance/'+n),'scripts/mvp-credential-input.cjs','scripts/mvp-edge-smoke-observer.cjs']);
const BINARY_PINS=Object.freeze({'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe':'d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b',
 'C:\\DATN\\Project_datn\\node_modules\\playwright-core\\package.json':'07c47543631fef9508760365dee9fbe958c562093ec8d122543949ed231f233f',
 'C:\\DATN\\Project_datn\\node_modules\\playwright-core\\lib\\coreBundle.js':'9393fa79e1c67c74edc26b610d65a4f7ed73d345a762465cc88340a33a2454ac',
 'C:\\DATN\\Project_datn\\node_modules\\playwright-core\\browsers.json':'f306eed529599b1eaf2f8a85db9de2b23e1a3fe36c2b66434b7c9434fb627a99'});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const guards=new WeakMap();
function strictCheck(plan,io){
 const path=require('node:path'),L=require('./strict-lineage.cjs');
 let rawPlanFile=io.rawPlanFile;
 if(!rawPlanFile&&process.argv[2]==='--check-plan')rawPlanFile=path.resolve(process.argv[3]);
 if(!rawPlanFile&&process.argv[2]==='--execute')rawPlanFile=path.join(path.resolve(process.argv[3]),'approval.json');
 const checked=typeof io.describeSource==='function'?{...io,rawPlanFile}:require('./lineage-fs.cjs').createIO({...io,rawPlanFile},require('./lineage-anchor.cjs'),rawPlanFile?[rawPlanFile]:[]);
 return L.verify(plan,checked,{requireEffective:true});
}
function validate(plan,io){
 assert.equal(plan.acceptanceMode,'AUTOMATED_BROWSER');assert.equal(plan.allowWebsiteCredentialReuseForBrowser,true);
 assert.equal(plan.automatedBrowser?.executionApproved,true);assert.equal(plan.automatedBrowser?.maxLaunches,1);assert.equal(plan.automatedBrowser?.verifiedOwnedCleanupApproved,true);
 assert.equal(plan.automatedBrowser.approvalSha256,plan.userApprovalSha256);
 const lineage=strictCheck(plan,io);
 assert.ok(!/99bcc29e|76d31ff0|1383afd4|7339522b|1cff98d8/.test(plan.userApprovalFile),'RETIRED_BROWSER_APPROVAL');
 assert.deepEqual(plan.browserBinaryHashes,BINARY_PINS);for(const [f,h]of Object.entries(BINARY_PINS))assert.equal(sha(io.read(f)),h,'BROWSER_BINARY_DRIFT');
 // Existing staged Supervisor invokes d.verifyRuntime after its post-session
 // source loop. Register this explicit IO extension once, preserving that
 // original native runtime verifier and adding the same strict source check.
 if(typeof io.verifyRuntime==='function'&&!guards.has(io)){const original=io.verifyRuntime;const guard=p=>{const result=original.call(io,p);strictCheck(plan,io);return result;};io.verifyRuntime=guard;guards.set(io,{plan,guard});}
 else if(guards.has(io)&&guards.get(io).plan!==plan)throw Error('SOURCE_LINEAGE_IO_REUSE_REFUSED');
 return lineage;
}
module.exports={FILES,BINARY_PINS,validate,strictCheck};
