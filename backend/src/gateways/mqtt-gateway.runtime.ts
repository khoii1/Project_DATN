import { env } from "../config/env";
import { mqttCommandChannel } from "../mqtt/mqtt-command-channel";
import { MqttDeviceGateway } from "./mqtt-device.gateway";

export const mqttDeviceGateway = new MqttDeviceGateway({
  connected: () => !!mqttCommandChannel.transport?.connected(),
  publish: (topic, payload, callback) => { if (!mqttCommandChannel.transport) throw new Error("BROKER_UNAVAILABLE"); mqttCommandChannel.transport.publish(topic, payload, callback); },
  discard: id => mqttCommandChannel.transport?.discard(id),
}, env.mqttTopicPrefix);
