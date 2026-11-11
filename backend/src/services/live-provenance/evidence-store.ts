import { createHash, randomUUID } from "node:crypto";

export interface ReceiptContext {
  retain: boolean; dup?: boolean; receivedAt: Date; qos?: number;
  observerGeneration?: number; observerSessionStartedAt?: Date;
}
export interface CorrelatedReading {
  id: string; sensorCode: string; value: number; source: string;
  recordedAt: string; dbReceivedAt: string;
}
export interface ReceiptEvidence {
  receiptId: string; deviceCode: string; sensorCode: string; topic: string; payloadDigest: string;
  recordedAt: string; callbackReceivedAt: string; qos: number; retain: false; dup: false; topicMatches: true;
  generation: number; sessionId: string; sessionStartedAt: string; sessionKind: "BACKEND_OBSERVER";
  policyVersion: "13.4A-observation-v1"; publisherIdentityAssurance: "NOT_VERIFIED";
  value: number; reading: CorrelatedReading | null;
}
export interface OffEvidence extends Omit<ReceiptEvidence, "sensorCode" | "value" | "reading"> {
  actuatorCode: string; state: "OFF"; reason: string;
  sourceVerification: "BACKEND_COMMIT_OBSERVED_NOT_PUBLISHER_AUTHENTICATED";
}
const ms = (at: string) => Date.parse(at);
const clone = <T>(value: T): T => structuredClone(value);

/** Observation/correlation only. No DB, environment, command, engine or network. */
export class LiveEvidenceStore {
  private entries = new Map<string, ReceiptEvidence>();
  private offs = new Map<string, OffEvidence>();
  private highWater = new Map<string, number>();
  private digests = new Map<string, number>();
  private generation = -1;
  private sessionId = "";
  private sessionStartedAt = "";
  private lastNow = 0;
  private lastRejection: string | null = null;
  private clockInvalidated = false;
  constructor(private readonly now: () => number = Date.now, private readonly ttlMs = 45000, private readonly capacity = 256) {}

  reset(generation: number, startedAt: Date) {
    this.entries.clear(); this.offs.clear(); this.highWater.clear(); this.digests.clear();
    this.generation = generation; this.sessionStartedAt = startedAt.toISOString();
    this.sessionId = `backend-observer:${randomUUID()}`; this.lastNow = this.now(); this.lastRejection = null; this.clockInvalidated = false;
  }
  private reject(reason: string) { this.lastRejection = reason; return null; }
  private prune() {
    const now = this.now();
    if (now < this.lastNow) { this.entries.clear(); this.offs.clear(); this.digests.clear(); this.lastRejection = "CLOCK_ROLLBACK"; this.clockInvalidated = true; }
    this.lastNow = now;
    for (const [key, item] of this.entries) if (now - ms(item.callbackReceivedAt) > this.ttlMs || now - ms(item.recordedAt) > this.ttlMs) this.entries.delete(key);
    for (const [key, item] of this.offs) if (now - ms(item.callbackReceivedAt) > 30000 || now - ms(item.recordedAt) > 30000) this.offs.delete(key);
    for (const [key, at] of this.digests) if (now - at > this.ttlMs) this.digests.delete(key);
  }
  private context(at: string, context: ReceiptContext): boolean {
    this.prune();
    if (this.clockInvalidated) { this.reject("CLOCK_ROLLBACK"); return false; }
    if (!this.sessionId || context.observerGeneration !== this.generation ||
        !(context.observerSessionStartedAt instanceof Date) || context.observerSessionStartedAt.toISOString() !== this.sessionStartedAt) { this.reject("OBSERVER_SESSION_MISMATCH"); return false; }
    if (!(context.receivedAt instanceof Date) || !Number.isFinite(context.receivedAt.getTime())) { this.reject("CALLBACK_TIME_MISSING"); return false; }
    const recorded = ms(at), received = context.receivedAt.getTime(), now = this.now();
    if (context.retain || context.dup || context.qos !== 1) { this.reject("REPLAY_OR_QOS_UNPROVEN"); return false; }
    if (!Number.isFinite(recorded) || recorded < ms(this.sessionStartedAt) || received < ms(this.sessionStartedAt) ||
        recorded > received + 2000 || recorded > now + 2000 || received > now + 2000 || now - recorded > this.ttlMs || now - received > this.ttlMs) { this.reject("TIMESTAMP_UNTRUSTED"); return false; }
    return true;
  }
  observeTelemetry(topic: string, payload: Buffer, body: { deviceCode: string; recordedAt: string; readings: Array<{ sensorCode: string; value: number }> }, context: ReceiptContext): string | null {
    if (!this.context(body.recordedAt, context)) return null;
    if (topic !== `smart-agriculture/v1/devices/${body.deviceCode}/telemetry` || body.deviceCode !== "ESP32-GF-A-01") return this.reject("TOPIC_IDENTITY_MISMATCH");
    const digest = createHash("sha256").update(payload).digest("hex");
    if (this.digests.has(digest)) return this.reject("DUPLICATE_PAYLOAD");
    const codes = body.readings.map(r => r.sensorCode);
    if (!codes.length || codes.length > 32 || new Set(codes).size !== codes.length || body.readings.some(r => !Number.isFinite(r.value))) return this.reject("INVALID_READING_SET");
    const keys = codes.map(code => `${body.deviceCode}/${code}`);
    if (keys.some(key => (this.highWater.get(key) ?? -Infinity) >= ms(body.recordedAt))) return this.reject("DUPLICATE_OR_OUT_OF_ORDER");
    if (this.highWater.size + keys.filter(key => !this.highWater.has(key)).length > this.capacity) return this.reject("SENSOR_CAPACITY_REACHED");
    const receiptId = randomUUID();
    body.readings.forEach((reading, index) => {
      const key = keys[index]; this.highWater.set(key, ms(body.recordedAt));
      if (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(`${receiptId}/${reading.sensorCode}`, { receiptId, deviceCode: body.deviceCode, sensorCode: reading.sensorCode,
        topic, payloadDigest: digest, recordedAt: body.recordedAt, callbackReceivedAt: context.receivedAt.toISOString(), qos: 1,
        retain: false, dup: false, topicMatches: true, generation: this.generation, sessionId: this.sessionId, sessionStartedAt: this.sessionStartedAt,
        sessionKind: "BACKEND_OBSERVER", policyVersion: "13.4A-observation-v1", publisherIdentityAssurance: "NOT_VERIFIED", value: reading.value, reading: null });
    });
    this.digests.set(digest, context.receivedAt.getTime());
    while (this.digests.size > this.capacity) this.digests.delete(this.digests.keys().next().value!);
    return receiptId;
  }
  correlate(receiptId: string, rows: CorrelatedReading[]) {
    this.prune();
    for (const [key, item] of this.entries) if (item.receiptId === receiptId) {
      const matches = rows.filter(r => r.sensorCode === item.sensorCode && r.id && r.source === "MQTT" &&
        r.value === item.value && ms(r.recordedAt) === ms(item.recordedAt) && Number.isFinite(ms(r.dbReceivedAt)) &&
        ms(r.dbReceivedAt) >= ms(item.callbackReceivedAt) - 2000);
      if (matches.length !== 1) { this.entries.delete(key); this.lastRejection = "CORRELATION_NOT_PROVEN"; }
      else item.reading = clone(matches[0]);
    }
  }
  latest(deviceCode: string, sensorCode: string) {
    this.prune();
    const items = [...this.entries.values()].filter(e => e.deviceCode === deviceCode && e.sensorCode === sensorCode && e.reading);
    return items.length ? clone(items.sort((a, b) => ms(b.recordedAt) - ms(a.recordedAt))[0]) : null;
  }
  matchDatabase(reading: CorrelatedReading, deviceCode: string) {
    const evidence = this.latest(deviceCode, reading.sensorCode);
    if (!evidence?.reading || evidence.reading.id !== reading.id || evidence.reading.value !== reading.value || reading.source !== "MQTT" ||
        ms(reading.recordedAt) !== ms(evidence.recordedAt) || reading.dbReceivedAt !== evidence.reading.dbReceivedAt) return null;
    return evidence;
  }
  observeCommittedOff(topic: string, payload: Buffer, body: { deviceCode: string; actuatorCode: string; state: string; reason: string; recordedAt: string }, context: ReceiptContext) {
    if (!this.context(body.recordedAt, context)) return false;
    if (body.state !== "OFF" || body.deviceCode !== "ESP32-GF-A-01" || body.actuatorCode !== "PUMP_01" ||
        topic !== `smart-agriculture/v1/devices/${body.deviceCode}/actuator/state` || this.now() - ms(body.recordedAt) > 30000) return false;
    const key = `${body.deviceCode}/${body.actuatorCode}`, old = this.offs.get(key);
    if (old && ms(old.recordedAt) >= ms(body.recordedAt)) return false;
    this.offs.set(key, { receiptId: randomUUID(), deviceCode: body.deviceCode, actuatorCode: body.actuatorCode, topic, state: "OFF", reason: body.reason,
      payloadDigest: createHash("sha256").update(payload).digest("hex"), recordedAt: body.recordedAt, callbackReceivedAt: context.receivedAt.toISOString(), qos: 1,
      retain: false, dup: false, topicMatches: true, generation: this.generation, sessionId: this.sessionId, sessionStartedAt: this.sessionStartedAt,
      sessionKind: "BACKEND_OBSERVER", policyVersion: "13.4A-observation-v1", publisherIdentityAssurance: "NOT_VERIFIED",
      sourceVerification: "BACKEND_COMMIT_OBSERVED_NOT_PUBLISHER_AUTHENTICATED" });
    return true;
  }
  off(deviceCode: string, actuatorCode: string) { this.prune(); return clone(this.offs.get(`${deviceCode}/${actuatorCode}`) ?? null); }
  diagnostics() { this.prune(); return { sessionKind: "BACKEND_OBSERVER", generation: this.generation, sessionId: this.sessionId, sessionStartedAt: this.sessionStartedAt,
    entries: this.entries.size, lastRejection: this.lastRejection, ttlMs: this.ttlMs, publisherIdentityAssurance: "NOT_VERIFIED" }; }
}
export const liveEvidenceStore = new LiveEvidenceStore();
