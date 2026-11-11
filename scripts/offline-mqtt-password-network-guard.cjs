// Verifier-only preload: no loopback/owned-port exceptions. Not an OS sandbox.
const path=require('node:path');
const {syncBuiltinESMExports}=require('node:module');
const Module=require('node:module');
const KEY=Symbol.for('smart-agriculture.offline-password-network-guard.v1');
const blocked=[];let installed=false;
const deny=function(){const e=Error('OFFLINE_VERIFIER_CAPABILITY_BLOCKED');e.code='OFFLINE_VERIFIER_CAPABILITY_BLOCKED';throw e;};
function lock(object,key){if(typeof object[key]==='function'){Object.defineProperty(object,key,{value:deny,writable:false,configurable:false});blocked.push([object,key]);}}
function preloadRequested(){return process.execArgv.some((arg,i)=>['--require','-r'].includes(arg)&&process.execArgv[i+1]&&path.resolve(process.execArgv[i+1])===__filename||arg.startsWith('--require=')&&path.resolve(arg.slice(10))===__filename);}
function install(){
 // Initialize anonymous stdio pipes before denying creation of arbitrary Socket objects.
 void process.stdin;void process.stdout;void process.stderr;
 const net=require('node:net'),tls=require('node:tls'),udp=require('node:dgram'),http=require('node:http'),https=require('node:https');
 const dns=require('node:dns'),cp=require('node:child_process'),workers=require('node:worker_threads'),cluster=require('node:cluster'),http2=require('node:http2');
 lock(net.Socket.prototype,'connect');lock(net.Server.prototype,'listen');
 for(const k of ['bind','connect','send','addMembership'])lock(udp.Socket.prototype,k);
 lock(tls.Server.prototype,'listen');
 for(const k of ['connect','createConnection','createServer','Socket','Server'])lock(net,k);
 for(const k of ['connect','createServer','TLSSocket','Server'])lock(tls,k);
 for(const k of ['createSocket','Socket'])lock(udp,k);
 for(const m of [http,https]){for(const k of ['request','get','createServer','ClientRequest','Server'])lock(m,k);lock(m.Agent.prototype,'createConnection');}
 for(const k of ['connect','createServer','createSecureServer'])lock(http2,k);
 for(const k of Object.keys(dns))if(k==='lookup'||k==='lookupService'||k==='reverse'||k.startsWith('resolve'))lock(dns,k);
 for(const k of Object.keys(dns.promises))if(k==='lookup'||k==='lookupService'||k==='reverse'||k.startsWith('resolve'))lock(dns.promises,k);
 for(const cls of [dns.Resolver,dns.promises.Resolver])for(const k of Object.getOwnPropertyNames(cls.prototype))if(k==='reverse'||k.startsWith('resolve'))lock(cls.prototype,k);
 lock(dns,'Resolver');lock(dns.promises,'Resolver');
 for(const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])lock(cp,k);
 lock(cp.ChildProcess.prototype,'spawn');lock(cp,'ChildProcess');lock(workers,'Worker');lock(cluster,'fork');
 lock(globalThis,'fetch');
 Object.defineProperty(globalThis,'WebSocket',{value:deny,writable:false,configurable:false});blocked.push([globalThis,'WebSocket']);
 lock(process,'dlopen');
 syncBuiltinESMExports();
 const load=Module._load;
 Object.defineProperty(Module,'_load',{configurable:false,writable:false,value:function(name,...args){
  if(name==='mqtt'||name==='undici'||name==='dotenv'||name.startsWith('dotenv/'))deny();
  const filename=Module._resolveFilename(name,args[0]);if(typeof filename==='string'&&filename.endsWith('.node'))deny();
  return load.call(this,name,...args);
 }});
 const evidence=Object.freeze({version:1,policy:'DENY_ALL_NETWORK_AND_CHILD_PROCESS',pid:process.pid,preloaded:true,guardActive:true});
 Object.defineProperty(globalThis,KEY,{value:evidence,writable:false,configurable:false});installed=true;
}
function assertActive(){
 if(!installed||!preloadRequested()||!globalThis[KEY]||blocked.some(([o,k])=>o[k]!==deny))throw Error('OFFLINE_VERIFIER_GUARD_REQUIRED');
 return globalThis[KEY];
}
if(preloadRequested())install();
module.exports={assertActive};
