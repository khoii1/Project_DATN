import type { CommandTransport } from "../gateways/mqtt-device.gateway";

// Registered once by the existing managed MQTT client, never a client per command.
export const mqttCommandChannel: { transport: CommandTransport | null } = { transport: null };
