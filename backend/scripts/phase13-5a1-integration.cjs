// Approved synthetic PostgreSQL integration. NEVER imports application env/server/gateway.
require('tsx/cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { fork } = require('node:child_process');
const { PrismaClient } = require('../../build/phase13-3b-client');
const ctx = require('./phase13-3b-test-context.cjs');
const { PostgresTestIrrigationRepository } = require('../src/services/irrigation-persistence/postgres-test.repository.ts');
const { IrrigationPersistenceFoundation: Foundation } = require('../src/services/irrigation-persistence/foundation.ts');
const { assertIsolatedTestDatabase } = require('../src/services/irrigation-persistence/test-database-guard.ts');
const template = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/shadow-irrigation.json'), 'utf8')).snapshot;
const app = () => {
  const url = new URL(ctx.testUrl('app')); url.searchParams.delete('connection_limit');
  assertIsolatedTestDatabase({ approved: true, testUrl: url.href, productionUrl: 'postgresql://forbidden:UNUSED@localhost:5432/smart_agriculture', expectedDatabase: ctx.database, expectedSchema: ctx.schema });
  if (url.hostname !== '127.0.0.1' || url.port !== '55433' || url.username !== 'phase13_test_app') throw Error('APPROVED_ENDPOINT_MISMATCH');
  return new PrismaClient({ datasourceUrl: ctx.testUrl('app') });
};
const proof = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../report/phase13-5a1-sql-identity.json'), 'utf8')).identity.started;
const repo = c => new PostgresTestIrrigationRepository(c, proof);
const nap = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
async function worker() {
  const file = path.resolve(process.argv[3]);
  if (path.dirname(file) !== path.join(ctx.root, 'fixtures')) throw Error('WORKER_FIXTURE_PATH_DENIED');
  const request = JSON.parse(fs.readFileSync(file, 'utf8')), client = app(), r = repo(client), service = new Foundation(r);
  const action = process.argv[4];
  if (action === 'inspect') {
    const state = await r.transaction(request.actuatorId, async tx => ({ safety: await tx.lockActuator(request.actuatorId), cycle: await tx.getCycle(request.cycleId), intents: await tx.openIntents(request.actuatorId) }));
    process.send({ result: state, pid: process.pid }); await client.$disconnect();
  } else if (action === 'cancel') {
    const result = await service.cancelUnclaimed(request.actuatorId, request.intentId, new Date(Date.parse(request.snapshot.now)+1000).toISOString(), request.correlationId);
    process.send({ result, pid: process.pid }); await client.$disconnect();
  } else if (action === 'emergency') {
    const result = await service.inhibit(request.actuatorId, request.cycleId, request.snapshot.now, { kind: 'EMERGENCY_STOP' });
    process.send({ result, pid: process.pid }); await client.$disconnect();
  } else if (action === 'crash-before-commit') {
    await r.transaction(request.actuatorId, async tx => {
      const safety = await tx.lockActuator(request.actuatorId);
      await tx.saveSafety({ ...safety, version: safety.version + 1, faultLatched: true, faultReason: 'UNCOMMITTED_TEST' }, safety.version);
      process.send({ readyToKill: true, pid: process.pid });
      await new Promise(() => {});
    });
  } else {
    const result = await service.reserve(request);
    if (['crash-claimed','crash-published','crash-acked'].includes(action) && result.kind === 'RESERVED') {
      const i = result.intent, start = Date.parse(request.snapshot.now);
      await service.recordLifecycle(request.actuatorId, i.id, 'DISPATCH_CLAIMED', new Date(start + 100).toISOString(), i.correlationId);
      if (action !== 'crash-claimed') await service.recordLifecycle(request.actuatorId, i.id, 'PUBLISHED', new Date(start + 200).toISOString(), i.correlationId);
      if (action === 'crash-acked') await service.recordLifecycle(request.actuatorId, i.id, 'ACK_APPLIED', new Date(start + 300).toISOString(), i.correlationId);
    }
    if (action.startsWith('crash-')) { process.send({ readyToKill: true, result, pid: process.pid }); await new Promise(() => {}); }
    process.send({ result, pid: process.pid }); await client.$disconnect();
  }
}
function child(request, action = 'reserve') {
  fs.mkdirSync(path.join(ctx.root, 'fixtures'), { recursive: true });
  const file = path.join(ctx.root, 'fixtures', randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(request));
  return new Promise((resolve, reject) => {
    const p = fork(__filename, ['--worker', file, action], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { ...process.env, DATABASE_URL: '', MQTT_COMMANDS_ENABLED: 'false', MQTT_AUTOMATION_COMMANDS_ENABLED: 'false', MQTT_PUMP_TEST_MODE: 'true' } });
    let message; const timeout = setTimeout(() => { p.kill(); reject(Error('WORKER_TIMEOUT')); }, 20000);
    p.on('message', data => { message = data; if (data.readyToKill) p.kill(); });
    p.on('error', reject);
    p.on('exit', code => { clearTimeout(timeout); if (!message || (code !== 0 && !message.readyToKill)) reject(Error('WORKER_FAILED')); else resolve(message); });
  });
}
async function main() {
  if (process.argv[2] !== '--approved-phase13-5a1') throw Error('APPROVAL_REQUIRED');
  const admin = new PrismaClient({ datasourceUrl: ctx.testUrl('admin', 'public', 'postgres') });
  const owner = new PrismaClient({ datasourceUrl: ctx.testUrl('migrator') });
  const c1 = app(), c2 = app();
  const start = new Date().toISOString();
  let caseIndex = 0;
  try {
    const previousResults = path.join(ctx.root, 'phase13-5a1-integration-results.json');
    if (fs.existsSync(previousResults)) fs.copyFileSync(previousResults, path.join(ctx.root, 'phase13-5a1-integration-attempt-' + Date.now() + '.json'));
    const identity = await ctx.verify(owner, 'phase13_test_migrator', ctx.database, ctx.schema, admin);
    await ctx.verify(c1, 'phase13_test_app'); await ctx.verify(c2, 'phase13_test_app');
    assert.equal(identity.started, proof);
    const [role] = await c1.$queryRawUnsafe('SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user');
    assert.deepEqual(role, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
    const prefix = randomUUID();
    const user = await owner.user.create({ data: { fullName: 'SYNTHETIC PG TEST ONLY', email: `${prefix}@phase13.invalid`, passwordHash: 'NOT_A_LOGIN_HASH', role: 'FARM_OWNER' } });
    const farm = await owner.farm.create({ data: { ownerId: user.id, name: 'SYNTHETIC' } });
    const zone = await owner.zone.create({ data: { farmId: farm.id, name: 'SYNTHETIC' } });
    // Fixed engine target is synthetic here; no connection to physical device/MQTT.
    const device = await owner.device.upsert({ where: { deviceCode: 'ESP32-GF-A-01' }, update: {}, create: { zoneId: zone.id, deviceCode: 'ESP32-GF-A-01', name: 'SYNTHETIC ONLY', type: 'CONTROLLER' } });
    const actuator = await owner.actuator.upsert({ where: { deviceId_actuatorCode: { deviceId: device.id, actuatorCode: 'PUMP_01' } }, update: {}, create: { deviceId: device.id, actuatorCode: 'PUMP_01', name: 'SYNTHETIC ONLY', type: 'PUMP' } });
    const priorDay = (await owner.irrigationDailyBudget.aggregate({ _max: { localDay: true } }))._max.localDay;
    const runBase = Math.max(Date.parse('2026-11-01T12:00:00Z'), priorDay ? priorDay.getTime() + 2 * 86400000 + 12 * 3600000 : 0);
    async function fresh() {
      // Case isolation by archiving rows, never DELETE/TRUNCATE/reset. Original
      // pre-archive state is preserved in per-test evidence, not operational recovery.
      const previous = await owner.commandIntent.findMany({ where: { actuatorId: actuator.id, status: { in: ['RESERVED','DISPATCH_CLAIMED','PUBLISHED','ACKED','UNCERTAIN'] } } });
      for (const i of previous) await owner.commandIntent.update({ where: { id: i.id }, data: { status: 'CANCELLED', reason: `SYNTHETIC_CASE_ARCHIVE_PREVIOUS_${i.status}` } });
      await owner.irrigationCycle.updateMany({ where: { actuatorId: actuator.id, closedAt: null }, data: { closedAt: new Date() } });
      const s = structuredClone(template), base = runBase + caseIndex++ * 2 * 86400000;
      const at = new Date(base).toISOString();
      s.now = at; s.device.sessionId = 'session-' + randomUUID(); s.cycle.id = randomUUID(); s.cycle.sessionId = s.device.sessionId;
      s.device.sessionStartedAt = new Date(base - 3600000).toISOString(); refresh(s, at);
      await owner.irrigationCycle.create({ data: { id: s.cycle.id, actuatorId: actuator.id, deviceId: device.id, policyKey: s.rule.id, policyVersion: s.rule.version,
        policySnapshot: { rule: s.rule, cycleTrusted: true }, mode: 'SHADOW', phase: 'IDLE', sessionGeneration: s.device.sessionId, sessionStartedAt: new Date(s.device.sessionStartedAt) } });
      const safety = { deviceId: device.id, version: 0, mode: 'SHADOW', faultLatched: false, faultReason: null, emergencyStop: false, reportedState: 'OFF',
        sessionGeneration: s.device.sessionId, lastConfirmedOffAt: null, cooldownUntil: null, manualOverrideUntil: null, lastAcceptedServerTime: null, budgetDayHighWater: null };
      await owner.irrigationSafetyState.upsert({ where: { actuatorId_mode: { actuatorId: actuator.id, mode: 'SHADOW' } }, create: { actuatorId: actuator.id, ...safety }, update: safety });
      return { actuatorId: actuator.id, cycleId: s.cycle.id, idempotencyKey: randomUUID(), source: 'FIXTURE', snapshot: s };
    }
    function refresh(s, at) {
      const n = Date.parse(at); s.now = at; s.clock.checkedAt = at; s.device.lastSeenAt = at;
      s.reading.readingId = randomUUID(); s.reading.recordedAt = new Date(n - 100).toISOString(); s.reading.receivedAt = at;
      s.actuator.off.sessionId = s.device.sessionId; s.actuator.off.recordedAt = new Date(n - 50).toISOString(); s.actuator.off.receivedAt = at;
    }
    const service = c => new Foundation(repo(c));
    const safety = () => owner.irrigationSafetyState.findUnique({ where: { actuatorId_mode: { actuatorId: actuator.id, mode: 'SHADOW' } } });
    async function ledger(request) {
      return { safety: await safety(), cycle: await owner.irrigationCycle.findUnique({ where: { id: request.cycleId } }),
        intents: await owner.commandIntent.findMany({ where: { cycleId: request.cycleId } }), reservations: await owner.irrigationBudgetReservation.findMany({ where: { cycleId: request.cycleId } }),
        budgets: await owner.irrigationDailyBudget.findMany({ where: { actuatorId: actuator.id, localDay: new Date(request.snapshot.now.slice(0, 10) + 'T00:00:00Z') } }),
        audits: await owner.irrigationDecisionLog.findMany({ where: { cycleId: request.cycleId } }) };
    }
    async function test(name, run) {
      const request = await fresh();
      try { const details = await run(request); const evidence = await ledger(request); results.push({ name, status: 'PASS', details, evidence }); console.log('PASS ' + name); }
      catch (e) { results.push({ name, status: 'FAIL', code: e.code, reason: e.name }); console.log('FAIL ' + name + ' [' + (e.code || e.name) + ']'); throw e; }
      finally { fs.writeFileSync(path.join(ctx.root, 'phase13-5a1-integration-results.json'), JSON.stringify({ start, checkedAt: new Date().toISOString(), identity, appRole: role, results }, null, 2)); }
    }
    await test('atomic reservation + real same-key replay + mismatch', async r => {
      const a = await service(c1).reserve(r), b = await service(c2).reserve(r);
      assert.equal(a.kind, 'RESERVED'); assert.equal(b.kind, 'REPLAY'); assert.equal(a.intent.id, b.intent.id);
      const changed = structuredClone(r); changed.snapshot.reading.value++;
      assert.equal((await service(c1).reserve(changed)).reason, 'IDEMPOTENCY_KEY_REUSED');
      const d = await ledger(r); assert.equal(d.intents.length, 1); assert.equal(d.reservations.length, 1); assert.equal(d.audits.length, 1); assert.equal(d.budgets[0].reservedSeconds, 1);
    });
    for (const operation of ['insertIntent', 'saveBudget', 'appendDecision']) await test('PG rollback on injected SQL failure: ' + operation, async r => {
      const real = repo(c1);
      const failing = { mode: 'SHADOW', environment: 'ISOLATED_TEST', transaction: (id, work) => real.transaction(id, tx => work(new Proxy(tx, { get(target, key) {
        if (key === operation) return async (row, version) => {
          if (operation === 'saveBudget') return target.saveBudget({ ...row, state: { ...row.state, reservedSeconds: 999 } }, version);
          if (operation === 'insertIntent') return target.insertIntent({ ...row, cycleId: 'missing-test-cycle' });
          return target.appendDecision({ ...row, cycleId: 'missing-test-cycle' });
        }; return target[key];
      } }))) };
      let sqlError;
      await assert.rejects(new Foundation(failing).reserve(r), e => {
        const budgetCheck = /23514|irrigation_budget_bounds/.test(e.message);
        sqlError = { code: e.code || e.name, sqlstate: e.meta?.code || (budgetCheck ? '23514' : undefined) };
        return ['P2003','P2004','P2010'].includes(e.code) || budgetCheck;
      });
      const d = await ledger(r); assert.equal(d.intents.length, 0); assert.equal(d.reservations.length, 0); assert.equal(d.budgets.length, 0); assert.equal(d.audits.length, 0); assert.equal(d.cycle.version, 0); assert.equal(d.safety.version, 0);
      return sqlError;
    });
    await test('two PG connections same-key concurrent reservation', async r => {
      const [a, b] = await Promise.all([service(c1).reserve(r), service(c2).reserve(r)]);
      assert.deepEqual([a.kind,b.kind].sort(), ['REPLAY','RESERVED']);
      return { intentId: a.intent.id, connections: 2 };
    });
    await test('two PG connections different-key same-actuator', async r => {
      const other = { ...r, idempotencyKey: randomUUID() };
      const out = await Promise.all([service(c1).reserve(r), service(c2).reserve(other)]);
      assert.equal(out.filter(x => x.kind === 'RESERVED').length, 1); assert.equal(out.find(x => x.kind === 'BLOCKED').reason, 'ACTUATOR_INTENT_OPEN');
    });
    await test('two independent processes same-key durable idempotency', async r => {
      const [a,b] = await Promise.all([child(r),child(r)]);
      assert.notEqual(a.pid,b.pid); assert.deepEqual([a.result.kind,b.result.kind].sort(),['REPLAY','RESERVED']);
      return { pids: [a.pid,b.pid], intentId: a.result.intent.id };
    });
    await test('two independent processes different-key prevent double reserve', async r => {
      const [a,b] = await Promise.all([child(r),child({ ...r,idempotencyKey: randomUUID() })]);
      assert.notEqual(a.pid,b.pid); assert.equal([a,b].filter(x=>x.result.kind==='RESERVED').length,1);
      return { pids:[a.pid,b.pid] };
    });
    await test('actual process kill before transaction commit rolls back', async r => {
      const w = await child(r,'crash-before-commit');
      await nap(200); const row = await safety(); assert.equal(row.version,0); assert.equal(row.faultLatched,false); return { killedPid:w.pid };
    });
    for (const stage of ['crash-after-commit','crash-claimed','crash-published','crash-acked']) await test('actual kill/restart recovery: ' + stage, async r => {
      const dead = await child(r,stage); const replay = await child(r);
      assert.notEqual(dead.pid,replay.pid); assert.equal(replay.result.kind,'REPLAY'); assert.equal(replay.result.intent.id,dead.result.intent.id);
      const recoveryClient = app();
      try { const f = service(recoveryClient); assert.equal(await f.recover(r.actuatorId,'restart-'+randomUUID(),new Date(Date.parse(r.snapshot.now)+1000).toISOString()),'RECOVERY_LOCKED'); }
      finally { await recoveryClient.$disconnect(); }
      const d = await ledger(r); assert.equal(d.intents[0].status,'UNCERTAIN'); assert.equal(d.reservations[0].status,'UNCERTAIN'); assert.equal(d.budgets[0].reservedSeconds,1); assert.equal(d.safety.reportedState,'UNKNOWN'); assert.equal(d.safety.faultLatched,true);
      assert.equal((await service(c1).reserve(r)).kind,'REPLAY');
      const nextProcess = await child(r,'inspect'); assert.equal(nextProcess.result.safety.faultLatched,true); assert.equal(nextProcess.result.safety.reportedState,'UNKNOWN'); assert.equal(nextProcess.result.cycle.state.trusted,false);
      assert.equal(await service(c1).acceptOff(r.actuatorId,d.intents[0].id,r.snapshot),'OFF_CONTEXT_UNTRUSTED');
      return { killedPid:dead.pid,restartedPid:replay.pid,inspectionPid:nextProcess.pid };
    });
    for (const event of ['ACK_TIMEOUT','PUBLISH_UNCERTAIN','BROKER_LOST','ACK_REJECTED']) await test('uncertainty/fault ledger + late/duplicate ACK: '+event, async r => {
      const f=service(c1), a=await f.reserve(r), i=a.intent, n=Date.parse(r.snapshot.now);
      await f.recordLifecycle(r.actuatorId,i.id,'DISPATCH_CLAIMED',new Date(n+100).toISOString(),i.correlationId);
      await f.recordLifecycle(r.actuatorId,i.id,'PUBLISHED',new Date(n+200).toISOString(),i.correlationId);
      await f.recordLifecycle(r.actuatorId,i.id,event,new Date(n+300).toISOString(),i.correlationId);
      assert.equal(await f.recordLifecycle(r.actuatorId,i.id,'ACK_APPLIED',new Date(n+400).toISOString(),i.correlationId),'TERMINAL_INTENT_NO_RETRY');
      assert.equal(await f.recordLifecycle(r.actuatorId,i.id,'ACK_APPLIED',new Date(n+500).toISOString(),i.correlationId),'TERMINAL_INTENT_NO_RETRY');
      const d=await ledger(r); assert.equal(d.reservations[0].status,'UNCERTAIN'); assert.equal(d.budgets[0].reservedSeconds,1); assert.equal(d.safety.faultLatched,true);
    });
    await test('ACK APPLIED + old OFF refused + fresh same-session OFF stores soak', async r => {
      const f=service(c1), a=await f.reserve(r), i=a.intent,n=Date.parse(r.snapshot.now);
      for (const [j,event] of ['DISPATCH_CLAIMED','PUBLISHED','ACK_APPLIED'].entries()) await f.recordLifecycle(r.actuatorId,i.id,event,new Date(n+100*(j+1)).toISOString(),i.correlationId);
      assert.equal(await f.acceptOff(r.actuatorId,i.id,r.snapshot),'FRESH_OFF_REQUIRED');
      const s=structuredClone(r.snapshot); refresh(s,new Date(n+2000).toISOString());
      const wrongSession=structuredClone(s);wrongSession.actuator.off.sessionId='previous-session';assert.equal(await f.acceptOff(r.actuatorId,i.id,wrongSession),'FRESH_OFF_REQUIRED');
      const retained=structuredClone(s);retained.actuator.off.retained=true;assert.equal(await f.acceptOff(r.actuatorId,i.id,retained),'FRESH_OFF_REQUIRED');
      assert.equal(await f.acceptOff(r.actuatorId,i.id,s),'SOAK');
      const d=await ledger(r); assert.equal(d.intents[0].status,'COMPLETED'); assert.equal(d.reservations[0].status,'CHARGED'); assert.ok(d.cycle.soakUntil); assert.ok(d.safety.cooldownUntil);
      assert.equal((await service(c2).reserve({...r,idempotencyKey:randomUUID(),snapshot:s})).reason,'PERSISTED_COOLDOWN');
    });
    await test('expired intent becomes uncertain, no refund', async r => {
      const f=service(c1),a=await f.reserve(r); assert.equal(await f.recordLifecycle(r.actuatorId,a.intent.id,'DISPATCH_CLAIMED',new Date(Date.parse(r.snapshot.now)+11000).toISOString(),a.intent.correlationId),'INTENT_EXPIRED');
      assert.equal((await ledger(r)).budgets[0].reservedRuns,1);
    });
    for (const [label,edit,reason] of [
      ['offline',s=>s.device.connectionStatus='OFFLINE','DEVICE_OFFLINE'],
      ['unknown relay',s=>s.actuator.state='UNKNOWN','ACTUATOR_UNKNOWN'],
      ['untrusted reading',s=>s.reading.mqtt.verified=false,'MQTT_UNTRUSTED'],
      ['old off',s=>s.actuator.off.recordedAt='2020-01-01T00:00:00Z','OFF_EVIDENCE_STALE'],
    ]) await test('guard: '+label,async r=>{edit(r.snapshot);const a=await service(c1).reserve(r);assert.notEqual(a.kind,'RESERVED');return {reason:a.reason, expectedGuard:reason};});
    for (const [name,data] of [
      ['manual override',{manualOverrideUntil:new Date('2099-01-01T00:00:00Z')}],['emergency stop',{emergencyStop:true}],
      ['fault latch',{faultLatched:true}],['persisted unknown',{reportedState:'UNKNOWN'}],['soak/cooldown',{cooldownUntil:new Date('2099-01-01T00:00:00Z')}],
    ]) await test('persisted safety: '+name,async r=>{
      await owner.irrigationSafetyState.update({where:{actuatorId_mode:{actuatorId:r.actuatorId,mode:'SHADOW'}},data});assert.notEqual((await service(c1).reserve(r)).kind,'RESERVED');
    });
    await test('quota persists and supplied snapshot cannot reset counters',async r=>{
      await owner.irrigationDailyBudget.create({data:{actuatorId:r.actuatorId,mode:'SHADOW',localDay:new Date(r.snapshot.now.slice(0,10)+'T00:00:00Z'),maxRuns:3,maxSeconds:3,reservedRuns:3,reservedSeconds:3}});
      assert.equal((await service(c1).reserve(r)).reason,'DAILY_RUN_LIMIT');
    });
    await test('clock rollback latches fault durably',async r=>{
      await owner.irrigationSafetyState.update({where:{actuatorId_mode:{actuatorId:r.actuatorId,mode:'SHADOW'}},data:{lastAcceptedServerTime:new Date(Date.parse(r.snapshot.now)+10000)}});
      assert.equal((await service(c1).reserve(r)).reason,'CLOCK_ROLLBACK');assert.equal((await safety()).faultLatched,true);
    });
    await test('day high-water blocks old day even if supplied clock says healthy',async r=>{
      await owner.irrigationSafetyState.update({where:{actuatorId_mode:{actuatorId:r.actuatorId,mode:'SHADOW'}},data:{budgetDayHighWater:new Date(Date.parse(r.snapshot.now)+86400000)}});
      assert.equal((await service(c1).reserve(r)).reason,'CLOCK_ROLLBACK');assert.equal((await safety()).faultLatched,true);
    });
    await test('midnight does not clear existing fault or manual override',async r=>{
      await owner.irrigationSafetyState.update({where:{actuatorId_mode:{actuatorId:r.actuatorId,mode:'SHADOW'}},data:{faultLatched:true,manualOverrideUntil:new Date('2099-01-01T00:00:00Z')}});
      refresh(r.snapshot,new Date(Date.parse(r.snapshot.now)+5*3600000).toISOString());assert.notEqual((await service(c1).reserve(r)).kind,'RESERVED');assert.equal((await safety()).faultLatched,true);
    });
    await test('midnight UTC+7 allocates new day but retains previous quota',async r=>{
      const n=Date.parse(r.snapshot.now), oldDay=r.snapshot.now.slice(0,10);
      await owner.irrigationDailyBudget.create({data:{actuatorId:r.actuatorId,mode:'SHADOW',localDay:new Date(oldDay+'T00:00:00Z'),maxRuns:3,maxSeconds:3,reservedRuns:2,reservedSeconds:2}});
      refresh(r.snapshot,new Date(n+5*3600000).toISOString());
      const out=await service(c1).reserve(r);assert.equal(out.kind,'RESERVED');
      const rows=await owner.irrigationDailyBudget.findMany({where:{actuatorId:r.actuatorId,localDay:{gte:new Date(oldDay+'T00:00:00Z'),lte:new Date(n+86400000)}}});
      assert.equal(rows.length,2);assert.equal(rows.find(x=>x.localDay.toISOString().startsWith(oldDay)).reservedSeconds,2);
    });
    await test('real CAS conflict rolls back',async r=>{
      await assert.rejects(repo(c1).transaction(r.actuatorId,async tx=>{const s=await tx.lockActuator(r.actuatorId);await tx.saveSafety({...s,version:s.version+2},s.version);}),/VERSION_CONFLICT/);assert.equal((await safety()).version,0);
    });
    await test('SQL FK/unique/partial-index/CHECK reject invalid writes',async r=>{
      const a=await service(c1).reserve(r),original=await owner.commandIntent.findUnique({where:{id:a.intent.id}});
      const clone={...original,id:randomUUID(),idempotencyKey:randomUUID(),correlationId:randomUUID(),pulseIndex:8};delete clone.deviceCommandId;
      await assert.rejects(c1.commandIntent.create({data:clone}),e=>e.code==='P2002'); // partial one-open
      await assert.rejects(c1.commandIntent.create({data:{...clone,status:'CANCELLED',idempotencyKey:original.idempotencyKey}}),e=>e.code==='P2002');
      await assert.rejects(c1.commandIntent.create({data:{...clone,status:'CANCELLED',cycleId:'missing-cycle'}}),e=>e.code==='P2003');
      await assert.rejects(c1.irrigationDailyBudget.updateMany({where:{actuatorId:r.actuatorId},data:{reservedSeconds:999}}));
      await assert.rejects(c1.commandIntent.update({where:{id:original.id},data:{maxRunSeconds:2}}));
      await assert.rejects(c1.commandIntent.update({where:{id:original.id},data:{expiresAt:new Date(original.issuedAt.getTime()-1)}}));
      await assert.rejects(c1.irrigationCycle.update({where:{id:r.cycleId},data:{consumedKeys:{invalid:true}}}));
      await assert.rejects(c1.irrigationSafetyState.update({where:{actuatorId_mode:{actuatorId:r.actuatorId,mode:'SHADOW'}},data:{version:-1}}));
      const audit=await owner.irrigationDecisionLog.findFirst({where:{cycleId:r.cycleId}});
      await assert.rejects(c1.irrigationDecisionLog.create({data:{...audit,id:randomUUID(),evaluationKey:randomUUID(),source:'VERIFIED_LIVE',sensorReadingId:null}}));
      await assert.rejects(c1.irrigationBudgetReservation.updateMany({where:{intentId:original.id},data:{seconds:0}}));
      await assert.rejects(owner.device.delete({where:{id:device.id}}),e=>e.code==='P2003');
      await assert.rejects(owner.irrigationCycle.create({data:{id:randomUUID(),actuatorId:r.actuatorId,deviceId:device.id,policyKey:'fixture-rule',policyVersion:1,policySnapshot:{},mode:'SHADOW',phase:'IDLE',sessionGeneration:'x',sessionStartedAt:new Date()}}),e=>e.code==='P2002');
      const catalogs=await c1.$queryRawUnsafe(`SELECT indexname FROM pg_indexes WHERE schemaname='${ctx.schema}' AND indexname IN ('irrigation_one_open_cycle','irrigation_one_open_intent')`);assert.equal(catalogs.length,2);
    });
    await test('app audit UPDATE DELETE TRUNCATE and schema CREATE denied',async r=>{
      await service(c1).reserve(r);
      await assert.rejects(c1.$executeRawUnsafe(`UPDATE ${ctx.schema}.irrigation_decision_logs SET reason_code='TAMPER'`));
      await assert.rejects(c1.$executeRawUnsafe(`DELETE FROM ${ctx.schema}.irrigation_decision_logs`));
      // Verify permission without issuing destructive TRUNCATE, even in test.
      const [p]=await c1.$queryRawUnsafe(`SELECT has_table_privilege(current_user,'${ctx.schema}.irrigation_decision_logs','TRUNCATE') AS truncate, has_schema_privilege(current_user,'${ctx.schema}','CREATE') AS create, has_table_privilege(current_user,'${ctx.schema}.irrigation_decision_logs','UPDATE') AS update, has_table_privilege(current_user,'${ctx.schema}.irrigation_decision_logs','DELETE') AS delete`);
      assert.deepEqual(p,{truncate:false,create:false,update:false,delete:false});
    });
    await test('duplicate decision evaluation cannot mutate append-only audit',async r=>{
      r.snapshot.reading.value=50;const f=service(c1);await f.reserve(r);await service(c2).reserve(r);
      assert.equal(await owner.irrigationDecisionLog.count({where:{cycleId:r.cycleId}}),1);
    });
    await test('real SERIALIZABLE conflict on two independent connections',async r=>{
      let arrived=0,release;const gate=new Promise(resolve=>release=resolve);
      const run=c=>c.$transaction(async tx=>{await tx.$queryRawUnsafe(`SELECT version FROM ${ctx.schema}.irrigation_safety_states WHERE actuator_id=$1`,r.actuatorId);if(++arrived===2)release();await gate;await tx.$executeRawUnsafe(`UPDATE ${ctx.schema}.irrigation_safety_states SET version=version+1 WHERE actuator_id=$1`,r.actuatorId);},{isolationLevel:'Serializable',timeout:10000});
      const out=await Promise.allSettled([run(c1),run(c2)]);assert.equal(out.filter(x=>x.status==='fulfilled').length,1);
      const failure=out.find(x=>x.status==='rejected').reason;
      assert.ok(failure.code==='P2034'||failure.meta?.code==='40001');
      return {prismaCode:failure.code,sqlstate:failure.meta?.code,successfulTransactions:1};
    });
    await test('v2 constraints and triggers are committed and visible on another connection', async r => {
      const constraints = await c1.$queryRawUnsafe("SELECT conname, convalidated FROM pg_constraint WHERE connamespace='phase13_test_phase13_3b'::regnamespace AND conname IN ('irrigation_v2_settlement','irrigation_v2_dispatch_order')");
      assert.equal(constraints.length, 2); assert.ok(constraints.every(c => c.convalidated));
      const triggers = await c2.$queryRawUnsafe("SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid='phase13_test_phase13_3b.irrigation_decision_logs'::regclass AND NOT tgisinternal");
      assert.equal(triggers.length, 2); assert.ok(triggers.every(t => t.tgenabled === 'O'));
      return { constraints, triggers };
    });
    await test('SELECT FOR UPDATE really blocks independent connection until coordinator commit', async r => {
      let locked, release; const acquired = new Promise(ok => locked=ok), gate = new Promise(ok => release=ok);
      const first = repo(c1).transaction(r.actuatorId, async tx => { await tx.lockActuator(r.actuatorId); locked(); await gate; });
      await acquired;
      const second = repo(c2).transaction(r.actuatorId, async tx => { const row = await tx.lockActuator(r.actuatorId); return row.version; });
      let blocked = false;
      try {
        for (let tries=0; tries<30; tries++) {
          const [state] = await c2.$queryRawUnsafe("SELECT count(*)::int AS blocked FROM pg_stat_activity WHERE usename=current_user AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0");
          if (state.blocked > 0) { blocked=true; break; } await nap(20);
        }
      } finally { release(); await first; }
      assert.equal(await second, 0); assert.equal(blocked, true); return { realPgBlockingObserved: blocked };
    });
    await test('CAS stale database version rejects update and rolls back', async r => {
      await service(c1).inhibit(r.actuatorId, r.cycleId, r.snapshot.now, {kind:'EMERGENCY_STOP'});
      await assert.rejects(repo(c2).transaction(r.actuatorId,async tx=>{
        const s=await tx.lockActuator(r.actuatorId); await tx.saveSafety({...s,version:1,emergencyStop:false},0);
      }),/VERSION_CONFLICT/);
      assert.equal((await safety()).version,1); assert.equal((await safety()).emergencyStop,true);
    });
    await test('cancel before dispatch releases once and durable replay never reserves twice', async r => {
      const f=service(c1), {intent:i}=await f.reserve(r), at=new Date(Date.parse(r.snapshot.now)+1000).toISOString();
      assert.equal(await f.cancelUnclaimed(r.actuatorId,i.id,at,i.correlationId),'RELEASED');
      assert.equal(await service(c2).cancelUnclaimed(r.actuatorId,i.id,at,i.correlationId),'ALREADY_CANCELLED');
      const d=await ledger(r); assert.equal(d.budgets[0].reservedRuns,0);assert.equal(d.budgets[0].reservedSeconds,0);
      assert.equal(d.reservations[0].status,'RELEASED'); assert.equal(d.intents[0].status,'CANCELLED');assert.equal(d.audits.length,2);
      assert.equal((await service(c2).reserve(r)).kind,'REPLAY');assert.equal(d.safety.faultLatched,true);
      assert.equal(d.cycle.pulses,1); assert.equal(d.cycle.phase,'FAULT_LOCKED');
    });
    await test('two processes duplicate cancellation refund exactly once',async r=>{
      const {intent:i}=await service(c1).reserve(r), request={...r,intentId:i.id,correlationId:i.correlationId};
      const [a,b]=await Promise.all([child(request,'cancel'),child(request,'cancel')]);
      assert.notEqual(a.pid,b.pid);assert.deepEqual([a.result,b.result].sort(),['ALREADY_CANCELLED','RELEASED']);
      const d=await ledger(r);assert.equal(d.budgets[0].reservedRuns,0);assert.equal(d.reservations.length,1);
      return {pids:[a.pid,b.pid]};
    });
    await test('cancel racing dispatch claim cannot create free published intent',async r=>{
      const f=service(c1),{intent:i}=await f.reserve(r),at=new Date(Date.parse(r.snapshot.now)+1000).toISOString();
      const [cancel,claim]=await Promise.all([f.cancelUnclaimed(r.actuatorId,i.id,at,i.correlationId),service(c2).recordLifecycle(r.actuatorId,i.id,'DISPATCH_CLAIMED',at,i.correlationId)]);
      const d=await ledger(r);
      if(cancel==='RELEASED'){assert.equal(claim,'TERMINAL_INTENT_NO_RETRY');assert.equal(d.budgets[0].reservedRuns,0);}
      else {assert.equal(cancel,'RELEASE_FORBIDDEN');assert.equal(claim,'DISPATCH_CLAIMED');assert.equal(d.budgets[0].reservedRuns,1);}
      return {cancel,claim};
    });
    for(const stage of ['DISPATCH_CLAIMED','PUBLISHED']) await test('cancel forbidden after '+stage,async r=>{
      const f=service(c1),{intent:i}=await f.reserve(r),n=Date.parse(r.snapshot.now);
      await f.recordLifecycle(r.actuatorId,i.id,'DISPATCH_CLAIMED',new Date(n+100).toISOString(),i.correlationId);
      if(stage==='PUBLISHED')await f.recordLifecycle(r.actuatorId,i.id,'PUBLISHED',new Date(n+200).toISOString(),i.correlationId);
      assert.equal(await service(c2).cancelUnclaimed(r.actuatorId,i.id,new Date(n+1000).toISOString(),i.correlationId),'RELEASE_FORBIDDEN');
      const d=await ledger(r);assert.equal(d.budgets[0].reservedSeconds,1);assert.equal(d.reservations[0].status,'RESERVED');
    });
    for(const operation of ['saveBudget','saveReservation','saveIntent','saveCycle','saveSafety','appendDecision']) await test('cancel transaction rollback at '+operation,async r=>{
      const {intent:i}=await service(c1).reserve(r),before=await ledger(r),real=repo(c2);
      const failing={mode:'SHADOW',environment:'ISOLATED_TEST',transaction:(id,work)=>real.transaction(id,tx=>work(new Proxy(tx,{get(target,key){
        if(key===operation)return async(...args)=>{await target[key](...args);await c2.$queryRawUnsafe('SELECT 1');throw Error('INJECTED_AFTER_WRITE');};return target[key];
      }})))};
      await assert.rejects(new Foundation(failing).cancelUnclaimed(r.actuatorId,i.id,new Date(Date.parse(r.snapshot.now)+1000).toISOString(),i.correlationId),/INJECTED_AFTER_WRITE/);
      assert.deepEqual(await ledger(r),before);
    });
    await test('emergency stop and audit survive test process exit and block future dispatch',async r=>{
      const {intent:i}=await service(c1).reserve(r), stopped=await child(r,'emergency'), inspected=await child(r,'inspect');
      assert.notEqual(stopped.pid,inspected.pid);assert.equal(inspected.result.safety.emergencyStop,true);
      assert.equal(await service(c2).recordLifecycle(r.actuatorId,i.id,'DISPATCH_CLAIMED',new Date(Date.parse(r.snapshot.now)+100).toISOString(),i.correlationId),'SAFETY_INHIBITED');
      assert.equal((await ledger(r)).audits.length,2);return {stoppedPid:stopped.pid,inspectionPid:inspected.pid};
    });
    await test('manual override persists across process restart and cannot shorten',async r=>{
      const f=service(c1), n=Date.parse(r.snapshot.now), until=new Date(n+3600000).toISOString();
      await f.inhibit(r.actuatorId,r.cycleId,r.snapshot.now,{kind:'MANUAL_OVERRIDE',until});
      await service(c2).inhibit(r.actuatorId,r.cycleId,r.snapshot.now,{kind:'MANUAL_OVERRIDE',until:new Date(n+1800000).toISOString()});
      const read=await child(r,'inspect');assert.equal(read.result.safety.manualOverrideUntil,until);
      assert.notEqual((await child(r)).result.kind,'RESERVED');return {inspectionPid:read.pid};
    });
    await test('v2 skip idempotency persists immutable outcome and rejects changed payload',async r=>{
      r.snapshot.reading.value=50;const a=await service(c1).reserve(r),b=await service(c2).reserve(r);
      assert.equal(a.kind,'SKIPPED');assert.equal(b.reason,a.reason);const changed=structuredClone(r);changed.snapshot.reading.value=10;
      assert.equal((await service(c2).reserve(changed)).reason,'IDEMPOTENCY_KEY_REUSED');assert.equal((await ledger(r)).audits.length,1);
    });
    await test('app audit UPDATE DELETE TRUNCATE actually denied with SQLSTATE 42501',async r=>{
      await service(c1).reserve(r);const before=(await ledger(r)).audits;
      for(const sql of ["UPDATE phase13_test_phase13_3b.irrigation_decision_logs SET reason_code='TAMPER'",'DELETE FROM phase13_test_phase13_3b.irrigation_decision_logs','TRUNCATE TABLE phase13_test_phase13_3b.irrigation_decision_logs']){
        await assert.rejects(c1.$executeRawUnsafe(sql),e=>e.meta?.code==='42501');
      }assert.deepEqual((await ledger(r)).audits,before);
    });
    await test('owner audit mutations rejected by v2 triggers, not only app grants',async r=>{
      await service(c1).reserve(r);const before=(await ledger(r)).audits;
      for(const sql of ["UPDATE phase13_test_phase13_3b.irrigation_decision_logs SET reason_code='TAMPER'",'DELETE FROM phase13_test_phase13_3b.irrigation_decision_logs','TRUNCATE TABLE phase13_test_phase13_3b.irrigation_decision_logs']){
        await assert.rejects(owner.$executeRawUnsafe(sql),e=>e.meta?.code==='P0001');
      }assert.deepEqual((await ledger(r)).audits,before);
    });
    await test('audit duplicate identical allowed, conflicting content rolls back',async r=>{
      await service(c1).reserve(r);const raw=(await ledger(r)).audits[0];
      await repo(c2).transaction(r.actuatorId,async tx=>{
        await tx.lockActuator(r.actuatorId);const row=await tx.getDecisionByKey(raw.evaluationKey);await tx.appendDecision(row);
      });
      await assert.rejects(repo(c2).transaction(r.actuatorId,async tx=>{
        await tx.lockActuator(r.actuatorId);const row=await tx.getDecisionByKey(raw.evaluationKey);await tx.appendDecision({...row,reasonCode:'TAMPER'});
      }),/AUDIT_IDEMPOTENCY_CONFLICT/);assert.equal((await ledger(r)).audits.length,1);
    });
    await test('v2 settlement and dispatch ordering constraints reject invalid writes',async r=>{
      const {intent:i}=await service(c1).reserve(r);
      await assert.rejects(c1.irrigationBudgetReservation.updateMany({where:{intentId:i.id},data:{status:'RELEASED',settledAt:null}}));
      await assert.rejects(c1.commandIntent.update({where:{id:i.id},data:{publishedAt:new Date(r.snapshot.now),dispatchClaimedAt:null}}));
      const d=await ledger(r);assert.equal(d.reservations[0].status,'RESERVED');assert.equal(d.intents[0].publishedAt,null);
    });
    const counts={deviceCommands:await owner.deviceCommand.count(),sensorReadings:await owner.sensorReading.count(),automationRules:await owner.automationRule.count(),auditRows:await owner.irrigationDecisionLog.count()};
    assert.equal(counts.deviceCommands,0);assert.equal(counts.sensorReadings,0);assert.equal(counts.automationRules,0);
    fs.writeFileSync(path.join(ctx.root,'phase13-5a1-integration-results.json'),JSON.stringify({start,end:new Date().toISOString(),identity,appRole:role,counts,passed:results.filter(r=>r.status==='PASS').length,failed:0,results},null,2));
    console.log(JSON.stringify({integrationPass:true,tests:results.length,counts,hardwareTriggered:false}));
  } finally {await Promise.all([c1.$disconnect(),c2.$disconnect(),owner.$disconnect(),admin.$disconnect()]);}
}
const launch=process.argv[2]==='--worker'?worker:main;
launch().catch(e=>{console.error(JSON.stringify({status:'STOP',code:e.code,type:e.name,message:/^[A-Z_]+$/.test(e.message)?e.message:'TEST_FAILURE_DETAILS_REDACTED'}));process.exitCode=1;});


