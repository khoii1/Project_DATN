import { Prisma } from "@prisma/client"; import { type FarmStatus, type UserRole } from "../types/domain-enums";
import { prisma } from "../config/database";

export interface FarmActor { id: string; role: UserRole; }
export interface FarmListOptions { search?: string; status?: FarmStatus; ownerId?: string; page: number; limit: number; }

export function farmScope(actor: FarmActor): Prisma.FarmWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "FARM_OWNER") return { ownerId: actor.id };
  return { staffAssignments: { some: { staffId: actor.id } } };
}

const farmInclude = {
  owner: { select: { id: true, fullName: true, email: true } },
  _count: { select: { zones: true, staffAssignments: true } },
} satisfies Prisma.FarmInclude;

export const farmRepository = {
  async list(actor: FarmActor, options: FarmListOptions) {
    const where: Prisma.FarmWhereInput = {
      AND: [
        farmScope(actor),
        options.status ? { status: options.status } : {},
        options.ownerId && actor.role === "ADMIN" ? { ownerId: options.ownerId } : {},
        options.search ? { OR: [{ name: { contains: options.search } }, { address: { contains: options.search } }] } : {},
      ],
    };
    const [items, total] = await prisma.$transaction([
      prisma.farm.findMany({ where, include: farmInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }),
      prisma.farm.count({ where }),
    ]);
    return { items, total };
  },
  findAccessibleById(id: string, actor: FarmActor) {
    return prisma.farm.findFirst({ where: { id, AND: [farmScope(actor)] }, include: farmInclude });
  },
  findAccessContext(id: string, staffId: string) {
    return prisma.farm.findUnique({ where: { id }, select: { id: true, ownerId: true, status: true, areaHectares: true, staffAssignments: { where: { staffId }, select: { id: true } } } });
  },
  create(data: Prisma.FarmUncheckedCreateInput) {
    return prisma.farm.create({ data, include: farmInclude });
  },
  update(id: string, data: Prisma.FarmUpdateInput) {
    return prisma.farm.update({ where: { id }, data, include: farmInclude });
  },
  async remove(id: string) {
    return prisma.$transaction(async (tx) => {
      const zones = await tx.zone.findMany({ where: { farmId: id }, select: { id: true } });
      const zoneIds = zones.map((z) => z.id);
      if (zoneIds.length > 0) {
        const devices = await tx.device.findMany({ where: { zoneId: { in: zoneIds } }, select: { id: true } });
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
        await tx.crop.deleteMany({ where: { zoneId: { in: zoneIds } } });
        await tx.zone.deleteMany({ where: { id: { in: zoneIds } } });
      }
      await tx.farmStaffAssignment.deleteMany({ where: { farmId: id } });
      await tx.activityLog.updateMany({ where: { farmId: id }, data: { farmId: null } });
      return tx.farm.delete({ where: { id } });
    });
  },
  countCrops(id: string) { return prisma.crop.count({ where: { zone: { farmId: id } } }); },
};

