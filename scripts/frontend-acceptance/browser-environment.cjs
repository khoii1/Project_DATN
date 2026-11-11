'use strict';
// OFFLINE CANDIDATE ONLY. No browser import, process creation or CLI executor.
const p = require('node:path').win32;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const canonical = value => {
  if (typeof value !== 'string' || !/^[A-Za-z]:\\/.test(value) || /[\x00-\x1f]/.test(value) || value.includes('/') || p.normalize(value) !== value) fail('INVALID_PATH');
  return value;
};
const equal = (a,b) => a.toLowerCase() === b.toLowerCase();
const inside = (child,root) => { const rel=p.relative(root,child); return !!rel && !rel.startsWith('..') && !p.isAbsolute(rel); };
function build({receipt, operatorSid, run, inspect}) {
  // Future parent captures these through Windows known-folder APIs BEFORE
  // EnvironmentVariables.Clear(). A JSON receipt is not authority on its own.
  if (!receipt || receipt.source !== 'CURRENT_OPERATOR_WINDOWS_KNOWN_FOLDERS' || receipt.operatorSid !== operatorSid || !/^S-1-5-21-(\d+-){3}\d+$/.test(operatorSid)) fail('PROFILE_IDENTITY_REQUIRED');
  const dirs={};
  for(const key of ['UserProfile','ApplicationData','LocalApplicationData','Windows']) {
    dirs[key]=canonical(receipt[key]);
    const state=inspect(dirs[key]);
    if(!state.directory || !state.canonical || state.reparse || !equal(state.canonical,dirs[key])) fail('PROFILE_PATH_NOT_VERIFIED');
  }
  run=canonical(run);
  const base=p.join(dirs.LocalApplicationData,'SmartAgricultureBrowserSmoke');
  if(!equal(p.dirname(run),base) || !/^edge-remediation-run-[a-f0-9]{32}$/.test(p.basename(run))) fail('PRIVATE_RUN_REQUIRED');
  const temp=p.join(run,'tmp'), userDataDir=p.join(temp,'user-data');
  for(const dir of [base,run,temp,userDataDir]) {
    const state=inspect(dir);
    if(!state.directory || state.reparse || !state.canonical || !equal(state.canonical,dir) || state.ownerSid!==operatorSid || !state.operatorOnly || !state.protectedDacl) fail('PRIVATE_ACL_REQUIRED');
  }
  if(!inside(userDataDir,run)) fail('PRIVATE_PROFILE_REQUIRED');
  const env=Object.freeze({SystemRoot:dirs.Windows,WINDIR:dirs.Windows,PATH:p.join(dirs.Windows,'System32'),USERPROFILE:dirs.UserProfile,APPDATA:dirs.ApplicationData,LOCALAPPDATA:dirs.LocalApplicationData,TEMP:temp,TMP:temp});
  return Object.freeze({env,userDataDir});
}
function launchOptions(plan, executablePath) {
  canonical(executablePath);
  return {executablePath,headless:true,chromiumSandbox:true,env:plan.env,viewport:{width:1280,height:720},serviceWorkers:'block',timeout:18000,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false};
}
function checkArguments(args, plan) {
  if(!Array.isArray(args)) fail('ARGUMENTS_REFUSED');
  const profiles=args.filter(x=>x.startsWith('--user-data-dir='));
  if(profiles.length!==1 || profiles[0]!==`--user-data-dir=${plan.userDataDir}` || !args.includes('--remote-debugging-pipe') || args.some(x=>x==='--no-sandbox'||x.startsWith('--remote-debugging-port')||/^(https?|file|ftp):/i.test(x))) fail('ARGUMENTS_REFUSED');
  return true;
}
function sameOwnedIdentity(expected,current) {
  return !!expected && !!current && Number.isInteger(expected.pid) && expected.pid>0 && ['pid','parentPid','creationFileTime','ownerSid','executablePath','userDataDir'].every(k=>expected[k]!==undefined && expected[k]!==null && expected[k]===current[k]);
}
function oneShotBoundary(spawn) {
  let used=false;
  return (...args)=>{if(used)fail('DUPLICATE_SPAWN_REFUSED');used=true;return spawn(...args);};
}
function classify({timedOut=false,launchResolved=false,nativeExit=null,signal=null,contextClosed=false}) {
  if(timedOut)return 'TIMEOUT_OUTCOME_UNKNOWN';
  return launchResolved && nativeExit===0 && signal===null && contextClosed ? 'CAPABILITY_CANDIDATE_PASS' : 'BLOCKED';
}
function cleanupPolicy({expected,current,contextAvailable,timeout,forceApproval=false}) {
  if(!sameOwnedIdentity(expected,current))return 'STOP_OWNERSHIP_UNKNOWN';
  if(contextAvailable && !timeout)return 'GRACEFUL_CLOSE_ONCE';
  // This candidate never grants termination authority, even with a boolean.
  return forceApproval ? 'SEPARATE_TERMINATION_REVIEW_REQUIRED' : 'STOP_PRESERVE_EVIDENCE';
}
module.exports={build,launchOptions,checkArguments,sameOwnedIdentity,oneShotBoundary,classify,cleanupPolicy};
if(require.main===module){process.stderr.write('PREPARATION_ONLY_NO_EXECUTOR\n');process.exitCode=3;}
