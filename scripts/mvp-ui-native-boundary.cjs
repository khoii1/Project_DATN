// Offline classification / injected observer design. No native adapter or CLI.
// Future real diagnostic transport requires separate approval and source pins.
function observed(r){return !!r&&r.independentNativeExit===true&&Number.isInteger(r.pid)&&r.pid>0&&Number.isInteger(r.code)&&!r.timeout&&!r.signal&&!r.error;}
function classifyBoundary({outer,node,tool,relationshipVerified}={}){
 if(!relationshipVerified||!outer||!node||node.parentPid!==outer.pid)return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
 if(observed(node)&&node.code!==0)return'NATIVE_CHILD_FAILURE_CONFIRMED';
 if(!observed(node)||!observed(outer))return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
 if(outer.code!==0)return'OUTER_HOST_FAILURE_CONFIRMED';
 if(tool?.linked===true&&Number.isInteger(tool.code)&&tool.code!==0)return'TOOL_HOST_FAILURE_CONFIRMED';
 if(tool?.linked===true&&tool.code===0)return'NATIVE_COMPLETION_PASS';
 return'NATIVE_FAILURE_BOUNDARY_UNDETERMINED';
}
function prepareObserver({spawnAndObserveOuter,emit,now=()=>new Date().toISOString(),deadlineMs=45000}){
 if(!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>45000)throw Error('DIAGNOSTIC_DEADLINE_REFUSED');
 let attempted=false;
 return async()=>{
  if(attempted)throw Error('DIAGNOSTIC_NO_RETRY');attempted=true;
  // Adapter must hold OS handles, record node completion in a separate
  // create-new artifact and return metadata; stdout never determines verdict.
  const start=now();let evidence;
  let timer;
  try{evidence=await Promise.race([spawnAndObserveOuter(),new Promise(resolve=>timer=setTimeout(()=>resolve({}),deadlineMs))]);}catch{evidence={};}finally{clearTimeout(timer);}
  const native=r=>r?{pid:r.pid,parentPid:r.parentPid,code:r.code,signal:r.signal||null,timeout:!!r.timeout,error:r.error?true:null,independentNativeExit:r.independentNativeExit===true}:null;
  const safe={outer:native(evidence.outer),node:native(evidence.node),tool:evidence.tool?{code:evidence.tool.code,linked:evidence.tool.linked===true}:null,relationshipVerified:evidence.relationshipVerified===true};
  const outcome={startedAt:start,endedAt:now(),...safe,verdict:classifyBoundary(safe)};emit(outcome);return outcome;
 };
}
module.exports={classifyBoundary,prepareObserver};
