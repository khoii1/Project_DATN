import { Prisma } from "@prisma/client"; import { type UserRole, type ZoneStatus } from "../types/domain-enums";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface ZoneListOptions { farmId?: string; search?: string; status?: ZoneStatus; page: number; limit: number; }
const zoneInclude = {
  farm: { select: { id: true, name: true, ownerId: true, status: true } },
  _count: { select: { crops: true } },
} satisfies Prisma.ZoneInclude;

function zoneScope(actor: { id: string; role: UserRole }): Prisma.ZoneWhereInput {
  return { farm: farmScope(actor as FarmActor) };
}

export const zoneRepository = {
  async list(actor: FarmActor, options: ZoneListOptions) {
    const where: Prisma.ZoneWhereInput = { AND: [zoneScope(actor), options.farmId ? { farmId: options.farmId } : {}, options.status ? { status: options.status } : {}, options.search ? { name: { contains: options.search } } : {}] };
    const [items, total] = await prisma.$transaction([
      prisma.zone.findMany({ where, include: zoneInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }),
      prisma.zone.count({ where }),
    ]);
    return { items, total };
  },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.zone.findFirst({ where: { id, AND: [zoneScope(actor)] }, include: { ...zoneInclude, crops: { include: { zone: { select: { id: true, name: true, farmId: true, farm: { select: { id: true, name: true, ownerId: true, status: true } } } } }, orderBy: { createdAt: "desc" } } } }); },
  findAccessContext(id: string) { return prisma.zone.findUnique({ where: { id }, select: { id: true, name: true, farmId: true, status: true, areaHectares: true, farm: { select: { id: true, ownerId: true, status: true, areaHectares: true } } } }); },
  findByFarmAndName(farmId: string, name: string) { return prisma.zone.findFirst({ where: { farmId, name: { equals: name } } }); },
  create(data: Prisma.ZoneUncheckedCreateInput) { return prisma.zone.create({ data, include: zoneInclude }); },
  update(id: string, data: Prisma.ZoneUpdateInput) { return prisma.zone.update({ where: { id }, data, include: zoneInclude }); },
  async remove(id: string) {
    return prisma.$transaction(async (tx) => {
      const devices = await tx.device.findMany({ where: { zoneId: id }, select: { id: true } });
      const deviceIds = devices.map((d) => d.id);
      if (deviceIds.length > 0) {
        const [sensors, actuators] = await Promise.all([
          tx.sensor.findMany({ where: { deviceId: { in: deviceIds } }, select: { id: true } }),
          tx.actuator.findMany({ where: { deviceId: { in: deviceIds } }, select: { id: true } }),
        ]);
        const sensorIds = sensors.map((s) => s.id);
        const actuatorIds = actuators.map((a) => a.id);
        const ruleWhere: Prisma.AutomationRuleWhereInput[] = [];
        if (sensorIds.length > 0) ruleWhere.push({ sensorId: { in: sensorIds } });
        if (actuatorIds.length > 0) ruleWhere.push({ actuatorId: { in: actuatorIds } });
        const rules = ruleWhere.length > 0 ? await tx.automationRule.findMany({ where: { OR: ruleWhere }, select: { id: true } }) : [];
        const ruleIds = rules.map((r) => r.id);
        const cmdWhere: Prisma.DeviceCommandWhereInput[] = [];
        if (actuatorIds.length > 0) cmdWhere.push({ actuatorId: { in: actuatorIds } });
        if (ruleIds.length > 0) cmdWhere.push({ automationRuleId: { in: ruleIds } });
        if (cmdWhere.length > 0) await tx.deviceCommand.deleteMany({ where: { OR: cmdWhere } });
        if (ruleIds.length > 0) await tx.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
        if (sensorIds.length > 0) {
          await tx.alert.deleteMany({ where: { sensorId: { in: sensorIds } } });
          await tx.alertRule.deleteMany({ where: { sensorId: { in: sensorIds } } });
          await tx.sensorReading.deleteMany({ where: { sensorId: { in: sensorIds } } });
          await tx.sensor.deleteMany({ where: { id: { in: sensorIds } } });
        }
        if (actuatorIds.length > 0) await tx.actuator.deleteMany({ where: { id: { in: actuatorIds } } });
        await tx.device.deleteMany({ where: { id: { in: deviceIds } } });
      }
      await tx.crop.deleteMany({ where: { zoneId: id } });
      return tx.zone.delete({ where: { id } });
    });
  },
};
