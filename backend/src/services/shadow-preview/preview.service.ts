import { z } from "zod";
import { decideIrrigation, irrigationDay, SHADOW_TARGET } from "../automatic-irrigation/decision-engine";
import type { ShadowSnapshot } from "../automatic-irrigation/shadow-schema";

const number = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);
export const previewQuerySchema = z.object({
  deviceId: z.string().min(1).max(128),
  soilMoisture: number(0, 100).default(18), thresholdOn: number(0, 100).default(20), thresholdOff: number(0, 100).default(40),
  connectionStatus: z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]).default("ONLINE"),
  clockHealth: z.enum(["HEALTHY", "UNHEALTHY", "UNKNOWN"]).default("HEALTHY"),
  pumpState: z.enum(["OFF", "ON", "UNKNOWN"]).default("OFF"),
  brokerHealthy: z.enum(["true", "false"]).default("true"),
  faultLatched: z.enum(["true", "false"]).default("false"),
  cooldownSeconds: number(0, 3600).int().default(0), soakSeconds: number(0, 3600).int().default(0),
  reservedRuns: number(0, 100).int().default(0), reservedSeconds: number(0, 100).int().default(0),
  cyclePhase: z.enum(["IDLE", "ELIGIBLE", "PENDING_ACK", "PULSE_ACTIVE", "WAIT_FRESH_OFF", "SOAK", "REEVALUATE", "FAULT_LOCKED"]).default("IDLE"),
  readingScenario: z.enum(["FRESH", "STALE", "FUTURE", "RETAINED", "DUPLICATE"]).default("FRESH"),
}).strict();
export type PreviewQuery = z.infer<typeof previewQuerySchema>;

const reasons: Record<string, string> = {
  SOIL_BELOW_THRESHOLD: "Độ ẩm thấp hơn ngưỡng bật; chỉ đề xuất tưới trong mô phỏng.",
  SOIL_MOISTURE_SUFFICIENT: "Đất đã đủ ẩm theo ngưỡng tắt của mô phỏng.",
  HYSTERESIS_IDLE: "Độ ẩm ở vùng giữa hai ngưỡng; giữ trạng thái nghỉ.",
  HYSTERESIS_HOLD: "Độ ẩm ở vùng hysteresis; giữ chu kỳ, không đề xuất bật thêm.",
  CLOCK_UNKNOWN: "Chưa có bằng chứng đồng bộ thời gian đáng tin cậy.",
  CLOCK_UNHEALTHY: "Đồng hồ không đạt điều kiện an toàn.",
  DEVICE_NOT_ONLINE: "Thiết bị mô phỏng không ONLINE.",
  PUMP_STATE_UNKNOWN: "Trạng thái relay chưa xác định; không được đề xuất tưới.",
  PUMP_ALREADY_ON: "Relay mô phỏng đang ON; không đề xuất bật thêm.",
  BROKER_UNAVAILABLE: "Kết nối MQTT mô phỏng không khỏe.",
  STALE_READING: "Dữ liệu độ ẩm đã quá hạn.", FUTURE_READING: "Timestamp cảm biến ở tương lai vượt giới hạn.",
  RETAINED_READING: "Bản tin retained không được dùng để kích hoạt tưới.", DUPLICATE_READING: "Không dùng lại bản tin cảm biến trùng.",
  COOLDOWN_ACTIVE: "Chưa hết thời gian nghỉ tối thiểu giữa hai lượt tưới.", SOAK_ACTIVE: "Đang chờ nước thấm vào đất.",
  DAILY_RUN_LIMIT: "Đã hết số lượt tưới được mô phỏng trong ngày.", DAILY_BUDGET_EXHAUSTED: "Đã hết ngân sách thời gian tưới mô phỏng.",
  FAULT_LATCHED: "Lỗi đã được chốt; cần xử lý trước khi đánh giá lại.",
  CYCLE_IN_FLIGHT: "Chu kỳ mô phỏng đang chờ ACK, đang chạy pulse hoặc chờ OFF mới.",
  PULSE_OFF_EVIDENCE_MISSING: "Thiếu báo cáo OFF mới sau pulse của chu kỳ mô phỏng.",
  INVALID_THRESHOLDS: "Ngưỡng bật phải nhỏ hơn ngưỡng tắt.",
};

/** Builds only synthetic snapshots. No database, environment, MQTT or command service. */
export function previewShadow(raw: unknown, now: string) {
  const q = previewQuerySchema.parse(raw), ms = Date.parse(now);
  if (!Number.isFinite(ms)) throw new Error("Invalid preview clock");
  const iso = (delta: number) => new Date(ms + delta).toISOString();
  const defaults = previewQuerySchema.parse({ deviceId: q.deviceId });
  const source: "FIXTURE" | "MOCK" = JSON.stringify(q) === JSON.stringify(defaults) ? "FIXTURE" : "MOCK";
  const minRest = Math.max(30, q.cooldownSeconds), soak = Math.max(60, q.soakSeconds + 31);
  const hasPulse = q.soakSeconds > 0 || ["SOAK", "REEVALUATE"].includes(q.cyclePhase);
  const pulseOff = iso(-(soak - q.soakSeconds) * 1000);
  const s: ShadowSnapshot = {
    mode: "SHADOW", now,
    reading: { deviceCode: SHADOW_TARGET.deviceCode, sensorCode: SHADOW_TARGET.sensorCode, readingId: `preview-reading-${ms}`, source: "MQTT", value: q.soilMoisture,
      recordedAt: iso(q.readingScenario === "STALE" ? -120000 : q.readingScenario === "FUTURE" ? 5000 : -1000), receivedAt: iso(-500),
      mqtt: { verified: true, topicMatches: true, authenticated: true, retained: q.readingScenario === "RETAINED", duplicate: q.readingScenario === "DUPLICATE", outOfOrder: false } },
    device: { deviceCode: SHADOW_TARGET.deviceCode, connectionStatus: q.connectionStatus, lastSeenAt: iso(-500), sessionId: "synthetic-session", sessionStartedAt: iso(-7200000), brokerHealthy: q.brokerHealthy === "true" },
    actuator: { actuatorCode: SHADOW_TARGET.actuatorCode, state: q.pumpState, pending: q.cyclePhase === "PENDING_ACK",
      off: { sessionId: "synthetic-session", recordedAt: iso(0), receivedAt: iso(0), source: "MQTT", verified: true, retained: false, duplicate: false } },
    rule: { id: "preview-fixture-rule", version: 1, enabled: true, thresholdOn: q.thresholdOn, thresholdOff: q.thresholdOff,
      minRestSeconds: minRest, soakSeconds: soak, pulseSeconds: 1, maxRunsPerDay: 3, dailyBudgetSeconds: 3, maxPulsesPerCycle: 3,
      maxReadingAgeSeconds: 45, presenceTtlSeconds: 30, offTtlSeconds: 30, clockTtlSeconds: 60, maxClockOffsetMs: 500, futureToleranceMs: 2000 },
    safety: { manualOverrideUntil: null, faultLatched: q.faultLatched === "true", emergencyStop: false,
      lastActuatorOffAt: q.cooldownSeconds > 0 ? iso(-(minRest - q.cooldownSeconds) * 1000) : hasPulse ? pulseOff : null },
    clock: { health: q.clockHealth, checkedAt: now, offsetMs: -50 },
    cycle: { id: "synthetic-cycle", sessionId: "synthetic-session", ruleId: "preview-fixture-rule", ruleVersion: 1, actuatorCode: SHADOW_TARGET.actuatorCode,
      trusted: true, phase: q.soakSeconds > 0 ? "SOAK" : q.cyclePhase, lastEvaluatedAt: null, lastReadingId: null, lastReadingRecordedAt: null,
      lastPulseStartedAt: hasPulse ? new Date(Date.parse(pulseOff) - 1000).toISOString() : null, lastOffAt: hasPulse ? pulseOff : null,
      pulsesInCycle: hasPulse ? 1 : 0, consumedKeys: [] },
    budget: { actuatorCode: SHADOW_TARGET.actuatorCode, day: irrigationDay(now), trusted: true, reservedRuns: q.reservedRuns, reservedSeconds: q.reservedSeconds },
  };
  // Synthetic trust above is ONLY fixture evidence, never labelled VERIFIED_LIVE.
  const decision = decideIrrigation(s);
  const budget = decision.nextBudget ?? s.budget;
  return { source, liveVerification: "NOT_VERIFIED" as const, independentScenario: true, evaluatedAt: now,
    notice: "CHẾ ĐỘ SHADOW — KHÔNG ĐIỀU KHIỂN MÁY BƠM. Dữ liệu, thời gian và trust là giả lập; không phải MQTT live. Ngưỡng fixture không phải cấu hình cho cây.",
    reasonVi: reasons[decision.reasonCode] ?? "Snapshot mô phỏng không đạt điều kiện an toàn; xem reasonCode để đối chiếu.",
    decision, settings: q, diagnostics: { ...SHADOW_TARGET, clockHealth: q.clockHealth, connectionStatus: q.connectionStatus, pumpState: q.pumpState,
      brokerHealthy: s.device.brokerHealthy, ruleName: "Quy tắc fixture (không lưu production)",
      cooldownRemainingSeconds: q.cooldownSeconds, soakRemainingSeconds: q.soakSeconds,
      dailyRunLimit: 3, dailyBudgetSeconds: 3, reservedRuns: budget.reservedRuns, reservedSeconds: budget.reservedSeconds,
      dailyRunsRemaining: Math.max(0, 3 - budget.reservedRuns), dailySecondsRemaining: Math.max(0, 3 - budget.reservedSeconds),
      cycleBefore: s.cycle?.phase, cycleAfter: decision.nextCycle?.phase ?? null } };
}
