// Production diagnostics only; no gateway/server/test repository imports.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const root = path.resolve(__dirname, '../..');
const values = require('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
const output = path.join(root, 'report/phase13-5a1-runtime-' + (process.argv[2] === '--after' ? 'after' : 'before') + '.json');
async function main() {
  const url = new URL(values.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || (url.port || '5432') !== '5432' || url.pathname !== '/smart_agriculture') throw Error('PRODUCTION_READ_TARGET_MISMATCH');
  const db = new PrismaClient({ datasourceUrl: values.DATABASE_URL });
  let result;
  try {
    result = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [identity] = await tx.$queryRawUnsafe("SELECT current_database() AS db, current_schema() AS schema, inet_server_port() AS port, pg_postmaster_start_time()::text AS started, current_setting('data_directory') AS data, (SELECT system_identifier::text FROM pg_control_system()) AS system_id");
      if (identity.db !== 'smart_agriculture' || identity.schema !== 'public' || identity.port !== 5432) throw Error('PRODUCTION_READ_TARGET_MISMATCH');
      const device = await tx.device.findUnique({ where: { deviceCode: 'ESP32-GF-A-01' }, select: { connectionStatus: true, lastSeenAt: true,
        actuators: { select: { actuatorCode: true, currentState: true, lastStateChangedAt: true } },
        sensors: { select: { sensorCode: true, readings: { where: { source: 'MQTT' }, orderBy: { recordedAt: 'desc' }, take: 1,
          select: { id: true, value: true, source: true, recordedAt: true, receivedAt: true } } } } } });
      return { identity, device, pending: await tx.deviceCommand.count({ where: { status: 'PENDING' } }), commandCount: await tx.deviceCommand.count(),
        sensorReadingCount: await tx.sensorReading.count(), automationRuleCount: await tx.automationRule.count(),
        userSerialCorrelation: { frame: 871, recordedAt: '2026-10-21T18:03:18.345Z',
          matchingMqttRows: await tx.sensorReading.count({ where: { source: 'MQTT', recordedAt: new Date('2026-10-21T18:03:18.345Z'),
            sensor: { device: { deviceCode: 'ESP32-GF-A-01' }, sensorCode: { in: ['TEMP_01','HUM_01','SOIL_01','LIGHT_01'] } } } }) } };
    });
  } finally { await db.$disconnect(); }
  const logs = ['build/phase13-4a/backend-final.err.log', 'build/phase13-4a/backend-final.out.log', 'build/phase13-3c/backend.err.log'].filter(p => fs.existsSync(path.join(root, p))).map(p => {
    const file = path.join(root, p), text = fs.readFileSync(file, 'utf8');
    // Summarize known signatures only; never emit arbitrary error/config lines.
    return { path: p, modifiedAt: fs.statSync(file).mtime.toISOString(), bytes: fs.statSync(file).size,
      refusedEndpoints: [...new Set((text.match(/ECONNREFUSED\s+(?:\d{1,3}\.){3}\d{1,3}:\d+/g) || []))],
      signatures: ['ECONNREFUSED', 'EADDRINUSE', 'SIGINT', 'SIGTERM', 'P2022', 'P1001', 'Database: connected', 'MQTT connected', 'MQTT disconnected', 'Terminate batch job', 'Graceful shutdown']
        .filter(s => text.includes(s)), errorClassNames: [...new Set(text.match(/\b(?:PrismaClientKnownRequestError|PrismaClientInitializationError|TypeError|SyntaxError|ReferenceError)\b/g) || [])] };
  });
  let testControl;
  const raw = execFileSync('C:\\Program Files\\PostgreSQL\\17\\bin\\pg_controldata.exe', ['C:\\DATN\\test-instances\\phase13-3b\\data'], { encoding: 'utf8', windowsHide: true });
  testControl = { systemId: raw.match(/Database system identifier:\s*(\d+)/)?.[1], state: raw.match(/Database cluster state:\s*([^\r\n]+)/)?.[1].trim() };
  if (!testControl.systemId || testControl.systemId === result.identity.system_id || path.resolve(result.identity.data).toLowerCase() === 'c:\\datn\\test-instances\\phase13-3b\\data') throw Error('TEST_PRODUCTION_IDENTITY_NOT_DISTINCT');
  const evidence = { checkedAt: new Date().toISOString(), ...result, testControl, systemIdentifiersDistinct: true, logs,
    runtimeFlags: 'NOT_VERIFIED_WITHOUT_RUNNING_API', configuredDefaultsOnly: { commands: values.MQTT_COMMANDS_ENABLED === 'true', automation: values.MQTT_AUTOMATION_COMMANDS_ENABLED === 'true', testMode: (values.MQTT_PUMP_TEST_MODE ?? 'true') === 'true' } };
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ evidence: output, ...evidence }, null, 2));
}
main().catch(e => { console.error(JSON.stringify({ status: 'STOP', code: e.code, reason: /^[A-Z_]+$/.test(e.message) ? e.message : 'READ_ONLY_DIAGNOSTIC_FAILED_REDACTED' })); process.exitCode = 1; });
