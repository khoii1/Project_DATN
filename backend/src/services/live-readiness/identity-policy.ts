/** Pure, offline assessment only. Never accepts an HTTP/MQTT self-declared trust flag.
 * A future trusted attestation adapter must construct these inputs; none is deployed. */
export interface BrokerAttestation {
  reviewId: string; approved: boolean; principal: string; deviceCode: string;
  checkedAt: string; expiresAt: string; configHash: string; aclHash: string;
  runningConfigHash: string; runningAclHash: string;
  anonymousDenied: boolean; topicPrincipalBindingTested: boolean;
  credentialIsolationAudited: boolean; revocationAudited: boolean;
  protectedTransport: boolean; protectedConnectionAudit: boolean;
}
export function assessPublisher(input: { correlatedReceipt: boolean; principal?: string;
  deviceCode: string; attestation?: BrokerAttestation | null }, now: string) {
  const a = input.attestation, reasons: string[] = [];
  const nowMs = Date.parse(now), hash = (s: string) => /^[a-f0-9]{64}$/i.test(s);
  if (!input.correlatedReceipt) reasons.push('CORRELATED_RECEIPT_REQUIRED');
  if (!a) reasons.push('BROKER_ATTESTATION_MISSING');
  else {
    if (!a.approved || !a.reviewId) reasons.push('ATTESTATION_REVIEW_NOT_APPROVED');
    if (!Number.isFinite(nowMs) || !Number.isFinite(Date.parse(a.checkedAt)) || !Number.isFinite(Date.parse(a.expiresAt)) ||
        Date.parse(a.checkedAt) > nowMs || Date.parse(a.expiresAt) <= nowMs || Date.parse(a.expiresAt) <= Date.parse(a.checkedAt) ||
        Date.parse(a.expiresAt) - Date.parse(a.checkedAt) > 300_000) reasons.push('ATTESTATION_EXPIRED_OR_INVALID');
    if (!input.principal || a.principal !== input.principal || a.deviceCode !== input.deviceCode || a.principal !== a.deviceCode) reasons.push('PRINCIPAL_BINDING_UNPROVEN');
    if (!hash(a.configHash) || !hash(a.aclHash) || a.configHash !== a.runningConfigHash || a.aclHash !== a.runningAclHash) reasons.push('EFFECTIVE_POLICY_UNPROVEN');
    if (![a.anonymousDenied, a.topicPrincipalBindingTested, a.credentialIsolationAudited, a.revocationAudited,
      a.protectedTransport, a.protectedConnectionAudit].every(flag => flag === true)) reasons.push('BROKER_CONTROLS_INCOMPLETE');
  }
  // A broker principal is NOT cryptographic device identity, nor a per-packet MQTT3 publisher proof.
  return { level: reasons.length === 0 ? 'BROKER_POLICY_ATTESTED' as const : input.correlatedReceipt ? 'OBSERVED' as const : 'NOT_VERIFIED' as const,
    packetPublisherIdentity: 'NOT_VERIFIED' as const, deviceIdentity: 'NOT_VERIFIED' as const,
    reasons, deviceIdentityVerifierImplemented: false as const };
}

export interface ObserverSession { id: string; generation: number; startedAt: string; connected: boolean }
export interface DeviceSessionContract {
  deviceCode: string; bootId: string; credentialVersion: string;
  establishedAt: string; expiresAt: string; revoked: boolean;
  /** Only a future authenticated session establishment may supply this context. */
  establishedByTrustedAdapter: boolean;
}
export interface SessionMessage {
  deviceCode: string; bootId?: string; sequence?: number; credentialVersion?: string;
  observerId: string; observerGeneration: number; recordedAt: string; receivedAt: string; digest: string;
  retain: boolean; duplicate: boolean;
}
export interface ReplayCursor {
  deviceCode: string; observerId: string; observerGeneration: number; bootId: string; credentialVersion: string;
  sequence: number; receivedAt: string; digest: string;
}
/** Proposal v2: sequence is global per boot across telemetry/status/state; context reset alone cannot authenticate a boot. */
export function assessSession(observer: ObserverSession, context: DeviceSessionContract | null,
  message: SessionMessage, previous: ReplayCursor | null, now: string) {
  const fail = (reason: string) => ({ status: 'NOT_VERIFIED' as const, reason, next: null, deviceIdentityVerified: false as const });
  const n = Date.parse(now), start = Date.parse(observer.startedAt), recorded = Date.parse(message.recordedAt), received = Date.parse(message.receivedAt);
  if (!observer.connected || !Number.isInteger(observer.generation) || observer.generation < 0 || !observer.id ||
      !Number.isFinite(start) || start > n) return fail('OBSERVER_INVALIDATED');
  if (message.observerId !== observer.id || message.observerGeneration !== observer.generation) return fail('OBSERVER_SESSION_MISMATCH');
  if (![n, recorded, received].every(Number.isFinite) || recorded < start || received < start || recorded > received + 2000 ||
      recorded > n + 2000 || received > n + 2000 || n - received > 45000 || n - recorded > 45000) return fail('SESSION_TIME_UNTRUSTED');
  if (message.retain || message.duplicate || !message.digest) return fail('REPLAY_PACKET');
  if (!context?.establishedByTrustedAdapter || !context.bootId || !context.credentialVersion ||
      !message.bootId || !message.credentialVersion || message.sequence === undefined) return fail('DEVICE_SESSION_METADATA_UNPROVEN');
  const established = Date.parse(context.establishedAt), expires = Date.parse(context.expiresAt);
  if (context.revoked !== false || !Number.isFinite(established) || !Number.isFinite(expires) ||
      established > n || expires <= n || expires <= established || recorded < established) return fail('DEVICE_SESSION_REVOKED_OR_EXPIRED');
  if (message.deviceCode !== context.deviceCode || message.bootId !== context.bootId || message.credentialVersion !== context.credentialVersion) return fail('DEVICE_SESSION_MISMATCH');
  if (!Number.isSafeInteger(message.sequence) || message.sequence < 0) return fail('SEQUENCE_INVALID');
  const same = previous && previous.observerId === observer.id && previous.observerGeneration === observer.generation;
  if (previous && (previous.deviceCode !== context.deviceCode || !previous.bootId || !previous.credentialVersion ||
      !Number.isSafeInteger(previous.sequence) || previous.sequence < 0 || !Number.isFinite(Date.parse(previous.receivedAt)))) return fail('REPLAY_CURSOR_INVALID');
  if (same && (previous.bootId !== context.bootId || previous.credentialVersion !== context.credentialVersion)) return fail('EXPLICIT_SESSION_REESTABLISHMENT_REQUIRED');
  const sameBoot = previous && previous.bootId === context.bootId && previous.credentialVersion === context.credentialVersion;
  // Reconnect invalidates receipts, NOT the per-device boot high-water mark.
  if (sameBoot && (message.sequence <= previous.sequence || message.digest === previous.digest || received < Date.parse(previous.receivedAt))) return fail('DUPLICATE_OR_OUT_OF_ORDER');
  return { status: 'SEQUENCE_OBSERVED' as const, reason: 'ORDERING_ONLY_NOT_DEVICE_AUTHENTICATION', deviceIdentityVerified: false as const,
    next: { deviceCode: context.deviceCode, observerId: observer.id, observerGeneration: observer.generation, bootId: context.bootId,
      credentialVersion: context.credentialVersion, sequence: message.sequence, receivedAt: message.receivedAt, digest: message.digest } };
}
