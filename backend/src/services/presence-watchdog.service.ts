import { invalidatePumpState } from "../mqtt/mqtt-pump-state.adapter";
import { env } from "../config/env";
import { mqttClientService } from "../mqtt/mqtt-client.service";
import { devicePresenceService } from "./device-presence.service";
import { createPresenceWatchdog } from "./presence-watchdog";

export const presenceWatchdog = createPresenceWatchdog({
  intervalMs: env.devicePresenceCheckIntervalSeconds * 1000,
  check: async () => { const result = await devicePresenceService.expire(mqttClientService.connectionState === "connected"); await invalidatePumpState(); return result; },
  info: count => console.log(`Device presence watchdog: ${count} expired device(s); MQTT=${mqttClientService.connectionState}`),
  warn: error => console.warn(`Device presence watchdog failed: ${error instanceof Error ? error.name : "unknown error"}; will retry`),
});
