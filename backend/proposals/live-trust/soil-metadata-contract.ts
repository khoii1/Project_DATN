/** OFFLINE PROPOSAL ONLY. Not a v1 MQTT schema extension or trusted adapter.
 * Input diagnostics are self-reports; structural validity NEVER grants trust.
 * No imports, clocks, persistence, callbacks, engine or dispatch capabilities.
 */
export interface SoilMetadataBinding {
  deviceCode: string; sensorCode: 'SOIL_01'; recordedAt: string;
  deviceSessionId: string; measurementSequence: number; calibrationVersion: string;
}
export interface SoilDiagnosticMetadata extends SoilMetadataBinding {
  metadataVersion: 'soil-diagnostics-proposal-v1';
  adcResolutionBits: 12; adcSamples: number; rawAdc: number; adcMin: number; adcMax: number;
  contactHealth: 'UNKNOWN' | 'DISCONNECTED' | 'SELF_REPORTED_CONNECTED';
}
const fields = ['metadataVersion', 'deviceCode', 'sensorCode', 'recordedAt', 'deviceSessionId',
  'measurementSequence', 'calibrationVersion', 'adcResolutionBits', 'adcSamples', 'rawAdc', 'adcMin', 'adcMax', 'contactHealth'] as const;
const label = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(v);
const canonicalUtc = (v: unknown): v is string => typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

/** expected must eventually come from independently validated receipt/registry,
 * not be copied from an HTTP request to manufacture an authenticated binding.
 * Even a synthetic all-valid expected/input pair remains observation-only here.
 */
export function inspectSoilMetadata(input: unknown, expected: SoilMetadataBinding) {
  const finish = (status: 'MISSING' | 'INVALID' | 'STRUCTURALLY_VALID', reasons: string[], metadata: SoilDiagnosticMetadata | null) => ({
    status, reasons: [...new Set(reasons)], metadata,
    publisherIdentityVerified: false as const, deviceIdentityVerified: false as const,
    qualityStatus: 'NOT_VERIFIED' as const, irrigationAuthorized: false as const,
    productionAdapterImplemented: false as const,
  });
  if (input === undefined || input === null) return finish('MISSING', ['DIAGNOSTIC_METADATA_MISSING'], null);
  if (typeof input !== 'object' || Array.isArray(input)) return finish('INVALID', ['METADATA_OBJECT_REQUIRED'], null);
  const value = input as Record<string, unknown>, reasons: string[] = [];
  if (Object.keys(value).some(k => !(fields as readonly string[]).includes(k))) reasons.push('UNKNOWN_METADATA_FIELD');
  if (fields.some(k => !Object.prototype.hasOwnProperty.call(value, k))) reasons.push('REQUIRED_METADATA_FIELD_MISSING');
  if (!expected || !/^[A-Z0-9_-]{3,64}$/.test(expected.deviceCode) || expected.sensorCode !== 'SOIL_01' ||
      !canonicalUtc(expected.recordedAt) || !label(expected.deviceSessionId) || !label(expected.calibrationVersion) ||
      !integer(expected.measurementSequence, 0, Number.MAX_SAFE_INTEGER)) reasons.push('EXPECTED_BINDING_INVALID');
  if (value.metadataVersion !== 'soil-diagnostics-proposal-v1') reasons.push('METADATA_VERSION_UNSUPPORTED');
  if (!expected || value.deviceCode !== expected.deviceCode || value.sensorCode !== expected.sensorCode ||
      value.recordedAt !== expected.recordedAt || value.deviceSessionId !== expected.deviceSessionId ||
      value.measurementSequence !== expected.measurementSequence || value.calibrationVersion !== expected.calibrationVersion) reasons.push('MEASUREMENT_BINDING_MISMATCH');
  if (value.adcResolutionBits !== 12 || !integer(value.adcSamples, 1, 64)) reasons.push('ADC_FORMAT_INVALID');
  if (![value.rawAdc, value.adcMin, value.adcMax].every(v => integer(v, 0, 4095))) reasons.push('ADC_RANGE_INVALID');
  else if ((value.adcMin as number) > (value.rawAdc as number) || (value.rawAdc as number) > (value.adcMax as number)) reasons.push('ADC_SUMMARY_INCONSISTENT');
  if (value.adcSamples === 1 && (value.adcMin !== value.rawAdc || value.adcMax !== value.rawAdc)) reasons.push('SINGLE_ADC_SAMPLE_INCONSISTENT');
  if (!['UNKNOWN', 'DISCONNECTED', 'SELF_REPORTED_CONNECTED'].includes(value.contactHealth as string)) reasons.push('CONTACT_HEALTH_INVALID');
  if (reasons.length) return finish('INVALID', reasons, null);
  // No direct reference to mutable input is returned, and no registry is invented.
  const metadata: SoilDiagnosticMetadata = {
    metadataVersion: 'soil-diagnostics-proposal-v1', deviceCode: value.deviceCode as string, sensorCode: 'SOIL_01',
    recordedAt: value.recordedAt as string, deviceSessionId: value.deviceSessionId as string,
    measurementSequence: value.measurementSequence as number, calibrationVersion: value.calibrationVersion as string,
    adcResolutionBits: 12, adcSamples: value.adcSamples as number, rawAdc: value.rawAdc as number,
    adcMin: value.adcMin as number, adcMax: value.adcMax as number,
    contactHealth: value.contactHealth as SoilDiagnosticMetadata['contactHealth'],
  };
  const warnings = ['STRUCTURE_ONLY_NOT_SENSOR_OR_PUBLISHER_PROOF'];
  if (metadata.adcMin === 0 || metadata.adcMax === 4095) warnings.push('ADC_RAIL_REQUIRES_QUALITY_REVIEW');
  if (metadata.contactHealth !== 'SELF_REPORTED_CONNECTED') warnings.push('CONTACT_HEALTH_NOT_ESTABLISHED');
  else warnings.push('CONTACT_CONNECTED_IS_SELF_REPORT_ONLY');
  return finish('STRUCTURALLY_VALID', warnings, metadata);
}
