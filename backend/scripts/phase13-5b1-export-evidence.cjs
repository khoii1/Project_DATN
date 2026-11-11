// Offline evidence reconciliation. No DB/client/config imports or service operations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),run=process.argv[2];
if(!/^\d{14}_[a-f0-9]{6}$/.test(run||''))throw Error('RUN_ID_REQUIRED');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const result=read('report/phase13-5b1-run-'+run+'.json');
assert.equal(result.pass,true);assert.equal(result.stoppedCluster,true);assert(result.cases.every(t=>t.status==='PASS'));
const before=read('report/phase13-5b1-production-inventory.json'),after=read('report/phase13-5b1-production-inventory-after.json');
const immutable=['identity','migrations','relations','columns','constraints','indexes','enums','functions','roles','memberships','schemaPrivileges','fingerprint','constraintFingerprint','ledgersPresent'];
const unchanged=Object.fromEntries(immutable.map(k=>[k,JSON.stringify(before[k])===JSON.stringify(after[k])]));assert(Object.values(unchanged).every(Boolean));
assert.equal(before.counts.commands,after.counts.commands);assert.equal(after.counts.pending,0);assert.deepEqual(result.oldPhaseBefore,result.oldPhaseAfter);
const target=path.join(root,'backend/prisma/proposals/production/20261022_irrigation_v1_v2'),file=path.join(target,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(file,'utf8')),names={bootstrap:'00-prerequisites.review.sql',migration:'01-ledgers.review.sql',finalize:'02-finalize-dba.review.sql'};
assert.deepEqual(manifest.files,result.sourceManifest.files);
for(const m of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(target,names[m.kind]))).digest('hex'),m.sha256);
manifest.sqlExecutionOnIsolatedTarget='MAPPED_EQUIVALENT_PASS_ORIGINAL_PRODUCTION_TARGET_NOT_EXECUTED';
manifest.isolatedRehearsal={runId:run,passed:result.cases.length,failed:0,port:55433,systemIdentifier:result.identity.system_id,targetMapped:true,productionExecuted:false,report:'report/phase13-5b1-run-'+run+'.json'};
fs.writeFileSync(file,JSON.stringify(manifest,null,2));
const summary={checkedAt:new Date().toISOString(),runId:run,sqlTests:result.cases.length,identity:result.identity,sourceFiles:manifest.files,productionCatalogUnchanged:unchanged,
  countsBefore:before.counts,countsAfter:after.counts,oldPhaseDataPreserved:true,testClusterStopped:result.stoppedCluster,productionMigrationPerformed:false,
  finalizationPrivileges:result.finalizationPrivileges,health:after.health,device:after.device,sourceArtifactStatus:'SQL_PRODUCTION_ARTIFACT_READY_FOR_REVIEW_NOT_DEPLOYMENT_APPROVAL'};
fs.writeFileSync(path.join(root,'report/phase13-5b1-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({runId:run,sqlTests:summary.sqlTests,catalogUnchanged:true,pending:after.counts.pending,commands:after.counts.commands,clusterStopped:true}));
