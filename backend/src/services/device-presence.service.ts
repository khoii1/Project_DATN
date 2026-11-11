import { prisma } from "../config/database";
import { env } from "../config/env";
import { createDevicePresenceService } from "./device-presence.policy";

export const devicePresenceService = createDevicePresenceService(prisma.device, env.devicePresenceTimeoutSeconds);
