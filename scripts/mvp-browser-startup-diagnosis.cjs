// Offline evidence classification only. Not a browser launcher or an execution gate.
// Accept structured metadata, never raw browser logs/argv/environment/credentials.
function classifyEvidence(input={}){
 const phase=['launch','context','page','navigation'].includes(input.phase)?input.phase:'unknown';
 const pid=Number.isSafeInteger(input.pid)&&input.pid>0?input.pid:null;
 const nativeExit=Number.isInteger(input.nativeExit)?input.nativeExit:null;
 const parentKnown=Number.isSafeInteger(input.parentPid)&&Number.isSafeInteger(input.expectedParentPid);
 let finding='INSUFFICIENT_EVIDENCE';
 if(parentKnown&&input.parentPid!==input.expectedParentPid)finding='OWNERSHIP_MISMATCH_BLOCKED';
 else if(Number.isFinite(input.cleanupAt)&&Number.isFinite(input.failureAt)&&input.cleanupAt<input.failureAt)finding='ORCHESTRATOR_CLEANUP_PRECEDES_FAILURE';
 else if(input.timeout===true)finding='BROWSER_TIMEOUT';
 else if(nativeExit!==null&&nativeExit!==0||input.nativeSignal===true)finding='BROWSER_NATIVE_EXIT_ABNORMAL';
 else if(input.success===true&&input.pageCreated===true&&input.closedGracefully===true&&nativeExit===0&&parentKnown&&pid!==null)finding='SYNTHETIC_LIFECYCLE_COMPLETE';
 else if(input.failed===true)finding=phase==='launch'?'LAUNCH_FAILED_NATIVE_CAUSE_UNDETERMINED':phase==='context'?'BROWSER_UNAVAILABLE_BEFORE_CONTEXT':phase==='page'?'CONTEXT_UNAVAILABLE_BEFORE_PAGE':'NAVIGATION_OR_UNKNOWN_FAILURE';
 return Object.freeze({phase,pid,nativeExit,finding,timeout:input.timeout===true,
  rootCauseConfirmed:false,realBrowserVerified:false});
}
module.exports={classifyEvidence};
