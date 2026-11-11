const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const ctx = require('./phase13-3b-test-context.cjs');
const backend = path.resolve(__dirname, '..'), workspace = path.resolve(backend, '..');
async function main() {
  if (process.argv[2] !== '--approved-phase13-3b') throw Error('APPROVAL_REQUIRED');
  const admin = new PrismaClient({ datasourceUrl: ctx.testUrl('admin', 'public', 'postgres') });
  const owner = new PrismaClient({ datasourceUrl: ctx.testUrl('migrator') });
  try {
    const identity = await ctx.verify(owner, 'phase13_test_migrator', ctx.database, ctx.schema, admin);
    const [state] = await owner.$queryRawUnsafe(`SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='${ctx.schema}'`);
    const generateOnly = process.argv.includes('--generate-only-after-committed-migration');
    if (state.tables !== 0 && !generateOnly) throw Error('NONEMPTY_TEST_SCHEMA_STOP_NO_RESET');
    if (generateOnly && state.tables !== 20) throw Error('TEST_CATALOG_COUNT_MISMATCH');
    const base = path.join(backend, 'prisma/migrations');
    const files = fs.readdirSync(base, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => path.join(base, x.name, 'migration.sql')).sort();
    if (files.length !== 11) throw Error('BASE_MIGRATION_COUNT_CHANGED');
    files.push(path.join(workspace, 'build/phase13-3a-schema/migration-proposal.sql'));
    const evidence = [];
    if (!generateOnly) await owner.$transaction(async tx => {
      for (const file of files) {
        const sql = fs.readFileSync(file, 'utf8');
        // Reviewed project DDL has no dollar-quoted blocks/semicolon literals.
        if (/\$\$|CREATE\s+(DATABASE|ROLE)|DROP\s+DATABASE|\\connect/i.test(sql)) throw Error('UNREVIEWED_SQL_STOP');
        const statements = sql.replace(/--[^\r\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
        for (const statement of statements) {
          await ctx.verify(tx, 'phase13_test_migrator', ctx.database, ctx.schema, admin);
          await tx.$executeRawUnsafe(statement);
        }
        evidence.push({ file: path.relative(workspace, file), sha256: crypto.createHash('sha256').update(sql).digest('hex'), statements: statements.length });
      }
      // Least privilege: app cannot own/modify schema, base data, or audit history.
      const grants = [
        `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
        `GRANT USAGE ON SCHEMA ${ctx.schema} TO phase13_test_app`,
        `GRANT SELECT ON ALL TABLES IN SCHEMA ${ctx.schema} TO phase13_test_app`,
        `GRANT INSERT, UPDATE ON ${['irrigation_cycles', 'irrigation_daily_budgets', 'irrigation_budget_reservations', 'irrigation_command_intents', 'irrigation_safety_states'].map(t => `${ctx.schema}.${t}`).join(',')} TO phase13_test_app`,
        `GRANT INSERT ON ${ctx.schema}.irrigation_decision_logs TO phase13_test_app`,
      ];
      // public is within the TEST database only. Never production.
      for (const sql of grants) { await ctx.verify(tx, 'phase13_test_migrator', ctx.database, ctx.schema, admin); await tx.$executeRawUnsafe(sql); }
    }, { timeout: 120000 });
    const output = path.join(workspace, 'build/phase13-3b-client');
    const original = fs.readFileSync(path.join(workspace, 'build/phase13-3a-schema/schema.prisma'), 'utf8');
    const generated = original.replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${output.replaceAll('\\', '/')}"`);
    fs.mkdirSync(path.join(backend, 'build'), { recursive: true });
    const schemaFile = path.join(backend, 'build/phase13-3b-test.prisma'); fs.writeFileSync(schemaFile, generated);
    const r = spawnSync(process.execPath, [path.join(backend, 'node_modules/prisma/build/index.js'), 'generate', '--schema', schemaFile], { cwd: backend, env: { ...process.env, PRISMA_GENERATE_SKIP_AUTOINSTALL: '1', DATABASE_URL: ctx.testUrl('app') }, encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) throw Error('TEST_CLIENT_GENERATE_FAILED_REDACTED');
    const catalogs = await owner.$queryRawUnsafe(`SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='${ctx.schema}'`);
    const hashes = files.map(file => ({ file: path.relative(workspace, file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
    fs.writeFileSync(path.join(ctx.root, 'migration-evidence.json'), JSON.stringify({ at: new Date().toISOString(), identity, files: generateOnly ? hashes : evidence, catalogs, generationRetriedWithoutMigration: generateOnly, testClientOutput: output, productionMigrationApplied: false }, null, 2));
    console.log(JSON.stringify({ migrationTestPass: true, baseMigrations: 11, proposalApplied: true, identity, catalogs, testClientOutput: output }));
  } finally { await owner.$disconnect(); await admin.$disconnect(); }
}
main().catch(e => { console.error(JSON.stringify({ status: 'STOP', code: e.code, reason: /^[A-Z_]+$/.test(e.message) ? e.message : 'TEST_MIGRATION_FAILED_DETAILS_REDACTED' })); process.exitCode = 1; });
