export type SoilQuality = 'VALID_OBSERVED' | 'SUSPECT' | 'INVALID' | 'NOT_VERIFIED';
export interface SoilSample {
  readingId: string; deviceCode: string; sensorCode: string; source: string;
  value: number | null; recordedAt: string; receivedAt: string; observerSession: string;
  rawAdc?: number; calibrationVersion?: string; disconnected?: boolean;
}
export interface SoilQualityPolicy {
  version: string; approvedForObservation: boolean; deviceCode: string; sensorCode: string;
  calibration: { version: string; approved: boolean; dryAdc: number; wetAdc: number };
  ttlMs: number; windowMs: number; maxGapMs: number; consecutiveSamples: number; stuckSamples: number;
  stuckSpanMs: number; stuckTolerance: number; maxSpikePoints: number; maxRatePointsPerSecond: number; maxNoiseStdDev: number;
}
/** Diagnostic proposal, NOT crop thresholds. Not approved/deployed for live quality decisions. */
export const soilQualityProposal: Readonly<SoilQualityPolicy> = {
  version: '13.4C-quality-proposal-v1', approvedForObservation: false, deviceCode: 'ESP32-GF-A-01', sensorCode: 'SOIL_01',
  calibration: { version: 'LM393-3500-1507-PROPOSAL', approved: false, dryAdc: 3500, wetAdc: 1507 },
  ttlMs: 45000, windowMs: 120000, maxGapMs: 30000, consecutiveSamples: 3, stuckSamples: 4, stuckSpanMs: 45000,
  stuckTolerance: 0.02, maxSpikePoints: 20, maxRatePointsPerSecond: 5, maxNoiseStdDev: 3,
};

/** No IO, global state, clock lookup or defaults pretending missing ADC/calibration exists. */
export function assessSoilQuality(sample: SoilSample, history: readonly SoilSample[], policy: SoilQualityPolicy, now: string) {
  const invalid: string[] = [], suspect: string[] = [], missing: string[] = [];
  const n = Date.parse(now), recorded = Date.parse(sample.recordedAt), received = Date.parse(sample.receivedAt);
  const c = policy.calibration;
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const raw = (v: SoilSample) => finite(v.rawAdc) && Number.isInteger(v.rawAdc) && v.rawAdc > 0 && v.rawAdc < 4095;
  const percent = (adc: number) => Math.max(0, Math.min(100, 100 * (c.dryAdc - adc) / (c.dryAdc - c.wetAdc)));
  const numbers = [policy.ttlMs, policy.windowMs, policy.maxGapMs, policy.stuckSpanMs, policy.stuckTolerance, policy.maxSpikePoints, policy.maxRatePointsPerSecond, policy.maxNoiseStdDev];
  if (!policy.version || numbers.some(v => !finite(v) || v <= 0) || policy.ttlMs > 45000 || policy.windowMs > 300000 ||
      !Number.isInteger(policy.consecutiveSamples) || policy.consecutiveSamples < 2 || policy.consecutiveSamples > 32 ||
      !Number.isInteger(policy.stuckSamples) || policy.stuckSamples < 3 || policy.stuckSamples > 32 ||
      !Number.isInteger(c.dryAdc) || !Number.isInteger(c.wetAdc) || c.dryAdc <= c.wetAdc || c.dryAdc > 4095 || c.wetAdc < 0) invalid.push('QUALITY_POLICY_INVALID');
  if (sample.deviceCode !== policy.deviceCode || sample.sensorCode !== policy.sensorCode || sample.source !== 'MQTT' || !sample.readingId || !sample.observerSession) invalid.push('SENSOR_IDENTITY_OR_SOURCE_INVALID');
  if (!finite(sample.value) || sample.value < 0 || sample.value > 100) invalid.push('PERCENT_INVALID');
  if (![n, recorded, received].every(Number.isFinite) || recorded > n + 2000 || received > n + 2000 || recorded > received + 2000 ||
      n - recorded > policy.ttlMs || n - received > policy.ttlMs) invalid.push('READING_TIME_INVALID_OR_STALE');
  if (!policy.approvedForObservation || !c.approved || !c.version) missing.push('QUALITY_OR_CALIBRATION_POLICY_NOT_APPROVED');
  if (!sample.calibrationVersion) missing.push('CALIBRATION_VERSION_MISSING');
  else if (sample.calibrationVersion !== c.version) invalid.push('CALIBRATION_VERSION_MISMATCH');
  if (sample.rawAdc === undefined) missing.push('RAW_ADC_MISSING');
  else if (!finite(sample.rawAdc) || !Number.isInteger(sample.rawAdc) || sample.rawAdc < 0 || sample.rawAdc > 4095) invalid.push('RAW_ADC_INVALID');
  else {
    if (sample.rawAdc === 0 || sample.rawAdc === 4095) invalid.push('ADC_AT_RAIL');
    if (sample.rawAdc < c.wetAdc || sample.rawAdc > c.dryAdc) suspect.push('ADC_SATURATION_OR_CLAMP');
    if (finite(sample.value) && Math.abs(percent(sample.rawAdc) - sample.value) > 0.5) suspect.push('ADC_PERCENT_MISMATCH');
  }
  if (sample.value === 0 || sample.value === 100) suspect.push('ENDPOINT_CLAMP_POSSIBLE');
  if (sample.disconnected === true) invalid.push('SENSOR_DISCONNECTED');
  else if (sample.disconnected !== false) missing.push('CONTACT_HEALTH_MISSING');
  if (history.length > 32) invalid.push('QUALITY_WINDOW_CAPACITY_EXCEEDED');
  // Never mix another sensor/session/calibration, duplicate ids or out-of-order history into a valid streak.
  if (history.some(v => !Number.isFinite(Date.parse(v.recordedAt)))) missing.push('QUALITY_WINDOW_TIME_UNPROVEN');
  const window = history.slice(-32).filter(v => n - Date.parse(v.recordedAt) <= policy.windowMs);
  const samples = [...window, sample], ids = new Set<string>();
  let prevAt = -Infinity, validStreak = 0;
  for (const item of samples) {
    const at = Date.parse(item.recordedAt), rx = Date.parse(item.receivedAt);
    const compatible = item.deviceCode === sample.deviceCode && item.sensorCode === sample.sensorCode && item.source === 'MQTT' &&
      item.observerSession === sample.observerSession && item.calibrationVersion === c.version;
    const ordered = Number.isFinite(at) && at > prevAt && at <= n + 2000 && Number.isFinite(rx) && rx <= n + 2000 && at <= rx + 2000;
    if (!compatible || !ordered || !item.readingId || ids.has(item.readingId)) missing.push('QUALITY_WINDOW_IDENTITY_ORDER_UNPROVEN');
    const valid = compatible && ordered && !!item.readingId && !ids.has(item.readingId) && finite(item.value) && item.value > 0 && item.value < 100 &&
      raw(item) && item.rawAdc! >= c.wetAdc && item.rawAdc! <= c.dryAdc && Math.abs(percent(item.rawAdc!) - item.value!) <= 0.5 && item.disconnected === false;
    validStreak = valid ? (prevAt !== -Infinity && at - prevAt > policy.maxGapMs ? 1 : validStreak + 1) : 0;
    ids.add(item.readingId); prevAt = at;
  }
  const numeric = samples.filter(v => finite(v.value) && Number.isFinite(Date.parse(v.recordedAt)));
  for (let i = 1; i < numeric.length; i++) {
    const delta = Math.abs(numeric[i].value! - numeric[i - 1].value!), seconds = (Date.parse(numeric[i].recordedAt) - Date.parse(numeric[i - 1].recordedAt)) / 1000;
    if (delta > policy.maxSpikePoints) suspect.push('OUTLIER_SPIKE');
    if (seconds > 0 && delta / seconds > policy.maxRatePointsPerSecond) suspect.push('RATE_OF_CHANGE');
  }
  if (numeric.length >= 3) {
    const mean = numeric.reduce((sum, v) => sum + v.value!, 0) / numeric.length;
    const std = Math.sqrt(numeric.reduce((sum, v) => sum + (v.value! - mean) ** 2, 0) / numeric.length);
    if (std > policy.maxNoiseStdDev) suspect.push('NOISY_WINDOW');
  }
  const tail = numeric.slice(-policy.stuckSamples);
  if (tail.length === policy.stuckSamples && Date.parse(tail[tail.length - 1].recordedAt) - Date.parse(tail[0].recordedAt) >= policy.stuckSpanMs &&
      Math.max(...tail.map(v => v.value!)) - Math.min(...tail.map(v => v.value!)) <= policy.stuckTolerance) suspect.push('STUCK_READING_SUSPECTED');
  if (validStreak < policy.consecutiveSamples) missing.push('CONSECUTIVE_VALID_SAMPLES_MISSING');
  const status: SoilQuality = invalid.length ? 'INVALID' : suspect.length ? 'SUSPECT' : missing.length ? 'NOT_VERIFIED' : 'VALID_OBSERVED';
  const expiry = new Date(Math.min(recorded, received) + policy.ttlMs);
  const validUntil = Number.isFinite(expiry.getTime()) ? expiry.toISOString() : null;
  return { status, reasons: [...new Set([...invalid, ...suspect, ...missing])], value: sample.value, policyVersion: policy.version,
    consecutiveValidSamples: validStreak, checkedAt: now, validUntil, publisherIdentityVerified: false as const, irrigationAuthorized: false as const };
}
