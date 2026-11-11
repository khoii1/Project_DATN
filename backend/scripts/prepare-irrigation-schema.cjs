// OFFLINE generator: schema validate/diff from files only. Never opens a DB.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const production = path.join(root, 'prisma/schema.prisma');
const original = fs.readFileSync(production, 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const extensions = {
  Actuator: '  persistenceCycles IrrigationCycle[]\n  persistenceDecisions IrrigationDecisionLog[]\n  persistenceBudgets IrrigationDailyBudget[]\n  persistenceSafety IrrigationSafetyState[]\n  @@unique([id, deviceId])',
  Device: '  persistenceCycles IrrigationCycle[]',
  AutomationRule: '  persistenceCycles IrrigationCycle[]\n  @@unique([id, actuatorId])',
  SensorReading: '  persistenceDecisions IrrigationDecisionLog[]',
  DeviceCommand: '  persistenceIntent CommandIntent?\n  @@unique([id, actuatorId])',
};
let composed = original;
for (const [model, fields] of Object.entries(extensions)) {
  const pattern = new RegExp('(model ' + model + ' \\{[\\s\\S]*?)(\\r?\\n\\})');
  if (!pattern.test(composed)) throw Error('Missing model: ' + model);
  composed = composed.replace(pattern, '$1\n' + fields + '$2');
}
composed += '\n' + fs.readFileSync(path.join(root, 'prisma/proposals/irrigation-persistence.prisma'), 'utf8');
const output = path.resolve(root, '../build/phase13-3a-schema'); fs.mkdirSync(output, { recursive: true });
const schema = path.join(output, 'schema.prisma'); fs.writeFileSync(schema, composed);
// Dummy, unreachable endpoint; validate/diff are datamodel-only and never connect.
const env = { ...process.env, DATABASE_URL: 'postgresql://schema_validation:NOT_A_REAL_CREDENTIAL@127.0.0.1:1/schema_validation_only' };
function prisma(args) {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), ...args], { cwd: output, env, encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || result.stdout || 'Prisma failed');
  return result.stdout;
}
console.log(prisma(['validate', '--schema', schema]));
const sql = prisma(['migrate', 'diff', '--from-schema-datamodel', production, '--to-schema-datamodel', schema, '--script']);
const constraints = fs.readFileSync(path.join(root, 'prisma/proposals/irrigation-constraints.sql'), 'utf8');
if (/DROP\s+(TABLE|COLUMN|TYPE|INDEX|CONSTRAINT)|TRUNCATE|DELETE\s+FROM/i.test(sql)) throw Error('Unexpected destructive diff');
fs.writeFileSync(path.join(output, 'migration-proposal.sql'), '-- GENERATED OFFLINE, NOT APPLIED\n' + sql + '\n' + constraints);
if (sha(fs.readFileSync(production, 'utf8')) !== sha(original)) throw Error('Production schema changed unexpectedly');
console.log(JSON.stringify({ productionSchemaUnchanged: true, productionSchemaSha256: sha(original), generatedSchema: schema, sqlProposal: path.join(output, 'migration-proposal.sql'), databaseConnected: false, migrationApplied: false }));
