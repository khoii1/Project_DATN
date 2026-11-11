import { api } from './api';
import type { LiveEvidence } from '../types/live-evidence';

export function assertObservation(value: LiveEvidence): LiveEvidence {
  // Never accept fixture/verified decisions through this read-only observation boundary.
  if (!value || value.mode !== 'SHADOW' || value.source !== 'LIVE_OBSERVED_NOT_VERIFIED' ||
      value.verifiedLiveReady !== false || value.publisherIdentityAssurance !== 'NOT_VERIFIED' ||
      value.engineCalled !== false || value.commandCreated !== false ||
      [value.snapshot, value.decision, value.policy, value.cycle, value.budget, value.safety].some(item => item !== null) ||
      !Number.isFinite(Date.parse(value.evaluatedAt)) || !value.observer?.sessionId ||
      !Number.isFinite(value.observer.ttlMs) || value.observer.ttlMs <= 0 || !Number.isInteger(value.observer.generation) ||
      !value.clock || !Number.isFinite(value.clock.ttlMs) || value.clock.ttlMs <= 0 ||
      !['HEALTHY', 'UNHEALTHY', 'UNKNOWN'].includes(value.clock.health) ||
      !value.presence || !value.runtime || !Array.isArray(value.reasons) || !value.reasons.every(item => typeof item === 'string') ||
      !Object.hasOwn(value, 'reading') || !Object.hasOwn(value, 'off')) {
    throw new Error('Live evidence không đúng hợp đồng quan sát. NOT_VERIFIED; không dùng fixture thay thế.');
  }
  return value;
}
export const liveEvidenceService = {
  async get(deviceId: string, signal?: AbortSignal): Promise<LiveEvidence> {
    const response = await api.get<{ data: LiveEvidence }>('/live-evidence', { params: { deviceId }, signal, timeout: 20_000 });
    return assertObservation(response.data.data);
  },
};
