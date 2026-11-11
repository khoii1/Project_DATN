// ISOLATED TEST ONLY. No Prisma singleton/env/MQTT imports. Never production wired.
import { randomUUID } from "node:crypto";
import type { BudgetRecord, CycleRecord, DecisionAudit, IntentRecord, IrrigationRepository, IrrigationTransaction, ReservationRecord, SafetyRecord } from "./repository";

// Structural interface keeps the separate generated test client outside src/dist.
interface TestClient {
  $transaction<T>(work: (tx: any) => Promise<T>, options?: { isolationLevel: "ReadCommitted"; timeout: number }): Promise<T>;
}
const iso = (value: Date | null) => value ? value.toISOString() : null;
const date = (value: string | null) => value ? new Date(value) : null;
const open = ["RESERVED", "DISPATCH_CLAIMED", "PUBLISHED", "ACKED", "UNCERTAIN"];
const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;

export class PostgresTestIrrigationRepository implements IrrigationRepository {
  readonly mode = "SHADOW" as const;
  readonly environment = "ISOLATED_TEST" as const;
  constructor(private readonly client: TestClient, private readonly expectedServerStart: string) {
    if (!expectedServerStart) throw new Error("TEST_CLUSTER_PROOF_REQUIRED");
  }

  async transaction<T>(actuatorId: string, work: (tx: IrrigationTransaction) => Promise<T>): Promise<T> {
    return this.client.$transaction(async db => {
      const [identity] = await db.$queryRawUnsafe("SELECT current_database() AS db, current_user AS role, inet_server_addr()::text AS host, inet_server_port() AS port, current_schema() AS schema, pg_postmaster_start_time()::text AS started");
      if (identity.db !== "smart_agriculture_test_phase13_3b" || identity.role !== "phase13_test_app" ||
          identity.host !== "127.0.0.1/32" || identity.port !== 55433 || identity.schema !== "phase13_test_phase13_3b" ||
          identity.started !== this.expectedServerStart) throw new Error("TEST_SQL_IDENTITY_MISMATCH_STOP");
      let locked = false;
      const check = (id = actuatorId) => { if (!locked || id !== actuatorId) throw new Error("ACTUATOR_LOCK_REQUIRED"); };
      const cas = async (model: any, where: object, data: { version: number }, expected: number) => {
        check();
        if (data.version !== expected + 1) throw new Error("VERSION_CONFLICT");
        const result = await model.updateMany({ where: { ...where, mode: "SHADOW", version: expected }, data });
        if (result.count !== 1) throw new Error("VERSION_CONFLICT");
      };
      const intent = (r: any): IntentRecord | null => r ? ({ id: r.id, key: r.idempotencyKey, fingerprint: r.fingerprint,
        correlationId: r.correlationId, actuatorId: r.actuatorId, cycleId: r.cycleId, sessionId: r.sessionGeneration,
        mode: "SHADOW", status: r.status, version: r.version, seconds: r.maxRunSeconds, pulseIndex: r.pulseIndex,
        issuedAt: iso(r.issuedAt)!, expiresAt: iso(r.expiresAt)!, acknowledgedAt: iso(r.acknowledgedAt), reason: r.reason,
        dispatchClaimedAt: iso(r.dispatchClaimedAt), publishedAt: iso(r.publishedAt) }) : null;
      const reservation = (r: any): ReservationRecord | null => r ? ({ id: r.id, intentId: r.intentId, budgetId: r.budgetId,
        cycleId: r.cycleId, seconds: r.seconds, status: r.status, version: r.version, reason: r.reason,
        createdAt: iso(r.createdAt)!, settledAt: iso(r.settledAt) }) : null;
      const budget = (r: any, code: string): BudgetRecord => ({ id: r.id, actuatorId: r.actuatorId, version: r.version,
        maxRuns: r.maxRuns, maxSeconds: r.maxSeconds, state: { actuatorCode: code, day: r.localDay.toISOString().slice(0, 10), trusted: true, reservedRuns: r.reservedRuns, reservedSeconds: r.reservedSeconds } });
      const intentData = (r: IntentRecord) => ({ idempotencyKey: r.key, fingerprint: r.fingerprint, correlationId: r.correlationId,
        actuatorId: r.actuatorId, cycleId: r.cycleId, sessionGeneration: r.sessionId, mode: "SHADOW", status: r.status,
        version: r.version, maxRunSeconds: r.seconds, pulseIndex: r.pulseIndex, issuedAt: date(r.issuedAt), expiresAt: date(r.expiresAt),
        acknowledgedAt: date(r.acknowledgedAt), reason: r.reason, dispatchClaimedAt: date(r.dispatchClaimedAt), publishedAt: date(r.publishedAt) });
      const tx: IrrigationTransaction = {
        lockActuator: async id => {
          if (id !== actuatorId) throw new Error("WRONG_ACTUATOR_LOCK");
          await db.$queryRawUnsafe('SELECT actuator_id FROM phase13_test_phase13_3b.irrigation_safety_states WHERE actuator_id=$1 AND mode=\'SHADOW\' FOR UPDATE', id);
          locked = true;
          const r = await db.irrigationSafetyState.findUnique({ where: { actuatorId_mode: { actuatorId: id, mode: "SHADOW" } }, include: { actuator: { include: { device: true } } } });
          if (!r) return null;
          // Domain has OFF/UNKNOWN only. ON cannot become an OFF assertion.
          return { actuatorId: r.actuatorId, deviceId: r.deviceId, deviceCode: r.actuator.device.deviceCode, actuatorCode: r.actuator.actuatorCode,
            sessionId: r.sessionGeneration || "", version: r.version, faultLatched: r.faultLatched, faultReason: r.faultReason,
            emergencyStop: r.emergencyStop, manualOverrideUntil: iso(r.manualOverrideUntil), lastActuatorOffAt: iso(r.lastConfirmedOffAt),
            cooldownUntil: iso(r.cooldownUntil), lastAcceptedTime: iso(r.lastAcceptedServerTime), budgetDayHighWater: r.budgetDayHighWater?.toISOString().slice(0, 10) || null,
            reportedState: r.reportedState === "OFF" ? "OFF" : "UNKNOWN" } satisfies SafetyRecord;
        },
        getCycle: async id => {
          check();
          const r = await db.irrigationCycle.findUnique({ where: { id }, include: { actuator: true } });
          if (!r || r.mode !== "SHADOW" || r.actuatorId !== actuatorId) return null;
          const envelope = r.policySnapshot;
          return { actuatorId: r.actuatorId, version: r.version, policy: envelope.rule, soakUntil: iso(r.soakUntil), state: {
            id: r.id, sessionId: r.sessionGeneration, ruleId: r.policyKey, ruleVersion: r.policyVersion, actuatorCode: r.actuator.actuatorCode,
            trusted: envelope.cycleTrusted === true, phase: r.phase, lastEvaluatedAt: iso(r.lastEvaluatedAt), lastReadingId: r.lastReadingId,
            lastReadingRecordedAt: iso(r.lastReadingAt), lastPulseStartedAt: iso(r.lastPulseAt), lastOffAt: iso(r.lastOffAt),
            pulsesInCycle: r.pulses, consumedKeys: r.consumedKeys } } satisfies CycleRecord;
        },
        getIntent: async id => { check(); return intent(await db.commandIntent.findFirst({ where: { id, actuatorId, mode: "SHADOW" } })); },
        getIntentByKey: async key => { check(); return intent(await db.commandIntent.findUnique({ where: { mode_idempotencyKey: { mode: "SHADOW", idempotencyKey: key } } })); },
        openIntents: async id => { check(id); return (await db.commandIntent.findMany({ where: { actuatorId: id, mode: "SHADOW", status: { in: open } } })).map(intent) as IntentRecord[]; },
        getBudget: async id => {
          check();
          const r = await db.irrigationDailyBudget.findFirst({ where: { id, actuatorId, mode: "SHADOW" }, include: { actuator: true } });
          return r ? budget(r, r.actuator.actuatorCode) : null;
        },
        getOrCreateBudget: async (id, day, limits) => {
          check(id);
          const r = await db.irrigationDailyBudget.upsert({ where: { actuatorId_mode_localDay: { actuatorId: id, mode: "SHADOW", localDay: new Date(day + "T00:00:00Z") } },
            update: {}, create: { actuatorId: id, mode: "SHADOW", localDay: new Date(day + "T00:00:00Z"), maxRuns: limits.maxRuns, maxSeconds: limits.maxSeconds } });
          return budget(r, limits.actuatorCode);
        },
        saveSafety: async (r, v) => {
          check(r.actuatorId);
          await cas(db.irrigationSafetyState, { actuatorId: r.actuatorId }, { version: r.version, deviceId: r.deviceId,
            sessionGeneration: r.sessionId, faultLatched: r.faultLatched, faultReason: r.faultReason, emergencyStop: r.emergencyStop,
            manualOverrideUntil: date(r.manualOverrideUntil), lastConfirmedOffAt: date(r.lastActuatorOffAt), cooldownUntil: date(r.cooldownUntil),
            lastAcceptedServerTime: date(r.lastAcceptedTime), budgetDayHighWater: r.budgetDayHighWater ? new Date(r.budgetDayHighWater + "T00:00:00Z") : null,
            reportedState: r.reportedState } as any, v);
        },
        saveCycle: async (r, v) => {
          check(r.actuatorId);
          await cas(db.irrigationCycle, { id: r.state.id, actuatorId }, { version: r.version, policySnapshot: { rule: r.policy, cycleTrusted: r.state.trusted },
            phase: r.state.phase, sessionGeneration: r.state.sessionId, policyKey: r.state.ruleId, policyVersion: r.state.ruleVersion,
            lastEvaluatedAt: date(r.state.lastEvaluatedAt), lastReadingId: r.state.lastReadingId, lastReadingAt: date(r.state.lastReadingRecordedAt),
            lastPulseAt: date(r.state.lastPulseStartedAt), lastOffAt: date(r.state.lastOffAt), pulses: r.state.pulsesInCycle,
            consumedKeys: r.state.consumedKeys, soakUntil: date(r.soakUntil) } as any, v);
        },
        saveBudget: async (r, v) => { check(r.actuatorId); await cas(db.irrigationDailyBudget, { id: r.id, actuatorId }, { version: r.version, reservedRuns: r.state.reservedRuns, reservedSeconds: r.state.reservedSeconds } as any, v); },
        insertIntent: async r => { check(r.actuatorId); await db.commandIntent.create({ data: { id: r.id, ...intentData(r) } }); },
        saveIntent: async (r, v) => { check(r.actuatorId); await cas(db.commandIntent, { id: r.id, actuatorId }, intentData(r), v); },
        insertReservation: async r => { check(); await db.irrigationBudgetReservation.create({ data: { ...r, actuatorId, mode: "SHADOW", createdAt: date(r.createdAt), settledAt: date(r.settledAt) } }); },
        reservationForIntent: async id => { check(); return reservation(await db.irrigationBudgetReservation.findFirst({ where: { intentId: id, actuatorId, mode: "SHADOW" } })); },
        saveReservation: async (r, v) => { await cas(db.irrigationBudgetReservation, { id: r.id, actuatorId }, { version: r.version, status: r.status, reason: r.reason, settledAt: date(r.settledAt) } as any, v); },
        getDecisionByKey: async key => {
          check();
          const r = await db.irrigationDecisionLog.findUnique({ where: { evaluationKey: key } });
          if (!r || r.actuatorId !== actuatorId || r.mode !== "SHADOW" || !["FIXTURE", "MOCK"].includes(r.source)) return null;
          return { evaluationKey: r.evaluationKey, cycleId: r.cycleId, actuatorId: r.actuatorId, readingReference: r.readingReference,
            evaluatedAt: iso(r.evaluatedAt)!, source: r.source, mode: "SHADOW", outcome: r.outcome, reasonCode: r.reasonCode,
            ruleId: r.policyKey, ruleVersion: r.policyVersion, intentId: r.intentId, evidence: r.evidence };
        },
        appendDecision: async (r: DecisionAudit) => {
          check(r.actuatorId);
          if (r.mode !== "SHADOW" || !["FIXTURE", "MOCK"].includes(r.source)) throw new Error("SHADOW_AUDIT_ONLY");
          const data = { evaluationKey: r.evaluationKey,
            cycleId: r.cycleId, actuatorId, intentId: r.intentId, readingReference: r.readingReference, policyKey: r.ruleId,
            policyVersion: r.ruleVersion, mode: "SHADOW", source: r.source, outcome: r.outcome, reasonCode: r.reasonCode,
            evidence: r.evidence, evaluatedAt: date(r.evaluatedAt) };
          const inserted = await db.irrigationDecisionLog.createMany({ skipDuplicates: true, data: [{ id: randomUUID(), ...data }] });
          if (inserted.count === 0) {
            const prior = await db.irrigationDecisionLog.findUnique({ where: { evaluationKey: r.evaluationKey } });
            const normalize = (row: any) => ({ ...row, evaluatedAt: iso(row.evaluatedAt) });
            const selected = prior && Object.fromEntries(Object.keys(data).map(key => [key, prior[key]]));
            if (!selected || JSON.stringify(canonical(normalize(selected))) !== JSON.stringify(canonical(normalize(data)))) throw new Error("AUDIT_IDEMPOTENCY_CONFLICT");
          }
        },
      };
      return work(tx);
    }, { isolationLevel: "ReadCommitted", timeout: 30000 });
  }
}
