import { createHash, randomUUID } from "node:crypto";
import { decideIrrigation, irrigationDay } from "../automatic-irrigation/decision-engine";
import { shadowSnapshotSchema, type IrrigationDecision, type ShadowSnapshot } from "../automatic-irrigation/shadow-schema";
import type { CycleRecord, IntentRecord, IrrigationRepository, IrrigationTransaction, ReserveRequest, SafetyRecord } from "./repository";

const time = (iso: string) => Date.parse(iso);
const validTime = (iso: string) => Number.isFinite(time(iso));
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)])) : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export interface ReservationResult { kind: "RESERVED" | "REPLAY" | "BLOCKED" | "SKIPPED"; reason: string; intent?: IntentRecord; decision?: IrrigationDecision }

/** Software foundation ONLY. Not wired to routes/evaluator/telemetry. All intents
 * are SHADOW and no method can publish MQTT or create a DeviceCommand. */
export class IrrigationPersistenceFoundation {
  constructor(private readonly repository: IrrigationRepository, private readonly newId: () => string = randomUUID) {
    if (repository.mode !== "SHADOW" || !["FAKE", "ISOLATED_TEST"].includes(repository.environment)) throw new Error("ISOLATED_SHADOW_REPOSITORY_REQUIRED");
  }

  private async latch(tx: IrrigationTransaction, safety: SafetyRecord, reason: string) {
    await tx.saveSafety({ ...safety, version: safety.version + 1, faultLatched: true, faultReason: reason, reportedState: "UNKNOWN" }, safety.version);
  }

  private async auditEvent(tx: IrrigationTransaction, cycle: CycleRecord, at: string, reason: string,
    key: string, intentId: string | null, evidence: Record<string, unknown>) {
    await tx.appendDecision({ evaluationKey: hash(["SHADOW_LEDGER_V2", key]), cycleId: cycle.state.id,
      actuatorId: cycle.actuatorId, readingReference: cycle.state.lastReadingId || "NO_READING_SAFETY_EVENT",
      evaluatedAt: at, source: "MOCK", mode: "SHADOW", outcome: "BLOCKED", reasonCode: reason,
      ruleId: cycle.policy.id, ruleVersion: cycle.policy.version, intentId,
      evidence: { ...evidence, ledgerSimulationOnly: true } });
  }

  /** Release ONLY before dispatch has ever been claimed. Never refunds ambiguous,
   * published, rejected, timed-out or ACKed work. Keeps the consumed reading/pulse
   * and fault-locks the cycle, so cancellation cannot be used as an ON retry. */
  async cancelUnclaimed(actuatorId: string, intentId: string, at: string, correlationId: string) {
    if (!validTime(at)) throw new Error("INVALID_TIME");
    return this.repository.transaction(actuatorId, async tx => {
      const safety = await tx.lockActuator(actuatorId), intent = await tx.getIntent(intentId);
      if (!safety || !intent || intent.actuatorId !== actuatorId || intent.correlationId !== correlationId || intent.sessionId !== safety.sessionId) return "CONTEXT_MISMATCH";
      if (intent.status === "CANCELLED") return "ALREADY_CANCELLED";
      if (intent.status !== "RESERVED" || intent.dispatchClaimedAt || intent.publishedAt || intent.acknowledgedAt) return "RELEASE_FORBIDDEN";
      if (time(at) < time(intent.issuedAt) || (safety.lastAcceptedTime && time(at) < time(safety.lastAcceptedTime))) {
        await this.latch(tx, safety, "CLOCK_ROLLBACK"); return "CLOCK_ROLLBACK";
      }
      const reservation = await tx.reservationForIntent(intent.id), cycle = await tx.getCycle(intent.cycleId);
      const budget = reservation ? await tx.getBudget(reservation.budgetId) : null;
      if (!reservation || !cycle || !budget || cycle.actuatorId !== actuatorId || reservation.cycleId !== intent.cycleId ||
          reservation.seconds !== intent.seconds || reservation.status !== "RESERVED" || budget.state.reservedRuns < 1 || budget.state.reservedSeconds < reservation.seconds) throw new Error("LEDGER_INCOMPLETE");
      await tx.saveBudget({ ...budget, version: budget.version + 1, state: { ...budget.state,
        reservedRuns: budget.state.reservedRuns - 1, reservedSeconds: budget.state.reservedSeconds - reservation.seconds } }, budget.version);
      await tx.saveReservation({ ...reservation, version: reservation.version + 1, status: "RELEASED", reason: "CANCELLED_BEFORE_DISPATCH", settledAt: at }, reservation.version);
      await tx.saveIntent({ ...intent, version: intent.version + 1, status: "CANCELLED", reason: "CANCELLED_BEFORE_DISPATCH" }, intent.version);
      await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: { ...cycle.state, phase: "FAULT_LOCKED" } }, cycle.version);
      await tx.saveSafety({ ...safety, version: safety.version + 1, faultLatched: true,
        faultReason: "CANCELLED_BEFORE_DISPATCH", lastAcceptedTime: at }, safety.version);
      await this.auditEvent(tx, cycle, at, "CANCELLED_BEFORE_DISPATCH", "cancel:" + intent.id, intent.id, { releasedSeconds: reservation.seconds, budgetId: budget.id });
      return "RELEASED";
    });
  }

  /** Persistent software inhibit only; NEVER an emergency physical OFF command.
   * No API clears the emergency latch, shortens an override or rearms a cycle. */
  async inhibit(actuatorId: string, cycleId: string, at: string,
    action: { kind: "EMERGENCY_STOP" } | { kind: "MANUAL_OVERRIDE"; until: string }) {
    if (!validTime(at) || !action || !["EMERGENCY_STOP", "MANUAL_OVERRIDE"].includes(action.kind) ||
        (action.kind === "MANUAL_OVERRIDE" && (!validTime(action.until) || time(action.until) <= time(at)))) throw new Error("INVALID_INHIBIT");
    return this.repository.transaction(actuatorId, async tx => {
      const safety = await tx.lockActuator(actuatorId), cycle = await tx.getCycle(cycleId);
      if (!safety || !cycle || cycle.actuatorId !== actuatorId) return "CONTEXT_MISMATCH";
      const rollback = safety.lastAcceptedTime !== null && time(at) < time(safety.lastAcceptedTime);
      // A stop still latches during rollback; an override cannot be trusted then.
      if (rollback && action.kind !== "EMERGENCY_STOP") { await this.latch(tx, safety, "CLOCK_ROLLBACK"); return "CLOCK_ROLLBACK"; }
      const until = action.kind === "MANUAL_OVERRIDE"
        ? (safety.manualOverrideUntil && time(safety.manualOverrideUntil) > time(action.until) ? safety.manualOverrideUntil : action.until)
        : safety.manualOverrideUntil;
      await tx.saveSafety({ ...safety, version: safety.version + 1, emergencyStop: safety.emergencyStop || action.kind === "EMERGENCY_STOP",
        faultLatched: true, faultReason: rollback ? "CLOCK_ROLLBACK" : action.kind, manualOverrideUntil: until,
        lastAcceptedTime: rollback ? safety.lastAcceptedTime : at }, safety.version);
      await this.auditEvent(tx, cycle, at, action.kind, `inhibit:${actuatorId}:${cycle.state.id}:${safety.sessionId}:${safety.version + 1}`, null,
        { emergencyStop: safety.emergencyStop || action.kind === "EMERGENCY_STOP", manualOverrideUntil: until, clockRollback: rollback });
      return "INHIBITED";
    });
  }

  async reserve(request: ReserveRequest): Promise<ReservationResult> {
    if (!request || typeof request !== "object") return { kind: "BLOCKED", reason: "REQUEST_INVALID" };
    const parsed = shadowSnapshotSchema.safeParse(request.snapshot);
    if (!parsed.success || [request.actuatorId, request.cycleId, request.idempotencyKey].some(value => typeof value !== "string" || !value.trim() || value.length > 256) ||
        !["FIXTURE", "MOCK"].includes(request.source)) return { kind: "BLOCKED", reason: "REQUEST_INVALID" };
    const observation = parsed.data;
    if (observation.mode !== "SHADOW") return { kind: "BLOCKED", reason: "PERSISTENCE_SHADOW_ONLY" };
    // Identity of the logical request is independent of retried wall-clock time.
    const fingerprint = hash([request.actuatorId, request.cycleId, request.source, observation.rule,
      observation.reading.readingId, observation.reading.value, observation.reading.recordedAt, observation.reading.source,
      observation.reading.deviceCode, observation.reading.sensorCode, observation.device.sessionId]);
    return this.repository.transaction(request.actuatorId, async tx => {
      const safety = await tx.lockActuator(request.actuatorId);
      if (!safety) return { kind: "BLOCKED", reason: "SAFETY_STATE_MISSING" };
      const existing = await tx.getIntentByKey(request.idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint || existing.actuatorId !== request.actuatorId) return { kind: "BLOCKED", reason: "IDEMPOTENCY_KEY_REUSED" };
        // A replay is only a lookup, not permission to dispatch again.
        return { kind: "REPLAY", reason: existing.status, intent: existing };
      }
      const evaluationKey = hash(["SHADOW_EVALUATION_V2", request.idempotencyKey]);
      // A skip/block also has an immutable result. Do not recompute and silently
      // replace its audit after the first evaluation changed persisted cycle.
      const evaluated = await tx.getDecisionByKey(evaluationKey);
      if (evaluated) {
        if (evaluated.actuatorId !== request.actuatorId || evaluated.evidence.requestFingerprint !== fingerprint) return { kind: "BLOCKED", reason: "IDEMPOTENCY_KEY_REUSED" };
        return { kind: evaluated.outcome === "WOULD_SKIP" ? "SKIPPED" : "BLOCKED", reason: evaluated.reasonCode };
      }
      const now = observation.now, day = irrigationDay(now);
      if ((safety.lastAcceptedTime && time(now) < time(safety.lastAcceptedTime)) ||
          (safety.budgetDayHighWater && day < safety.budgetDayHighWater)) {
        await this.latch(tx, safety, "CLOCK_ROLLBACK");
        return { kind: "BLOCKED", reason: "CLOCK_ROLLBACK" };
      }
      const cycle = await tx.getCycle(request.cycleId);
      if (!cycle || cycle.actuatorId !== safety.actuatorId || cycle.state.actuatorCode !== safety.actuatorCode ||
          observation.device.deviceCode !== safety.deviceCode || observation.actuator.actuatorCode !== safety.actuatorCode ||
          observation.device.sessionId !== safety.sessionId || cycle.state.sessionId !== safety.sessionId) return { kind: "BLOCKED", reason: "PERSISTED_CONTEXT_MISMATCH" };
      if (hash(cycle.policy) !== hash(observation.rule)) return { kind: "BLOCKED", reason: "PERSISTED_POLICY_MISMATCH" };
      // Open/uncertain intent on the actuator is shared across keys, cycles and instances.
      if ((await tx.openIntents(request.actuatorId)).length) return { kind: "BLOCKED", reason: "ACTUATOR_INTENT_OPEN" };
      // Check health before allocating a new day's row; never trust a client budget reset.
      if (observation.clock.health !== "HEALTHY" || time(observation.clock.checkedAt) > time(now) ||
          time(now) - time(observation.clock.checkedAt) > observation.rule.clockTtlSeconds * 1000 ||
          observation.clock.offsetMs === null || Math.abs(observation.clock.offsetMs) > observation.rule.maxClockOffsetMs) return { kind: "BLOCKED", reason: "CLOCK_NOT_TRUSTED" };
      const budget = await tx.getOrCreateBudget(request.actuatorId, day, { maxRuns: observation.rule.maxRunsPerDay, maxSeconds: observation.rule.dailyBudgetSeconds, actuatorCode: safety.actuatorCode });
      if (budget.maxRuns !== observation.rule.maxRunsPerDay || budget.maxSeconds !== observation.rule.dailyBudgetSeconds) return { kind: "BLOCKED", reason: "BUDGET_POLICY_CHANGED" };
      // Persisted safety/cycle/budget override supplied snapshot fields.
      const snapshot: ShadowSnapshot = { ...observation, cycle: cycle.state, budget: budget.state,
        safety: { manualOverrideUntil: safety.manualOverrideUntil, faultLatched: safety.faultLatched || safety.reportedState === "UNKNOWN", emergencyStop: safety.emergencyStop, lastActuatorOffAt: safety.lastActuatorOffAt } };
      if (safety.cooldownUntil && time(safety.cooldownUntil) > time(now)) return { kind: "BLOCKED", reason: "PERSISTED_COOLDOWN" };
      if (cycle.soakUntil && time(cycle.soakUntil) > time(now)) return { kind: "BLOCKED", reason: "PERSISTED_SOAK" };
      const decision = decideIrrigation(snapshot);
      const audit = { evaluationKey, cycleId: request.cycleId, actuatorId: request.actuatorId,
        readingReference: observation.reading.readingId, evaluatedAt: now, source: request.source, mode: "SHADOW" as const,
        outcome: decision.outcome, reasonCode: decision.reasonCode, ruleId: observation.rule.id, ruleVersion: observation.rule.version, intentId: null as string | null,
        evidence: { requestFingerprint: fingerprint, clock: observation.clock, mqtt: observation.reading.mqtt, recordedAt: observation.reading.recordedAt,
          receivedAt: observation.reading.receivedAt, off: observation.actuator.off, sessionId: safety.sessionId,
          policyFingerprint: hash(cycle.policy), budgetBefore: budget.state, budgetAfter: decision.nextBudget } };
      if (decision.outcome !== "WOULD_ON" || !decision.nextCycle || !decision.nextBudget) {
        await tx.appendDecision(audit);
        if (decision.outcome === "WOULD_SKIP" && decision.nextCycle) await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: decision.nextCycle }, cycle.version);
        return { kind: decision.outcome === "WOULD_SKIP" ? "SKIPPED" : "BLOCKED", reason: decision.reasonCode, decision };
      }
      const intent: IntentRecord = { id: this.newId(), key: request.idempotencyKey, fingerprint, correlationId: this.newId(), actuatorId: request.actuatorId,
        cycleId: request.cycleId, sessionId: safety.sessionId, mode: "SHADOW", status: "RESERVED", version: 0, seconds: decision.recommendedRunSeconds!, pulseIndex: decision.nextCycle.pulsesInCycle - 1,
        issuedAt: now, expiresAt: new Date(time(now) + 10_000).toISOString(), acknowledgedAt: null, reason: null, dispatchClaimedAt: null, publishedAt: null };
      await tx.saveBudget({ ...budget, version: budget.version + 1, state: decision.nextBudget }, budget.version);
      await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: decision.nextCycle }, cycle.version);
      await tx.insertIntent(intent);
      await tx.insertReservation({ id: this.newId(), intentId: intent.id, cycleId: request.cycleId, budgetId: budget.id, seconds: intent.seconds, status: "RESERVED", version: 0, reason: null, createdAt: now, settledAt: null });
      await tx.appendDecision({ ...audit, intentId: intent.id });
      await tx.saveSafety({ ...safety, version: safety.version + 1, lastAcceptedTime: now, budgetDayHighWater: day }, safety.version);
      return { kind: "RESERVED", reason: "SHADOW_INTENT_RESERVED", intent, decision };
    });
  }

  /** Ledger simulation only. No dispatcher/network callback is accepted. */
  async recordLifecycle(actuatorId: string, intentId: string, event: "DISPATCH_CLAIMED" | "PUBLISHED" | "ACK_APPLIED" | "ACK_REJECTED" | "ACK_TIMEOUT" | "PUBLISH_UNCERTAIN" | "BROKER_LOST", at: string, correlationId: string) {
    if (!validTime(at)) throw new Error("INVALID_TIME");
    return this.repository.transaction(actuatorId, async tx => {
      const safety = await tx.lockActuator(actuatorId), intent = await tx.getIntent(intentId);
      if (!safety || !intent || intent.actuatorId !== actuatorId || intent.correlationId !== correlationId || intent.mode !== "SHADOW") return "CONTEXT_MISMATCH";
      if (["UNCERTAIN", "CANCELLED", "REJECTED", "ACKED", "COMPLETED"].includes(intent.status)) return "TERMINAL_INTENT_NO_RETRY";
      if (intent.sessionId !== safety.sessionId) return "SESSION_MISMATCH";
      if (["DISPATCH_CLAIMED", "PUBLISHED"].includes(event) && (safety.emergencyStop || safety.faultLatched ||
          (safety.manualOverrideUntil && time(safety.manualOverrideUntil) > time(at)))) return "SAFETY_INHIBITED";
      const cycle = await tx.getCycle(intent.cycleId), reservation = await tx.reservationForIntent(intent.id);
      if (!cycle || !reservation) throw new Error("LEDGER_INCOMPLETE");
      const rollback = (safety.lastAcceptedTime && time(at) < time(safety.lastAcceptedTime)) || time(at) < time(intent.issuedAt);
      const uncertain = rollback || time(at) >= time(intent.expiresAt) || ["ACK_TIMEOUT", "PUBLISH_UNCERTAIN", "BROKER_LOST"].includes(event);
      if (uncertain || event === "ACK_REJECTED") {
        const reason = rollback ? "CLOCK_ROLLBACK" : time(at) >= time(intent.expiresAt) ? "INTENT_EXPIRED" : event;
        await tx.saveIntent({ ...intent, version: intent.version + 1, status: event === "ACK_REJECTED" && !uncertain ? "REJECTED" : "UNCERTAIN", reason }, intent.version);
        await tx.saveReservation({ ...reservation, version: reservation.version + 1, status: "UNCERTAIN", reason }, reservation.version);
        await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: { ...cycle.state, phase: "FAULT_LOCKED" } }, cycle.version);
        await this.latch(tx, safety, reason);
        return reason;
      }
      const transitions = { DISPATCH_CLAIMED: ["RESERVED", "DISPATCH_CLAIMED"], PUBLISHED: ["DISPATCH_CLAIMED", "PUBLISHED"], ACK_APPLIED: ["PUBLISHED", "ACKED"] } as const;
      if (!(event in transitions)) return "INVALID_TRANSITION";
      const [from, to] = transitions[event as keyof typeof transitions];
      if (intent.status !== from) return "INVALID_TRANSITION";
      await tx.saveIntent({ ...intent, version: intent.version + 1, status: to, acknowledgedAt: to === "ACKED" ? at : null,
        dispatchClaimedAt: to === "DISPATCH_CLAIMED" ? at : intent.dispatchClaimedAt, publishedAt: to === "PUBLISHED" ? at : intent.publishedAt }, intent.version);
      if (to === "ACKED") {
        await tx.saveReservation({ ...reservation, version: reservation.version + 1, status: "CHARGED", settledAt: at }, reservation.version);
        await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: { ...cycle.state, phase: "PULSE_ACTIVE", lastPulseStartedAt: at } }, cycle.version);
      }
      await tx.saveSafety({ ...safety, version: safety.version + 1, lastAcceptedTime: at }, safety.version);
      return to;
    });
  }

  async acceptOff(actuatorId: string, intentId: string, observation: unknown) {
    const parsed = shadowSnapshotSchema.safeParse(observation);
    if (!parsed.success || parsed.data.mode !== "SHADOW") return "SNAPSHOT_INVALID";
    const s = parsed.data, off = s.actuator.off;
    return this.repository.transaction(actuatorId, async tx => {
      const safety = await tx.lockActuator(actuatorId), intent = await tx.getIntent(intentId);
      const cycle = intent ? await tx.getCycle(intent.cycleId) : null;
      if (!safety || !intent || !cycle || intent.actuatorId !== actuatorId || intent.status !== "ACKED" || safety.faultLatched ||
          intent.sessionId !== safety.sessionId || s.device.sessionId !== safety.sessionId || s.device.deviceCode !== safety.deviceCode ||
          s.actuator.actuatorCode !== safety.actuatorCode || s.actuator.state !== "OFF" || !cycle.state.lastPulseStartedAt) return "OFF_CONTEXT_UNTRUSTED";
      if (hash(s.rule) !== hash(cycle.policy)) return "PERSISTED_POLICY_MISMATCH";
      if (!off?.verified || off.source !== "MQTT" || off.retained || off.duplicate || off.sessionId !== safety.sessionId ||
          time(off.recordedAt) <= time(cycle.state.lastPulseStartedAt) || time(off.recordedAt) < time(s.device.sessionStartedAt) ||
          (safety.lastActuatorOffAt && time(off.recordedAt) <= time(safety.lastActuatorOffAt)) ||
          time(off.recordedAt) > time(s.now) || time(off.receivedAt) > time(s.now) ||
          time(off.recordedAt) > time(off.receivedAt) + s.rule.futureToleranceMs ||
          time(s.now) - time(off.recordedAt) > 30_000 || time(s.now) - time(off.receivedAt) > 30_000 ||
          (safety.lastAcceptedTime && time(s.now) < time(safety.lastAcceptedTime))) return "FRESH_OFF_REQUIRED";
      await tx.saveCycle({ ...cycle, version: cycle.version + 1, soakUntil: new Date(time(off.recordedAt) + s.rule.soakSeconds * 1000).toISOString(),
        state: { ...cycle.state, phase: "SOAK", lastOffAt: off.recordedAt } }, cycle.version);
      await tx.saveSafety({ ...safety, version: safety.version + 1, reportedState: "OFF", lastActuatorOffAt: off.recordedAt,
        cooldownUntil: new Date(time(off.recordedAt) + s.rule.minRestSeconds * 1000).toISOString(), lastAcceptedTime: s.now }, safety.version);
      await tx.saveIntent({ ...intent, version: intent.version + 1, status: "COMPLETED" }, intent.version);
      return "SOAK";
    });
  }

  async recover(actuatorId: string, newSessionId: string, at: string) {
    if (!newSessionId || !validTime(at)) throw new Error("INVALID_RECOVERY");
    return this.repository.transaction(actuatorId, async tx => {
      const safety = await tx.lockActuator(actuatorId);
      if (!safety) return "SAFETY_STATE_MISSING";
      for (const intent of await tx.openIntents(actuatorId)) {
        const cycle = await tx.getCycle(intent.cycleId), reservation = await tx.reservationForIntent(intent.id);
        await tx.saveIntent({ ...intent, version: intent.version + 1, status: "UNCERTAIN", reason: "BACKEND_RESTARTED_NO_REPLAY" }, intent.version);
        if (reservation) await tx.saveReservation({ ...reservation, version: reservation.version + 1, status: "UNCERTAIN", reason: "BACKEND_RESTARTED_NO_REPLAY", settledAt: null }, reservation.version);
        if (cycle) await tx.saveCycle({ ...cycle, version: cycle.version + 1, state: { ...cycle.state, trusted: false, phase: "FAULT_LOCKED" } }, cycle.version);
      }
      await tx.saveSafety({ ...safety, version: safety.version + 1, sessionId: newSessionId, faultLatched: true,
        faultReason: "BACKEND_RESTARTED_NO_REPLAY", reportedState: "UNKNOWN", lastActuatorOffAt: null }, safety.version);
      // No rearm or auto replay. Old reservations, high-water, cooldown and faults survive.
      return "RECOVERY_LOCKED";
    });
  }
}
