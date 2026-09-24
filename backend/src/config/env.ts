import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);
const automationCommandCooldownSeconds = Number(process.env.AUTOMATION_COMMAND_COOLDOWN_SECONDS ?? 60);
const automationManualOverrideMinutes = Number(process.env.AUTOMATION_MANUAL_OVERRIDE_MINUTES ?? 15);
const automationMaxReadingAgeSeconds = Number(process.env.AUTOMATION_MAX_READING_AGE_SECONDS ?? 300);
const mqttEnabled = (process.env.MQTT_ENABLED ?? "false").toLowerCase() === "true";
const mqttReconnectPeriodMs = Number(process.env.MQTT_RECONNECT_PERIOD_MS ?? 3000);
const mqttSideEffectMaxAgeSeconds = Number(process.env.MQTT_SIDE_EFFECT_MAX_AGE_SECONDS ?? 300);
const mqttMaxPayloadBytes = Number(process.env.MQTT_MAX_PAYLOAD_BYTES ?? 32768);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET is required and must contain at least 32 characters");
}

for (const [name, value] of Object.entries({ AUTOMATION_COMMAND_COOLDOWN_SECONDS: automationCommandCooldownSeconds, AUTOMATION_MANUAL_OVERRIDE_MINUTES: automationManualOverrideMinutes, AUTOMATION_MAX_READING_AGE_SECONDS: automationMaxReadingAgeSeconds })) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
}

for (const [name, value] of Object.entries({ MQTT_RECONNECT_PERIOD_MS: mqttReconnectPeriodMs, MQTT_SIDE_EFFECT_MAX_AGE_SECONDS: mqttSideEffectMaxAgeSeconds, MQTT_MAX_PAYLOAD_BYTES: mqttMaxPayloadBytes })) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
}

const mqttTopicPrefix = process.env.MQTT_TOPIC_PREFIX ?? "smart-agriculture/v1";
if (!/^[a-z0-9][a-z0-9/-]*[a-z0-9]$/.test(mqttTopicPrefix) || mqttTopicPrefix.includes("//")) {
  throw new Error("MQTT_TOPIC_PREFIX must be a valid topic prefix without wildcards");
}

if (mqttEnabled && (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD)) {
  throw new Error("MQTT_USERNAME and MQTT_PASSWORD are required when MQTT_ENABLED=true");
}

export const env = {
  port,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  automationCommandCooldownSeconds,
  automationManualOverrideMinutes,
  automationMaxReadingAgeSeconds,
  mqttEnabled,
  mqttBrokerUrl: process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1:1883",
  mqttBackendClientId: process.env.MQTT_BACKEND_CLIENT_ID ?? "smartagri-backend",
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  mqttTopicPrefix,
  mqttReconnectPeriodMs,
  mqttSideEffectMaxAgeSeconds,
  mqttMaxPayloadBytes,
} as const;
