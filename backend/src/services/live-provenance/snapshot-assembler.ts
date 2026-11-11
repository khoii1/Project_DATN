import type { ClockHealth } from "./clock-health";
import type { ReceiptEvidence, OffEvidence } from "./evidence-store";

/** No HTTP supplied trust/policy fields. No production persistence source exists yet.
 * Do NOT manufacture cycle/budget/safety or invoke engine with a partial snapshot. */
export function assembleLiveObservation(input: {
  receipt: ReceiptEvidence | null; off: OffEvidence | null; clock: ClockHealth;
  presence: { connectionStatus: string; lastSeenAt: string | null };
}, now: string) {
  const problems = ["PUBLISHER_IDENTITY_NOT_VERIFIED", "PRODUCTION_POLICY_CYCLE_BUDGET_SAFETY_UNAVAILABLE"];
  const receipt = input.receipt, off = input.off, nowMs = Date.parse(now);
  if (!receipt?.reading) problems.push("READING_CORRELATION_NOT_PROVEN");
  if (receipt && (nowMs - Date.parse(receipt.callbackReceivedAt) > 45000 || nowMs - Date.parse(receipt.recordedAt) > 45000 ||
      Date.parse(receipt.recordedAt) > nowMs + 2000 || Date.parse(receipt.callbackReceivedAt) > nowMs + 2000)) problems.push("READING_EVIDENCE_EXPIRED_OR_FUTURE");
  if (input.presence.connectionStatus !== "ONLINE" || !input.presence.lastSeenAt || nowMs - Date.parse(input.presence.lastSeenAt) > 30000 || Date.parse(input.presence.lastSeenAt) > nowMs + 2000) problems.push("DEVICE_PRESENCE_UNTRUSTED");
  if (!off || !receipt || off.sessionId !== receipt.sessionId || off.generation !== receipt.generation ||
      nowMs - Date.parse(off.recordedAt) > 30000 || nowMs - Date.parse(off.callbackReceivedAt) > 30000 || Date.parse(off.recordedAt) > nowMs + 2000) problems.push("FRESH_OFF_SAME_OBSERVER_SESSION_REQUIRED");
  if (input.clock.health !== "HEALTHY" || nowMs - Date.parse(input.clock.checkedAt) > input.clock.ttlMs || Date.parse(input.clock.checkedAt) > nowMs || input.clock.clockJumpDetected) problems.push("CLOCK_HEALTH_NOT_TRUSTED");
  return { mode: "SHADOW" as const, source: "LIVE_OBSERVED_NOT_VERIFIED" as const,
    status: problems.length > 2 ? "BLOCKED" as const : "LIVE_OBSERVED_NOT_VERIFIED" as const,
    verifiedLiveReady: false, publisherIdentityAssurance: "NOT_VERIFIED" as const, deviceBootSession: "NOT_PROVIDED_BY_FIRMWARE" as const,
    notice: receipt?.reading ? "Đã nhận dữ liệu cảm biến thật — Chưa đủ bằng chứng để cấp VERIFIED_LIVE."
      : "Chưa có đủ evidence cảm biến mới đã đối chiếu trong phiên hiện tại.",
    reasons: problems, evaluatedAt: now, reading: receipt, off, clock: input.clock, presence: input.presence,
    policy: null, cycle: null, budget: null, safety: null, snapshot: null, decision: null,
    engineCalled: false, commandCreated: false };
}
