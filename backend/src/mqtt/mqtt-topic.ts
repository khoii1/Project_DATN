import { env } from "../config/env";

export const MQTT_DEVICE_CODE_PATTERN = /^[A-Z0-9_-]{3,64}$/;

function validateCode(code: string, label: string): string {
  const normalized = code.trim().toUpperCase();
  if (!MQTT_DEVICE_CODE_PATTERN.test(normalized)) throw new Error(`Invalid MQTT ${label}`);
  return normalized;
}

export const mqttTopics = {
  telemetryFilter: `${env.mqttTopicPrefix}/devices/+/telemetry`,
  statusFilter: `${env.mqttTopicPrefix}/devices/+/status`,
  telemetry(deviceCode: string) { return `${env.mqttTopicPrefix}/devices/${validateCode(deviceCode, "device code")}/telemetry`; },
  status(deviceCode: string) { return `${env.mqttTopicPrefix}/devices/${validateCode(deviceCode, "device code")}/status`; },
  command(deviceCode: string, actuatorCode: string) { return `${env.mqttTopicPrefix}/devices/${validateCode(deviceCode, "device code")}/commands/${validateCode(actuatorCode, "actuator code")}`; },
  commandAck(deviceCode: string, actuatorCode: string) { return `${env.mqttTopicPrefix}/devices/${validateCode(deviceCode, "device code")}/command-acks/${validateCode(actuatorCode, "actuator code")}`; },
};

function parseDeviceTopic(topic: string, suffix: "telemetry" | "status"): string | null {
  const prefix = `${env.mqttTopicPrefix}/devices/`;
  if (!topic.startsWith(prefix) || !topic.endsWith(`/${suffix}`)) return null;
  const middle = topic.slice(prefix.length, -(suffix.length + 1));
  return MQTT_DEVICE_CODE_PATTERN.test(middle) ? middle : null;
}

export const parseDeviceTelemetryTopic = (topic: string) => parseDeviceTopic(topic, "telemetry");
export const parseDeviceStatusTopic = (topic: string) => parseDeviceTopic(topic, "status");
