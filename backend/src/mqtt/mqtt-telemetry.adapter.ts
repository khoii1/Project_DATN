import { SensorReadingSource } from "@prisma/client";
import { env } from "../config/env";
import { telemetryIngestionService } from "../services/telemetry-ingestion.service";
import { mqttTelemetrySchema } from "./mqtt-message.schema";
import { parseDeviceTelemetryTopic } from "./mqtt-topic";

export type MqttTelemetryResult = "accepted" | "ignored";

export const mqttTelemetryAdapter = {
  async handle(topic: string, message: Buffer): Promise<MqttTelemetryResult> {
    const topicDeviceCode = parseDeviceTelemetryTopic(topic);
    if (!topicDeviceCode) return "ignored";
    if (message.byteLength > env.mqttMaxPayloadBytes) {
      console.warn(`MQTT telemetry rejected: payload exceeds ${env.mqttMaxPayloadBytes} bytes`);
      return "ignored";
    }

    let json: unknown;
    try { json = JSON.parse(message.toString("utf8")); }
    catch { console.warn("MQTT telemetry rejected: invalid JSON"); return "ignored"; }

    const parsed = mqttTelemetrySchema.safeParse(json);
    if (!parsed.success) {
      console.warn(`MQTT telemetry rejected: invalid schema (${parsed.error.issues.length} issue(s))`);
      return "ignored";
    }
    if (parsed.data.deviceCode !== topicDeviceCode) {
      console.warn("MQTT telemetry rejected: topic/payload device mismatch");
      return "ignored";
    }

    const recordedAt = new Date(parsed.data.recordedAt);
    const ageMs = Date.now() - recordedAt.getTime();
    const fresh = ageMs >= -60_000 && ageMs <= env.mqttSideEffectMaxAgeSeconds * 1000;
    try {
      await telemetryIngestionService.ingest({
        deviceCode: topicDeviceCode,
        recordedAt,
        source: SensorReadingSource.MQTT,
        readings: parsed.data.readings,
        evaluateAlerts: fresh,
        evaluateAutomation: fresh,
      });
      return "accepted";
    } catch (error) {
      const summary = error instanceof Error ? error.message : "unknown ingestion error";
      console.warn(`MQTT telemetry rejected by ingestion: ${summary}`);
      return "ignored";
    }
  },
};
