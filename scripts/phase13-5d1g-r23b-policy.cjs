'use strict';
const ROOT='C:\\DATN\\test-instances\\phase13-5d1g',INITDB='C:\\Program Files\\PostgreSQL\\17\\bin\\initdb.exe';
const INITDB_HASH='94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC';
function plan(){return {phase:'13.5D.1G-R2.3B',mode:'PLAN_ONLY',executionEnabled:false,approvalRequired:'NEW_EXPLICIT_ONE_ATTEMPT_APPROVAL',historicalApprovalIsExecutionToken:false,executable:INITDB,sha256:INITDB_HASH,workingDirectory:ROOT,pgdata:ROOT+'\\data',args:['-D',ROOT+'\\data','-U','d1g_dba','--pwprompt','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C','--no-clean'],markerTemplate:ROOT+'\\initdb-attempt-r23b-<newRunId>.json',createNew:true,maxAttempts:1,retry:false,forceKillReal:false,cleanupPGDATA:false,visibleOperatorConsole:true,operatorTypesTwoPrompts:true,passwordArgv:false,passwordEnvironment:false,passwordFile:false,inputInjection:false,consoleRecording:false,deadlineMs:120000,attachObservationMs:2000,attachDeadlineIsCompatibilityGuarantee:false,maxActiveProcesses:8,maxRecordedProcesses:64,maxDepth:3,preResumeConsole:'HOST_ONLY',postResumeConsole:'HOST_PLUS_NATIVE_VERIFIED_JOB_MEMBERS',sideEffectsPossibleImmediatelyAfterResume:true,passwordInputVerified:false};}
function liveRules({postgresHash,cmdHash}){
 if(!/^[A-F0-9]{64}$/.test(postgresHash||'')||!/^[A-F0-9]{64}$/.test(cmdHash||''))throw Error('EXACT_BINARY_HASHES_REQUIRED');
 const pg='C:\\Program Files\\PostgreSQL\\17\\bin\\postgres.exe',cmd='C:\\Windows\\System32\\cmd.exe';
 return [{role:'root',parentRole:null,path:INITDB,hash:INITDB_HASH,depth:0,restricted:false},
 {role:'restricted-reexec',parentRole:'root',path:INITDB,hash:INITDB_HASH,depth:1,restricted:true},
 ...[['root',1],['restricted-reexec',2]].flatMap(([parentRole,depth])=>[
 {role:'shell-'+depth,parentRole,path:cmd,hash:cmdHash,depth,restricted:false},
 {role:'backend-'+depth,parentRole,path:pg,hash:postgresHash,depth,restricted:false},
 {role:'backend-shell-'+depth,parentRole:'shell-'+depth,path:pg,hash:postgresHash,depth:depth+1,restricted:false}])];
}
function validateIdentity(p,parent,rule,owner){return !!p&&!!rule&&p.owner===owner&&p.inJob===true&&p.image.toLowerCase()===rule.path.toLowerCase()&&p.hash===rule.hash&&p.depth===rule.depth&&/^\d+$/.test(p.startFileTime)&&(!rule.restricted||p.restricted===true)&&(p.depth===0||!!parent&&p.parentPid===parent.pid&&BigInt(p.startFileTime)>=BigInt(parent.startFileTime)&&parent.role===rule.parentRole);}
function classify({unknown,root,observer,jobActive,policyAccepted}){if(unknown||!root||!observer||!observer.independentHandle||root.pid!==observer.pid||root.startFileTime!==observer.startFileTime||root.exitCode!==observer.exitCode||root.exitAt!==observer.exitAt)return 'UNKNOWN_NATIVE_OUTCOME';if(jobActive!==0||!policyAccepted)return 'BLOCKED';return root.exitCode===0?'OFFLINE_SYNTHETIC_PASS':'NATIVE_NONZERO';}
module.exports={plan,liveRules,validateIdentity,classify,INITDB_HASH};
