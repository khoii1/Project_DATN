// Export an allowlisted evidence summary only. Never reads credential files.
const fs = require('node:fs');
const path = require('node:path');
const root = 'C:\\DATN\\test-instances\\phase13-3b';
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const results = read('integration-results.json'), migration = read('migration-evidence.json'), shutdown = read('shutdown-evidence.json');
if (results.passed !== 38 || results.failed !== 0 || !shutdown.testClusterStopped) throw Error('INCOMPLETE_TEST_EVIDENCE');
const output = path.resolve(__dirname, '../../report/phase13_3b'); fs.mkdirSync(output, { recursive: true });
const summary = { conclusion: 'POSTGRESQL_PERSISTENCE_PASS', scope: 'ISOLATED_TEST_ONLY', startedAt: results.start, endedAt: results.end,
  identity: results.identity, appRole: results.appRole, testsPassed: results.passed, testsFailed: results.failed,
  counts: results.counts, tests: results.results.map(row => ({ name: row.name, status: row.status, details: row.details })),
  migration: { files: migration.files, catalogs: migration.catalogs, testClientOutput: migration.testClientOutput, productionMigrationApplied: false },
  shutdown, automationActive: false, mqttPublishedByHarness: false, physicalPumpTriggered: false };
fs.writeFileSync(path.join(output, 'postgresql-results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ evidenceExported: true, output, testsPassed: results.passed, stoppedAt: shutdown.stoppedAt }));
