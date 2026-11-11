import { pumpRuntimeLimit } from "../pump-command-policy";
import { shadowSnapshotSchema, type IrrigationDecision, type ShadowSnapshot } from "./shadow-schema";

// This phase deliberately has one fixed hardware identity, no production configuration.
export const SHADOW_TARGET = Object.freeze({ deviceCode: "ESP32-GF-A-01", actuatorCode: "PUMP_01", sensorCode: "SOIL_01" });
const at = (value: string) => Date.parse(value);
export const irrigationDay = (iso: string): string => new Date(at(iso) + 7 * 3_600_000).toISOString().slice(0, 10);

/** Pure snapshot -> decision + proposed in-memory state. No clock, random ID, I/O or commands. */
export function decideIrrigation(raw: unknown): IrrigationDecision {
  const parsed = shadowSnapshotSchema.safeParse(raw);
  if (!parsed.success) return {
    ...SHADOW_TARGET, mode: "DISABLED", outcome: "BLOCKED", reasonCode: "SNAPSHOT_INVALID",
    message: "Incomplete or invalid snapshot; no action is permitted.", evaluatedAt: null,
    soilMoisture: null, readingId: null, cycleId: null, recommendedRunSeconds: null,
    idempotencyKey: null, phaseTransitions: [], nextCycle: null, nextBudget: null,
  };
  const s: ShadowSnapshot = parsed.data;
  const cycle = s.cycle ? { ...s.cycle, consumedKeys: [...s.cycle.consumedKeys] } : null;
  const budget = { ...s.budget };
  const now = at(s.now), tolerance = s.rule.futureToleranceMs;
  const decision = (outcome: IrrigationDecision["outcome"], reasonCode: string): IrrigationDecision => ({
    ...SHADOW_TARGET, mode: s.mode, outcome, reasonCode,
    message: `Shadow only: ${reasonCode.toLowerCase().replaceAll("_", " ")}. No command is issued.`,
    soilMoisture: s.reading.value, evaluatedAt: s.now, readingId: s.reading.readingId,
    cycleId: cycle?.id ?? null, recommendedRunSeconds: null, idempotencyKey: null,
    phaseTransitions: [], nextCycle: cycle, nextBudget: budget,
  });
  const blocked = (code: string) => decision("BLOCKED", code);
  if (s.mode === "DISABLED" || !s.rule.enabled) return blocked("AUTOMATION_DISABLED");
  if (s.rule.thresholdOn >= s.rule.thresholdOff) return blocked("INVALID_THRESHOLDS");
  // Reuse the production pure cap; SHADOW policy never recommends more than test-mode 1s.
  if (s.rule.pulseSeconds > pumpRuntimeLimit(s.rule.pulseSeconds, true)) return blocked("POLICY_RUNTIME_EXCEEDED");
  if (s.reading.deviceCode !== SHADOW_TARGET.deviceCode || s.device.deviceCode !== SHADOW_TARGET.deviceCode ||
      s.reading.sensorCode !== SHADOW_TARGET.sensorCode || s.actuator.actuatorCode !== SHADOW_TARGET.actuatorCode ||
      s.budget.actuatorCode !== SHADOW_TARGET.actuatorCode) return blocked("IDENTITY_MISMATCH");
  if (s.safety.emergencyStop) return blocked("EMERGENCY_STOP");
  if (s.safety.faultLatched || cycle?.phase === "FAULT_LOCKED") return blocked("FAULT_LATCHED");
  if (s.clock.health !== "HEALTHY") return blocked(`CLOCK_${s.clock.health}`);
  if (at(s.clock.checkedAt) > now) return blocked("CLOCK_SNAPSHOT_FUTURE");
  if (now - at(s.clock.checkedAt) > s.rule.clockTtlSeconds * 1000) return blocked("CLOCK_SNAPSHOT_STALE");
  if (s.clock.offsetMs === null || Math.abs(s.clock.offsetMs) > s.rule.maxClockOffsetMs) return blocked("CLOCK_OFFSET_UNTRUSTED");
  if (s.reading.source !== "MQTT") return blocked("READING_SOURCE_INVALID");
  const trust = s.reading.mqtt;
  if (!trust.verified || !trust.topicMatches || !trust.authenticated) return blocked("MQTT_READING_UNTRUSTED");
  if (trust.retained) return blocked("RETAINED_READING");
  if (trust.duplicate) return blocked("DUPLICATE_READING");
  if (trust.outOfOrder) return blocked("OUT_OF_ORDER_READING");
  if (at(s.reading.recordedAt) > now + tolerance || at(s.reading.receivedAt) > now + tolerance ||
      at(s.reading.recordedAt) > at(s.reading.receivedAt) + tolerance) return blocked("FUTURE_READING");
  if (now - at(s.reading.recordedAt) > s.rule.maxReadingAgeSeconds * 1000 ||
      now - at(s.reading.receivedAt) > s.rule.maxReadingAgeSeconds * 1000) return blocked("STALE_READING");
  if (s.device.connectionStatus !== "ONLINE") return blocked("DEVICE_NOT_ONLINE");
  if (!s.device.lastSeenAt || now - at(s.device.lastSeenAt) > s.rule.presenceTtlSeconds * 1000 ||
      at(s.device.lastSeenAt) > now + tolerance) return blocked("PRESENCE_UNTRUSTED");
  if (!s.device.brokerHealthy) return blocked("BROKER_UNAVAILABLE");
  if (s.actuator.pending) return blocked("COMMAND_PENDING");
  if (s.actuator.state !== "OFF") return blocked(s.actuator.state === "ON" ? "PUMP_ALREADY_ON" : "PUMP_STATE_UNKNOWN");
  const off = s.actuator.off;
  if (!off || !off.verified || off.source !== "MQTT" || off.retained || off.duplicate) return blocked("OFF_UNTRUSTED");
  if (off.sessionId !== s.device.sessionId || at(off.recordedAt) < at(s.device.sessionStartedAt) ||
      at(s.device.sessionStartedAt) > now) return blocked("OFF_SESSION_MISMATCH");
  if (at(off.recordedAt) > now + tolerance || at(off.receivedAt) > now + tolerance ||
      at(off.recordedAt) > at(off.receivedAt) + tolerance || now - at(off.recordedAt) > s.rule.offTtlSeconds * 1000 ||
      now - at(off.receivedAt) > s.rule.offTtlSeconds * 1000) return blocked("OFF_STALE_OR_FUTURE");
  if (!cycle || !cycle.trusted) return blocked("CYCLE_STATE_UNTRUSTED");
  if (cycle.sessionId !== s.device.sessionId || cycle.ruleId !== s.rule.id || cycle.ruleVersion !== s.rule.version ||
      cycle.actuatorCode !== s.actuator.actuatorCode) return blocked("CYCLE_CONTEXT_MISMATCH");
  if ((cycle.lastEvaluatedAt && at(cycle.lastEvaluatedAt) > now) ||
      (cycle.lastPulseStartedAt && at(cycle.lastPulseStartedAt) > now) ||
      (cycle.lastOffAt && at(cycle.lastOffAt) > now) ||
      (s.safety.lastActuatorOffAt && at(s.safety.lastActuatorOffAt) > now)) return blocked("CYCLE_TIMESTAMP_FUTURE");
  if (!s.budget.trusted || s.budget.day !== irrigationDay(s.now)) return blocked("BUDGET_STATE_UNTRUSTED");
  if (s.safety.manualOverrideUntil && at(s.safety.manualOverrideUntil) > now) return blocked("MANUAL_OVERRIDE");
  if (["PENDING_ACK", "PULSE_ACTIVE", "WAIT_FRESH_OFF"].includes(cycle.phase)) return blocked("CYCLE_IN_FLIGHT");
  if (cycle.lastReadingId === s.reading.readingId ||
      (cycle.lastReadingRecordedAt && at(s.reading.recordedAt) <= at(cycle.lastReadingRecordedAt))) return blocked("READING_ALREADY_EVALUATED");
  if (cycle.pulsesInCycle > 0 && (!cycle.lastOffAt || !s.safety.lastActuatorOffAt ||
      !cycle.lastPulseStartedAt || at(cycle.lastOffAt) < at(cycle.lastPulseStartedAt) ||
      at(off.recordedAt) < at(cycle.lastOffAt))) return blocked("PULSE_OFF_EVIDENCE_MISSING");
  const lastOff = Math.max(cycle.lastOffAt ? at(cycle.lastOffAt) : -Infinity,
    s.safety.lastActuatorOffAt ? at(s.safety.lastActuatorOffAt) : -Infinity);
  if (lastOff !== -Infinity && now - lastOff < s.rule.minRestSeconds * 1000) return blocked("COOLDOWN_ACTIVE");
  if (cycle.phase === "SOAK" && !cycle.lastOffAt) return blocked("PULSE_OFF_EVIDENCE_MISSING");
  if (cycle.lastOffAt && now - at(cycle.lastOffAt) < s.rule.soakSeconds * 1000) return blocked("SOAK_ACTIVE");
  if (cycle.lastOffAt && at(s.reading.recordedAt) <= at(cycle.lastOffAt)) return blocked("READING_BEFORE_PULSE_OFF");
  if (cycle.phase === "SOAK") cycle.phase = "REEVALUATE";
  if (s.budget.reservedRuns >= s.rule.maxRunsPerDay) return blocked("DAILY_RUN_LIMIT");
  if (s.budget.reservedSeconds + s.rule.pulseSeconds > s.rule.dailyBudgetSeconds) return blocked("DAILY_BUDGET_EXHAUSTED");
  if (cycle.pulsesInCycle >= s.rule.maxPulsesPerCycle) return blocked("CYCLE_PULSE_LIMIT");
  const markReading = () => {
    cycle.lastEvaluatedAt = s.now;
    cycle.lastReadingId = s.reading.readingId;
    cycle.lastReadingRecordedAt = s.reading.recordedAt;
  };
  if (s.reading.value >= s.rule.thresholdOff) {
    markReading(); cycle.phase = "IDLE";
    return decision("WOULD_SKIP", "SOIL_MOISTURE_SUFFICIENT");
  }
  if (s.reading.value >= s.rule.thresholdOn) {
    const idle = cycle.phase === "IDLE";
    markReading();
    return decision("WOULD_SKIP", idle ? "HYSTERESIS_IDLE" : "HYSTERESIS_HOLD");
  }
  const key = JSON.stringify([s.rule.id, s.rule.version, s.actuator.actuatorCode, cycle.id, cycle.pulsesInCycle]);
  if (cycle.consumedKeys.includes(key)) return blocked("IDEMPOTENCY_KEY_CONSUMED");
  const previousPhase = cycle.phase;
  markReading();
  cycle.consumedKeys.push(key);
  cycle.pulsesInCycle++;
  cycle.phase = "PENDING_ACK"; // A simulated reservation, never a DeviceCommand.
  budget.reservedRuns++;
  budget.reservedSeconds += s.rule.pulseSeconds;
  return { ...decision("WOULD_ON", "SOIL_BELOW_THRESHOLD"), recommendedRunSeconds: s.rule.pulseSeconds, idempotencyKey: key,
    phaseTransitions: [previousPhase, "ELIGIBLE", "PENDING_ACK"] };
}
