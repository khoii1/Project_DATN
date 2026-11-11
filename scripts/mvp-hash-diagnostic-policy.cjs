// Separate AJ diagnostic contract. Import performs no filesystem/native action.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='C:\\DATN\\test-instances\\phase13-3b';
const SID='S-1-5-21-1432835263-483988321-3159128977-1001';
const MANIFEST='b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56';
const NODE='C:\\Program Files\\nodejs\\node.exe',PS='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const PINFILE=path.join(ROOT,'docs/PHASE_AJ_NATIVE_DIAGNOSTIC_SOURCE_PINS.json');
const MEMBERS=['mvp-hash-diagnostic-policy.cjs','mvp-hash-only-target.cjs','mvp-hash-diagnostic-observer.cjs','mvp-hash-diagnostic-outer.ps1','mvp-hash-diagnostic-once.ps1','mvp-ui-native-boundary.cjs'].map(n=>'scripts/'+n);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function canonical(file){const full=path.resolve(file);for(let p=full;;p=path.dirname(p)){assert.ok(!fs.lstatSync(p).isSymbolicLink(),'REPARSE_REFUSED');if(path.dirname(p)===p)break;}assert.equal(fs.realpathSync.native(full).toLowerCase(),full.toLowerCase(),'CANONICAL_PATH_REFUSED');return full;}
const io={read:f=>fs.readFileSync(f),canonical,now:Date.now};
function checkPlan(p,d=io){
 assert.deepEqual(Object.keys(p||{}).sort(),['version','scope','approved','maxAttempts','noRetry','operatorSid','expiresAt','manifestSha256','sourcePinSetFile','sourcePinSetSha256','userApprovalFile','userApprovalSha256'].sort(),'APPROVAL_FIELDS_REFUSED');
 assert.equal(p?.version,1);assert.equal(p.scope,'ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC');assert.equal(p.approved,true);assert.equal(p.maxAttempts,1);assert.equal(p.noRetry,true);assert.equal(p.operatorSid,SID);
 assert.ok(Date.parse(p.expiresAt)>d.now()&&Date.parse(p.expiresAt)-d.now()<=86400000,'APPROVAL_EXPIRED');
 assert.equal(p.manifestSha256,MANIFEST);assert.equal(p.sourcePinSetFile,PINFILE);
 assert.match(p.userApprovalSha256,/^[a-f0-9]{64}$/);assert.match(p.sourcePinSetSha256,/^[a-f0-9]{64}$/);
 assert.ok(typeof p.userApprovalFile==='string'&&!['d7beea37-4806-492f-9250-659741611ee7','861dfdf1-fc4c-4f92-9801-65ae856061c5','4e2baaa3-45e2-43c5-bec4-6e4a90b80059','1b0509d8-0f42-444e-9b47-ffd602a187bd'].some(x=>p.userApprovalFile.includes(x)),'FRESH_DIAGNOSTIC_APPROVAL_REQUIRED');
 d.canonical(p.userApprovalFile);assert.equal(sha(d.read(p.userApprovalFile)),p.userApprovalSha256,'APPROVAL_DRIFT');
 d.canonical(PINFILE);const bytes=d.read(PINFILE);assert.equal(sha(bytes),p.sourcePinSetSha256,'PIN_SET_DRIFT');const pins=JSON.parse(bytes);
 assert.equal(pins.purpose,'AJ_SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL');assert.equal(pins.manifestSha256,MANIFEST);
 assert.deepEqual(Object.keys(pins.sources).sort(),MEMBERS.slice().sort(),'DIAGNOSTIC_MEMBER_DRIFT');
 for(const [f,h]of Object.entries(pins.sources)){assert.match(h,/^[a-f0-9]{64}$/);const full=path.join(ROOT,f);d.canonical(full);assert.equal(sha(d.read(full)),h,'DIAGNOSTIC_SOURCE_DRIFT');}
 const runtime={[NODE]:'fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d',[PS]:'60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f'};
 assert.deepEqual(pins.executionBinaries,runtime);for(const[f,h]of Object.entries(runtime)){d.canonical(f);assert.equal(sha(d.read(f)),h,'DIAGNOSTIC_EXECUTABLE_DRIFT');}
 assert.equal(sha(d.read(path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json'))),MANIFEST,'UI_MANIFEST_DRIFT');return pins;
}
function checkRun(run){
 assert.equal(path.dirname(run),BASE);assert.match(path.basename(run),/^hash-only-native-\d+-[a-f0-9]+$/);canonical(run);
 const plan=JSON.parse(fs.readFileSync(path.join(run,'approval.json'),'utf8'));checkPlan(plan);
 const receipt=JSON.parse(fs.readFileSync(path.join(run,'launcher-receipt.json'),'utf8'));assert.equal(receipt.operatorSid,SID);assert.equal(receipt.privateAclVerified,true);
 const marker=JSON.parse(fs.readFileSync(path.join(BASE,'hash-only-approved-'+plan.userApprovalSha256+'.attempt.json'),'utf8'));assert.equal(marker.run,run);assert.equal(marker.approvalSha256,plan.userApprovalSha256);
 return{plan,receipt};
}
function writeNew(run,name,value){fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2),{flag:'wx'});}
module.exports={ROOT,BASE,SID,MANIFEST,NODE,PS,PINFILE,MEMBERS,sha,canonical,checkPlan,checkRun,writeNew};
