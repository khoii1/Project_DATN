import { Prisma } from "@prisma/client"; import { DeviceConnectionStatus, DeviceStatus, DeviceType, type UserRole } from "../types/domain-enums";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface DeviceListOptions { search?: string; farmId?: string; zoneId?: string; type?: DeviceType; status?: DeviceStatus; connectionStatus?: DeviceConnectionStatus; page: number; limit: number; }
const include = { zone: { select: { id: true, name: true, status: true, farmId: true, farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } satisfies Prisma.DeviceInclude;
function scope(actor: { id: string; role: UserRole }): Prisma.DeviceWhereInput { return { zone: { farm: farmScope(actor as FarmActor) } }; }
function where(actor: FarmActor, options: Partial<DeviceListOptions>): Prisma.DeviceWhereInput {
  return { AND: [scope(actor), options.farmId ? { zone: { farmId: options.farmId } } : {}, options.zoneId ? { zoneId: options.zoneId } : {}, options.type ? { type: options.type } : {}, options.status ? { status: options.status } : {}, options.connectionStatus ? { connectionStatus: options.connectionStatus } : {}, options.search ? { OR: [{ deviceCode: { contains: options.search.toUpperCase() } }, { name: { contains: options.search } }, { hardwareModel: { contains: options.search } }] } : {}] };
}
export const deviceRepository = {
  async list(actor: FarmActor, options: DeviceListOptions) { const filter = where(actor, options); const [items, total] = await prisma.$transaction([prisma.device.findMany({ where: filter, include, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }), prisma.device.count({ where: filter })]); return { items, total }; },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.device.findFirst({ where: { id, AND: [scope(actor)] }, include }); },
  findAccessContext(id: string) { return prisma.device.findUnique({ where: { id }, select: { id: true, zoneId: true, status: true, zone: { select: { id: true, status: true, farmId: true, farm: { select: { id: true, ownerId: true, status: true } } } } } }); },
  findByCode(deviceCode: string) { return prisma.device.findUnique({ where: { deviceCode }, include }); },
  findTelemetryContextByCode(deviceCode: string) { return prisma.device.findUnique({ where: { deviceCode }, include: { sensors: true } }); },
  create(data: Prisma.DeviceUncheckedCreateInput) { return prisma.device.create({ data, include }); },
  update(id: string, data: Prisma.DeviceUpdateInput) { return prisma.device.update({ where: { id }, data, include }); },
  async remove(id: string) {
    return prisma.$transaction(async (tx) => {
      const [sensors, actuators] = await Promise.all([
        tx.sensor.findMany({ where: { deviceId: id }, select: { id: true } }),
        tx.actuator.findMany({ where: { deviceId: id }, select: { id: true } }),
      ]);
      const sensorIds = sensors.map((s) => s.id);
      const actuatorIds = actuators.map((a) => a.id);

      const ruleWhere: Prisma.AutomationRuleWhereInput[] = [];
      if (sensorIds.length > 0) ruleWhere.push({ sensorId: { in: sensorIds } });
      if (actuatorIds.length > 0) ruleWhere.push({ actuatorId: { in: actuatorIds } });

      const rules =
        ruleWhere.length > 0
          ? await tx.automationRule.findMany({
              where: { OR: ruleWhere },
              select: { id: true },
            })
          : [];
      const ruleIds = rules.map((r) => r.id);

      const cmdWhere: Prisma.DeviceCommandWhereInput[] = [];
      if (actuatorIds.length > 0) cmdWhere.push({ actuatorId: { in: actuatorIds } });
      if (ruleIds.length > 0) cmdWhere.push({ automationRuleId: { in: ruleIds } });

      if (cmdWhere.length > 0) {
        await tx.deviceCommand.deleteMany({ where: { OR: cmdWhere } });
      }
      if (ruleIds.length > 0) {
        await tx.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
      }
      if (sensorIds.length > 0) {
        await tx.alert.deleteMany({ where: { sensorId: { in: sensorIds } } });
        await tx.alertRule.deleteMany({ where: { sensorId: { in: sensorIds } } });
        await tx.sensorReading.deleteMany({ where: { sensorId: { in: sensorIds } } });
        await tx.sensor.deleteMany({ where: { id: { in: sensorIds } } });
      }
      if (actuatorIds.length > 0) {
        await tx.actuator.deleteMany({ where: { id: { in: actuatorIds } } });
      }
      return tx.device.delete({ where: { id } });
    });
  },
  async summary(actor: FarmActor, filters: { farmId?: string; zoneId?: string }) { const filter = where(actor, filters); const [total, active, maintenance, inactive, online, offline, unknown] = await prisma.$transaction([prisma.device.count({ where: filter }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.ACTIVE }] } }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.MAINTENANCE }] } }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.INACTIVE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.ONLINE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.OFFLINE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.UNKNOWN }] } })]); return { total, active, maintenance, inactive, online, offline, unknown }; },
};
