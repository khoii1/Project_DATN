import { z } from "zod";

const timestamp = z.string().datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)));
const id = z.string().min(1).max(128);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const seconds = z.number().int().positive().max(86_400);

export const shadowCycleSchema = z.object({
  id, sessionId: id, ruleId: id, ruleVersion: count.min(1), actuatorCode: id,
  trusted: z.boolean(),
  phase: z.enum(["IDLE", "ELIGIBLE", "PENDING_ACK", "PULSE_ACTIVE", "WAIT_FRESH_OFF", "SOAK", "REEVALUATE", "FAULT_LOCKED"]),
  lastEvaluatedAt: timestamp.nullable(), lastReadingId: id.nullable(), lastReadingRecordedAt: timestamp.nullable(),
  lastPulseStartedAt: timestamp.nullable(), lastOffAt: timestamp.nullable(),
  pulsesInCycle: count, consumedKeys: z.array(z.string().min(1).max(1024)),
}).strict();

export const shadowBudgetSchema = z.object({
  actuatorCode: id, day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), trusted: z.boolean(),
  reservedRuns: count, reservedSeconds: count,
}).strict();

export const shadowSnapshotSchema = z.object({
  mode: z.enum(["DISABLED", "SHADOW"]), now: timestamp,
  reading: z.object({
    readingId: id, deviceCode: id, sensorCode: id, source: z.string(),
    value: z.number().finite().min(0).max(100), recordedAt: timestamp, receivedAt: timestamp,
    mqtt: z.object({ verified: z.boolean(), topicMatches: z.boolean(), authenticated: z.boolean(), retained: z.boolean(), duplicate: z.boolean(), outOfOrder: z.boolean() }).strict(),
  }).strict(),
  device: z.object({
    deviceCode: id, connectionStatus: z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]), lastSeenAt: timestamp.nullable(),
    sessionId: id, sessionStartedAt: timestamp, brokerHealthy: z.boolean(),
  }).strict(),
  actuator: z.object({
    actuatorCode: id, state: z.enum(["ON", "OFF", "UNKNOWN"]), pending: z.boolean(),
    off: z.object({
      sessionId: id, recordedAt: timestamp, receivedAt: timestamp, source: z.string(),
      verified: z.boolean(), retained: z.boolean(), duplicate: z.boolean(),
    }).strict().nullable(),
  }).strict(),
  rule: z.object({
    id, version: count.min(1), enabled: z.boolean(), thresholdOn: z.number().finite().min(0).max(100),
    thresholdOff: z.number().finite().min(0).max(100),
    minRestSeconds: seconds, soakSeconds: seconds, pulseSeconds: seconds,
    maxRunsPerDay: count.min(1), dailyBudgetSeconds: count.min(1), maxPulsesPerCycle: count.min(1),
    maxReadingAgeSeconds: seconds, presenceTtlSeconds: seconds,
    offTtlSeconds: seconds.max(30), clockTtlSeconds: seconds,
    maxClockOffsetMs: z.number().finite().positive().max(2000), futureToleranceMs: count.max(2000),
  }).strict(),
  safety: z.object({ manualOverrideUntil: timestamp.nullable(), faultLatched: z.boolean(), emergencyStop: z.boolean(), lastActuatorOffAt: timestamp.nullable() }).strict(),
  clock: z.object({ health: z.enum(["HEALTHY", "UNHEALTHY", "UNKNOWN"]), checkedAt: timestamp, offsetMs: z.number().finite().nullable() }).strict(),
  cycle: shadowCycleSchema.nullable(), budget: shadowBudgetSchema,
}).strict();

export type ShadowSnapshot = z.infer<typeof shadowSnapshotSchema>;
export type ShadowCycle = z.infer<typeof shadowCycleSchema>;
export type ShadowBudget = z.infer<typeof shadowBudgetSchema>;
export type CyclePhase = ShadowCycle["phase"];

export interface IrrigationDecision {
  mode: "DISABLED" | "SHADOW";
  outcome: "WOULD_ON" | "WOULD_SKIP" | "BLOCKED";
  reasonCode: string;
  message: string;
  deviceCode: string;
  actuatorCode: string;
  sensorCode: string;
  soilMoisture: number | null;
  evaluatedAt: string | null;
  readingId: string | null;
  cycleId: string | null;
  recommendedRunSeconds: number | null;
  idempotencyKey: string | null;
  phaseTransitions: CyclePhase[];
  nextCycle: ShadowCycle | null;
  nextBudget: ShadowBudget | null;
}
