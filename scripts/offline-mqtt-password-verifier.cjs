// Pure verifier for Mosquitto 2.1.2 canonical $7$ entries. No filesystem/env/network imports.
const crypto=require('node:crypto');
const {isUtf8}=require('node:buffer');
const USER='smartagri_backend',MAX_ITERATIONS=1000000;
const RESULTS=Object.freeze(['MATCH','NO_MATCH','FORMAT_UNSUPPORTED','VERIFICATION_ERROR']);
class Unsupported extends Error {}
function decodeCanonical(buffer,lengths){
 let decoded;
 try{
  const text=buffer.toString('ascii');
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Unsupported();
  decoded=Buffer.from(text,'base64');
  if(!lengths.includes(decoded.length)||decoded.toString('base64')!==text)throw new Unsupported();
  return decoded;
 }catch(e){decoded?.fill(0);throw e;}
}
function parse(entry){
 let salt,digest;
 try{
  if(!Buffer.isBuffer(entry)||entry.length>1024||entry.some(x=>x>127))throw new Unsupported();
  const split=[];let start=0;for(let i=0;i<entry.length;i++)if(entry[i]===36){split.push(entry.subarray(start,i));start=i+1;}split.push(entry.subarray(start));
  if(split.length!==5||split[0].length||split[1].toString('ascii')!=='7')throw new Unsupported();
  const digits=split[2].toString('ascii');
  if(!/^[1-9][0-9]{0,6}$/.test(digits))throw new Unsupported();
  const iterations=Number(digits);if(iterations>MAX_ITERATIONS)throw new Unsupported();
  salt=decodeCanonical(split[3],[12,64]);digest=decodeCanonical(split[4],[64]);
  return{iterations,salt,digest};
 }catch(e){salt?.fill(0);digest?.fill(0);throw e;}
}
// Consumes dedicated password/entry buffers and clears them, including failures.
function verify(passwordBytes,readTargetEntry,{derive=crypto.pbkdf2Sync,compare=crypto.timingSafeEqual}={}){
 let entry,parsed,derived;
 try{
  if(!Buffer.isBuffer(passwordBytes)||passwordBytes.length>4096||passwordBytes.includes(0)||
    !isUtf8(passwordBytes))return 'FORMAT_UNSUPPORTED';
  entry=readTargetEntry();parsed=parse(entry);
  derived=derive(passwordBytes,parsed.salt,parsed.iterations,64,'sha512');
  if(!Buffer.isBuffer(derived)||derived.length!==64)return 'VERIFICATION_ERROR';
  return compare(derived,parsed.digest)?'MATCH':'NO_MATCH';
 }catch(e){return e instanceof Unsupported?'FORMAT_UNSUPPORTED':'VERIFICATION_ERROR';}
 finally{for(const b of [passwordBytes,entry,parsed?.salt,parsed?.digest,derived])if(Buffer.isBuffer(b))b.fill(0);}
}
module.exports={USER,MAX_ITERATIONS,RESULTS,verify};
