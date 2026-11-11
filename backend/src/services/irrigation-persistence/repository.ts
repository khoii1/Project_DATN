import type { IrrigationDecision, ShadowBudget, ShadowCycle, ShadowSnapshot } from "../automatic-irrigation/shadow-schema";

export type IntentStatus = "RESERVED" | "DISPATCH_CLAIMED" | "PUBLISHED" | "ACKED" | "COMPLETED" | "REJECTED" | "UNCERTAIN" | "CANCELLED";
export interface CycleRecord { actuatorId: string; version: number; state: ShadowCycle; policy: ShadowSnapshot["rule"]; soakUntil: string | null }
export interface SafetyRecord {
  actuatorId: string; deviceId: string; deviceCode: string; actuatorCode: string; sessionId: string;
  version: number; faultLatched: boolean; faultReason: string | null; emergencyStop: boolean;
  manualOverrideUntil: string | null; lastActuatorOffAt: string | null; cooldownUntil: string | null;
  lastAcceptedTime: string | null; budgetDayHighWater: string | null;
  reportedState: "OFF" | "UNKNOWN"; // domain evidence only, NEVER updates production Actuator
}
export interface BudgetRecord { id: string; actuatorId: string; version: number; state: ShadowBudget; maxRuns: number; maxSeconds: number }
export interface IntentRecord {
  id: string; key: string; fingerprint: string; correlationId: string; actuatorId: string; cycleId: string;
  sessionId: string; mode: "SHADOW"; status: IntentStatus; version: number; seconds: number; pulseIndex: number;
  issuedAt: string; expiresAt: string; acknowledgedAt: string | null; reason: string | null;
  dispatchClaimedAt: string | null; publishedAt: string | null;
}
export interface ReservationRecord { id: string; intentId: string; budgetId: string; cycleId: string; seconds: number; status: "RESERVED" | "CHARGED" | "RELEASED" | "UNCERTAIN"; version: number; reason: string | null; createdAt: string; settledAt: string | null }
export interface DecisionAudit {
  evaluationKey: string; cycleId: string; actuatorId: string; readingReference: string;
  evaluatedAt: string; source: "FIXTURE" | "MOCK"; mode: "SHADOW"; outcome: IrrigationDecision["outcome"];
  reasonCode: string; ruleId: string; ruleVersion: number; intentId: string | null;
  evidence: Record<string, unknown>;
}

/** Contract for a future PG adapter: SERIALIZABLE or equivalent actuator row lock,
 * CAS on every mutable record, unique key/cycle slot, rollback on any failure.
 * No connection/client is created here. Implementations must return detached records.
 */
export interface IrrigationTransaction {
  lockActuator(id: string): Promise<SafetyRecord | null>;
  getCycle(id: string): Promise<CycleRecord | null>;
  getIntentByKey(key: string): Promise<IntentRecord | null>;
  getIntent(id: string): Promise<IntentRecord | null>;
  /** Includes RESERVED, DISPATCH_CLAIMED, PUBLISHED, ACKED and UNCERTAIN. */
  openIntents(actuatorId: string): Promise<IntentRecord[]>;
  getBudget(id: string): Promise<BudgetRecord | null>;
  getOrCreateBudget(actuatorId: string, day: string, limits: { maxRuns: number; maxSeconds: number; actuatorCode: string }): Promise<BudgetRecord>;
  saveSafety(row: SafetyRecord, expectedVersion: number): Promise<void>;
  saveCycle(row: CycleRecord, expectedVersion: number): Promise<void>;
  saveBudget(row: BudgetRecord, expectedVersion: number): Promise<void>;
  insertIntent(row: IntentRecord): Promise<void>;
  saveIntent(row: IntentRecord, expectedVersion: number): Promise<void>;
  insertReservation(row: ReservationRecord): Promise<void>;
  reservationForIntent(id: string): Promise<ReservationRecord | null>;
  saveReservation(row: ReservationRecord, expectedVersion: number): Promise<void>;
  getDecisionByKey(key: string): Promise<DecisionAudit | null>;
  appendDecision(row: DecisionAudit): Promise<void>;
}
export interface IrrigationRepository {
  readonly mode: "SHADOW";
  readonly environment: "FAKE" | "ISOLATED_TEST";
  transaction<T>(actuatorId: string, work: (tx: IrrigationTransaction) => Promise<T>): Promise<T>;
}
export interface ReserveRequest {
  actuatorId: string; cycleId: string; idempotencyKey: string;
  source: "FIXTURE" | "MOCK"; snapshot: ShadowSnapshot;
}
