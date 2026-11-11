import { z } from "zod";
import { shadowSnapshotSchema, type ShadowCycle, type ShadowBudget } from "./shadow-schema";

const eventSchema = z.object({
  type: z.enum(["ACK_APPLIED", "ACK_REJECTED", "ACK_TIMEOUT", "PULSE_ELAPSED", "OFF_REPORTED"]),
  idempotencyKey: z.string().min(1).max(1024),
}).strict();

export interface ShadowTransition {
  accepted: boolean;
  reasonCode: string;
  nextCycle: ShadowCycle | null;
  nextBudget: ShadowBudget | null;
  lastActuatorOffAt: string | null;
}

/** Test-harness events only. This does not acknowledge or change any physical relay. */
export function advanceShadowCycle(raw: unknown, event: unknown): ShadowTransition {
  const snapshot = shadowSnapshotSchema.safeParse(raw), parsedEvent = eventSchema.safeParse(event);
  if (!snapshot.success || !parsedEvent.success) return {
    accepted: false, reasonCode: "SNAPSHOT_OR_EVENT_INVALID", nextCycle: null, nextBudget: null, lastActuatorOffAt: null,
  };
  const s = snapshot.data, e = parsedEvent.data;
  const cycle = s.cycle ? { ...s.cycle, consumedKeys: [...s.cycle.consumedKeys] } : null;
  const budget = { ...s.budget };
  let lastOff = s.safety.lastActuatorOffAt;
  const result = (accepted: boolean, reasonCode: string): ShadowTransition => ({ accepted, reasonCode, nextCycle: cycle, nextBudget: budget, lastActuatorOffAt: lastOff });
  if (s.mode !== "SHADOW" || !cycle?.trusted || cycle.sessionId !== s.device.sessionId ||
      cycle.ruleId !== s.rule.id || cycle.ruleVersion !== s.rule.version || cycle.actuatorCode !== s.actuator.actuatorCode ||
      cycle.consumedKeys.at(-1) !== e.idempotencyKey || !cycle.lastEvaluatedAt ||
      Date.parse(cycle.lastEvaluatedAt) > Date.parse(s.now)) return result(false, "TRANSITION_CONTEXT_UNTRUSTED");
  if (e.type === "ACK_REJECTED" || e.type === "ACK_TIMEOUT") {
    if (cycle.phase !== "PENDING_ACK") return result(false, "INVALID_TRANSITION");
    cycle.phase = "FAULT_LOCKED";
    // Reserved runs/seconds are deliberately not refunded, including ACK_TIMEOUT.
    return result(true, e.type);
  }
  if (e.type === "ACK_APPLIED") {
    if (cycle.phase !== "PENDING_ACK") return result(false, "INVALID_TRANSITION");
    cycle.phase = "PULSE_ACTIVE";
    cycle.lastPulseStartedAt = s.now;
    return result(true, "SIMULATED_PULSE_ACTIVE");
  }
  if (e.type === "PULSE_ELAPSED") {
    if (cycle.phase !== "PULSE_ACTIVE" || !cycle.lastPulseStartedAt ||
        Date.parse(s.now) - Date.parse(cycle.lastPulseStartedAt) < s.rule.pulseSeconds * 1000) return result(false, "INVALID_TRANSITION");
    cycle.phase = "WAIT_FRESH_OFF";
    return result(true, "WAITING_FOR_NEW_OFF");
  }
  const off = s.actuator.off;
  if (!["PULSE_ACTIVE", "WAIT_FRESH_OFF"].includes(cycle.phase) || !cycle.lastPulseStartedAt || s.actuator.state !== "OFF" ||
      !off?.verified || off.source !== "MQTT" || off.retained || off.duplicate || off.sessionId !== s.device.sessionId ||
      Date.parse(off.recordedAt) <= Date.parse(cycle.lastPulseStartedAt) ||
      Date.parse(off.recordedAt) < Date.parse(s.device.sessionStartedAt) ||
      (cycle.lastOffAt && Date.parse(off.recordedAt) <= Date.parse(cycle.lastOffAt)) ||
      (lastOff && Date.parse(off.recordedAt) < Date.parse(lastOff)) ||
      Date.parse(off.recordedAt) > Date.parse(s.now) || Date.parse(off.receivedAt) > Date.parse(s.now) ||
      Date.parse(off.recordedAt) > Date.parse(off.receivedAt) + s.rule.futureToleranceMs ||
      Date.parse(s.now) - Date.parse(off.recordedAt) > s.rule.offTtlSeconds * 1000 ||
      Date.parse(s.now) - Date.parse(off.receivedAt) > s.rule.offTtlSeconds * 1000) return result(false, "FRESH_PULSE_OFF_REQUIRED");
  cycle.phase = "SOAK";
  cycle.lastOffAt = off.recordedAt;
  lastOff = off.recordedAt;
  return result(true, "SIMULATED_SOAK_STARTED");
}
