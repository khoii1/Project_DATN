export interface LiveReceipt {
  receiptId: string; deviceCode: string; sensorCode?: string; actuatorCode?: string;
  topic: string; payloadDigest: string; recordedAt: string; callbackReceivedAt: string;
  qos: number; retain: boolean; dup: boolean; topicMatches: boolean;
  generation: number; sessionId: string; sessionStartedAt: string; sessionKind: string;
  publisherIdentityAssurance: string; value?: number; state?: string; reason?: string;
  sourceVerification?: string;
  reading?: { id: string; sensorCode: string; value: number; source: string; recordedAt: string; dbReceivedAt: string } | null;
}
export interface LiveEvidence {
  mode: 'SHADOW'; source: 'LIVE_OBSERVED_NOT_VERIFIED'; verifiedLiveReady: false;
  publisherIdentityAssurance: 'NOT_VERIFIED'; deviceBootSession: string;
  evaluatedAt: string; reasons: string[]; reading: LiveReceipt | null; off: LiveReceipt | null;
  clock: { health: string; reason: string; source: string | null; lastSuccessfulSync: string | null;
    checkedAt: string; ttlMs: number; offsetMs: number | null; clockJumpDetected: boolean };
  presence: { connectionStatus: string; lastSeenAt: string | null };
  observer: { sessionId: string; generation: number; ttlMs: number };
  policy: null; cycle: null; budget: null; safety: null; snapshot: null; decision: null;
  engineCalled: false; commandCreated: false;
  runtime: { commandsEnabled: boolean; automationEnabled: boolean; pumpTestMode: boolean };
}
