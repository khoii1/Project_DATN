import { deviceRepository } from "../repositories/device.repository";
import { env } from "../config/env";
import { devicePresenceService } from "../services/device-presence.service";
import { mqttStatusSchema } from "./mqtt-message.schema";
import { parseDeviceStatusTopic } from "./mqtt-topic";
import type { MqttMessageContext } from "./mqtt.types";

export const mqttPresenceAdapter = {
  async handle(topic: string, message: Buffer, context: MqttMessageContext = { retain: false, receivedAt: new Date() }): Promise<"accepted" | "ignored"> {
    const topicDeviceCode = parseDeviceStatusTopic(topic);
    if (!topicDeviceCode) return "ignored";
    const debug = (event: string, details: Record<string, unknown> = {}) => {
      if (env.mqttPresenceDebug) console.log(JSON.stringify({ component: "MQTT_PRESENCE", event, deviceCode: topicDeviceCode, receivedAt: context.receivedAt.toISOString(), ...details }));
    };
    debug("STATUS_RECEIVED", { retain: context.retain, dup: !!context.dup });
    // With the existing timestamp-free schema, replay cannot prove current liveness.
    if (context.retain || context.dup) { debug("REPLAY_IGNORED"); return "ignored"; }
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
    debug("DEVICE_MATCHED", { status: parsed.data.status });
    const result = parsed.data.status === "ONLINE"
      ? await devicePresenceService.markOnline(topicDeviceCode, context.receivedAt)
      : await devicePresenceService.markOffline(topicDeviceCode, context.receivedAt);
    debug("DB_UPDATE_COMPLETED", { status: parsed.data.status, affected: result.count });
    return "accepted";
  },
};
