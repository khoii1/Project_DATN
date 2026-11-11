'use strict';
// PREPARATION ONLY. No real initdb executor, credential transport or test-root writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../build/phase13-5d1g-r2-offline');
const FIXTURE=path.join(__dirname,'phase13-5d1g-r2-console-fixture.ps1');
const POWERSHELL='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const INITDB='C:\\Program Files\\PostgreSQL\\17\\bin\\initdb.exe';
const INITDB_HASH='94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC';
const SCENARIOS=Object.freeze(['success','mismatch','missing','timeout','cancel','disconnect','exit7','echo-risk','no-console']);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex').toUpperCase();
function futurePlan(){return Object.freeze({phase:'13.5D.1G-R2',mode:'PLAN_ONLY',secondInitdbAuthorized:false,
 executable:INITDB,requiredBinarySha256:INITDB_HASH,
 args:Object.freeze(['-D','C:\\DATN\\test-instances\\phase13-5d1g\\data','-U','d1g_dba','--pwprompt','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C','--no-clean']),
 input:'OPERATOR_TYPES_DIRECTLY_IN_VISIBLE_OWNED_CONSOLE_TWICE',promptDeadlineMs:120000,
 passwordArgv:false,passwordEnvironment:false,passwordFile:false,automaticRetry:false,
 requiresFreshApproval:true,realInitdbInputVerified:false,actualInitdbExecutor:'UNAVAILABLE',
 cancellation:'FUTURE_IDENTITY_BOUND_CTRL_C_THEN_VERIFY_EXIT; UNKNOWN_BLOCKS_NO_RETRY'});}
function executeInitdb(){throw Error('SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED');}
function inspectionSpec(option){if(!['--help','--version'].includes(option))throw Error('INSPECTION_OPTION_NOT_ALLOWED');return{executable:INITDB,args:[option]};}
function classify(native,output){
 const reasons=new Set(['SYNTHETIC_CONFIRMED','CONFIRMATION_MISMATCH','MISSING_INPUT','PROMPT_TIMEOUT','OPERATOR_CANCELLED','CONSOLE_DISCONNECTED','NO_CONSOLE','ECHO_UNSAFE','NATIVE_NONZERO','UNKNOWN_CONSOLE_OUTCOME']);
 const safeOutput=output&&typeof output==='object'?output:{};
 if(native.errorCode||native.signal||!Number.isInteger(native.exitCode))return {status:'UNKNOWN_NATIVE_OUTCOME',retry:false,secondInitdbAuthorized:false};
 const outcome=reasons.has(safeOutput.outcome)?safeOutput.outcome:'UNKNOWN_CONSOLE_OUTCOME';
 const passed=native.exitCode===0&&outcome==='SYNTHETIC_CONFIRMED'&&safeOutput.consoleAvailable===true&&safeOutput.echoDisabled===true&&
  safeOutput.confirmationMatched===true&&safeOutput.echoDetected===false&&safeOutput.modeRestored===true&&safeOutput.consoleMembers===1&&safeOutput.promptCount===2;
 return {status:passed?'SYNTHETIC_CONSOLE_PASS':'BLOCKED',outcome,retry:false,secondInitdbAuthorized:false,realInitdbInputVerified:false};
}
function createNew(file,value){fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2),{flag:'wx'});}
function runSynthetic(options){
 if(!options||Object.keys(options).length!==2||!Object.hasOwn(options,'runId')||!Object.hasOwn(options,'scenario')||!/^[a-z0-9-]{1,80}$/.test(options.runId)||!SCENARIOS.includes(options.scenario))throw Error('SYNTHETIC_OPTIONS_REQUIRED');
 // Never accepts executable, passwords, environment overrides, arbitrary arguments or initdb mode.
 for(let p=ROOT;;p=path.dirname(p)){if(fs.existsSync(p)&&(fs.lstatSync(p).isSymbolicLink()||path.resolve(fs.realpathSync.native(p)).toLowerCase()!==path.resolve(p).toLowerCase()))throw Error('SYNTHETIC_REPARSE_REFUSED');if(path.dirname(p)===p)break;}
 fs.mkdirSync(ROOT,{recursive:true});const dir=path.join(ROOT,options.runId);if(fs.existsSync(dir))throw Error('ATTEMPT_EXISTS_NO_RETRY');fs.mkdirSync(dir);
 const fixtureSha256=sha(fs.readFileSync(FIXTURE));createNew(path.join(dir,'attempt.json'),{phase:'13.5D.1G-R2',scenario:options.scenario,runId:options.runId,fixtureSha256,synthetic:true,secondInitdbAuthorized:false});
 const args=['-NoLogo','-NoProfile','-NonInteractive','-File',FIXTURE,'-Mode','SYNTHETIC','-Scenario',options.scenario];
 const start=Date.now(),r=spawnSync(POWERSHELL,args,{windowsHide:true,encoding:'utf8',timeout:8000,maxBuffer:1048576,stdio:['ignore','pipe','pipe'],
  env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',TEMP:dir,TMP:dir}});
 // stdout/stderr contain only fixed synthetic status; the console screen is NOT persisted.
 const stdout=r.stdout||'',stderr=r.stderr||'';
 const meta={pid:r.pid||null,exitCode:r.status,errorCode:r.error?.code||null,signal:r.signal||null,elapsedMs:Date.now()-start,
  stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr),fixtureSha256};
 const canary=/SYNTHETIC_INPUT_CANARY_R2_NO_CREDENTIAL/.test(stdout+stderr);
 let output=null;try{output=JSON.parse(stdout.trim());}catch{/* unknown, never retry */}
 const verdict=canary||stderr?{status:'BLOCKED',outcome:'OUTPUT_OR_REDACTION_FAILURE',retry:false,secondInitdbAuthorized:false}:classify(meta,output);
 createNew(path.join(dir,'stdout.log'),canary?'SYNTHETIC_CANARY_OUTPUT_BLOCKED':stdout);
 createNew(path.join(dir,'stderr.log'),canary?'SYNTHETIC_CANARY_OUTPUT_BLOCKED':stderr);
 createNew(path.join(dir,'result.json'),{meta,output:canary?null:output,verdict,canaryInLogs:canary,realInitdbExecuted:false});
 return {directory:dir,meta,output,verdict,canaryInLogs:canary};
}
module.exports={futurePlan,executeInitdb,inspectionSpec,classify,runSynthetic,SCENARIOS,INITDB_HASH};
if(require.main===module){if(process.argv.length>2){console.error('SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED');process.exitCode=2;}else console.log(JSON.stringify({phase:'13.5D.1G-R2',mode:'PLAN_ONLY',secondInitdbAuthorized:false}));}
