const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {verify,RESULTS}=require('./offline-mqtt-password-verifier.cjs');
const {readTargetEntry,FIXTURES,PRODUCTION,fixturePath}=require('./offline-mqtt-password-file.cjs');
const cases=[['ascii','SYNTHETIC_ascii_123!'],['unicode','SYNTHETIC_Tiếng Việt_🌱'],['spaces','  SYNTHETIC with spaces  '],['special','SYNTHETIC_\'"\\/$![]'],['composed','SYNTHETIC_é']];
const manifest=JSON.parse(fs.readFileSync(path.join(FIXTURES,'synthetic-manifest.json'),'utf8'));
const file=name=>path.join(FIXTURES,'synthetic-'+name+'.pw');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline=new Map(manifest.fixtures.map(x=>{const b=fs.readFileSync(file(x.name));assert.equal(sha(b),x.sha256);return[x.name,b];}));
const brokenBaseline=fs.readFileSync(file('broken'));
function run(name,password){const input=Buffer.from(password,'utf8');const result=verify(input,()=>readTargetEntry(file(name)));assert.ok(input.every(x=>x===0),'PASSWORD_BUFFER_CLEARED');return result;}
function memoryFile(data,{error,changed=false}={}){
 let offset=0,closed=0;const b=Buffer.from(data),stat={size:b.length,mtimeMs:1,ino:1,isFile:()=>true};
 return{io:{openSync:(_p,mode)=>{assert.equal(mode,'r');if(error)throw Object.assign(Error('PRIVATE_ERROR_NO_REFLECTION'),{code:error});return 1;},readSync:(_fd,out)=>{if(offset===b.length)return 0;out[0]=b[offset++];return 1;},fstatSync:()=>stat,statSync:()=>({...stat,mtimeMs:changed?2:1}),closeSync:()=>closed++},closed:()=>closed};
}
const asciiEntry=()=>baseline.get('ascii').toString('ascii').split(':')[1].replace(/\n$/,'');
function fromText(data,password=cases[0][1],opts={}){const f=memoryFile(data,opts);return verify(Buffer.from(password,'utf8'),()=>readTargetEntry('SYNTHETIC_IN_MEMORY',f.io));}
for(const [name,password]of cases){
 test('Python reference MATCH: '+name,()=>assert.equal(run(name,password),'MATCH'));
 test('wrong candidate NO_MATCH: '+name,()=>assert.equal(run(name,password+'WRONG'),'NO_MATCH'));
}
test('spaces and Unicode are not trimmed or normalized',()=>{assert.equal(run('spaces',cases[2][1].trim()),'NO_MATCH');assert.equal(run('composed',cases[4][1].normalize('NFD')),'NO_MATCH');});
test('supports both official salt sizes and multiple iterations from independent Python fixtures',()=>{assert.deepEqual([...new Set(manifest.fixtures.map(x=>x.saltBytes))].sort((a,b)=>a-b),[12,64]);assert.ok(manifest.fixtures.some(x=>x.iterations===1));assert.ok(manifest.fixtures.some(x=>x.iterations===4096));});
const malformed={
 unknownAlgorithm:s=>s.replace('$7$','$6$'),
 zeroIterations:s=>s.replace('$1000$','$0$'),
 negativeIterations:s=>s.replace('$1000$','$-1$'),
 fractionalIterations:s=>s.replace('$1000$','$1.5$'),
 iterationSuffix:s=>s.replace('$1000$','$1000garbage$'),
 leadingZeroIteration:s=>s.replace('$1000$','$01000$'),
 excessiveWork:s=>s.replace('$1000$','$1000001$'),
 missingDigest:s=>s.substring(0,s.lastIndexOf('$')),
 extraField:s=>s+'$EXTRA',
 invalidSaltAlphabet:s=>{const a=s.split('$');a[3]='!'+a[3].slice(1);return a.join('$');},
 wrongSaltLength:s=>{const a=s.split('$');a[3]=Buffer.alloc(13).toString('base64');return a.join('$');},
 wrongDigestLength:s=>{const a=s.split('$');a[4]=Buffer.alloc(63).toString('base64');return a.join('$');},
 invalidDigestAlphabet:s=>{const a=s.split('$');a[4]='!'+a[4].slice(1);return a.join('$');},
 whitespaceInHash:s=>s+' ',
 missingPadding:s=>s.slice(0,-1),
 invalidBase64PadBits:s=>{const a=s.split('$');a[4]=a[4].slice(0,-3)+'B==';return a.join('$');}
};
for(const [name,change]of Object.entries(malformed))test('FORMAT_UNSUPPORTED: '+name,()=>assert.equal(fromText('smartagri_backend:'+change(asciiEntry())+'\n'),'FORMAT_UNSUPPORTED'));
test('valid but changed salt/digest/iteration is crypto NO_MATCH, not a format exception',()=>{
 for(const index of [2,3,4]){const a=asciiEntry().split('$');if(index===2)a[index]='1001';else {const b=Buffer.from(a[index],'base64');b[0]^=1;a[index]=b.toString('base64');b.fill(0);}assert.equal(fromText('smartagri_backend:'+a.join('$')+'\n'),'NO_MATCH');}
});
test('target missing, duplicate or whitespace alias is VERIFICATION_ERROR',()=>{
 for(const text of ['', 'other:SYNTHETIC_NOT_A_HASH\n',baseline.get('ascii').toString().repeat(2),' smartagri_backend:'+asciiEntry()+'\n'])assert.equal(fromText(text),'VERIFICATION_ERROR');
});
test('only target entry is decoded; unrelated malformed hash discarded; CRLF supported',()=>{
 const f=memoryFile('other:SYNTHETIC_PRIVATE_NOT_DECODED\r\nsmartagri_backend:'+asciiEntry()+'\r\n');
 assert.equal(verify(Buffer.from(cases[0][1]),()=>readTargetEntry('SYNTHETIC',f.io)),'MATCH');assert.equal(f.closed(),1);
});
test('access denied and missing file are errors, never NO_MATCH',()=>{for(const error of ['EACCES','ENOENT'])assert.equal(fromText('',cases[0][1],{error}),'VERIFICATION_ERROR');});
test('changed auth-store snapshot is error, not MATCH',()=>assert.equal(fromText(baseline.get('ascii'),cases[0][1],{changed:true}),'VERIFICATION_ERROR'));
test('crypto failure, wrong derived length and compare exception never MATCH/NO_MATCH',()=>{
 for(const options of [{derive:()=>{throw Error('SYNTHETIC_PRIVATE');}},{derive:()=>Buffer.alloc(3)},{derive:()=>null},{compare:()=>{throw Error('SYNTHETIC_PRIVATE');}}]){
  const input=Buffer.from(cases[0][1]),entry=Buffer.from(asciiEntry());assert.equal(verify(input,()=>entry,options),'VERIFICATION_ERROR');assert.ok(input.every(x=>x===0));assert.ok(entry.every(x=>x===0));
 }
});
test('wrong reader return type and invalid UTF8/NUL/oversize input fail closed',()=>{
 assert.equal(verify(Buffer.from('SYNTHETIC'),()=> 'PRIVATE_BAD_ENTRY'),'FORMAT_UNSUPPORTED');
 for(const input of [Buffer.from([255]),Buffer.from('SYNTHETIC\0VALUE'),Buffer.alloc(4097,65)]){let reads=0;assert.equal(verify(input,()=>{reads++;return Buffer.from(asciiEntry());}),'FORMAT_UNSUPPORTED');assert.equal(reads,0);assert.ok(input.every(x=>x===0));}
});
test('constant-time compare invoked only for equal64-byte hashes; temporary buffers cleared',()=>{
 let compared=0,derivedRef,saltRef;const input=Buffer.from(cases[0][1]),entry=Buffer.from(asciiEntry());
 const result=verify(input,()=>entry,{derive:(p,s,i,l,d)=>{saltRef=s;derivedRef=crypto.pbkdf2Sync(p,s,i,l,d);return derivedRef;},compare:(a,b)=>{assert.equal(a.length,64);assert.equal(b.length,64);compared++;return crypto.timingSafeEqual(a,b);}});
 assert.equal(result,'MATCH');assert.equal(compared,1);for(const b of [input,entry,derivedRef,saltRef])assert.ok(b.every(x=>x===0));
});
test('verification performs only readonly file opens and no write API',()=>{
 const original=fs.openSync,writes=fs.writeFileSync;let opens=0;
 fs.openSync=function(f,mode,...rest){assert.equal(mode,'r');assert.equal(path.resolve(f),file('ascii'));opens++;return original.call(this,f,mode,...rest);};
 fs.writeFileSync=()=>{throw Error('WRITE_FORBIDDEN');};
 try{assert.equal(run('ascii',cases[0][1]),'MATCH');assert.equal(opens,1);}finally{fs.openSync=original;fs.writeFileSync=writes;}
});
function cli(args,password){return spawnSync(process.execPath,['--require','./scripts/offline-mqtt-password-network-guard.cjs','./scripts/offline-mqtt-password-verify-cli.cjs',...args],{cwd:path.resolve(__dirname,'..'),input:Buffer.from(password,'utf8'),encoding:'utf8',timeout:10000,windowsHide:true,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'}});}
for(const [name,password]of cases)test('native CLI no stdout/stderr disclosure: '+name,()=>{
 const r=cli(['--synthetic',file(name)],password);assert.equal(r.status,0);assert.equal(r.stdout,'MATCH\n');assert.equal(r.stderr,'');assert.ok(!r.stdout.includes(password));
});
test('native CLI wrong password has code1 and only NO_MATCH',()=>{const r=cli(['--synthetic',file('ascii')],'SYNTHETIC_WRONG');assert.equal(r.status,1);assert.equal(r.stdout,'NO_MATCH\n');assert.equal(r.stderr,'');});
test('native CLI malformed entry has code2 and only FORMAT_UNSUPPORTED',()=>{const r=cli(['--synthetic',file('broken')],'SYNTHETIC_UNUSED');assert.equal(r.status,2);assert.equal(r.stdout,'FORMAT_UNSUPPORTED\n');assert.equal(r.stderr,'');});
test('production path and unapproved real mode refused without real file read',()=>{
 assert.throws(()=>fixturePath(PRODUCTION));
 for(const args of [['--synthetic',PRODUCTION],['--approved-real-once','NOT_AN_APPROVAL_DIRECTORY'],[]]){const r=cli(args,'SYNTHETIC_UNUSED');assert.equal(r.status,3);assert.equal(r.stdout,'VERIFICATION_ERROR\n');assert.equal(r.stderr,'');}
});
test('module boundaries contain no network, dotenv, database or MQTT import',()=>{
 for(const f of ['offline-mqtt-password-verifier.cjs','offline-mqtt-password-file.cjs','offline-mqtt-password-verify-cli.cjs']){const s=fs.readFileSync(path.join(__dirname,f),'utf8');assert.doesNotMatch(s,/require\(['"](?:mqtt|dotenv|https?|node:https?|node:net|node:tls|@prisma)|\bfetch\(/);}
 const ps=fs.readFileSync(path.join(__dirname,'offline-mqtt-password-verify-once.ps1'),'utf8');
 assert.match(ps,/Get-Credential -UserName 'smartagri_backend'/);assert.match(ps,/StandardInput\.BaseStream\.Write/);assert.match(ps,/EnvironmentVariables\.Clear/);assert.doesNotMatch(ps,/Set-Content|WriteAllText|StandardInput\.Write\(/);
 const args=ps.split('\n').find(x=>x.startsWith(' $info.Arguments='));assert.ok(args);assert.doesNotMatch(args,/\$plain|\$credential|\$bytes/);
});
test('all fixture SHA256 and byte contents unchanged after tests; no plaintext credential file',()=>{
 for(const f of manifest.fixtures){const after=fs.readFileSync(file(f.name));assert.equal(sha(after),f.sha256);assert.ok(after.equals(baseline.get(f.name)),'FIXTURE_BYTES_UNCHANGED');}
 const brokenAfter=fs.readFileSync(file('broken'));assert.equal(sha(brokenAfter),sha(brokenBaseline));assert.ok(brokenAfter.equals(brokenBaseline),'BROKEN_FIXTURE_BYTES_UNCHANGED');
 assert.deepEqual(RESULTS,['MATCH','NO_MATCH','FORMAT_UNSUPPORTED','VERIFICATION_ERROR']);
});
