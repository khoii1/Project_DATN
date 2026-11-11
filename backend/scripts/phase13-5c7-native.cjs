// Direct file handles: descendants may inherit log FDs, never a pipe we must drain.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
function assertResult(result){if(result.error||result.status!==0||result.signal)throw Error('NATIVE_PROCESS_FAILED_OR_TIMED_OUT');}
function run(exe,args,{directory,label,env=process.env,timeout=30000}={}){
 if(!/^[a-z0-9_-]+$/.test(label))throw Error('NATIVE_LOG_LABEL_INVALID');
 const stdout=path.join(directory,label+'.stdout.private.log'),stderr=path.join(directory,label+'.stderr.private.log');
 const out=fs.openSync(stdout,'wx');let err;
 const at=Date.now();let result;
 try{err=fs.openSync(stderr,'wx');result=spawnSync(exe,args,{stdio:['ignore',out,err],windowsHide:true,timeout,env});}finally{fs.closeSync(out);if(err!==undefined)fs.closeSync(err);}
 const metadata={exitCode:result.status,errorCode:result.error?.code||null,signal:result.signal||null,elapsedMs:Date.now()-at,stdoutBytes:fs.statSync(stdout).size,stderrBytes:fs.statSync(stderr).size};
 return {result,metadata,stdout:fs.readFileSync(stdout,'utf8'),stderr:fs.readFileSync(stderr,'utf8')};
}
module.exports={run,assertResult};
