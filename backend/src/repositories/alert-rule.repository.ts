import { Prisma, type AlertSeverity, type SensorType } from "@prisma/client";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface AlertRuleListOptions { search?: string; farmId?: string; zoneId?: string; deviceId?: string; sensorId?: string; sensorType?: SensorType; severity?: AlertSeverity; enabled?: boolean; page: number; limit: number }
export const alertRuleInclude = { sensor: { include: { device: { include: { zone: { include: { farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } } } }, createdBy: { select: { id: true, fullName: true, email: true } } } satisfies Prisma.AlertRuleInclude;
const scope = (actor: FarmActor): Prisma.AlertRuleWhereInput => ({ sensor: { device: { zone: { farm: farmScope(actor) } } } });
function where(actor: FarmActor, options: Partial<AlertRuleListOptions>): Prisma.AlertRuleWhereInput { return { AND: [scope(actor), options.farmId ? { sensor: { device: { zone: { farmId: options.farmId } } } } : {}, options.zoneId ? { sensor: { device: { zoneId: options.zoneId } } } : {}, options.deviceId ? { sensor: { deviceId: options.deviceId } } : {}, options.sensorId ? { sensorId: options.sensorId } : {}, options.sensorType ? { sensor: { type: options.sensorType } } : {}, options.severity ? { severity: options.severity } : {}, options.enabled === undefined ? {} : { enabled: options.enabled }, options.search ? { OR: [{ name: { contains: options.search, mode: "insensitive" } }, { sensor: { sensorCode: { contains: options.search.toUpperCase(), mode: "insensitive" } } }] } : {}] }; }

export const alertRuleRepository = {
  async list(actor: FarmActor, options: AlertRuleListOptions) { const filter = where(actor, options); const [items, total] = await prisma.$transaction([prisma.alertRule.findMany({ where: filter, include: alertRuleInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }), prisma.alertRule.count({ where: filter })]); return { items, total }; },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.alertRule.findFirst({ where: { id, AND: [scope(actor)] }, include: alertRuleInclude }); },
  findContext(id: string) { return prisma.alertRule.findUnique({ where: { id }, select: { id: true, sensorId: true } }); },
  create(data: Prisma.AlertRuleUncheckedCreateInput) { return prisma.alertRule.create({ data, include: alertRuleInclude }); },
  enabledForSensors(sensorIds: string[]) { return prisma.alertRule.findMany({ where: { sensorId: { in: sensorIds }, enabled: true }, include: alertRuleInclude }); },
};
