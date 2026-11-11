'use strict';
// READ ONLY target inspection. No credential/config loading, socket connection or filesystem mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const ROOT='C:\\DATN\\test-instances\\phase13-5d1g';
const EXPECTED_FILES=Object.freeze(['attempt.json','initdb-attempt.json','resume-r1-bootstrap.json','resume-r1-outcome.json',
 'logs/001-existing-test-control.native.json','logs/001-existing-test-control.stderr.log','logs/001-existing-test-control.stdout.log',
 'logs/002-initdb.native.json','logs/002-initdb.stderr.log','logs/002-initdb.stdout.log']);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function inspectRoot(){
 for(const p of ['C:\\','C:\\DATN','C:\\DATN\\test-instances',ROOT])if(fs.lstatSync(p).isSymbolicLink()||path.resolve(fs.realpathSync.native(p)).toLowerCase()!==path.resolve(p).toLowerCase())throw Error('ROOT_CANONICAL_OR_REPARSE_FAILED');
 function list(dir){let files=[];for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('EVIDENCE_REPARSE_FAILED');if(s.isDirectory())files=files.concat(list(p));else files.push(path.relative(ROOT,p).replaceAll('\\','/'));}return files;}
 const files=list(ROOT).sort();if(JSON.stringify(files)!==JSON.stringify([...EXPECTED_FILES].sort()))throw Error('ROOT_EVIDENCE_WHITELIST_MISMATCH');
 if(fs.existsSync(path.join(ROOT,'data')))throw Error('PGDATA_ALREADY_EXISTS');
 const outcome=JSON.parse(fs.readFileSync(path.join(ROOT,'resume-r1-outcome.json'),'utf8'));
 if(outcome.initdbAttempts!==1||outcome.failure!=='NATIVE_UNEXPECTED_OUTCOME_STOP_initdb'||!outcome.operations.some(o=>o.label==='initdb'&&o.exitCode===1&&o.errorCode===null&&o.signal===null))throw Error('OLD_ATTEMPT_NOT_RESOLVED');
 const ps="$a=Get-Acl -LiteralPath '"+ROOT+"';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;@{operatorSid=$sid;ownerSid=$a.GetOwner([Security.Principal.SecurityIdentifier]).Value;protected=$a.AreAccessRulesProtected;aces=@($a.Access|ForEach-Object{@{sid=$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value;rights=$_.FileSystemRights.ToString();type=$_.AccessControlType.ToString();inherited=$_.IsInherited}});port55435Listeners=@(Get-NetTCPConnection -State Listen -ErrorAction Stop|Where-Object LocalPort -eq 55435).Count;initdbProcesses=@(Get-Process -Name initdb -ErrorAction SilentlyContinue).Count}|ConvertTo-Json -Depth 5 -Compress";
 const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:7000,maxBuffer:1048576,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'},windowsHide:true});
 if(r.error||r.signal||r.status!==0||r.stderr)throw Error('ROOT_NATIVE_INSPECTION_UNKNOWN');const acl=JSON.parse(r.stdout);
 if(acl.operatorSid!=='S-1-5-21-1432835263-483988321-3159128977-1001'||acl.ownerSid!==acl.operatorSid||acl.protected!==true||acl.aces.length!==2||new Set(acl.aces.map(a=>a.sid)).size!==2||
  !acl.aces.every(a=>[acl.operatorSid,'S-1-5-18'].includes(a.sid)&&a.rights==='FullControl'&&a.type==='Allow'&&a.inherited===false)||acl.port55435Listeners!==0||acl.initdbProcesses!==0)throw Error('ROOT_ACL_OR_PORT_GATE_FAILED');
 return {observedAt:new Date().toISOString(),root:ROOT,pgdataAbsent:true,oldAttemptResolved:true,newInitdbApproved:false,acl,
  files:files.map(name=>({name,bytes:fs.statSync(path.join(ROOT,name)).size,sha256:sha(fs.readFileSync(path.join(ROOT,name)))})),readOnly:true};
}
module.exports={inspectRoot,EXPECTED_FILES};
