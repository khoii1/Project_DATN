import { deviceRepository } from "../repositories/device.repository";
import { env } from "../config/env";
import { devicePresenceService } from "../services/device-presence.service";
import { mqttStatusSchema } from "./mqtt-message.schema";
import { parseDeviceStatusTopic } from "./mqtt-topic";

export const mqttPresenceAdapter = {
  async handle(topic: string, message: Buffer): Promise<"accepted" | "ignored"> {
    const topicDeviceCode = parseDeviceStatusTopic(topic);
    if (!topicDeviceCode) return "ignored";
    if (message.byteLength > env.mqttMaxPayloadBytes) { console.warn("MQTT status rejected: payload too large"); return "ignored"; }
    let json: unknown;
    try { json = JSON.parse(message.toString("utf8")); }
    catch { console.warn("MQTT status rejected: invalid JSON"); return "ignored"; }
    const parsed = mqttStatusSchema.safeParse(json);
    if (!parsed.success || parsed.data.deviceCode !== topicDeviceCode) {
      console.warn("MQTT status rejected: invalid schema or topic/payload mismatch");
      return "ignored";
    }
    const device = await deviceRepository.findByCode(topicDeviceCode);
    if (!device) { console.warn("MQTT status rejected: unknown device"); return "ignored"; }
    if (parsed.data.status === "ONLINE") await devicePresenceService.markOnline(topicDeviceCode);
    else await devicePresenceService.markOffline(topicDeviceCode);
    return "accepted";
  },
};
