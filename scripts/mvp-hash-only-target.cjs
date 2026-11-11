// Read-only target. Never imports application runtime or a process/network module.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,MANIFEST,sha,canonical,checkRun}=require('./mvp-hash-diagnostic-policy.cjs');
function hashOnly(d={read:f=>fs.readFileSync(f),canonical,readdir:f=>fs.readdirSync(f),stat:f=>fs.lstatSync(f)}){
 const mf=path.join(ROOT,'docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json');d.canonical(mf);const bytes=d.read(mf);assert.equal(sha(bytes),MANIFEST,'MANIFEST_HASH_DRIFT');const m=JSON.parse(bytes);assert.equal(m.revision,4);
 assert.equal(m.purpose,'SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL');assert.equal(m.previousManifestFile,'PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev3.json');
 const priorFile=path.join(ROOT,'docs',m.previousManifestFile);d.canonical(priorFile);const prior=d.read(priorFile);assert.equal(sha(prior),m.previousManifestSha256);assert.equal(m.previousManifestSha256,'9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a');assert.equal(JSON.parse(prior).revision,3);
 const seen=new Set();const entries=Object.entries(m.sourceHashes);assert.equal(entries.length,250);
 for(const [f,h]of entries){assert.match(h,/^[a-f0-9]{64}$/);assert.ok(!path.isAbsolute(f)&&!f.includes('\\')&&f.split('/').every(x=>x&&x!=='.'&&x!=='..'));const full=path.resolve(ROOT,f);assert.ok(!path.relative(ROOT,full).startsWith('..'));const real=d.canonical(full);assert.equal(real.toLowerCase(),full.toLowerCase());assert.ok(!seen.has(real.toLowerCase()));seen.add(real.toLowerCase());assert.equal(sha(d.read(full)),h,'SOURCE_DRIFT');}
 // Parse only the pinned, narrowly specified constant declarations. No eval,
 // require(runtime), native helper import or application bootstrap.
 const runtime=d.read(path.join(ROOT,'scripts/mvp-ui-only-runtime.cjs')).toString('utf8');
 const list=runtime.match(/const SCRIPTS=\[([^\]]+)\];/)?.[1];assert.ok(list);const scripts=list.split(',').map(s=>{assert.match(s,/^'[a-z0-9.-]+'$/);return'scripts/'+s.slice(1,-1);});
 const walk=dir=>d.readdir(path.join(ROOT,dir)).flatMap(n=>{const f=path.join(dir,n);d.canonical(path.join(ROOT,f));return d.stat(path.join(ROOT,f)).isDirectory()?walk(f):[f.replaceAll('\\','/')];});
 const members=[...scripts,...walk('backend/src'),...walk('frontend/src'),'backend/prisma/schema.prisma','package-lock.json','backend/package-lock.json','frontend/package-lock.json'];assert.deepEqual(Object.keys(m.sourceHashes).sort(),members.sort(),'MEMBERSHIP_DRIFT');
 const block=runtime.match(/const RUNTIME=\{([\s\S]*?)\};/)?.[1];assert.ok(block);const lines=block.trim().split(/\r?\n/).map(s=>s.trim().replace(/,$/,''));assert.equal(lines.length,4);
 const names=['C:\\Program Files\\nodejs\\node.exe',...['pg_ctl.exe','pg_controldata.exe','postgres.exe'].map(n=>'C:\\Program Files\\PostgreSQL\\17\\bin\\'+n)];
 const prefixes=[String.raw`'C:\\Program Files\\nodejs\\node.exe':'`,...['pg_ctl.exe','pg_controldata.exe','postgres.exe'].map(n=>"[path.join(BIN,'"+n+"')]:'")];
 const extracted={};for(let i=0;i<4;i++){assert.ok(lines[i].startsWith(prefixes[i])&&lines[i].endsWith("'"),'RUNTIME_DECLARATION_UNSUPPORTED');const h=lines[i].slice(prefixes[i].length,-1);assert.match(h,/^[a-f0-9]{64}$/);extracted[names[i]]=h;}assert.deepEqual(extracted,m.runtimeHashes,'RUNTIME_MANIFEST_DRIFT');
 for(const[f,h]of Object.entries(extracted)){d.canonical(f);assert.equal(sha(d.read(f)),h,'BINARY_DRIFT');}
 return{status:'HASH_CHECKS_PASS',revision:4,manifestSha256:MANIFEST,sourceCount:250,runtimeCount:4,lineageVerified:true};
}
module.exports={hashOnly};
if(require.main===module){try{const[mode,run,...extra]=process.argv.slice(2);assert.equal(mode,'--approved-run');assert.equal(extra.length,0);checkRun(run);const outer=JSON.parse(fs.readFileSync(path.join(run,'outer-start.json'),'utf8'));assert.equal(outer.pid,process.ppid);assert.equal(outer.spawnObserved,true);const result=hashOnly();console.log(JSON.stringify({pid:process.pid,parentPid:process.ppid,...result}));}catch{console.error('HASH_ONLY_TARGET_BLOCKED');process.exitCode=3;}}
