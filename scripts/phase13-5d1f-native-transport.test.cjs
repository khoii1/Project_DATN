'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const t=require('./phase13-5d1f-native-transport.cjs'),revision=require('./phase13-5d1f-sql-revision.cjs'),oldSql=require('./phase13-5d1e-readonly-sql.cjs');
const {NOW,fixtures}=require('./phase13-5d1f-fixtures.cjs');
const copy=v=>JSON.parse(JSON.stringify(v)),hash=x=>crypto.createHash('sha256').update(x).digest('hex'),runId='d1f-mock-run';
const when=n=>new Date(Date.parse(NOW)+n).toISOString();
function native(kind,raw=fixtures()[kind]) {const plan=t.buildPlan(kind);return {source:{kind:'OFFLINE_NATIVE_FIXTURE',runId,invocationSha256:hash(JSON.stringify(plan))},
 startedAt:when(-100),endedAt:NOW,status:0,error:null,signal:null,timedOut:false,stdout:kind==='postgres'?raw.map(x=>JSON.stringify(x)).join('\n')+'\n':JSON.stringify(raw),stderr:''};}
function collect(kind='postgres',raw=fixtures()[kind],delta={},plan=t.buildPlan(kind)) {return t.createMockTransport({runId}).collect(kind,plan,{...native(kind,raw),...delta},NOW);}
function blocked(r,code) {assert.equal(r.status,'BLOCKED');assert.equal(r.productionAuthorized,false);if(code)assert.equal(r.reasonCode,code);}
test('default plan is disabled, fixed binary/argv and sanitized environment',()=>{
 const p=t.buildPlan();assert.equal(p.mode,'PLAN_ONLY');assert.equal(p.executionEnabled,false);assert.equal(p.liveAuthorized,false);assert.equal(p.shell,false);assert.equal(p.inheritEnvironment,false);
 assert.equal(p.executable,t.PSQL);assert.ok(p.args.includes('--port=5432'));assert.ok(p.args.includes('--file=-'));assert.ok(p.args.includes('--no-password'));assert.ok(p.args.includes('--no-psqlrc'));
 assert.equal(p.stdin,revision.SQL);assert.equal(p.maxAttempts,1);assert.equal(p.autoRetry,false);
 for(const key of ['DATABASE_URL','PGSERVICE','PGSERVICEFILE','PGHOST','PGPORT','PGDATABASE','PGPASSFILE','PGPASSWORD','NODE_OPTIONS'])assert.ok(!Object.hasOwn(p.environment,key));
 assert.throws(()=>t.buildPlan('other'),/NOT_ALLOWLISTED/);
});
test('production execution denied irrespective of approval, token, target or mode',()=>{
 for(const args of [{},{mode:'LIVE',approval:'APPROVED'},{mode:'PRODUCTION',port:55433},{port:55434}])assert.throws(()=>t.executeLive(args),/NOT_AUTHORIZED/);
});
test('candidate module has no process/network/filesystem/SQL execution imports',()=>{
 const source=fs.readFileSync(path.join(__dirname,'phase13-5d1f-native-transport.cjs'),'utf8');
 assert.doesNotMatch(source,/require\(['"](?:pg|mqtt|dotenv|@prisma\/client|node:(?:fs|child_process|net|http|https))['"]\)|spawn\(|exec\(|fetch\(/);
});
const badPlans=[p=>{p.executable='psql.exe';},p=>{p.executable='C:\\Other\\psql.exe';},p=>{p.args.push('--command=SELECT public.evil()');},
 p=>{p.args[7]='--port=55433';},p=>{p.args[8]='--dbname=other';},p=>{p.stdin+='SELECT 1;';},p=>{p.stdin=oldSql.QUERIES.catalog;},
 p=>{p.environment.PGSERVICE='production';},p=>{p.environment.PGPASSWORD='SYNTHETIC_CANARY';},p=>{p.shell=true;},p=>{p.nativeTimeoutMs=999999;},p=>{p.executionEnabled=true;}];
for(const [i,mutate]of badPlans.entries())test(`wrong binary/arguments/query/environment ${i+1} refused`,()=>{const p=copy(t.buildPlan());mutate(p);blocked(collect('postgres',fixtures().postgres,{},p),'INVOCATION_NOT_ALLOWLISTED');});
test('SQL revision is separate, one RR READ ONLY transaction with rechecks and read locks',()=>{
 assert.match(revision.SQL,/^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;/);assert.equal((revision.SQL.match(/^COMMIT;/gm)||[]).length,1);
 assert.equal((revision.SQL.match(/^SELECT 1 FROM public\.[a-z_]+ LIMIT 0;/gm)||[]).length,6);
 assert.match(revision.SQL,/pg_catalog\.pg_current_snapshot\(\)/);assert.match(revision.SQL,/AccessShareLock/);
 assert.equal((revision.SQL.match(/^\\if :d1f_catalog_ok$/gm)||[]).length,3);assert.equal((revision.SQL.match(/^\\endif$/gm)||[]).length,3);
 assert.doesNotMatch(revision.SQL,/\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|GRANT|REVOKE|COPY|TRUNCATE|pg_advisory_lock|pg_sleep|set_config)\b|^\\(?:!|include|copy|connect)\b/im);
 assert.doesNotMatch(revision.SQL,/pg_catalog\.coalesce/);
});
test('six SQL transcript records pass offline consistency only',()=>{
 const r=collect();assert.equal(r.status,'OFFLINE_NATIVE_PASS');assert.equal(r.liveEvidenceVerified,false);assert.equal(r.value.pending,0);assert.equal(r.value.commandCount,58);assert.equal(r.value.sourceLive,false);
});
test('windows fixture validated without live OS acquisition',()=>{assert.equal(collect('windows').status,'OFFLINE_NATIVE_PASS');});
const failures=[['status7',{status:7},'NATIVE_EXIT_OR_SIGNAL'],['error despite0',{error:{code:'ETIMEDOUT'}},'NATIVE_ERROR_OR_TIMEOUT'],['timeout',{timedOut:true},'NATIVE_ERROR_OR_TIMEOUT'],
 ['signal',{signal:'SIGTERM'},'NATIVE_EXIT_OR_SIGNAL'],['partial JSON',{stdout:'{'},'SQL_TRANSCRIPT_INCOMPLETE'],['invalid JSON',{stdout:'x\nx\nx\nx\nx\nx'},'OFFLINE_NATIVE_REJECTED'],
 ['stdout limit',{stdout:'x'.repeat(1048577)},'OUTPUT_LIMIT_OR_STDERR'],['stderr limit',{stderr:'x'.repeat(1048577)},'OUTPUT_LIMIT_OR_STDERR'],
 ['stderr secret',{stderr:'SYNTHETIC_SECRET_CANARY'},'OUTPUT_LIMIT_OR_STDERR'],['old collection',{startedAt:when(-10000)},'COLLECTION_TIME_INVALID'],
 ['future collection',{endedAt:when(1)},'COLLECTION_TIME_INVALID'],['overlong execution',{startedAt:when(-8001)},'NATIVE_ERROR_OR_TIMEOUT']];
for(const[name,delta,code]of failures)test(`native ${name} fail-closed`,()=>{const r=collect('postgres',fixtures().postgres,delta);blocked(r,code);assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_SECRET|ETIMEDOUT/);});
const sqlMutations=[
 ['wrong database',r=>{r[1].database='other';}],['wrong port',r=>{r[1].port=55434;}],['wrong systemID',r=>{r[1].systemId='7699532241714573532';}],
 ['wrong schema',r=>{r[1].schema='other';}],['missing migration',r=>{r[3].migrations.pop();}],['checksum drift',r=>{r[3].migrations[0].checksum='a'.repeat(64);}],
 ['pending command',r=>{r[3].commands.pending='1';}],['missing actuator',r=>{r[3].actuators=[];}],['baseline system mismatch',r=>{r[3].systemId='other';}],
 ['principal mismatch',r=>{r[3].principal='other';}],['server restart',r=>{r[3].serverStartedAt=NOW;}],['different connection',r=>{r[5].backendPid=102;}],
 ['different snapshot',r=>{r[5].snapshot='101:102:';}],['no lock proof',r=>{r[5].protectedRelations=5;}],['wrong isolation',r=>{r[0].isolation='read committed';}],
 ['read write',r=>{r[5].readOnly='off';}],['catalog changes',r=>{r[4].schemaOwner='postgres';}],['table replaced',r=>{r[2].relations[0].kind='v';}],
 ['object conflict',r=>{r[1].conflicts=1;}],['missing stage',r=>{r.pop();}],['extra stage',r=>{r.push({status:'PASS'});}]
];
for(const[name,mutate]of sqlMutations)test(`SQL ${name} blocks`,()=>{const raw=fixtures().postgres;mutate(raw);blocked(collect('postgres',raw));});
const windowsMutations=[['missing metadata',r=>{r.process.before.complete=false;}],['wrong listener owner',r=>{const l={address:'0.0.0.0',port:5000,pid:999,startTicks:'639285000000000001'};r.process.before.listeners=[l];r.process.after=copy(r.process.before);}],
 ['wrong broker executable',r=>{r.broker.process.executable='other';}],['wrong config path',r=>{r.broker.config.pathFromProcess='other';}],['wrong config hash',r=>{r.broker.config.observedHash='b'.repeat(64);}],
 ['loopback broker',r=>{r.broker.listeners[0].address='127.0.0.1';}],['wrong LAN',r=>{r.broker.endpoint.host='192.168.1.4';}],['broker PID reuse',r=>{r.broker.processAfter.startTicks='639285000000000002';}],
 ['metadata denied',r=>{r.status='NOT_VERIFIED';}],['stale startup',r=>{r.process.attempts=[{runId:'old',pid:101,startTicks:'639285000000000001',state:'VERIFIED',updatedAt:when(-20000),exitCode:null}];}]];
for(const[name,mutate]of windowsMutations)test(`Windows ${name} blocks`,()=>{const raw=fixtures().windows;mutate(raw);blocked(collect('windows',raw));});
test('duplicate native collection and any failed attempt prohibit retry',()=>{
 const s=t.createMockTransport({runId}),p=t.buildPlan();assert.equal(s.collect('postgres',p,native('postgres'),NOW).status,'OFFLINE_NATIVE_PASS');blocked(s.collect('postgres',p,native('postgres'),NOW),'DUPLICATE_ATTEMPT_NO_RETRY');
 const f=t.createMockTransport({runId});blocked(f.collect('postgres',p,{...native('postgres'),status:7},NOW));blocked(f.collect('postgres',p,native('postgres'),NOW),'SESSION_LATCHED_NO_RETRY');
});
test('source attestation cannot be replaced with LIVE or a different invocation',()=>{
 for(const delta of [{kind:'LIVE'},{runId:'old'},{invocationSha256:'a'.repeat(64)}]){const n=native('postgres');Object.assign(n.source,delta);blocked(collect('postgres',fixtures().postgres,n),'NATIVE_ATTESTATION_MISMATCH');}
});
test('sanitizer removes values/raw streams/credentials and false authority',()=>{
 const r=t.sanitize({status:'OFFLINE_NATIVE_PASS',productionAuthorized:true,value:{password:'SYNTHETIC_SECRET_CANARY'},stdout:'SYNTHETIC_SECRET_CANARY',reasonCode:'SYNTHETIC_SECRET_CANARY'});
 assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_SECRET/);assert.equal(r.productionAuthorized,false);
});
test('unknown result fields and self-declared PASS never authorize collection',()=>{
 const n=native('postgres');n.status='PASS';blocked(collect('postgres',fixtures().postgres,n),'NATIVE_EXIT_OR_SIGNAL');
 blocked(collect('postgres',fixtures().postgres,{approval:'LIVE'}),'NATIVE_RESULT_INVALID');
});
test('future server start and backend PID reuse rejected',()=>{
 const rows=fixtures().postgres;for(const i of [1,2,3,4])rows[i].serverStartedAt=when(1);blocked(collect('postgres',rows),'DB_IDENTITY_MISMATCH');
 const raw=fixtures().windows,p={pid:101,startTicks:'639285000000000002',parentPid:99,executable:'C:\\Program Files\\nodejs\\node.exe',workingDirectory:'C:\\DATN\\Project_datn\\backend',entrypoint:'src/server.ts'};
 raw.process.before.processes=[p];raw.process.after=copy(raw.process.before);raw.process.attempts=[{runId:'old',pid:101,startTicks:'639285000000000001',state:'VERIFIED',updatedAt:when(-1000),exitCode:null}];
 blocked(collect('windows',raw),'PID_REUSED');
});
test('twelve inherited code artifacts retain reviewed source hashes',()=>{
 const expected={
 'scripts/phase13-5d1c-launcher.cjs':'051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A',
 'scripts/phase13-5d1c-console-host.ps1':'C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3',
 'scripts/phase13-5d1c-synthetic-child.cjs':'DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF',
 'scripts/phase13-5d1c-launcher.test.cjs':'990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10',
 'scripts/phase13-5d1d-contracts.cjs':'22E12B76C328EA9E2B6A93564F2FCEF2BA0F2CD56B77817265A6092521030B86',
 'scripts/phase13-5d1d-recovery-adapter.cjs':'1AEC6EB4A1A6CA866CCD396372D4BA80ACFEFBB74549A3F3E56BC1BA5B62261E',
 'scripts/phase13-5d1d-recovery-adapter.test.cjs':'6E80C0F000E0B9A4F4310FDFE1FE628542CD83867F50B16FF02860835AC58C7E',
 'scripts/phase13-5d1e-readonly-sql.cjs':'50BDF2AA3A1FD19F621F98AEB77217A5730912A5180280628041FCAC3187599C',
 'scripts/phase13-5d1e-validators.cjs':'5FD56795063766B34B696FEC39816301678CD1DB09B129131ABE06AB9FAAAE87',
 'scripts/phase13-5d1e-evidence-collectors.cjs':'9B1A70C6DA816D39C37EE3583770AD62D689ADC3D75CB3D47EAAEAEDB67C3B1F',
 'scripts/phase13-5d1e-evidence-collectors.test.cjs':'F32BFC9253470B77BC3DA031079712EE0A09DDE0E55CBAD5452169A17FA34D18',
 'backend/scripts/phase13-5c7-native.cjs':'4507548409A553EAAB5FD586334F5E66DD86C40F781BEABAEB1989B0EC16BD2E'};
 for(const[file,digest]of Object.entries(expected))assert.equal(hash(fs.readFileSync(path.resolve(__dirname,'..',file))).toUpperCase(),digest);
});
test('PowerShell AST valid; read-only specification is not invoked',()=>{
 const file=path.join(__dirname,'phase13-5d1f-windows-transport.ps1');
 const command="$e=$null; $t=$null; $a=[System.Management.Automation.Language.Parser]::ParseFile('"+file.replace(/'/g,"''")+"',[ref]$t,[ref]$e); if($e.Count){exit 2}; 'AST_PASS'";
 const result=spawnSync(t.POWERSHELL,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:8000,maxBuffer:1048576,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});
 assert.equal(result.error,undefined);assert.equal(result.status,0);assert.match(result.stdout,/AST_PASS/);
 const source=fs.readFileSync(file,'utf8');assert.match(source,/function Invoke-D1FLiveAcquisition\s*\{\s*throw 'LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED'/);
 assert.doesNotMatch(source,/&\s*\$candidate|Invoke-Command|Invoke-Expression|Start-Process|Stop-Process|Get-Content|Get-FileHash|CommandLine\s*[=|]/);
});
test('PowerShell default PLAN_ONLY and access-denied fixture disclose no metadata',()=>{
 const file=path.join(__dirname,'phase13-5d1f-windows-transport.ps1');
 for(const fixture of [false,true]){
  const args=['-NoLogo','-NoProfile','-NonInteractive','-File',file,...(fixture?['-Mode','OFFLINE_FIXTURE']:[])];
  const r=spawnSync(t.POWERSHELL,args,{encoding:'utf8',timeout:8000,maxBuffer:1048576,input:fixture?JSON.stringify({scenario:'ACCESS_DENIED'}):'',env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});
  assert.equal(r.error,undefined);assert.equal(r.status,0);assert.equal(r.stderr,'');const out=JSON.parse(r.stdout);assert.equal(out.liveAuthorized,false);
  assert.equal(fixture?out.status:out.mode,fixture?'NOT_VERIFIED':'PLAN_ONLY');
 }
});
