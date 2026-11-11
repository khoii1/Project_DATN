'use strict';
// Pure verifier. Authority comes from fixed anchors + trusted caller IO, never plan.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path').win32;
const ROOT='C:\\DATN\\Project_datn',SID='S-1-5-21-1432835263-483988321-3159128977-1001';
const BASE='docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json',BASE_SHA='47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb';
const SUPP='docs/FINAL_FRONTEND_LIFECYCLE_SOURCE_PINS.json',SUPP_SHA='b3b51b7ad27f97e3b1bb3a2e1212b45739f8543a04638c232b124119465c462f';
const APPROVAL='C:\\Users\\Acer Swift3\\.codex\\attachments\\88c3785e-466a-4027-989c-71d3e5ecdb22\\Pasted text.txt',APPROVAL_SHA='1e8d88d02f1f5066418746bae36c1f3a6bbd4c16df024b4d930b477f5f7b0dc8';
const HARDENING_APPROVAL='C:\\Users\\Acer Swift3\\.codex\\attachments\\f3cad0e5-c086-4e40-b872-de66947ae466\\Pasted text.txt',HARDENING_SHA='d4ff17ff9f6d470e740163407fb7b3924fbad598a66a4d89f118426aeef9bd64';
const DELTA=Object.freeze({
 'scripts/mvp-ui-only-supervisor.cjs':Object.freeze({old:'2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b',new:'b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2'}),
 'scripts/mvp-ui-only-runtime.cjs':Object.freeze({old:'671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf',new:'ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83'})});
const READY_POLICY_REVIEW=Object.freeze({"path":"scripts/frontend-acceptance/bridge.cjs","old":"2c667c0b5a46389f9fee3494a0b1c07ad4e275d8538362c80c2b1c694c7cabbb","new":"f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1","preparationApprovalFile":"C:\\Users\\Acer Swift3\\.codex\\attachments\\765e707f-c586-4aa6-a96e-9dbb47b1d92a\\Pasted text.txt","preparationApprovalSha256":"364cb7448bf5fbdbb1a063c04b3f4bd0d7e7cda359b61c7fba83596de0cb4fa1","parentFile":"docs/FINAL_FRONTEND_STRICT_HARDENING_PINS.json","parentSha256":"4f336378455fc5bc7a9bb570d324e18cab6b43fe1c932842ba85e530728f3c07","purpose":"STAGED_READY_POLICY_SOURCE_REVIEW_NOT_LIVE_APPROVAL"});
const BROWSER_REVIEW=Object.freeze({"purpose":"STAGED_BROWSER_REMEDIATION_REVIEW_NOT_EXECUTION","preparationApprovalFile":"C:\\Users\\Acer Swift3\\.codex\\attachments\\9637d66a-599b-4b6b-b608-719bd47bdd2f\\Pasted text.txt","preparationApprovalSha256":"41aa934eec56c834d61101b23a539d6a1ba551c0f9c118c24059820cfcb96e7f","parentFile":"docs/FINAL_FRONTEND_READY_POLICY_HARDENING_PINS.json","parentSha256":"c634f044958c4684420d957c1adea23bed2d7e5125d4b05fdd757d2f4061c79d","changes":{"scripts/frontend-acceptance/adapter.cjs":{"old":"1617f6a221f899c1f8107417a8a175bc4ec58673adbd55324bbe38a3215ae19e","new":"4b78f3c928db2c40939d5e17f2672cb6c801ee1a9a0f24d4f5fe294d3e8457c2"},"scripts/frontend-acceptance/policy.cjs":{"old":"e70a7c922fe902434fa4f5712a8805ad5c649971d1b8e09781c821279d07f119","new":"2af4991d3425434c15f66368b221c07f046722217c84f94120ec6f9de2f2a4f8"},"scripts/frontend-acceptance/assertions.cjs":{"old":"c5fc747f4f31da4945a029f18e9b7b8338955bf7f608cd43dc0b9ebd9cabff65","new":"ca9fe0b7c03831e4e66c8f560b59a4b5691abda91aaebba40c5f0c62e673d191"},"scripts/frontend-acceptance/contract.cjs":{"old":"a0be73f63accce5e872a256dabeab8adb6fdcd91da9177ac8a7269a0e30e99df","new":"89c00551046464a7397b224691a17cf01f932a0a8b48f3da4ab0a29ccc1826c7"}}});
const THIRD_REVIEW=Object.freeze({"purpose":"THIRD_BLOCKER_PREPARATION_NOT_ACTIVATION","parentFile":"docs/FINAL_FRONTEND_BROWSER_REMEDIATION_PINS.json","parentSha256":"f097e563ce287ba31bef1dad3377e90c5e16a672727b56e9b0f17471f8bed635","preparationFile":"C:\\Users\\Acer Swift3\\.codex\\attachments\\538b1157-f6d0-4a16-b1c5-c7ad14b5003e\\Pasted text.txt","preparationSha256":"dbcd6fbaabad5ced15c540252fba4c76e777adaa0202ed8d6078a9491d55db85","changes":{"scripts/frontend-acceptance/policy.cjs":{"old":"2af4991d3425434c15f66368b221c07f046722217c84f94120ec6f9de2f2a4f8","new":"4e9c282e925f132832a4aa5e3b295b7c040da1b25d35e98a7d4d384d0d9c30e8"},"scripts/frontend-acceptance/adapter.cjs":{"old":"4b78f3c928db2c40939d5e17f2672cb6c801ee1a9a0f24d4f5fe294d3e8457c2","new":"44c9f7dd5750dbe44e942e6baaf6923e037ec58754870c6bb52db798c9b0f7f4"},"scripts/frontend-acceptance/worker.cjs":{"old":"8da79aba15c74a84f864e7e6d1d2ecd4653e4ea75c4b3102bc057f0bc7e0e2b4","new":"b5430a2d7d1de0971424b613e0e1703e2e50485b222207e36677d3d5f0c7440c"},"scripts/frontend-acceptance/native-host.ps1":{"old":"381d7da2ad388dbd5595e46b554ff73c88922a9008c5bb83531de6c9f8ab3823","new":"612c907bb17a386e0734ee119781537dd7539c3580196aebff8ba3d93a6db8bf"}}});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const block=label=>{throw Object.assign(Error('SOURCE_LINEAGE_BLOCKED:'+label),{code:'SOURCE_LINEAGE_BLOCKED',reason:label});};
function parse(bytes){
 const text=Buffer.isBuffer(bytes)?bytes.toString('utf8'):String(bytes);let i=0;
 const ws=()=>{while(/[ \t\r\n]/.test(text[i]||'')&&i<text.length)i++;};
 function string(){const start=i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')return JSON.parse(text.slice(start,i));}block('JSON_STRING');}
 function value(){ws();if(text[i]==='"')return string();if(text[i]==='{'){i++;const o={},keys=new Set();ws();if(text[i]==='}'){i++;return o;}while(true){ws();if(text[i]!=='"')block('JSON_KEY');const key=string();if(keys.has(key)||['__proto__','prototype','constructor'].includes(key))block('DUPLICATE_JSON_KEY');keys.add(key);ws();if(text[i++]!==':')block('JSON_COLON');o[key]=value();ws();const c=text[i++];if(c==='}')return o;if(c!==',')block('JSON_OBJECT');}}
 if(text[i]==='['){i++;const a=[];ws();if(text[i]===']'){i++;return a;}while(true){a.push(value());ws();const c=text[i++];if(c===']')return a;if(c!==',')block('JSON_ARRAY');}}
 const start=i;while(i<text.length&&!/[\s,}\]]/.test(text[i]))i++;if(start===i)block('JSON_VALUE');return JSON.parse(text.slice(start,i));}
 try{const result=value();ws();if(i!==text.length)block('JSON_TRAILING');return result;}catch(e){if(e.code==='SOURCE_LINEAGE_BLOCKED')throw e;block('INVALID_JSON');}
}
function canonical(f){if(typeof f!=='string'||!f||path.isAbsolute(f)||/[\\%\x00-\x20]/.test(f)||f.split('/').some(s=>!s||s==='.'||s==='..'))block('SOURCE_PATH');return f;}
function catalogue(map,count){if(!map||Array.isArray(map)||typeof map!=='object'||Object.keys(map).length!==count)block('CATALOGUE_COUNT');const names=new Set();for(const[f,h]of Object.entries(map)){canonical(f);if(names.has(f.toLowerCase()))block('DUPLICATE_CANONICAL_PATH');names.add(f.toLowerCase());if(!/^[a-f0-9]{64}$/.test(h))block('PIN_FORMAT');}return map;}
function equalMap(a,b,label){if(!a||Array.isArray(a)||JSON.stringify(Object.keys(a).sort())!==JSON.stringify(Object.keys(b).sort()))block(label+'_PATH_SET');for(const f of Object.keys(b))if(a[f]!==b[f])block(label+'_HASH');}
function verifyImpl(plan,io,{requireEffective=false}={}){
 if(!io||typeof io.describeSource!=='function'||typeof io.read!=='function'||typeof io.readSource!=='function')block('TRUSTED_IO_REQUIRED');
 const samples=new Map();
 function meta(f){const m=io.describeSource(f);if(!m||m.ownerKnown!==true||!/^S-1-/.test(m.ownerSid||'')||m.reparse!==false||m.ancestorsVerified!==true||typeof m.stamp!=='string'||!m.stamp)block('OWNERSHIP_OR_IDENTITY_UNKNOWN');const absolute=path.isAbsolute(f)?path.resolve(f):path.resolve(ROOT,f);if(typeof m.canonicalPath!=='string'||m.canonicalPath.toLowerCase()!==absolute.toLowerCase())block('CANONICAL_PATH');if(!path.isAbsolute(f)&&m.ownerSid!==SID)block('SOURCE_OWNER');return m;}
 function read(f,source=false){const before=meta(f),bytes=source?io.readSource(f):io.read(path.isAbsolute(f)?f:path.resolve(ROOT,f)),after=meta(f);if(JSON.stringify(before)!==JSON.stringify(after))block('SOURCE_CHANGED_DURING_READ');const old=samples.get(f);if(old&&JSON.stringify(old.meta)!==JSON.stringify(after))block('SOURCE_STATE_CHANGED');samples.set(f,{meta:after,hash:sha(bytes),source});return bytes;}
 if(io.rawPlanFile){const normalized=v=>Array.isArray(v)?v.map(normalized):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalized(x)])):v;if(JSON.stringify(normalized(parse(read(io.rawPlanFile))))!==JSON.stringify(normalized(plan)))block('RAW_PLAN_MISMATCH');}
 const baselineBytes=read(BASE);if(sha(baselineBytes)!==BASE_SHA)block('BASELINE_HASH');const baseline=parse(baselineBytes);catalogue(baseline.sourceHashes,250);
 if(Object.keys(baseline.runtimeHashes||{}).length!==4||Object.keys(baseline.offlineTestHashes||{}).length!==4)block('BASELINE_AUXILIARY_CATALOGUE');
 if(plan.sourceLineageApprovalFile!==APPROVAL||plan.sourceLineageApprovalSha256!==APPROVAL_SHA||sha(read(APPROVAL))!==APPROVAL_SHA)block('TWO_FILE_APPROVAL');
 const suppBytes=read(SUPP);if(sha(suppBytes)!==SUPP_SHA)block('SUPPLEMENTAL_DOCUMENT');const supp=parse(suppBytes);
 equalMap(Object.fromEntries(Object.entries(supp.stagedPinnedChanges||{}).map(([f,v])=>[f,v.originalSha256])),Object.fromEntries(Object.entries(DELTA).map(([f,v])=>[f,v.old])),'OLD_PAIRS');
 equalMap(Object.fromEntries(Object.entries(supp.stagedPinnedChanges).map(([f,v])=>[f,v.candidateSha256])),Object.fromEntries(Object.entries(DELTA).map(([f,v])=>[f,v.new])),'NEW_PAIRS');
 const expected={...baseline.sourceHashes};for(const[f,pair]of Object.entries(DELTA)){if(expected[f]!==pair.old)block('OLD_HASH');expected[f]=pair.new;}
 // Hardening modifies verifier code that the immutable old document also pins.
 // Its separate descriptor digest is fixed in the reviewed bootstrap anchor;
 // accepting a digest or override from execution-plan fields is forbidden.
 const helpers={...supp.runtimeSourceHashes},tests={...supp.offlineTestAndHandoffHashes};
 const hard=io.lineageAuthority;if(!hard||typeof hard.documentFile!=='string'||!/^[a-f0-9]{64}$/.test(hard.documentSha256||''))block('HARDENING_AUTHORITY_REQUIRED');
 const hardBytes=read(hard.documentFile);if(sha(hardBytes)!==hard.documentSha256)block('HARDENING_DOCUMENT_HASH');const hd=parse(hardBytes);
 if(hd.purpose!=='OFFLINE_HARDENING_PINS_NOT_EXECUTION_APPROVAL'||hd.approvalFile!==HARDENING_APPROVAL||hd.approvalSha256!==HARDENING_SHA||sha(read(HARDENING_APPROVAL))!==HARDENING_SHA)block('HARDENING_APPROVAL');
 // Optional, externally pinned READY-policy review descriptor. It is not
 // accepted from execution-plan fields and does not authorize live execution.
 if(hd.readyPolicyUpdate){
  const ready=READY_POLICY_REVIEW;
  equalMap(hd.readyPolicyUpdate,ready,'READY_POLICY_SCOPE');
  if(sha(read(ready.preparationApprovalFile))!==ready.preparationApprovalSha256)block('READY_POLICY_REVIEW_REFERENCE');
  const parentBytes=read(ready.parentFile);if(sha(parentBytes)!==ready.parentSha256)block('READY_POLICY_PARENT_HASH');
  const parent=parse(parentBytes);
  if(JSON.stringify(hd.replacements)!==JSON.stringify(parent.replacements)||hd.approvalFile!==parent.approvalFile||hd.approvalSha256!==parent.approvalSha256||hd.purpose!==parent.purpose)block('READY_POLICY_PARENT_SCOPE');
  if(helpers[ready.path]!==ready.old)block('READY_POLICY_OLD_PIN');
  helpers[ready.path]=ready.new;
 }
 // Externally pinned review overlay; execution-plan fields cannot select it.
 if(hd.browserRemediation){
  const review=BROWSER_REVIEW,got=hd.browserRemediation;
  equalMap(Object.fromEntries(Object.entries(got).filter(([k])=>k!=='changes')),Object.fromEntries(Object.entries(review).filter(([k])=>k!=='changes')),'BROWSER_REVIEW_REFERENCE');
  if(JSON.stringify(got.changes)!==JSON.stringify(review.changes))block('BROWSER_REVIEW_SCOPE');
  if(sha(read(review.preparationApprovalFile))!==review.preparationApprovalSha256)block('BROWSER_REVIEW_APPROVAL');
  const parentBytes=read(review.parentFile);if(sha(parentBytes)!==review.parentSha256)block('BROWSER_REVIEW_PARENT');const parent=parse(parentBytes);
  if(JSON.stringify(hd.replacements)!==JSON.stringify(parent.replacements)||JSON.stringify(hd.readyPolicyUpdate)!==JSON.stringify(parent.readyPolicyUpdate))block('BROWSER_REVIEW_PARENT_SCOPE');
  for(const[f,pair]of Object.entries(review.changes)){if(helpers[f]!==pair.old)block('BROWSER_REVIEW_OLD_PIN');helpers[f]=pair.new;}
 }
 if(hd.thirdBlockerRemediation){
  const review=THIRD_REVIEW,got=hd.thirdBlockerRemediation;
  if(JSON.stringify(got)!==JSON.stringify(review))block('THIRD_REVIEW_SCOPE');
  if(sha(read(review.preparationFile))!==review.preparationSha256)block('THIRD_REVIEW_REFERENCE');
  const pb=read(review.parentFile);if(sha(pb)!==review.parentSha256)block('THIRD_REVIEW_PARENT');const parent=parse(pb);
  for(const k of ['purpose','approvalFile','approvalSha256','replacements','readyPolicyUpdate','browserRemediation'])if(JSON.stringify(hd[k])!==JSON.stringify(parent[k]))block('THIRD_REVIEW_PARENT_SCOPE');
  for(const[f,pair]of Object.entries(review.changes)){if(helpers[f]!==pair.old)block('THIRD_REVIEW_OLD_PIN');helpers[f]=pair.new;}
 }
 const allowedOverrides=['scripts/frontend-acceptance/source-contract.cjs','scripts/frontend-acceptance/bridge.test.cjs'];
 for(const[f,v]of Object.entries(hd.replacements||{})){if(!allowedOverrides.includes(f)||v.old!==(helpers[f]||tests[f])||!/^[a-f0-9]{64}$/.test(v.new))block('HARDENING_OVERRIDE_SCOPE');if(helpers[f])helpers[f]=v.new;else tests[f]=v.new;}
 const allowedAdds=['scripts/frontend-acceptance/strict-lineage.cjs','scripts/frontend-acceptance/lineage-fs.cjs'];equalMap(Object.fromEntries(Object.keys(hd.additions||{}).map(f=>[f,true])),Object.fromEntries(allowedAdds.map(f=>[f,true])),'HARDENING_ADDITION_SCOPE');for(const[f,h]of Object.entries(hd.additions)){if(!/^[a-f0-9]{64}$/.test(h))block('HARDENING_PIN');helpers[f]=h;}
 if(hard.bootstrapAnchor?.path!=='scripts/frontend-acceptance/lineage-anchor.cjs'||!/^[a-f0-9]{64}$/.test(hard.bootstrapAnchor.sha256||''))block('BOOTSTRAP_ANCHOR_REQUIRED');helpers[hard.bootstrapAnchor.path]=hard.bootstrapAnchor.sha256;
 catalogue(helpers,16);equalMap(plan.automationSourceHashes,helpers,'HELPER_PLAN');equalMap(plan.browserBinaryHashes,supp.browserBinaryHashes,'BROWSER_PLAN');equalMap(plan.runtimeHashes,baseline.runtimeHashes,'RUNTIME_PLAN');
 const states=[];for(const[f,h]of Object.entries(baseline.sourceHashes)){const actual=sha(read(f,true));if(DELTA[f]){if(actual!==DELTA[f].old&&actual!==DELTA[f].new)block('REPLACEMENT_HASH');states.push(actual===DELTA[f].new);}else if(actual!==h)block('THIRD_SOURCE_DRIFT');}
 const state=states.every(Boolean)?'APPROVED_DELTA_VALID':states.every(v=>!v)?'BASELINE_UNPATCHED':block('PARTIAL_DELTA');
 equalMap(plan.sourceHashes,state==='BASELINE_UNPATCHED'?baseline.sourceHashes:expected,'EFFECTIVE_PLAN');
 for(const[f,h]of Object.entries(helpers))if(sha(read(f,true))!==h)block('HELPER_DRIFT');
 for(const[f,h]of Object.entries(tests))if(sha(read(f,true))!==h)block('OFFLINE_TEST_DRIFT');
 for(const group of [baseline.runtimeHashes,baseline.offlineTestHashes,supp.browserBinaryHashes])for(const[f,h]of Object.entries(group))if(sha(read(f,path.isAbsolute(f)?false:true))!==h)block('BINARY_OR_TEST_DRIFT');
 // Second complete pass catches source/approval/owner changes after an earlier
 // file was verified. Post-session calls run this same verifier from scratch.
 for(const[f,v]of samples){const before=meta(f),again=v.source?io.readSource(f):io.read(path.isAbsolute(f)?f:path.resolve(ROOT,f));if(JSON.stringify(before)!==JSON.stringify(v.meta)||sha(again)!==v.hash||JSON.stringify(meta(f))!==JSON.stringify(v.meta))block('SOURCE_STATE_CHANGED');}
 if(requireEffective&&state!=='APPROVED_DELTA_VALID')block('BASELINE_UNPATCHED');
 return Object.freeze({baseline:'REV10_BASELINE_VALID',delta:state==='APPROVED_DELTA_VALID'?'APPROVED_TWO_FILE_DELTA_VALID':state,effective:state==='APPROVED_DELTA_VALID'?'EFFECTIVE_SOURCE_VALID':'BASELINE_UNPATCHED',state,baselineSources:250,unchangedSources:state==='APPROVED_DELTA_VALID'?248:250,approvedReplacements:state==='APPROVED_DELTA_VALID'?2:0,expectedEffectiveHashes:Object.freeze(expected),helperHashes:Object.freeze(helpers)});
}
function verify(...args){try{return verifyImpl(...args);}catch(e){if(e.code==='SOURCE_LINEAGE_BLOCKED')throw e;block('IO_OR_AUTHORITY_VALIDATION');}}
module.exports={ROOT,SID,BASE,BASE_SHA,SUPP,SUPP_SHA,APPROVAL,APPROVAL_SHA,HARDENING_APPROVAL,HARDENING_SHA,DELTA,parse,canonical,catalogue,verify,sha};
