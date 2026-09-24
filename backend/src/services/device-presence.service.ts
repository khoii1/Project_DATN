import { DeviceConnectionStatus } from "@prisma/client";
import { prisma } from "../config/database";
export const devicePresenceService = {
  markOnline(deviceCode: string, seenAt = new Date()) { return prisma.device.update({ where: { deviceCode: deviceCode.trim().toUpperCase() }, data: { connectionStatus: DeviceConnectionStatus.ONLINE, lastSeenAt: seenAt } }); },
  touchLastSeen(deviceCode: string, seenAt = new Date()) { return prisma.device.update({ where: { deviceCode: deviceCode.trim().toUpperCase() }, data: { lastSeenAt: seenAt } }); },
  markOffline(deviceCode: string) { return prisma.device.update({ where: { deviceCode: deviceCode.trim().toUpperCase() }, data: { connectionStatus: DeviceConnectionStatus.OFFLINE } }); },
};
