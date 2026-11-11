const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const c=require('./phase13-5c-backup-contract.cjs'),{aclSql}=require('./phase13-5c-restore-rehearsal.cjs');
const root=path.resolve(__dirname,'../..');
const identity={host:'127.0.0.1/32',port:55433,system_id:c.TEST_SYSTEM,db:c.SOURCE,role:'phase13_test_admin',pgdata:'C:/DATN/test-instances/phase13-3b/data'};
test('fixed isolated backup source identity accepted',()=>assert.doesNotThrow(()=>c.testIdentity(identity,c.SOURCE)));
for(const [k,v]of [['port',5432],['system_id',c.PROD_SYSTEM],['db','smart_agriculture'],['role','postgres'],['pgdata','C:/Program Files/PostgreSQL/17/data'],['host','::1/128']])
 test('backup target contract fails closed on '+k,()=>assert.throws(()=>c.testIdentity({...identity,[k]:v},c.SOURCE),/ISOLATED_IDENTITY_MISMATCH/));
for(const db of ['smart_agriculture',c.SOURCE,'postgres','smart_agriculture_restore_13_5c_invalid'])test('restore rejects non-fresh target '+db,()=>assert.throws(()=>c.restoreArgs(db,'fixture.dump'),/FRESH_RESTORE_DATABASE_REQUIRED/));
test('custom dump and actual restore preserve owners/ACL and do not clean/create-overwrite existing databases',()=>{
  const dump=c.dumpArgs('fixture.dump'),restore=c.restoreArgs('smart_agriculture_restore_13_5c_20261022000000_abcdef','fixture.dump');
  assert(dump.includes('-Fc'));assert(dump.includes(c.SOURCE));assert.equal(restore[restore.indexOf('-p')+1],'55433');assert(restore.includes('--single-transaction'));assert(restore.includes('--exit-on-error'));
  for(const bad of ['--clean','--create','--no-owner','--no-acl'])assert(!restore.includes(bad));
});
test('ACL comparator expands NULL defaults rather than comparing ACL text or skipping privileges',()=>{
  const sql=aclSql('c.relacl','c.relowner','r');for(const marker of ['aclexplode','acldefault','coalesce','is_grantable','grantor','grantee','PUBLIC','ORDER BY'])assert(sql.includes(marker));
});
test('PowerShell scripts parse and production/storage default plans create nothing and request no credential',()=>{
  const storageRoot='C:/Users/Acer Swift3/AppData/Local/SmartAgriculturePostgresBackups';
  const existedBefore=fs.existsSync(storageRoot);
  const entriesBefore=existedBefore?fs.readdirSync(storageRoot).sort():[];
  const scripts=['phase13-5c-backup-security.ps1','phase13-5c-prepare-backup-storage.ps1','phase13-5c-production-backup.ps1'];
  for(const name of scripts){const full=path.join(root,'scripts',name).replaceAll("'","''");
    const command="$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('"+full+"',[ref]$tokens,[ref]$errors);if($errors.Count){exit 1}";
    execFileSync('powershell.exe',['-NoProfile','-Command',command],{windowsHide:true,stdio:'pipe'});
  }
  const plan=name=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-File',path.join(root,'scripts',name)],{encoding:'utf8',windowsHide:true}));
  const storage=plan(scripts[1]),backup=plan(scripts[2]);assert.equal(storage.Mode,'PLAN_ONLY');assert.equal(storage.Created,false);assert.equal(storage.ProductionDataStorageApproved,false);assert.equal(storage.CustomSyncBackupScope,'NOT_VERIFIED');
  assert.equal(backup.ProductionBackupPerformed,false);assert.equal(backup.CredentialsRequested,false);assert.equal(backup.RequiresSeparateBackupApproval,true);
  assert.equal(fs.existsSync(storageRoot),existedBefore);
  assert.deepEqual(existedBefore?fs.readdirSync(storageRoot).sort():[],entriesBefore);
});
test('future production script has explicit approvals, identity/checksum and secret handling gates',()=>{
  const s=fs.readFileSync(path.join(root,'scripts/phase13-5c-production-backup.ps1'),'utf8');
  for(const marker of ['PLAN_ONLY','EXPLICIT_BACKUP_AND_STORAGE_APPROVAL_IDS_REQUIRED','StorageApprovalId','PRODUCTION_BACKUP_IDENTITY_OR_SAFETY_MISMATCH','7472695863566132416','SQL_ARTIFACT_HASH_MISMATCH','PRISMA_CHECKSUM_MISMATCH','Read-Host','-AsSecureString','ZeroFreeBSTR','--roles-only','--no-role-passwords','RestoreVerified=$false','PG_DUMP_EXIT_','NO_RETRY','database_properties','aclexplode','native-exits.private.json'])assert(s.includes(marker),marker);
  assert(s.indexOf("Mode='PLAN_ONLY'")<s.indexOf('$password=Read-Host'));assert(!s.includes('pg_restore.exe\" --clean'));assert(!s.includes('Set-ItemProperty'));
  assert(!/NativeArguments[^\n]*(?:plain|password)/i.test(s));
});
test('storage only creates new directories, refuses existing ACL repair, grants only operator/SYSTEM',()=>{
  const s=fs.readFileSync(path.join(root,'scripts/phase13-5c-backup-security.ps1'),'utf8');
  for(const gate of ['TARGET_ALREADY_EXISTS_NO_ACL_REPAIR','CreateDirectoryW','SetAccessRuleProtection($true,$false)','S-1-5-18','PRIVATE_ACL_ACE_MISMATCH','REPARSE_PATH_REFUSED','BACKUP_INSIDE_REPOSITORY_REFUSED'])assert(s.includes(gate));
  assert(!s.includes('Set-Acl'));assert(!s.includes('S-1-5-32-545'));assert(!s.includes('S-1-5-11'));
});
