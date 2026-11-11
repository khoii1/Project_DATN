'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const p=require('./phase13-5d1g-r2-password-plan.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const fixture=path.join(__dirname,'phase13-5d1g-r2-console-fixture.ps1');
const prefix='r2-tests-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex');
const canary='SYNTHETIC_INPUT_CANARY_R2_NO_CREDENTIAL';
test('future plan is disabled, uses pwprompt not pwfile or trust, no credential channel',()=>{
 const plan=p.futurePlan();assert.equal(plan.mode,'PLAN_ONLY');assert.equal(plan.secondInitdbAuthorized,false);assert.equal(plan.realInitdbInputVerified,false);
 assert.ok(plan.args.includes('--pwprompt'));assert.ok(plan.args.includes('--no-clean'));assert.equal(plan.promptDeadlineMs,120000);assert.equal(plan.automaticRetry,false);
 assert.equal(plan.passwordArgv,false);assert.equal(plan.passwordEnvironment,false);assert.equal(plan.passwordFile,false);assert.doesNotMatch(JSON.stringify(plan),/--pwfile|trust/);
});
test('real initdb executor denied even with approval token or alternate arguments',()=>{
 for(const options of [{},{approval:'APPROVED_SECOND_INITDB'},{mode:'PRODUCTION'},{executable:'initdb.exe'}])assert.throws(()=>p.executeInitdb(options),/NOT_AUTHORIZED/);
});
test('binary inspection only permits help/version, never a data argument',()=>{
 for(const option of ['--help','--version'])assert.deepEqual(p.inspectionSpec(option).args,[option]);
 for(const option of ['--pwprompt','--pwfile=-','-D','--show','--sync-only'])assert.throws(()=>p.inspectionSpec(option),/NOT_ALLOWED/);
 assert.equal(sha(fs.readFileSync(p.futurePlan().executable)),p.INITDB_HASH);
});
test('synthetic options reject arbitrary executable, password, env and invalid paths',()=>{
 for(const options of [{runId:'../bad',scenario:'success'},{runId:prefix,scenario:'other'},{runId:prefix,scenario:'success',password:canary},
  {runId:prefix,scenario:'success',executable:'initdb.exe'},{runId:prefix,scenario:'success',environment:{PGPASSWORD:canary}}])assert.throws(()=>p.runSynthetic(options),/OPTIONS_REQUIRED/);
});
test('source has no database/network or actual initdb invocation and no password-file API',()=>{
 const source=fs.readFileSync(path.join(__dirname,'phase13-5d1g-r2-password-plan.cjs'),'utf8');
 assert.doesNotMatch(source,/require\(['"](?:pg|@prisma\/client|dotenv|mqtt|node:(?:net|http|https))['"]\)|spawnSync\(INITDB|PGPASSWORD:|DATABASE_URL/);
 assert.match(source,/spawnSync\(POWERSHELL/);assert.match(source,/env:\{SystemRoot:/);assert.match(source,/flag:'wx'/);
 const helper=fs.readFileSync(fixture,'utf8');assert.doesNotMatch(helper,/Start-Process|Get-Content|Set-Acl|New-Item|Read-Host|Out-File|WriteAllText|pg_ctl/);
 assert.match(helper,/CreateFile\("CONIN\$"/);assert.match(helper,/CreateFile\("CONOUT\$"/);assert.match(helper,/ReadConsoleW/);assert.match(helper,/SetConsoleMode/);
});
const cases=[['success','SYNTHETIC_CONFIRMED',0],['mismatch','CONFIRMATION_MISMATCH',23],['missing','MISSING_INPUT',23],
 ['timeout','PROMPT_TIMEOUT',23],['cancel','OPERATOR_CANCELLED',23],['disconnect','CONSOLE_DISCONNECTED',23],
 ['exit7','NATIVE_NONZERO',7],['echo-risk','ECHO_UNSAFE',23],['no-console','NO_CONSOLE',23]];
for(const[scenario,outcome,code]of cases)test(`real synthetic console child: ${scenario}`,()=>{
 const r=p.runSynthetic({runId:prefix+'-'+scenario,scenario});
 assert.equal(r.meta.errorCode,null);assert.equal(r.meta.signal,null);assert.equal(r.meta.exitCode,code,JSON.stringify(r));
 assert.equal(r.output.outcome,outcome);assert.equal(r.canaryInLogs,false);assert.equal(r.verdict.retry,false);assert.equal(r.verdict.secondInitdbAuthorized,false);
 assert.equal(r.verdict.status,scenario==='success'?'SYNTHETIC_CONSOLE_PASS':'BLOCKED');
 if(scenario==='success'){assert.equal(r.output.confirmationMatched,true);assert.equal(r.output.echoDetected,false);assert.equal(r.output.echoDisabled,true);assert.equal(r.output.modeRestored,true);assert.equal(r.output.promptCount,2);assert.equal(r.output.consoleMembers,1);}
 if(scenario==='echo-risk'){assert.equal(r.output.echoDisabled,false);assert.equal(r.output.echoDetected,true);}
 if(scenario==='cancel')assert.equal(r.output.ctrlCObserved,true);
 for(const file of ['stdout.log','stderr.log','attempt.json','result.json'])assert.ok(!fs.readFileSync(path.join(r.directory,file),'utf8').includes(canary));
 assert.deepEqual(fs.readdirSync(r.directory).filter(f=>/passw|\.pwd|\.pgpass/.test(f)),[]);
});
test('duplicate attempt refuses overwrite and retry',()=>{
 const runId=prefix+'-duplicate',r=p.runSynthetic({runId,scenario:'success'}),file=path.join(r.directory,'attempt.json'),before=fs.readFileSync(file);
 assert.throws(()=>p.runSynthetic({runId,scenario:'success'}),/ATTEMPT_EXISTS_NO_RETRY/);assert.deepEqual(fs.readFileSync(file),before);
});
test('native error despite exit0 / signal / unknown outcome never retries',()=>{
 for(const native of [{exitCode:0,errorCode:'ETIMEDOUT',signal:null},{exitCode:0,errorCode:null,signal:'SIGTERM'},{exitCode:null,errorCode:null,signal:null}]){
  const r=p.classify(native,{outcome:'SYNTHETIC_CONFIRMED'});assert.equal(r.status,'UNKNOWN_NATIVE_OUTCOME');assert.equal(r.retry,false);assert.equal(r.secondInitdbAuthorized,false);
 }
});
test('status0 alone, missing no-echo or confirmation proof never becomes success',()=>{
 for(const out of [{outcome:'SYNTHETIC_CONFIRMED'},{outcome:'UNKNOWN_CONSOLE_OUTCOME'},{outcome:'PROMPT_TIMEOUT'}])assert.equal(p.classify({exitCode:0,errorCode:null,signal:null},out).status,'BLOCKED');
});
test('PowerShell AST parses without running console or initdb',()=>{
 const command="$e=$null;$t=$null;[void][Management.Automation.Language.Parser]::ParseFile('"+fixture.replace(/'/g,"''")+"',[ref]$t,[ref]$e);if($e.Count){exit 2};'AST_PASS'";
 const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:8000,maxBuffer:1048576,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}});
 assert.equal(r.error,undefined);assert.equal(r.status,0);assert.match(r.stdout,/AST_PASS/);
});
test('R1 runner, accepted ACL helper and old summaries/marker/evidence hashes unchanged',()=>{
 const pins={
  'scripts/phase13-5d1g-isolated-run.cjs':'855B3EADF534E214D7112FE11190A356CBC952ABFF81493656D11A02BFF4699B',
  'scripts/phase13-5d1g-resume-root.ps1':'EA18F33C8FD072A6F524AD831278A3124B0E4256FE7C15667458D7267AA704C1',
  'report/phase13-5d1g-isolated-sql-summary.json':'317959ABCCB272EB6BB77F5D0AF309F4942C5B6CD4BA9172E92C357B98F1DC01',
  'report/phase13-5d1g-resume-r1-summary.json':'D21BC5DB879C9BAB5F093799B1CB9A95C5ED0708630103DCBA779D36F6BE037D'};
 for(const[file,hash]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.resolve(__dirname,'..',file))),hash);
 assert.equal(sha(fs.readFileSync('C:\\DATN\\test-instances\\phase13-5d1g\\initdb-attempt.json')),'43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C');
 assert.equal(sha(fs.readFileSync('C:\\DATN\\test-instances\\phase13-5d1g\\resume-r1-outcome.json')),'03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138');
});
