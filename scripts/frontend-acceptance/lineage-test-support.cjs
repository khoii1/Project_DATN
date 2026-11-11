'use strict';
// Explicitly synthetic trusted IO; no writes, processes, network or startup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const L=require('./strict-lineage.cjs');
function fixture({state='APPROVED_DELTA_VALID'}={}){
 const abs=f=>path.isAbsolute(f)?path.resolve(f):path.resolve(L.ROOT,f),key=f=>abs(f).toLowerCase();
 const baseline=L.parse(fs.readFileSync(abs(L.BASE))),supp=L.parse(fs.readFileSync(abs(L.SUPP))),map=new Map();
 const put=(f,b)=>map.set(key(f),Buffer.isBuffer(b)?b:Buffer.from(b));
 for(const f of [L.BASE,L.SUPP,L.APPROVAL,L.HARDENING_APPROVAL,...Object.keys(baseline.sourceHashes),...Object.keys(baseline.runtimeHashes),...Object.keys(baseline.offlineTestHashes),...Object.keys(supp.runtimeSourceHashes),...Object.keys(supp.offlineTestAndHandoffHashes),...Object.keys(supp.browserBinaryHashes),'scripts/frontend-acceptance/strict-lineage.cjs','scripts/frontend-acceptance/lineage-fs.cjs','scripts/frontend-acceptance/lineage-anchor.cjs'])put(f,fs.readFileSync(abs(f)));
 if(state!=='BASELINE_UNPATCHED')for(const[f,v]of Object.entries(supp.stagedPinnedChanges))put(f,fs.readFileSync(abs(v.candidateFile)));
 const helpers={...supp.runtimeSourceHashes},tests={...supp.offlineTestAndHandoffHashes},replacements={};
 for(const f of ['scripts/frontend-acceptance/source-contract.cjs','scripts/frontend-acceptance/bridge.test.cjs']){const old=helpers[f]||tests[f],next=L.sha(map.get(key(f)));replacements[f]={old,new:next};if(helpers[f])helpers[f]=next;else tests[f]=next;}
 const additions={};for(const f of ['scripts/frontend-acceptance/strict-lineage.cjs','scripts/frontend-acceptance/lineage-fs.cjs'])helpers[f]=additions[f]=L.sha(map.get(key(f)));
 const bootstrapAnchor={path:'scripts/frontend-acceptance/lineage-anchor.cjs',sha256:L.sha(map.get(key('scripts/frontend-acceptance/lineage-anchor.cjs')))};helpers[bootstrapAnchor.path]=bootstrapAnchor.sha256;
 const descriptor={purpose:'OFFLINE_HARDENING_PINS_NOT_EXECUTION_APPROVAL',approvalFile:L.HARDENING_APPROVAL,approvalSha256:L.HARDENING_SHA,replacements,additions};
 const descriptorFile=abs('build/SYNTHETIC_TRUSTED_HARDENING_DESCRIPTOR.json'),descriptorBytes=Buffer.from(JSON.stringify(descriptor));put(descriptorFile,descriptorBytes);
 const sourceHashes={...baseline.sourceHashes};if(state!=='BASELINE_UNPATCHED')for(const[f,v]of Object.entries(L.DELTA))sourceHashes[f]=v.new;
 const plan={sourceLineageApprovalFile:L.APPROVAL,sourceLineageApprovalSha256:L.APPROVAL_SHA,sourceHashes,automationSourceHashes:helpers,browserBinaryHashes:{...supp.browserBinaryHashes},runtimeHashes:{...baseline.runtimeHashes}};
 let onRead=null,describeOverride=null;
 const io={lineageAuthority:{documentFile:descriptorFile,documentSha256:L.sha(descriptorBytes),bootstrapAnchor},read:f=>{if(onRead)onRead(f);const b=map.get(key(f));if(!b)throw Error('SYNTHETIC_MISSING_FILE');return b;},readSource:f=>{if(onRead)onRead(f);const b=map.get(key(f));if(!b)throw Error('SYNTHETIC_MISSING_SOURCE');return b;},describeSource:f=>{
  const b=map.get(key(f));if(!b)throw Error('SYNTHETIC_MISSING_META');const m={canonicalPath:abs(f),ownerKnown:true,ownerSid:L.SID,reparse:false,ancestorsVerified:true,stamp:L.sha(b)};return describeOverride?describeOverride(f,m):m;
 }};
 return {plan,io,baseline,supp,descriptor,descriptorFile,map,put,key,abs,setOnRead:fn=>{onRead=fn;},setDescribe:fn=>{describeOverride=fn;}};
}
function attach(plan,io){
 const f=fixture();Object.assign(plan,f.plan);plan.automatedBrowser={...plan.automatedBrowser};
 const originalRead=io.read;Object.assign(io,f.io);io.read=p=>f.map.has(f.key(p))?f.io.read(p):originalRead(p);io.requiredSources=()=>Object.keys(f.baseline.sourceHashes);io.verifyRuntime=p=>assert.deepEqual(p,f.baseline.runtimeHashes);
 return f;
}
module.exports={fixture,attach};
