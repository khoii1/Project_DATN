export type ShadowPhase = "IDLE" | "ELIGIBLE" | "PENDING_ACK" | "PULSE_ACTIVE" | "WAIT_FRESH_OFF" | "SOAK" | "REEVALUATE" | "FAULT_LOCKED";
export interface ShadowControls {
  soilMoisture: number; thresholdOn: number; thresholdOff: number;
  connectionStatus: "ONLINE" | "OFFLINE" | "UNKNOWN"; clockHealth: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
  pumpState: "OFF" | "ON" | "UNKNOWN"; brokerHealthy: "true" | "false"; faultLatched: "true" | "false";
  cooldownSeconds: number; soakSeconds: number; reservedRuns: number; reservedSeconds: number;
  cyclePhase: ShadowPhase; readingScenario: "FRESH" | "STALE" | "FUTURE" | "RETAINED" | "DUPLICATE";
}
export const shadowDefaults: ShadowControls = {
  soilMoisture: 18, thresholdOn: 20, thresholdOff: 40, connectionStatus: "ONLINE", clockHealth: "HEALTHY",
  pumpState: "OFF", brokerHealthy: "true", faultLatched: "false", cooldownSeconds: 0, soakSeconds: 0,
  reservedRuns: 0, reservedSeconds: 0, cyclePhase: "IDLE", readingScenario: "FRESH",
};
export interface ShadowPreview {
  source: "FIXTURE" | "MOCK"; liveVerification: "NOT_VERIFIED"; independentScenario: true; evaluatedAt: string;
  notice: string; reasonVi: string; settings: ShadowControls & { deviceId: string };
  decision: {
    mode: "SHADOW"; outcome: "WOULD_ON" | "WOULD_SKIP" | "BLOCKED"; reasonCode: string;
    soilMoisture: number | null; readingId: string | null; cycleId: string | null;
    recommendedRunSeconds: number | null; phaseTransitions: ShadowPhase[];
    nextCycle: { phase: ShadowPhase } | null;
  };
  diagnostics: {
    deviceCode: string; sensorCode: string; actuatorCode: string; clockHealth: string; connectionStatus: string; pumpState: string;
    brokerHealthy: boolean; ruleName: string; cooldownRemainingSeconds: number; soakRemainingSeconds: number;
    dailyRunLimit: number; dailyBudgetSeconds: number; reservedRuns: number; reservedSeconds: number;
    dailyRunsRemaining: number; dailySecondsRemaining: number; cycleBefore: ShadowPhase; cycleAfter: ShadowPhase | null;
  };
}
