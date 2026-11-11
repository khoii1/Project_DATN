import { mqttPresenceAdapter } from "./mqtt-presence.adapter";
import { mqttTelemetryAdapter } from "./mqtt-telemetry.adapter";
import { parseDeviceStatusTopic, parseDeviceTelemetryTopic } from "./mqtt-topic";
import type { MqttMessageContext } from "./mqtt.types";

export const mqttMessageRouter = {
  async handle(topic: string, message: Buffer, context: MqttMessageContext = { retain: false, receivedAt: new Date() }): Promise<void> {
    if (parseDeviceTelemetryTopic(topic)) { await mqttTelemetryAdapter.handle(topic, message, context); return; }
    if (parseDeviceStatusTopic(topic)) await mqttPresenceAdapter.handle(topic, message, context);
  },
};
