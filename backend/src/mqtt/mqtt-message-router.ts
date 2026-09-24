import { mqttPresenceAdapter } from "./mqtt-presence.adapter";
import { mqttTelemetryAdapter } from "./mqtt-telemetry.adapter";
import { parseDeviceStatusTopic, parseDeviceTelemetryTopic } from "./mqtt-topic";

export const mqttMessageRouter = {
  async handle(topic: string, message: Buffer): Promise<void> {
    if (parseDeviceTelemetryTopic(topic)) { await mqttTelemetryAdapter.handle(topic, message); return; }
    if (parseDeviceStatusTopic(topic)) await mqttPresenceAdapter.handle(topic, message);
  },
};
