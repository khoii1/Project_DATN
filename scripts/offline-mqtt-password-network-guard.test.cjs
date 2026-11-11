const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),guard=path.join(__dirname,'offline-mqtt-password-network-guard.cjs'),cli=path.join(__dirname,'offline-mqtt-password-verify-cli.cjs');
function native(code,{preload=true,input=''}={}){
 return spawnSync(process.execPath,[...(preload?['--require',guard]:[]),'-'],{cwd:root,input:code,encoding:'utf8',timeout:10000,windowsHide:true,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'}});
}
test('guard preloads before CLI; immutable active proof matches native child PID',()=>{
 const r=native(`const a=require('./scripts/offline-mqtt-password-network-guard.cjs').assertActive();const cli=require('./scripts/offline-mqtt-password-verify-cli.cjs');if(!a.guardActive||!a.preloaded||a.pid!==process.pid)throw Error('BAD_ATTESTATION');console.log(JSON.stringify(a));`);
 assert.equal(r.status,0);assert.equal(r.stderr,'');const p=JSON.parse(r.stdout);assert.equal(p.guardActive,true);assert.equal(p.preloaded,true);assert.equal(p.policy,'DENY_ALL_NETWORK_AND_CHILD_PROCESS');assert.ok(p.pid>0);
});
test('missing preload blocks real-mode resolution and direct auth-store read before any IO',()=>{
 const {approvedTarget}=require('./offline-mqtt-password-verify-cli.cjs');const {readTargetEntry,PRODUCTION}=require('./offline-mqtt-password-file.cjs');
 const read=fs.readFileSync,open=fs.openSync;let reads=0;fs.readFileSync=()=>{reads++;throw Error('AUTH_READ_FORBIDDEN');};fs.openSync=()=>{reads++;throw Error('AUTH_OPEN_FORBIDDEN');};
 try{assert.throws(()=>approvedTarget('C:\\DATN\\test-instances\\phase13-3b\\mqtt-password-verification-1-a'),/GUARD_REQUIRED/);assert.throws(()=>readTargetEntry(PRODUCTION),/GUARD_REQUIRED/);assert.equal(reads,0);}finally{fs.readFileSync=read;fs.openSync=open;}
});
test('startup probe returns native0 and no token; reads no approval/auth store/stdin',()=>{
 const r=native(`const fs=require('node:fs');const {main}=require('./scripts/offline-mqtt-password-verify-cli.cjs');fs.readFileSync=()=>{throw Error('UNEXPECTED_FILE_READ');};fs.openSync=()=>{throw Error('UNEXPECTED_FILE_OPEN');};main(['--guard-check']);`);
 assert.equal(r.status,0);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
});
test('missing preload probe fails with native3/four-token error; no guard auto-install',()=>{
 const r=spawnSync(process.execPath,[cli,'--guard-check'],{cwd:root,encoding:'utf8',timeout:5000});assert.equal(r.status,3);assert.equal(r.stdout,'VERIFICATION_ERROR\n');assert.equal(r.stderr,'');
});
test('all network entry points and process escape paths synchronously denied without OS calls',()=>{
 const r=native(`
 const assert=require('node:assert/strict');require('./scripts/offline-mqtt-password-network-guard.cjs').assertActive();
 const net=require('node:net'),tls=require('node:tls'),udp=require('node:dgram'),http=require('node:http'),https=require('node:https'),http2=require('node:http2'),dns=require('node:dns'),cp=require('node:child_process'),w=require('node:worker_threads'),cluster=require('node:cluster');
 const probes=[
 ()=>net.connect({host:'127.0.0.1',port:9}),()=>net.createConnection(9,'localhost'),()=>net.createServer(),()=>new net.Server().listen(0,'127.0.0.1'),()=>new net.Socket(),
 ()=>tls.connect(9,'localhost'),()=>tls.createServer(),()=>new tls.TLSSocket(),
 ()=>udp.createSocket('udp4'),()=>new udp.Socket('udp4'),
 ()=>http.request('http://127.0.0.1:9'),()=>http.get('http://127.0.0.1:9'),()=>http.createServer(),()=>new http.ClientRequest('http://127.0.0.1:9'),
 ()=>https.request('https://127.0.0.1:9'),()=>https.get('https://127.0.0.1:9'),()=>https.createServer(),
 ()=>http2.connect('http://127.0.0.1:9'),()=>http2.createServer(),()=>http2.createSecureServer(),
 ()=>fetch('http://127.0.0.1:9'),()=>new WebSocket('ws://127.0.0.1:9'),
 ()=>dns.lookup('localhost',()=>{}),()=>dns.resolve('example.invalid',()=>{}),()=>dns.promises.lookup('localhost'),()=>new dns.Resolver(),
 ()=>cp.spawn('NOT_EXECUTED',[]),()=>cp.spawnSync('NOT_EXECUTED',[]),()=>cp.exec('NOT_EXECUTED'),()=>cp.execSync('NOT_EXECUTED'),()=>cp.execFile('NOT_EXECUTED'),()=>cp.execFileSync('NOT_EXECUTED'),()=>cp.fork('NOT_EXECUTED'),()=>new cp.ChildProcess(),
 ()=>new w.Worker('NOT_EXECUTED'),()=>cluster.fork(),()=>process.dlopen({},'NOT_EXECUTED.node'),()=>require('undici'),()=>require('mqtt'),
 ()=>process.getBuiltinModule('child_process').spawn('NOT_EXECUTED')];
 for(const fn of probes)assert.throws(fn,e=>e.code==='OFFLINE_VERIFIER_CAPABILITY_BLOCKED');
 console.log(JSON.stringify({denied:probes.length,networkOSCalls:0,childrenCreated:0}));
 `);
 assert.equal(r.status,0,JSON.stringify({error:r.error?.code,signal:r.signal,stderr:r.stderr}));assert.equal(r.stderr,'');const p=JSON.parse(r.stdout);assert.ok(p.denied>=39);assert.equal(p.childrenCreated,0);
});
test('ESM builtin exports are patched; no owned-loopback exception or reversible monkey patch',()=>{
 const r=native(`(async()=>{const assert=require('node:assert/strict');const net=await import('node:net');assert.throws(()=>net.connect(9,'127.0.0.1'),e=>e.code==='OFFLINE_VERIFIER_CAPABILITY_BLOCKED');assert.throws(()=>net.createServer(),e=>e.code==='OFFLINE_VERIFIER_CAPABILITY_BLOCKED');const cp=await import('node:child_process');assert.throws(()=>cp.spawn('NOT_EXECUTED'),e=>e.code==='OFFLINE_VERIFIER_CAPABILITY_BLOCKED');assert.throws(()=>Object.defineProperty(require('node:net'),'connect',{value:()=>{}}));console.log('GUARD_ESM_DENIAL_PASS');})();`);
 assert.equal(r.status,0);assert.equal(r.stderr,'');assert.equal(r.stdout.trim(),'GUARD_ESM_DENIAL_PASS');
});
test('PowerShell hashes and guard probe execute before prompt; actual probe native evidence and mismatch rejection',()=>{
 const script=String.raw`
$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$file=Join-Path (Get-Location) 'scripts/offline-mqtt-password-verify-once.ps1'
$ast=[Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'AST_FAILED'}
foreach($name in @('Assert-OfflineVerifierSources','New-OfflineVerifierStartInfo','Test-OfflineVerifierGuard')){
 $fn=@($ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -ceq $name},$true))
 if($fn.Count -ne 1){throw 'FUNCTION_NOT_FOUND'}
 Invoke-Expression $fn[0].Extent.Text
}
$hashes=@{}
foreach($name in @('offline-mqtt-password-verifier.cjs','offline-mqtt-password-file.cjs','offline-mqtt-password-verify-cli.cjs','offline-mqtt-password-verify-once.ps1','offline-mqtt-password-network-guard.cjs')){$hashes[$name]=(Get-FileHash (Join-Path (Get-Location) ('scripts/'+$name))).Hash.ToLowerInvariant()}
$plan=[pscustomobject]@{sourceHashes=[pscustomobject]$hashes}
Assert-OfflineVerifierSources -Plan $plan
$guard=Join-Path (Get-Location) 'scripts/offline-mqtt-password-network-guard.cjs'
$cli=Join-Path (Get-Location) 'scripts/offline-mqtt-password-verify-cli.cjs'
$pass=Test-OfflineVerifierGuard -GuardPath $guard -CliPath $cli
$mismatch=$false;$plan.sourceHashes.'offline-mqtt-password-network-guard.cjs'=('0'*64)
try{Assert-OfflineVerifierSources -Plan $plan}catch{$mismatch=$true}
$missing=$false
try{$null=Test-OfflineVerifierGuard -GuardPath (Join-Path (Get-Location) 'scripts/offline-mqtt-password-verifier.cjs') -CliPath $cli}catch{$missing=$true}
@{astPass=$true;guardProbePass=$pass;hashMismatchRefused=$mismatch;missingGuardRefused=$missing;credentialPrompts=0}|ConvertTo-Json -Compress
`;
 const input=script.replace(/\r?\n/g,'\r\n').replace(/}\r\n/g,'}\r\n\r\n')+'\r\n';
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','-'],{cwd:root,input,encoding:'utf8',timeout:15000,windowsHide:true});
 assert.equal(r.status,0);assert.equal(r.stderr,'');assert.deepEqual(JSON.parse(r.stdout.trim()),{astPass:true,guardProbePass:true,hashMismatchRefused:true,missingGuardRefused:true,credentialPrompts:0});
 const source=fs.readFileSync(path.join(__dirname,'offline-mqtt-password-verify-once.ps1'),'utf8');
 const main=source.slice(source.indexOf('\ntry{'));
 assert.ok(main.indexOf('Assert-OfflineVerifierSources -Plan $plan')<main.indexOf('$null=Test-OfflineVerifierGuard'));
 assert.ok(main.indexOf('$null=Test-OfflineVerifierGuard')<main.indexOf('$credential=Get-Credential'));
 assert.match(main,/New-OfflineVerifierStartInfo -Arguments \('--require/);
});
