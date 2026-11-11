// Only four output tokens. No password arguments/env/files, no MQTT or application runtime.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {assertActive}=require('./offline-mqtt-password-network-guard.cjs');
const {verify}=require('./offline-mqtt-password-verifier.cjs');
const {PRODUCTION,readTargetEntry,fixturePath}=require('./offline-mqtt-password-file.cjs');
const REAL_SOURCES=['offline-mqtt-password-verifier.cjs','offline-mqtt-password-file.cjs','offline-mqtt-password-verify-cli.cjs','offline-mqtt-password-verify-once.ps1','offline-mqtt-password-network-guard.cjs'];
function approvedTarget(dir){
 const guard=assertActive(); // Before approval lookup, auth-store metadata or hash access.
 const base='C:\\DATN\\test-instances\\phase13-3b';dir=path.resolve(dir);
 if(path.dirname(dir)!==base||!/^mqtt-password-verification-\d+-[a-f0-9]+$/.test(path.basename(dir)))throw Error('APPROVAL_REQUIRED');
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'approval.json'),'utf8'));
 if(plan.scope!=='ONE_OFFLINE_BACKEND_PASSWORD_VERIFICATION'||plan.username!=='smartagri_backend'||
   plan.passwordFile!==PRODUCTION||plan.maxAttempts!==1||plan.realVerificationApproved!==true)throw Error('APPROVAL_REQUIRED');
 const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 if(hash(plan.userApprovalFile)!==plan.userApprovalSha256)throw Error('APPROVAL_DRIFT');
 if(JSON.stringify(Object.keys(plan.sourceHashes).sort())!==JSON.stringify([...REAL_SOURCES].sort()))throw Error('SOURCE_MANIFEST_REQUIRED');
 for(const file of REAL_SOURCES)if(hash(path.join(__dirname,file))!==plan.sourceHashes[file])throw Error('SOURCE_DRIFT');
 for(let p=PRODUCTION;;p=path.dirname(p)){
  if(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==p.toLowerCase())throw Error('REPARSE_REFUSED');
  if(path.dirname(p)===p)break;
 }
 // Create-new before reading real hash/password verification, no automatic retry.
 fs.writeFileSync(path.join(dir,'attempt.json'),JSON.stringify({pid:process.pid,at:new Date().toISOString(),offline:true,guard,guardSourceSha256:plan.sourceHashes['offline-mqtt-password-network-guard.cjs']}),{flag:'wx'});
 return PRODUCTION;
}
async function main(args){
 let password=Buffer.alloc(0),chunks=[],size=0,result='VERIFICATION_ERROR';
 try{
  assertActive();
  // Safe startup probe only: no approval/auth-store/stdin read and no password verdict.
  if(args.length===1&&args[0]==='--guard-check'){process.exitCode=0;return;}
  if(args.length!==2)throw Error('MODE_REQUIRED');
  const file=args[0]==='--synthetic'?fixturePath(args[1]):args[0]==='--approved-real-once'?approvedTarget(args[1]):null;
  if(!file)throw Error('MODE_REQUIRED');
  for await(const chunk of process.stdin){size+=chunk.length;if(size>4096){chunk.fill(0);throw Error('INPUT_LIMIT');}chunks.push(chunk);}
  password=Buffer.concat(chunks);result=verify(password,()=>readTargetEntry(file));
 }catch{result='VERIFICATION_ERROR';}
 finally{password.fill(0);for(const chunk of chunks)chunk.fill(0);chunks=[];}
 process.stdout.write(result+'\n');process.exitCode={MATCH:0,NO_MATCH:1,FORMAT_UNSUPPORTED:2,VERIFICATION_ERROR:3}[result];
}
module.exports={approvedTarget,main};
if(require.main===module)main(process.argv.slice(2)).catch(()=>{process.stdout.write('VERIFICATION_ERROR\n');process.exitCode=3;});
