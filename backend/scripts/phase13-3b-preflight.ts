// Read-only production inventory for Phase 13.3B A; never creates a test target.
import { env } from "../src/config/env";
import { prisma } from "../src/config/database";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  const migrationsPath = resolve(__dirname, "../prisma/migrations");
  const local = readdirSync(migrationsPath, { withFileTypes: true }).filter(row => row.isDirectory()).map(row => {
    const sql = readFileSync(resolve(migrationsPath, row.name, "migration.sql"));
    return { name: row.name, checksum: createHash("sha256").update(sql).digest("hex") };
  });
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const identity = await tx.$queryRaw`SELECT current_database() AS database, current_user AS role,
      inet_server_addr()::text AS server_address, inet_server_port() AS server_port,
      current_schema() AS schema, current_setting('server_version') AS server_version,
      current_setting('transaction_read_only') AS transaction_read_only,
      pg_postmaster_start_time()::text AS server_started_at`;
    const rolePrivileges = await tx.$queryRaw`SELECT rolsuper, rolcreatedb, rolcreaterole
      FROM pg_roles WHERE rolname = current_user`;
    const applied = await tx.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
    const targets = await tx.$queryRaw`SELECT
      EXISTS(SELECT 1 FROM pg_database WHERE datname = 'smart_agriculture_test_phase13_3b') AS proposed_database_exists_on_production_server,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'phase13_test_app') AS proposed_role_exists_on_production_server`;
    const proposalTables = await tx.$queryRaw`SELECT tablename FROM pg_tables
      WHERE schemaname = current_schema() AND tablename IN ('irrigation_cycles', 'irrigation_decision_logs',
      'irrigation_daily_budgets', 'irrigation_budget_reservations', 'irrigation_command_intents', 'irrigation_safety_states')`;
    const commands = { pending: await tx.deviceCommand.count({ where: { status: "PENDING" } }) };
    return { identity, rolePrivileges, targets, proposalTables, commands,
      migrationCount: applied.length,
      pendingMigrations: local.filter(row => !applied.some(db => db.migration_name === row.name && db.finished_at && !db.rolled_back_at)).map(row => row.name),
      checksumMismatches: local.filter(row => applied.some(db => db.migration_name === row.name && db.finished_at && !db.rolled_back_at && db.checksum !== row.checksum)).map(row => row.name),
      unfinishedMigrations: applied.filter(row => !row.finished_at && !row.rolled_back_at).map(row => row.migration_name),
      latestMigration: applied.at(-1)?.migration_name };
  });
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(),
    configuredEndpoint: { host: url.hostname, port: url.port || "5432", database: decodeURIComponent(url.pathname.slice(1)), schema: url.searchParams.get("schema") || "public" },
    safeConfiguration: { commandsEnabled: env.mqttCommandsEnabled, automationEnabled: env.mqttAutomationCommandsEnabled, testMode: env.mqttPumpTestMode },
    ...result, testDatabaseCreatedByThisDiagnostic: false, ddlExecutedByThisDiagnostic: false }, null, 2));
}
main().catch(() => { console.error("PREFLIGHT_READ_ONLY_FAILED: details omitted to avoid exposing credentials"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
