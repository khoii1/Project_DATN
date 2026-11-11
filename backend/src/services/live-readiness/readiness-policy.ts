import type { ClockHealth } from '../live-provenance/clock-health';

export type GateStatus = 'PASS' | 'FAIL' | 'NOT_VERIFIED' | 'NOT_IMPLEMENTED';
export interface EvidenceGate { status: GateStatus; evidenceId: string | null; checkedAt: string | null; expiresAt: string | null }
export const requiredLiveGates = ['receiptCorrelation', 'publisherAssurance', 'deviceSession', 'soilQuality', 'freshOff',
  'productionPolicy', 'persistentCycle', 'persistentBudget', 'persistentSafety', 'idempotency', 'farmDeviceRbac', 'emergencyStop', 'restartRecovery'] as const;
export type LiveGate = typeof requiredLiveGates[number];

/** Evidence matrix, NOT a dispatcher. Production attestation/persistence adapters are not installed. */
export function assessLiveReadiness(gates: Partial<Record<LiveGate, EvidenceGate>>, clock: ClockHealth, now: string) {
  const n = Date.parse(now);
  const matrix: { gate: LiveGate | 'clockHealth'; status: GateStatus; evidenceId: string | null }[] = requiredLiveGates.map(key => {
    const gate = gates[key];
    const fresh = !!gate && !!gate.evidenceId && !!gate.checkedAt && !!gate.expiresAt &&
      Number.isFinite(n) && Number.isFinite(Date.parse(gate.checkedAt)) && Number.isFinite(Date.parse(gate.expiresAt)) &&
      Date.parse(gate.checkedAt) <= n && Date.parse(gate.expiresAt) > n && Date.parse(gate.expiresAt) > Date.parse(gate.checkedAt);
    const status: GateStatus = !gate ? 'NOT_IMPLEMENTED' : gate.status === 'PASS' && !fresh ? 'NOT_VERIFIED' : gate.status;
    return { gate: key, status, evidenceId: gate?.evidenceId ?? null };
  });
  const checked = Date.parse(clock.checkedAt);
  const synced = Date.parse(clock.lastSuccessfulSync ?? '');
  const clockHealthy = clock.health === 'HEALTHY' && !clock.clockJumpDetected && clock.lastSyncError === 0 && clock.leapIndicator === 0 &&
    clock.source === 'time.windows.com,0x8' && typeof clock.stratum === 'number' && clock.stratum >= 1 && clock.stratum <= 15 &&
    Number.isFinite(synced) && synced <= n && n - synced <= 3600000 &&
    typeof clock.offsetMs === 'number' && Number.isFinite(clock.offsetMs) && Math.abs(clock.offsetMs) <= 500 &&
    Number.isFinite(n) && Number.isFinite(checked) && checked <= n && n - checked <= Math.min(clock.ttlMs, 60000) && clock.ttlMs > 0;
  matrix.push({ gate: 'clockHealth', status: clockHealthy ? 'PASS' : 'NOT_VERIFIED', evidenceId: clockHealthy ? clock.checkedAt : null });
  return { matrix, observationConditionsComplete: matrix.every(g => g.status === 'PASS'),
    // Even synthetic all-PASS gates must never act as a production enable switch.
    verifiedLiveReady: false as const, reason: 'PRODUCTION_TRUST_ADAPTERS_NOT_DEPLOYED',
    engineCalled: false as const, commandCreated: false as const, automationActive: false as const };
}
