// Offline static ACL analysis. Never imports MQTT or writes broker configuration.
const crypto=require('node:crypto');
const TOPICS=['telemetry','status','actuator/state'].map(x=>'smart-agriculture/v1/devices/ESP32-GF-A-01/'+x);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function decode(b){
 let bom=0,enc='utf8';if(b.subarray(0,3).equals(Buffer.from([239,187,191])))bom=3;
 if(b.subarray(0,2).equals(Buffer.from([255,254]))){bom=2;enc='utf16le';}
 if(b.subarray(0,2).equals(Buffer.from([254,255])))throw Error('UNSUPPORTED_ENCODING_STOP');
 const body=b.subarray(bom),text=body.toString(enc);if(!Buffer.from(text,enc).equals(body)||text.includes('\0'))throw Error('ENCODING_ROUNDTRIP_REFUSED');
 const endings=text.match(/\r\n|\r|\n/g)||[];if(endings.some(e=>e!==endings[0]))throw Error('MIXED_EOL_STOP');
 return{text,bom,enc,eol:endings[0]||'\r\n'};
}
function parse(text){
 const rows=text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g).filter(x=>x.length),rules=[],users=[];let user=null,offset=0;
 for(let i=0;i<rows.length;i++){
  const full=rows[i],line=full.replace(/[\r\n]+$/,'');
  if(!line.trim()||line.startsWith('#')){offset+=full.length;continue;}
  if(/^\s/.test(line))throw Error('LEADING_WHITESPACE_UNSUPPORTED_STOP');
  if(line.startsWith('user ')){const name=line.slice(5);if(!name||name.trim()!==name)throw Error('INVALID_USER_SYNTAX');user=name;users.push({name,line:i+1,offset,after:offset+full.length});}
  else{
   const m=/^(topic|pattern) (?:(read|write|readwrite|deny) )?(.+)$/.exec(line);if(!m)throw Error('UNSUPPORTED_ACL_DIRECTIVE');
   const filter=m[3],levels=filter.split('/');if(levels.some((s,j)=>(s.includes('#')&&(s!=='#'||j!==levels.length-1))||(s.includes('+')&&s!=='+')))throw Error('INVALID_WILDCARD');
   if(m[1]==='pattern'&&levels.some(s=>s.includes('%')&&!['%u','%c'].includes(s)))throw Error('UNSUPPORTED_PATTERN');
   rules.push({kind:m[1],access:m[2]||'readwrite',filter,user,line:i+1});
  }
  offset+=full.length;
 }
 return{rules,users,rows};
}
function matches(filter,topic,username,pattern){
 const f=filter.split('/'),t=topic.split('/');let uncertain=false;
 for(let i=0;i<f.length;i++){
  let part=f[i];if(part==='#')return uncertain?null:true;
  if(i>=t.length)return false;
  if(pattern&&part==='%u')part=username;
  if(pattern&&part==='%c'){uncertain=true;continue;}
  if(part!=='+'&&part!==t[i])return false;
 }
 if(f.length!==t.length)return false;return uncertain?null:true;
}
function assess(parsed,username,topic,mode='read'){
 const rules=parsed.rules.filter(r=>r.kind==='pattern'||r.user===username);let allow=false,deny=false,unknown=false;
 for(const r of rules){if(![mode,'readwrite','deny'].includes(r.access))continue;const m=matches(r.filter,topic,username,r.kind==='pattern');if(m===null)unknown=true;if(m===true){if(r.access==='deny')deny=true;else allow=true;}}
 return deny?'DENIED':unknown?'UNDETERMINED':allow?'ALLOWED':'NOT_GRANTED';
}
function prepare(original,username,{dedicated=false}={}){
 if(typeof username!=='string'||!username||/[\r\n\0]/.test(username))throw Error('LOCAL_USERNAME_INVALID');
 const fmt=decode(original),p=parse(fmt.text),blocks=p.users.filter(x=>x.name===username);
 if(blocks.length!==1)throw Error('USERNAME_NOT_EXACTLY_ONE_BLOCK');
 const before=TOPICS.map(topic=>({topic,read:assess(p,username,topic)}));
 if(before.some(x=>x.read==='DENIED'))throw Error('CONFLICTING_DENY_STOP');
 if(before.some(x=>x.read==='UNDETERMINED'))throw Error('CLIENT_ID_PATTERN_SCOPE_UNDETERMINED');
 const control=[...TOPICS,'smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01','smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01'];
 if(!dedicated||username==='ESP32-GF-A-01'||control.some(t=>['ALLOWED','UNDETERMINED'].includes(assess(p,username,t,'write'))))throw Error('SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED');
 const missing=before.filter(x=>x.read==='NOT_GRANTED').map(x=>'topic read '+x.topic);
 const block=blocks[0],next=p.users.find(x=>x.offset>block.offset),pos=next?next.offset:fmt.text.length;
 const prefix=fmt.text.slice(0,pos),suffix=fmt.text.slice(pos),needsEol=prefix.length&&!/[\r\n]$/.test(prefix);
 if(needsEol&&missing.length)throw Error('UNTERMINATED_INSERTION_BOUNDARY_STOP');
 const insert=missing.length?(needsEol?fmt.eol:'')+missing.join(fmt.eol)+fmt.eol:'';
 const bytePos=fmt.bom+Buffer.byteLength(prefix,fmt.enc),insertion=Buffer.from(insert,fmt.enc);
 const candidate=Buffer.concat([original.subarray(0,bytePos),insertion,original.subarray(bytePos)]);
 if(!candidate.subarray(0,bytePos).equals(original.subarray(0,bytePos))||!candidate.subarray(bytePos+insertion.length).equals(original.subarray(bytePos)))throw Error('UNINTENDED_BYTE_MODIFICATION');
 const afterParsed=parse(decode(candidate).text),after=TOPICS.map(topic=>({topic,read:assess(afterParsed,username,topic)}));
 if(after.some(x=>x.read!=='ALLOWED'))throw Error('AFTER_PERMISSION_FAILED');
 if(afterParsed.rules.length!==p.rules.length+missing.length)throw Error('UNEXPECTED_RULE_COUNT');
 // Zero context diff contains only grant lines, never any username or full ACL.
 const line=(prefix.match(/\r\n|\r|\n/g)||[]).length+(needsEol?1:0);
 const diff=missing.length?'--- acl.original\n+++ acl.candidate\n@@ -'+line+',0 +'+(line+1)+','+missing.length+' @@\n'+missing.map(x=>'+'+x+'\n').join(''):'';
 return{candidate,diff,summary:{originalHash:sha(original),candidateHash:sha(candidate),encoding:fmt.enc,bomBytes:fmt.bom,eol:JSON.stringify(fmt.eol),insertedLines:missing.length,modifiedLines:0,deletedLines:0,existingFinalLineTerminated:!needsEol,bytePreservation:true,selectedUserBlocks:1,globalPatternCount:p.rules.filter(r=>r.kind==='pattern').length,totalUserBlocks:p.users.length,before,after,staticParser:'PASS_SUPPORTED_STATIC_ACL_SUBSET',brokerNativeSyntax:'NOT_VERIFIED',runtimeDelivery:'NOT_VERIFIED'}};
}
module.exports={TOPICS,decode,parse,matches,assess,prepare,sha};
if(require.main===module)(async()=>{
 const fs=require('node:fs'),path=require('node:path');let s='';for await(const b of process.stdin){s+=b;if(s.length>8192)throw Error('HANDOFF_LIMIT');}const x=JSON.parse(s);s='';
 const root=path.join(process.env.LOCALAPPDATA,'SmartAgriculture'),dir=path.resolve(x.directory);
 if(path.dirname(dir)!==root||!/^mqtt-acl-plan-\d{8}-\d{6}-[a-f0-9]+$/.test(path.basename(dir)))throw Error('STAGING_PATH_REFUSED');
 const config=fs.readFileSync('C:/mosquitto/config/mosquitto.conf'),original=fs.readFileSync('C:/mosquitto/config/acl');
 if(sha(config)!=='084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F'||sha(original)!=='4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766')throw Error('SOURCE_HASH_DRIFT_STOP');
 // Configuration hash pins the separately reviewed single-listener static ACL config.
 try{
  const result=prepare(original,x.username,{dedicated:x.dedicated});x.username=null;
  fs.writeFileSync(path.join(dir,'acl.candidate'),result.candidate,{flag:'wx'});fs.writeFileSync(path.join(dir,'acl.patch'),result.diff,{flag:'wx'});
  fs.writeFileSync(path.join(dir,'assessment.json'),JSON.stringify({verdict:'MQTT_ACL_PATCH_PREPARED_NOT_APPLIED',...result.summary},null,2),{flag:'wx'});
  console.log('OFFLINE_CANDIDATE_PREPARED_NO_BROKER_CHANGE');
 }catch(e){
  x.username=null;const safe=['USERNAME_NOT_EXACTLY_ONE_BLOCK','CONFLICTING_DENY_STOP','CLIENT_ID_PATTERN_SCOPE_UNDETERMINED','SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED'];
  const reason=safe.includes(e.message)?e.message:'STATIC_VALIDATION_STOP';
  fs.writeFileSync(path.join(dir,'assessment.json'),JSON.stringify({verdict:'MQTT_ACL_PATCH_PREPARATION_BLOCKED',reason,originalHash:sha(original),usernamePersisted:false},null,2),{flag:'wx'});
  console.log(reason);
 }
})().catch(()=>{console.error('PREPARATION_STOP_NO_RETRY');process.exitCode=1;});
