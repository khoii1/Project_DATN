// Offline mapper/harness regression. Importing harness never starts a cluster/client.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {mapSql}=require('./phase13-5b1-rehearsal.cjs');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'backend/prisma/proposals/production/20261022_irrigation_v1_v2');
const env={name:'smart_agriculture_rehearsal_offline',migrator:'p135b1_offline_m',app:'p135b1_offline_a'};
for(const name of ['00-prerequisites.review.sql','01-ledgers.review.sql','02-finalize-dba.review.sql'])test('rehearsal identity mapping is reversible and preserves DDL: '+name,()=>{
  const original=fs.readFileSync(path.join(dir,name),'utf8'),mapped=mapSql(original,env);
  assert.equal(mapped.reversible,true);assert(mapped.sql.includes('7698826681383327460'));assert(!mapped.sql.includes('7472695863566132416'));
  assert(!mapped.sql.includes("'smart_agriculture'"));assert(!mapped.sql.includes('5432'));assert(!mapped.sql.includes('sa_irrigation_'));
  assert(mapped.sql.includes('55433'));assert(mapped.sql.includes(env.name));
  for(const command of ['CREATE TABLE','CREATE TYPE','CREATE UNIQUE INDEX','FOREIGN KEY','CHECK (','CREATE TRIGGER','GRANT','REVOKE','COMMIT;'])
    assert.equal(mapped.sql.split(command).length,original.split(command).length,command);
  assert(!mapped.changes.some(c=>c.from==='public'));assert.notEqual(mapped.sourceSha256,mapped.mappedSha256);
});
test('harness cannot use production URL fallback, erase data or mutate old phase fixtures',()=>{
  const source=fs.readFileSync(path.join(__dirname,'phase13-5b1-rehearsal.cjs'),'utf8');
  assert(!source.includes("require('dotenv')"));assert(!source.includes('process.env.DATABASE_URL'));
  for(const gate of ['7698826681383327460','TEST_SQL_IDENTITY_MISMATCH','TEST_SYSTEM_IDENTITY_MISMATCH','SOURCE_SQL_HASH_MISMATCH','EXPLICIT_REHEARSAL_APPROVAL_REQUIRED','SHUTDOWN_IDENTITY_MISMATCH'])assert(source.includes(gate),gate);
  assert(!/DROP\s+(?:DATABASE|SCHEMA)|TRUNCATE\s+(?:public\.)?irrigation_(?!decision_logs)/i.test(source));
  assert(source.includes('secrets:')||source.includes("secrets:'"));assert(source.includes('disabledAfterTests=true'));
});
