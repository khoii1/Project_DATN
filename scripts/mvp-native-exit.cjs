// Observe the native parent exit, independently from EOF on inherited descendant pipes.
const {spawn}=require('node:child_process');
async function observeNativeExit({executable,args,cwd,environment,input='',deadline=30000,limit=524288}){
 const child=spawn(executable,args,{cwd,env:environment,stdio:['pipe','pipe','pipe'],windowsHide:true});
 let stdout='',stderr='',outputCapped=false,pipeClosed=false;
 child.stdin.on('error',()=>{});child.once('close',()=>{pipeClosed=true;});
 const collect=which=>chunk=>{if(which==='out'){if(stdout.length<limit)stdout+=chunk;else outputCapped=true;}else if(stderr.length<limit)stderr+=chunk;else outputCapped=true;};
 child.stdout.on('data',collect('out'));child.stderr.on('data',collect('err'));child.stdin.end(input);
 const result=await new Promise(resolve=>{
  const timer=setTimeout(()=>resolve({code:null,unknown:true}),deadline);
  child.once('error',error=>{clearTimeout(timer);resolve({code:null,error:error.code,unknown:false});});
  child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal,nativeExitObserved:true});});
 });
 // A bounded drain permits trailing parent output; it NEVER waits for descendant EOF.
 if(result.nativeExitObserved)await new Promise(resolve=>setTimeout(resolve,30));
 return {pid:child.pid,...result,stdout,stderr,outputCapped,pipeClosed};
}
module.exports={observeNativeExit};
