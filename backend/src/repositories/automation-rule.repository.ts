import { DeviceCommandSource, DeviceCommandStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface AutomationRuleListOptions { search?: string; farmId?: string; zoneId?: string; sensorId?: string; actuatorId?: string; enabled?: boolean; page: number; limit: number }
export const automationRuleInclude = {
  sensor: { include: { readings: { orderBy: { recordedAt: "desc" }, take: 1 }, device: { include: { zone: { include: { farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } } } },
  actuator: { include: { commands: { where: { source: DeviceCommandSource.MANUAL, status: DeviceCommandStatus.SUCCESS }, orderBy: { completedAt: "desc" }, take: 1 }, device: { include: { zone: { include: { farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } } } },
  commands: { where: { source: DeviceCommandSource.AUTOMATION }, orderBy: { requestedAt: "desc" }, take: 1 },
  createdBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.AutomationRuleInclude;
const scope = (actor: FarmActor): Prisma.AutomationRuleWhereInput => ({ sensor: { device: { zone: { farm: farmScope(actor) } } } });
function where(actor: FarmActor, options: Partial<AutomationRuleListOptions>): Prisma.AutomationRuleWhereInput { return { AND: [scope(actor), options.farmId ? { sensor: { device: { zone: { farmId: options.farmId } } } } : {}, options.zoneId ? { sensor: { device: { zoneId: options.zoneId } } } : {}, options.sensorId ? { sensorId: options.sensorId } : {}, options.actuatorId ? { actuatorId: options.actuatorId } : {}, options.enabled === undefined ? {} : { enabled: options.enabled }, options.search ? { OR: [{ name: { contains: options.search, mode: "insensitive" } }, { sensor: { sensorCode: { contains: options.search.toUpperCase(), mode: "insensitive" } } }, { actuator: { actuatorCode: { contains: options.search.toUpperCase(), mode: "insensitive" } } }] } : {}] }; }

export const automationRuleRepository = {
  async list(actor: FarmActor, options: AutomationRuleListOptions) { const filter = where(actor, options); const [items, total] = await prisma.$transaction([prisma.automationRule.findMany({ where: filter, include: automationRuleInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }), prisma.automationRule.count({ where: filter })]); return { items, total }; },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.automationRule.findFirst({ where: { id, AND: [scope(actor)] }, include: automationRuleInclude }); },
  create(data: Prisma.AutomationRuleUncheckedCreateInput) { return prisma.automationRule.create({ data, include: automationRuleInclude }); },
  enabledForSensors(sensorIds: string[]) { return prisma.automationRule.findMany({ where: { sensorId: { in: sensorIds }, enabled: true }, include: { actuator: true } }); },
};
