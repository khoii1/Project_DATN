import type { LiveEvidence, LiveReceipt } from '../types/live-evidence';

export function observationTime(iso?: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));
}
/** Age from server evaluation + local elapsed time; never rewrite measurement timestamps. */
export function projectObservation(value: LiveEvidence, elapsedMs: number, failed = false) {
  const now = Date.parse(value.evaluatedAt) + Math.max(0, elapsedMs);
  const fresh = (iso: string | null | undefined, ttl: number) => !!iso && Number.isFinite(Date.parse(iso)) &&
    now - Date.parse(iso) >= -2000 && now - Date.parse(iso) <= ttl;
  const sameObserver = (item: LiveReceipt | null) => !!item && item.sessionId === value.observer.sessionId &&
    item.generation === value.observer.generation && item.sessionKind === 'BACKEND_OBSERVER';
  const packet = (item: LiveReceipt | null) => !!item && item.deviceCode === 'ESP32-GF-A-01' &&
    item.qos === 1 && item.retain === false && item.dup === false && item.topicMatches === true && sameObserver(item);
  const r = value.reading, row = r?.reading;
  const correlated = !!r && !!row && row.id.length > 0 && row.sensorCode === 'SOIL_01' && r.sensorCode === 'SOIL_01' &&
    Number.isFinite(r.value) && r.value === row.value && row.source === 'MQTT' && r.recordedAt === row.recordedAt &&
    Number.isFinite(Date.parse(row.dbReceivedAt)) && r.topic === 'smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry';
  const online = !failed && value.presence.connectionStatus === 'ONLINE' && fresh(value.presence.lastSeenAt, 30_000);
  const readingFresh = !failed && online && packet(r) && correlated && fresh(r?.recordedAt, Math.min(value.observer.ttlMs, 45_000)) && fresh(r?.callbackReceivedAt, 45_000);
  const off = value.off;
  const offFresh = !failed && online && packet(off) && off?.state === 'OFF' && off.actuatorCode === 'PUMP_01' &&
    off.sourceVerification === 'BACKEND_COMMIT_OBSERVED_NOT_PUBLISHER_AUTHENTICATED' &&
    off.topic === 'smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state' && fresh(off.recordedAt, 30_000) && fresh(off.callbackReceivedAt, 30_000);
  return {
    correlated, readingFresh, offFresh, receipt: readingFresh ? 'MQTT OBSERVED / DB CORRELATED' : 'STALE / NOT_VERIFIED',
    presence: failed ? 'UNKNOWN (API không khả dụng)' : online ? 'ONLINE' : value.presence.connectionStatus === 'OFFLINE' ? 'OFFLINE' : 'UNKNOWN / STALE',
    relay: offFresh ? 'OFF' : 'UNKNOWN',
    offAge: off && Number.isFinite(Date.parse(off.recordedAt)) ? Math.max(0, Math.floor((now - Date.parse(off.recordedAt)) / 1000)) : null,
    clock: !failed && fresh(value.clock.checkedAt, value.clock.ttlMs) && !value.clock.clockJumpDetected ? value.clock.health : 'UNKNOWN',
  };
}
