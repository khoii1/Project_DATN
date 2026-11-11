'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {mappedSql,sha,SOURCE_HASH}=require('./phase13-5d1g-mapping.cjs');
const source=require('./phase13-5d1f-sql-revision.cjs').SQL;
test('R1 source pin matches and all five identity mappings reverse byte for byte',()=>{
 const m=mappedSql('7777777777777777777');assert.equal(sha(source),SOURCE_HASH);assert.equal(m.reverseSha256,SOURCE_HASH);assert.deepEqual(m.mappings.map(x=>x.count),[3,3,3,3,6]);
 let reverse=m.sql;for(const p of [...m.mappings].reverse())reverse=reverse.split(p.to).join(p.from);assert.equal(reverse,source);
});
for(const id of ['7472695863566132416','7699532241714573532','other',5432,''])test(`reject forbidden/unknown system identity ${typeof id==='number'?'number':id.slice(-5)}`,()=>assert.throws(()=>mappedSql(id)));
for(const db of ['smart_agriculture','postgres','smart_agriculture_recovery_13_5c_01',"smart_agriculture_d1g';DROP DATABASE x;--"])
 test(`reject nonallowlisted database ${db.slice(0,25)}`,()=>assert.throws(()=>mappedSql('7777777777777777777',db),/NOT_ALLOWLISTED/));
test('mapping changes no transaction/guard/fingerprint logic',()=>{
 const m=mappedSql('7777777777777777777','smart_agriculture_d1g_before');
 for(const text of ['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;','390c65cfe11f3b8695a6bc5ff21d94d4','2e5981464ef4017e1ad5a6854ba17cc2',"statement_timeout = '3000ms'",'\\quit 3'])assert.ok(m.sql.includes(text));
});
test('isolated runner imports no production config, ORM, broker, credentials or archive',()=>{
 const s=fs.readFileSync(path.join(__dirname,'phase13-5d1g-isolated-run.cjs'),'utf8');
 assert.doesNotMatch(s,/require\(['"](?:pg|@prisma\/client|dotenv|mqtt)['"]\)|DATABASE_URL|pg_restore|pg_dump/);
 assert.doesNotMatch(s,/'-p',\s*'(?:5432|55433|55434)'/);
 assert.match(s,/if\(fs\.existsSync\(ROOT\)/);assert.match(s,/initdbAttempts=1/);assert.match(s,/flag:'wx'/);
});
test('root cause reproduced in memory: string SID fails, explicit SecurityIdentifier rule succeeds without Set-Acl',()=>{
 const ps="$ErrorActionPreference='Stop';$s=[Security.Principal.WindowsIdentity]::GetCurrent().User;$oldFailed=$false;try{$a=New-Object Security.AccessControl.DirectorySecurity;$r=New-Object Security.AccessControl.FileSystemAccessRule($s.Value,'FullControl','ContainerInherit,ObjectInherit','None','Allow');$a.AddAccessRule($r)}catch{if($_.Exception.InnerException -is [Security.Principal.IdentityNotMappedException]){$oldFailed=$true}else{throw}};if(-not $oldFailed){throw 'EXPECTED_REPRO_MISSING'};$b=New-Object Security.AccessControl.DirectorySecurity;$b.SetOwner($s);$b.SetAccessRuleProtection($true,$false);foreach($id in @($s.Value,'S-1-5-18')){$sid=New-Object Security.Principal.SecurityIdentifier($id);$r=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow');$b.AddAccessRule($r)};if(-not $b.AreAccessRulesProtected -or $b.Access.Count -ne 2){throw 'IN_MEMORY_ACL_FAILED'};'OFFLINE_SID_CONSTRUCTOR_REPRO_AND_CANDIDATE_PASS'";
 assert.doesNotMatch(ps,/Set-Acl|New-Item|Remove-Item|initdb/);
 const r=spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:8000,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'},maxBuffer:1048576});
 assert.equal(r.error,undefined);assert.equal(r.status,0);assert.match(r.stdout,/OFFLINE_SID_CONSTRUCTOR_REPRO_AND_CANDIDATE_PASS/);
});
