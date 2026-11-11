export interface TestDatabaseGate {
  approved: boolean;
  testUrl: string;
  productionUrl: string;
  expectedDatabase: string;
  expectedSchema: string;
}

/** Pure preflight only; does not connect, create databases or execute migrations. */
export function assertIsolatedTestDatabase(gate: TestDatabaseGate) {
  if (!gate.approved) throw new Error("SEPARATE_TEST_DATABASE_APPROVAL_REQUIRED");
  let test: URL, production: URL;
  try { test = new URL(gate.testUrl); production = new URL(gate.productionUrl); } catch { throw new Error("INVALID_DATABASE_ENDPOINT"); }
  const database = decodeURIComponent(test.pathname.slice(1));
  const productionDatabase = decodeURIComponent(production.pathname.slice(1));
  if (!["postgresql:", "postgres:"].includes(test.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(test.hostname) ||
      !/^smart_agriculture_test_[a-z0-9_]+$/.test(gate.expectedDatabase) || database !== gate.expectedDatabase ||
      !/^phase13_test_[a-z0-9_]+$/.test(gate.expectedSchema) || test.searchParams.get("schema") !== gate.expectedSchema ||
      database === productionDatabase || !/^phase13_test_[a-z0-9_]+$/.test(decodeURIComponent(test.username)) || !test.password ||
      (test.username === production.username && test.password === production.password)) throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
  for (const key of test.searchParams.keys()) if (key !== "schema") throw new Error("UNAPPROVED_CONNECTION_OPTION");
  if (test.hash) throw new Error("UNAPPROVED_CONNECTION_OPTION");
  return { host: test.hostname, port: test.port || "5432", database, schema: gate.expectedSchema, productionMigrationAllowed: false as const };
}
