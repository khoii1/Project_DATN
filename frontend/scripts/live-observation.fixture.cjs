// Synthetic browser/unit fixture ONLY. Never sent to the backend or MQTT.
module.exports = function observation(overrides = {}) {
  const at = new Date().toISOString(), sessionId = 'backend-observer:MOCK';
  const common = { receiptId: 'mock-receipt', deviceCode: 'ESP32-GF-A-01', recordedAt: at, callbackReceivedAt: at,
    payloadDigest: 'mock-digest', qos: 1, retain: false, dup: false, topicMatches: true, generation: 1, sessionId,
    sessionStartedAt: at, sessionKind: 'BACKEND_OBSERVER', publisherIdentityAssurance: 'NOT_VERIFIED' };
  return { mode: 'SHADOW', source: 'LIVE_OBSERVED_NOT_VERIFIED', verifiedLiveReady: false, publisherIdentityAssurance: 'NOT_VERIFIED',
    deviceBootSession: 'NOT_PROVIDED_BY_FIRMWARE', evaluatedAt: at, reasons: ['PUBLISHER_IDENTITY_NOT_VERIFIED', 'PRODUCTION_POLICY_CYCLE_BUDGET_SAFETY_UNAVAILABLE'],
    reading: { ...common, topic: 'smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry', sensorCode: 'SOIL_01', value: 0,
      reading: { id: 'mock-reading-0', sensorCode: 'SOIL_01', value: 0, source: 'MQTT', recordedAt: at, dbReceivedAt: at } },
    off: { ...common, topic: 'smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state', actuatorCode: 'PUMP_01', state: 'OFF', reason: 'PERIODIC', sourceVerification: 'BACKEND_COMMIT_OBSERVED_NOT_PUBLISHER_AUTHENTICATED' },
    clock: { health: 'HEALTHY', reason: 'SHORT_TERM_ONLY', source: 'time.windows.com,0x8', offsetMs: 10, checkedAt: at, ttlMs: 60000, lastSuccessfulSync: at, clockJumpDetected: false },
    presence: { connectionStatus: 'ONLINE', lastSeenAt: at }, observer: { sessionId, generation: 1, ttlMs: 45000 },
    policy: null, cycle: null, budget: null, safety: null, snapshot: null, decision: null, engineCalled: false, commandCreated: false,
    runtime: { commandsEnabled: false, automationEnabled: false, pumpTestMode: true }, ...overrides };
};
