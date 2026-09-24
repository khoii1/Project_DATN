import { z } from "zod";
import { MQTT_DEVICE_CODE_PATTERN } from "./mqtt-topic";

const deviceCode = z.string().trim().toUpperCase().min(3).max(64).regex(MQTT_DEVICE_CODE_PATTERN);
const sensorCode = z.string().trim().toUpperCase().min(3).max(64).regex(MQTT_DEVICE_CODE_PATTERN);

export const mqttTelemetrySchema = z.object({
  schemaVersion: z.literal(1),
  deviceCode,
  recordedAt: z.string().datetime({ offset: true }),
  readings: z.array(z.object({ sensorCode, value: z.number().finite() }).strict()).min(1).max(32),
}).strict();

export const mqttStatusSchema = z.object({
  schemaVersion: z.literal(1),
  deviceCode,
  status: z.enum(["ONLINE", "OFFLINE"]),
}).strict();
