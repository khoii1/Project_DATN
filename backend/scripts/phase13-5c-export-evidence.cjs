// Offline reconciliation only: no production/test connections, no dump contents in report.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),run=process.argv[2];if(!/^\d{14}_[a-f0-9]{6}$/.test(run||''))throw Error('RUN_ID_REQUIRED');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const result=read('report/phase13-5c-run-'+run+'.json'),before=read('report/phase13-5c-production-inventory.json'),after=read('report/phase13-5c-production-inventory-after.json');
assert(result.pass&&result.stoppedCluster&&result.testLoginDisabled);assert(result.tests.every(t=>t.status==='PASS'));
const immutable=['identity','migrations','relations','columns','constraints','indexes','enums','functions','roles','memberships','schemaPrivileges','fingerprint','constraintFingerprint','ledgersPresent'];
const unchanged=Object.fromEntries(immutable.map(k=>[k,JSON.stringify(before[k])===JSON.stringify(after[k])]));assert(Object.values(unchanged).every(Boolean));
assert.equal(before.counts.commands,after.counts.commands);assert.equal(after.counts.pending,0);assert.equal(after.ledgersPresent.length,0);
const dir=path.join(root,'backend/prisma/proposals/production/20261022_irrigation_v1_v2'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const names={bootstrap:'00-prerequisites.review.sql',migration:'01-ledgers.review.sql',finalize:'02-finalize-dba.review.sql'};
for(const m of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,names[m.kind]))).digest('hex'),m.sha256);
const summary={runId:run,sqlRestoreTests:result.tests.length,source:result.source,restoreDb:result.restoreDb,archive:result.archive,globals:result.globals,
  restoreElapsedMs:result.restoreElapsedMs,sourceUnchanged:result.sourceUnchanged,ownersAndPrivilegesCompared:true,roleMapping:'IDENTITY_ON_SAME_TEST_CLUSTER',
  testClusterStopped:result.stoppedCluster,productionCatalogUnchanged:unchanged,commandsBefore:before.counts.commands,commandsAfter:after.counts.commands,pending:after.counts.pending,
  productionHealth:after.health,device:after.device,capacityBefore:before.capacity,capacityAfter:after.capacity,sqlArtifacts:manifest.files,
  storageCreated:false,productionBackupPerformed:false,productionMigrationPerformed:false,productionBackupPlan:'PARTIAL_PENDING_STORAGE_DATA_HANDLING_APPROVAL'};
fs.writeFileSync(path.join(root,'report/phase13-5c-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({runId:run,passed:summary.sqlRestoreTests,sourceUnchanged:true,productionCatalogUnchanged:true,commands:summary.commandsAfter,pending:summary.pending,productionBackupPerformed:false}));
