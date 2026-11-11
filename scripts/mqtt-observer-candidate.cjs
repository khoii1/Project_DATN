// PREPARE ONLY. Pure analysis on import; guarded CLI writes only a NEW private staging directory.
const {TOPICS,decode,parse,assess,sha}=require('./mqtt-acl-prepare.cjs');
const USER='sa_mqtt_observer',PREFIX='smart-agriculture/v1/devices/';
const DENIES=['telemetry','status','command-acks/+','commands/+'].map(s=>PREFIX+USER+'/'+s);
const BLOCK=['user '+USER,...DENIES.map(s=>'topic deny '+s),...TOPICS.map(s=>'topic read '+s)];
function membership(readByte){
 let prefix=[],skip=false,entries=0,found=0;
 function finish(){if(prefix.length){const b=Buffer.from(prefix),s=b.toString('utf8');if(!Buffer.from(s,'utf8').equals(b))throw Error('USERNAME_ENCODING_STOP');if(!skip)throw Error('PASSWORD_FILE_FORMAT_STOP');entries++;if(s===USER)found++;}prefix=[];skip=false;}
 for(let n=readByte();n!==null;n=readByte()){
  if(n===10){finish();continue;}if(n===13){if(!skip)throw Error('PASSWORD_FILE_FORMAT_STOP');continue;}
  if(skip)continue; // Hash bytes are discarded: never decoded, accumulated, logged, hashed or exported.
  if(n===58){if(!prefix.length)throw Error('PASSWORD_FILE_FORMAT_STOP');skip=true;continue;}
  prefix.push(n);if(prefix.length>4096)throw Error('USERNAME_PREFIX_TOO_LONG');
 }
 finish();return{proposedUsernameExists:found>0,proposedUsernameOccurrences:found,entryCount:entries,hashFieldsInspected:false};
}
const normalized=(p,u)=>p.rules.filter(r=>r.kind==='pattern'||r.user===u).map(r=>({kind:r.kind,access:r.access,filter:r.filter}));
function build(original){
 const fmt=decode(original),before=parse(fmt.text);
 if(before.users.some(u=>u.name===USER))throw Error('ACL_ACCOUNT_COLLISION_STOP');
 const terminated=/[\r\n]$/.test(fmt.text),pos=terminated?fmt.text.length:before.users[0]?.offset;
 if(pos===undefined)throw Error('NO_SAFE_INSERTION_BOUNDARY');
 const prefix=fmt.text.slice(0,pos);if(prefix&&!/[\r\n]$/.test(prefix))throw Error('NO_SAFE_INSERTION_BOUNDARY');
 const bytePos=fmt.bom+Buffer.byteLength(prefix,fmt.enc),addition=Buffer.from(BLOCK.join(fmt.eol)+fmt.eol,fmt.enc),candidate=Buffer.concat([original.subarray(0,bytePos),addition,original.subarray(bytePos)]),after=parse(decode(candidate).text);
 if(!Buffer.concat([candidate.subarray(0,bytePos),candidate.subarray(bytePos+addition.length)]).equals(original))throw Error('EXISTING_BYTES_CHANGED');
 const expectedGlobals=[['write','telemetry'],['write','status'],['read','commands/+'],['write','command-acks/+']].map(([access,s])=>({access,filter:PREFIX+USER+'/'+s}));
 const globals=after.rules.filter(r=>r.kind==='pattern').map(r=>{
  if(r.filter.includes('%c'))throw Error('CLIENT_ID_SCOPE_UNDETERMINED');
  return{access:r.access,filter:r.filter.split('/').map(s=>s==='%u'?USER:s).join('/')};
 });
 if(JSON.stringify(globals)!==JSON.stringify(expectedGlobals))throw Error('GLOBAL_PATTERN_LANGUAGE_DRIFT');
 const local=after.rules.filter(r=>r.kind==='topic'&&r.user===USER);
 const expectedLocal=[...DENIES.map(filter=>({access:'deny',filter})),...TOPICS.map(filter=>({access:'read',filter}))];
 if(JSON.stringify(local.map(({access,filter})=>({access,filter})))!==JSON.stringify(expectedLocal))throw Error('LOCAL_RULE_SET_DRIFT');
 // Complete language proof, not just sample testing: every inherited allow has an
 // identical user-scoped deny language after %u expansion. The ONLY surviving allow
 // languages are the three singleton READ topics, disjoint from observer namespace.
 if(globals.some(g=>!DENIES.includes(g.filter)))throw Error('UNCOVERED_GLOBAL_ALLOW_LANGUAGE');
 if(TOPICS.some(t=>t.startsWith(PREFIX+USER+'/')))throw Error('READ_DENY_NAMESPACE_OVERLAP');
 const legacy=[null,...before.users.map(u=>u.name)];
 if(legacy.some(u=>JSON.stringify(normalized(before,u))!==JSON.stringify(normalized(after,u))))throw Error('LEGACY_EFFECTIVE_RULES_CHANGED');
 const samples=[...TOPICS,...DENIES.filter(t=>!t.includes('+')),PREFIX+USER+'/command-acks/PUMP_01',PREFIX+USER+'/command-acks/OTHER',PREFIX+USER+'/command-acks/',PREFIX+USER+'/commands/PUMP_01',PREFIX+USER+'/commands/OTHER',PREFIX+USER+'/commands/',PREFIX+'ESP32-GF-A-01/commands/PUMP_01',PREFIX+'ESP32-GF-A-01/commands/OTHER',PREFIX+'ESP32-GF-A-01/command-acks/PUMP_01',PREFIX+'OTHER/telemetry',PREFIX+USER+'/unrelated',PREFIX+USER+'/commands/PUMP_01/deeper','$SYS/broker/version'];
 const matrix=samples.map(topic=>({topic,beforeRead:assess(before,USER,topic),beforeWrite:assess(before,USER,topic,'write'),afterRead:assess(after,USER,topic),afterWrite:assess(after,USER,topic,'write')}));
 if(matrix.some(r=>r.afterWrite==='ALLOWED'||r.afterWrite==='UNDETERMINED'||(TOPICS.includes(r.topic)?r.afterRead!=='ALLOWED':r.afterRead==='ALLOWED'||r.afterRead==='UNDETERMINED')))throw Error('SAMPLE_MATRIX_FAILED');
 const line=(prefix.match(/\r\n|\r|\n/g)||[]).length;
 const diff='--- acl.original\n+++ acl.candidate\n@@ -'+line+',0 +'+(line+1)+',8 @@\n'+BLOCK.map(s=>'+'+s+'\n').join('');
 return{candidate,diff,summary:{verdict:'MQTT_OBSERVER_ACCOUNT_PREPARED_NOT_APPLIED',originalHash:sha(original),candidateHash:sha(candidate),diffHash:sha(Buffer.from(diff)),insertedLines:8,modifiedLines:0,deletedLines:0,encoding:fmt.enc,bomBytes:fmt.bom,eol:JSON.stringify(fmt.eol),insertionMode:terminated?'APPEND':'BEFORE_FIRST_EXISTING_USER',insertionByteOffset:bytePos,originalOutsideInsertionByteIdentical:true,existingUserBlocks:before.users.length,legacyRuleLanguagesUnchanged:true,anonymousRuleLanguagesUnchanged:true,globalAllowLanguagesCoveredByExactDeny:4,survivingReadLanguages:'EXACTLY_THREE_SINGLETON_TOPICS',survivingWriteLanguages:0,matrix,nativeSyntax:'NOT_VERIFIED',runtimeBroker:'NOT_VERIFIED',liveDelivery:'NOT_VERIFIED'}};
}
module.exports={USER,DENIES,BLOCK,membership,build};
if(require.main===module){
 try{
  const fs=require('node:fs'),path=require('node:path'),a=process.argv.slice(2),root=path.join(process.env.LOCALAPPDATA,'SmartAgriculture');
  if(a.length!==2||a[0]!=='--prepare')throw Error('MODE_REFUSED');const dir=path.resolve(a[1]);
  if(path.dirname(dir)!==root||!/^mqtt-observer-candidate-\d{8}-\d{6}-[a-f0-9]+$/.test(path.basename(dir))||fs.readdirSync(dir).length)throw Error('PRIVATE_EMPTY_TARGET_REFUSED');
  const config=fs.readFileSync('C:/mosquitto/config/mosquitto.conf'),source=fs.readFileSync('C:/mosquitto/config/acl');
  if(sha(config)!=='084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F'||sha(source)!=='4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766')throw Error('SOURCE_HASH_DRIFT');
  const lines=config.toString('utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
  if(lines.some(s=>/^(?:include_dir|plugin|global_plugin|auth_plugin|plugin_opt_|auth_opt_)/.test(s)))throw Error('AUTH_MECHANISM_REVIEW_REQUIRED');
  const paths=lines.filter(s=>s.startsWith('password_file ')).map(s=>s.slice(14).trim());if(paths.length!==1||!path.isAbsolute(paths[0]))throw Error('PASSWORD_PATH_SCOPE_UNDETERMINED');
  const fd=fs.openSync(paths[0],fs.constants.O_RDONLY),one=Buffer.alloc(1);let collision;
  try{const initial=fs.fstatSync(fd);collision=membership(()=>fs.readSync(fd,one,0,1,null)===1?one[0]:null);const final=fs.fstatSync(fd),current=fs.statSync(paths[0]);if(initial.size!==final.size||initial.mtimeMs!==final.mtimeMs||current.ino!==initial.ino||current.size!==initial.size||current.mtimeMs!==initial.mtimeMs)throw Error('PASSWORD_METADATA_CHANGED_STOP');}finally{one.fill(0);fs.closeSync(fd);}
  if(collision.proposedUsernameExists)throw Error('PASSWORD_ACCOUNT_COLLISION_STOP');
  const result=build(source);
  if(sha(fs.readFileSync('C:/mosquitto/config/acl'))!==result.summary.originalHash||sha(fs.readFileSync('C:/mosquitto/config/mosquitto.conf'))!==sha(config))throw Error('SOURCE_CHANGED_BEFORE_STAGE');
  fs.writeFileSync(path.join(dir,'acl.candidate'),result.candidate,{flag:'wx'});fs.writeFileSync(path.join(dir,'acl.patch'),result.diff,{flag:'wx'});
  fs.writeFileSync(path.join(dir,'assessment.json'),JSON.stringify({...result.summary,collision,preparedAt:new Date().toISOString(),passwordFileModified:false,brokerModified:false,accountCreated:false},null,2),{flag:'wx'});
  console.log(JSON.stringify({directory:dir,...result.summary,collision},null,2));
 }catch{console.error('OBSERVER_CANDIDATE_PREPARATION_STOP_NO_RETRY');process.exitCode=1;}
}
