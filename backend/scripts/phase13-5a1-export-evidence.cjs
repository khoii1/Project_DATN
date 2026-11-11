// Export synthetic/redacted evidence only. No credentials file reads.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), instance = 'C:\\DATN\\test-instances\\phase13-3b';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const results = read(path.join(instance, 'phase13-5a1-integration-results.json'));
assert.equal(results.failed, 0); assert.equal(results.passed, results.results.length);
assert.equal(results.identity.port, 55433); assert.equal(results.identity.db, 'smart_agriculture_test_phase13_3b');
const before = read(path.join(root, 'report/phase13-5a1-runtime-before.json'));
const after = read(path.join(root, 'report/phase13-5a1-runtime-after.json'));
assert.deepEqual(after.identity, before.identity);
for (const field of ['pending', 'commandCount', 'sensorReadingCount', 'automationRuleCount']) assert.equal(after[field], before[field]);
assert.equal(after.pending, 0);
const attempts = fs.readdirSync(instance).filter(p => /^phase13-5a1-integration-attempt-\d+\.json$/.test(p)).map(p => {
  const old = read(path.join(instance, p));
  return { file: p, passed: old.results.filter(x => x.status === 'PASS').length, failures: old.results.filter(x => x.status !== 'PASS').map(x => ({ name: x.name, code: x.code, reason: x.reason })) };
});
const exportFile = path.join(root, 'report/phase13-5a1-postgresql-results.json');
fs.writeFileSync(exportFile, JSON.stringify({ ...results, earlierAttempts: attempts,
  productionUnchangedDuringObservation: { identity: after.identity, pending: after.pending, commandCount: after.commandCount, sensorReadingCount: after.sensorReadingCount, automationRuleCount: after.automationRuleCount },
  scope: 'ISOLATED_SYNTHETIC_NO_MQTT_NO_DEVICECOMMAND', sqlIsolationProven: true }, null, 2));
console.log(JSON.stringify({ file: exportFile, passed: results.passed, failed: results.failed, start: results.start, end: results.end, attempts,
  processEvidence: results.results.filter(x=>x.details?.pids || x.details?.killedPid || x.details?.realPgBlockingObserved).map(x=>({ name:x.name, details:x.details })) }, null, 2));
