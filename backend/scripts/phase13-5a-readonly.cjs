// Separate production SELECT diagnostic. Never imported by repository/tests.
// No gateway, server, migrations, authentication writes or command API calls.
const fs = require('node:fs'), path = require('node:path');
const values = require('dotenv').parse(fs.readFileSync(path.resolve(__dirname, '../.env')));
const { PrismaClient } = require('@prisma/client');
async function main() {
  const target = new URL(values.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || (target.port || '5432') !== '5432' || target.pathname !== '/smart_agriculture') throw Error('READ_TARGET_REFUSED');
  const client = new PrismaClient({ datasources: { db: { url: values.DATABASE_URL } } });
  try {
    const result = await client.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [identity] = await tx.$queryRaw`SELECT current_database() AS database, current_schema() AS schema, inet_server_port() AS port`;
      if (identity.database !== 'smart_agriculture' || identity.schema !== 'public' || identity.port !== 5432) throw Error('READ_TARGET_REFUSED');
      return { identity, pending: await tx.deviceCommand.count({ where: { status: 'PENDING' } }),
        device: await tx.device.findUnique({ where: { deviceCode: 'ESP32-GF-A-01' }, select: { connectionStatus: true, lastSeenAt: true,
          actuators: { where: { actuatorCode: 'PUMP_01' }, select: { actuatorCode: true, currentState: true, lastStateChangedAt: true } } } }) };
    });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...result,
      configOnlyNotRuntime: { commands: values.MQTT_COMMANDS_ENABLED === 'true', automation: values.MQTT_AUTOMATION_COMMANDS_ENABLED === 'true',
        pumpTestMode: (values.MQTT_PUMP_TEST_MODE ?? 'true') === 'true', flagsMissingUseSourceDefaults: ['MQTT_COMMANDS_ENABLED', 'MQTT_AUTOMATION_COMMANDS_ENABLED', 'MQTT_PUMP_TEST_MODE'].filter(k => values[k] === undefined) },
      runtimeFlags: 'NOT_VERIFIED_WITHOUT_RUNNING_API', adapterPower: 'USER_CONTROLLED_NOT_MEASURED' }, null, 2));
  } finally { await client.$disconnect(); }
}
main().catch(() => { console.error('READ_ONLY_CHECK_FAILED_NO_SECRET_DETAILS'); process.exitCode = 1; });
