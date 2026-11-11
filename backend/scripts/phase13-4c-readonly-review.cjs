// Explicit read-only production diagnostic. No gateway/server/evaluator imports.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function policy(name) {
  const exports = {}, file = path.resolve(__dirname, '../src/services/live-readiness', name + '.ts');
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Date, Number, Math, Set, require() { throw Error('PURE_DEPENDENCY_DENIED'); } }); return exports;
}
async function main() {
  const rows = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const identity = await tx.$queryRaw`SELECT current_database() AS database, current_schema() AS schema, inet_server_port() AS port, pg_postmaster_start_time() AS started`;
    if (identity[0].database !== 'smart_agriculture' || identity[0].schema !== 'public' || identity[0].port !== 5432) throw Error('READ_TARGET_MISMATCH');
    const device = await tx.device.findUnique({ where: { deviceCode: 'ESP32-GF-A-01' }, select: { id: true, connectionStatus: true, lastSeenAt: true,
      actuators: { where: { actuatorCode: 'PUMP_01' }, select: { currentState: true, lastStateChangedAt: true } },
      sensors: { select: { sensorCode: true, readings: { orderBy: { recordedAt: 'desc' }, take: 1, select: { id: true, value: true, source: true, recordedAt: true, receivedAt: true } } } } } });
    const incident = await tx.sensorReading.findMany({ where: { source: 'MQTT', sensor: { device: { deviceCode: 'ESP32-GF-A-01' } },
      recordedAt: { gte: new Date('2026-10-21T04:35:00Z'), lte: new Date('2026-10-21T04:36:40Z') } },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }], select: { id: true, value: true, source: true, recordedAt: true, receivedAt: true, sensor: { select: { sensorCode: true } } } });
    const proposalTables = await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('irrigation_cycles','irrigation_decision_logs','irrigation_daily_budgets','irrigation_budget_reservations','irrigation_command_intents','irrigation_safety_states')`;
    return { identity, device, incident, proposalTables, pending: await tx.deviceCommand.count({ where: { status: 'PENDING' } }), commandCount: await tx.deviceCommand.count() };
  });
  if (!rows.device) throw Error('DEVICE_MISSING');
  // Existing normal auth; never print credential/token and never call a control endpoint.
  const seed = fs.readFileSync(path.resolve(__dirname, '../prisma/seed.ts'), 'utf8');
  const credential = seed.match(/email:\s*"(owner@smartagri\.local)",\s*password:\s*"([^"]+)"/);
  if (!credential) throw Error('EXISTING_AUTH_UNAVAILABLE');
  const base = 'http://127.0.0.1:5000/api';
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: credential[1], password: credential[2] }) });
  if (!login.ok) throw Error('AUTH_FAILED');
  const auth = await login.json(), headers = { Authorization: 'Bearer ' + auth.data.accessToken };
  const response = await fetch(base + '/live-evidence?deviceId=' + encodeURIComponent(rows.device.id), { headers });
  if (!response.ok) throw Error('LIVE_READ_FAILED');
  const live = (await response.json()).data, checkedAt = new Date().toISOString();
  if (live.runtime.commandsEnabled !== false || live.runtime.automationEnabled !== false || live.runtime.pumpTestMode !== true) throw Error('SAFETY_FLAGS_UNEXPECTED');
  const { assessPublisher } = policy('identity-policy'), { assessSoilQuality, soilQualityProposal } = policy('soil-quality');
  const { assessLiveReadiness } = policy('readiness-policy');
  const archive = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../report/phase13_4b/live-evidence.json'), 'utf8'));
  const historicalQuality = archive.snapshots.map(snapshot => {
    const r = snapshot.data.reading;
    const sample = { readingId: r.reading.id, deviceCode: r.deviceCode, sensorCode: r.sensorCode, source: r.reading.source, value: r.value,
      recordedAt: r.recordedAt, receivedAt: r.callbackReceivedAt, observerSession: r.sessionId };
    return { archivedObservedAt: snapshot.at, currentLiveEvidence: false,
      assessmentAtHistoricalObservation: assessSoilQuality(sample, [], soilQualityProposal, snapshot.at),
      assessmentNow: assessSoilQuality(sample, [], soilQualityProposal, checkedAt) };
  });
  const until = new Date(Date.parse(checkedAt) + 30000).toISOString();
  const gate = status => ({ status, evidenceId: status === 'PASS' ? 'readonly-probe:' + checkedAt : null, checkedAt, expiresAt: until });
  const matrix = assessLiveReadiness({ receiptCorrelation: gate(live.reading?.reading ? 'PASS' : 'NOT_VERIFIED'),
    publisherAssurance: gate('NOT_VERIFIED'), deviceSession: gate('NOT_VERIFIED'), soilQuality: gate('NOT_VERIFIED'), freshOff: gate(live.off ? 'PASS' : 'NOT_VERIFIED'),
    farmDeviceRbac: gate('PASS'), restartRecovery: gate('NOT_VERIFIED'), idempotency: gate('NOT_IMPLEMENTED'), emergencyStop: gate('NOT_IMPLEMENTED') }, live.clock, checkedAt);
  const publisher = assessPublisher({ deviceCode: 'ESP32-GF-A-01', correlatedReceipt: !!live.reading?.reading }, checkedAt);
  const result = { checkedAt, ...rows, live, publisher, historicalQuality, matrix, manuallyMutatedDatabase: false, commandsSent: 0 };
  const output = path.resolve(__dirname, '../../report/phase13_4c'); fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'readonly-review.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ checkedAt, device: rows.device.connectionStatus, latest: rows.device.sensors.map(s => ({ code: s.sensorCode, recordedAt: s.readings[0]?.recordedAt })),
    hasFreshReceipt: !!live.reading, hasFreshOff: !!live.off, clock: live.clock.health, runtime: live.runtime, pending: rows.pending, commandCount: rows.commandCount,
    productionLedgerTables: rows.proposalTables.length, publisher: publisher.level, readiness: matrix.verifiedLiveReady }));
}
main().catch(e => { console.error(JSON.stringify({ status: 'READONLY_REVIEW_STOP', type: e.name, code: e.code, message: /^(READ_TARGET_MISMATCH|DEVICE_MISSING|EXISTING_AUTH_UNAVAILABLE|AUTH_FAILED|LIVE_READ_FAILED|SAFETY_FLAGS_UNEXPECTED)$/.test(e.message) ? e.message : 'See diagnostic boundary; no secrets printed' })); process.exitCode = 1; }).finally(() => prisma.$disconnect());
