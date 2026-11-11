import type { Prisma } from "@prisma/client";

export interface PresenceStore {
  updateMany(input: { where: Prisma.DeviceWhereInput; data: Prisma.DeviceUpdateManyMutationInput }): Promise<{ count: number }>;
}

/** All state transitions are guarded inside the UPDATE, not by a preceding SELECT. */
export function createDevicePresenceService(store: PresenceStore, timeoutSeconds: number, clock = () => new Date()) {
  const recent = (at: Date) => Number.isFinite(at.getTime()) && at.getTime() <= clock().getTime() && at.getTime() >= clock().getTime() - timeoutSeconds * 1000;
  const notNewer = (at: Date): Prisma.DeviceWhereInput => ({ OR: [{ lastSeenAt: null }, { lastSeenAt: { lte: at } }] });
  return {
    markOnline(deviceCode: string, seenAt = clock()) {
      if (!recent(seenAt)) return Promise.resolve({ count: 0 });
      return store.updateMany({
        where: { deviceCode: deviceCode.trim().toUpperCase(), ...notNewer(seenAt) },
        data: { connectionStatus: "ONLINE", lastSeenAt: seenAt },
      });
    },
    touchLastSeen(deviceCode: string, seenAt = clock()) {
      if (!recent(seenAt)) return Promise.resolve({ count: 0 });
      return store.updateMany({ where: { deviceCode: deviceCode.trim().toUpperCase(), ...notNewer(seenAt) }, data: { lastSeenAt: seenAt } });
    },
    markOffline(deviceCode: string, observedAt = clock()) {
      if (!recent(observedAt)) return Promise.resolve({ count: 0 });
      return store.updateMany({
        where: { deviceCode: deviceCode.trim().toUpperCase(), connectionStatus: { not: "OFFLINE" }, ...notNewer(observedAt) },
        // LWT is broker evidence of disconnect, not a new heartbeat from the device.
        data: { connectionStatus: "OFFLINE" },
      });
    },
    expire(brokerConnected: boolean, now = clock()) {
      const cutoff = new Date(now.getTime() - timeoutSeconds * 1000);
      return store.updateMany({
        where: {
          AND: [
            brokerConnected
              ? { OR: [{ connectionStatus: "ONLINE" }, { connectionStatus: "UNKNOWN", lastSeenAt: { not: null } }] }
              : { connectionStatus: "ONLINE" },
            { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] },
          ],
        },
        data: { connectionStatus: brokerConnected ? "OFFLINE" : "UNKNOWN" },
      });
    },
  };
}
