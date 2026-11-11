// Read-only adapter; never reads on import and never accumulates non-target hash fields.
const fs=require('node:fs'),path=require('node:path');
const {USER}=require('./offline-mqtt-password-verifier.cjs');
const {assertActive}=require('./offline-mqtt-password-network-guard.cjs');
const PRODUCTION='C:\\mosquitto\\config\\passwords';
const FIXTURES=path.resolve(__dirname,'fixtures/offline-mqtt-password-verifier');
function readTargetEntry(file,io=fs){
 if(path.resolve(file).toLowerCase()===PRODUCTION.toLowerCase())assertActive();
 const fd=io.openSync(file,'r'),one=Buffer.alloc(1),target=Buffer.from(USER,'ascii');
 let entry=null,prefix=[],hash=[],readingHash=false,match=false,count=0,total=0;
 function finish(){
  if(match){count++;if(count>1)throw Error('ACCOUNT_AMBIGUOUS');if(!hash.length)throw Error('ACCOUNT_EMPTY');entry=Buffer.from(hash);}
  prefix.fill(0);hash.fill(0);prefix=[];hash=[];readingHash=false;match=false;
 }
 try{
  const before=io.fstatSync(fd);if(!before.isFile()||before.size>1048576)throw Error('FILE_REFUSED');
  while(io.readSync(fd,one,0,1,null)){
   if(++total>1048576)throw Error('FILE_LIMIT');const b=one[0];
   if(b===10){finish();continue;}
   if(!readingHash){
    if(b===58){
     const name=Buffer.from(prefix),exact=name.equals(target);
     // Refuse whitespace aliases rather than guessing Mosquitto trim semantics.
     if(!exact&&name.toString('utf8').trim()===USER)throw Error('ACCOUNT_AMBIGUOUS');
     match=exact;name.fill(0);prefix.fill(0);prefix=[];readingHash=true;
    }else{prefix.push(b);if(prefix.length>65535)throw Error('USERNAME_LIMIT');}
   }else if(match){hash.push(b);if(hash.length>1025)throw Error('ENTRY_LIMIT');}
   // All non-target hash bytes are discarded immediately.
  }
  if(prefix.length||readingHash)finish();
  if(count!==1)throw Error('ACCOUNT_MISSING');
  // Allow CRLF line termination only, never whitespace trimming of password/hash.
  if(entry.at(-1)===13){const old=entry;entry=Buffer.from(old.subarray(0,-1));old.fill(0);}
  const after=io.fstatSync(fd),current=io.statSync(file);
  if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==current.ino||
    before.size!==current.size||before.mtimeMs!==current.mtimeMs)throw Error('FILE_CHANGED');
  return entry;
 }catch(e){entry?.fill(0);throw Error('ENTRY_READ_FAILED');}
 finally{one.fill(0);target.fill(0);prefix.fill(0);hash.fill(0);try{io.closeSync(fd);}catch{entry?.fill(0);throw Error('ENTRY_READ_FAILED');}}
}
function fixturePath(value){
 const f=path.resolve(value);
 if(path.dirname(f)!==FIXTURES||!/^synthetic-[a-z0-9-]+\.pw$/.test(path.basename(f)))throw Error('FIXTURE_PATH_REFUSED');
 for(let p=f;;p=path.dirname(p)){
  if(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==p.toLowerCase())throw Error('REPARSE_REFUSED');
  if(path.dirname(p)===p)break;
 }
 return f;
}
module.exports={PRODUCTION,FIXTURES,readTargetEntry,fixturePath};
