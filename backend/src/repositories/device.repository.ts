import { DeviceConnectionStatus, DeviceStatus, DeviceType, Prisma, type UserRole } from "@prisma/client";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface DeviceListOptions { search?: string; farmId?: string; zoneId?: string; type?: DeviceType; status?: DeviceStatus; connectionStatus?: DeviceConnectionStatus; page: number; limit: number; }
const include = { zone: { select: { id: true, name: true, status: true, farmId: true, farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } satisfies Prisma.DeviceInclude;
function scope(actor: { id: string; role: UserRole }): Prisma.DeviceWhereInput { return { zone: { farm: farmScope(actor as FarmActor) } }; }
function where(actor: FarmActor, options: Partial<DeviceListOptions>): Prisma.DeviceWhereInput {
  return { AND: [scope(actor), options.farmId ? { zone: { farmId: options.farmId } } : {}, options.zoneId ? { zoneId: options.zoneId } : {}, options.type ? { type: options.type } : {}, options.status ? { status: options.status } : {}, options.connectionStatus ? { connectionStatus: options.connectionStatus } : {}, options.search ? { OR: [{ deviceCode: { contains: options.search.toUpperCase(), mode: "insensitive" } }, { name: { contains: options.search, mode: "insensitive" } }, { hardwareModel: { contains: options.search, mode: "insensitive" } }] } : {}] };
}
export const deviceRepository = {
  async list(actor: FarmActor, options: DeviceListOptions) { const filter = where(actor, options); const [items, total] = await prisma.$transaction([prisma.device.findMany({ where: filter, include, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }), prisma.device.count({ where: filter })]); return { items, total }; },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.device.findFirst({ where: { id, AND: [scope(actor)] }, include }); },
  findAccessContext(id: string) { return prisma.device.findUnique({ where: { id }, select: { id: true, zoneId: true, status: true, zone: { select: { id: true, status: true, farmId: true, farm: { select: { id: true, ownerId: true, status: true } } } } } }); },
  findByCode(deviceCode: string) { return prisma.device.findUnique({ where: { deviceCode }, include }); },
  findTelemetryContextByCode(deviceCode: string) { return prisma.device.findUnique({ where: { deviceCode }, include: { sensors: true } }); },
  create(data: Prisma.DeviceUncheckedCreateInput) { return prisma.device.create({ data, include }); },
  update(id: string, data: Prisma.DeviceUpdateInput) { return prisma.device.update({ where: { id }, data, include }); },
  async summary(actor: FarmActor, filters: { farmId?: string; zoneId?: string }) { const filter = where(actor, filters); const [total, active, maintenance, inactive, online, offline, unknown] = await prisma.$transaction([prisma.device.count({ where: filter }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.ACTIVE }] } }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.MAINTENANCE }] } }), prisma.device.count({ where: { AND: [filter, { status: DeviceStatus.INACTIVE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.ONLINE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.OFFLINE }] } }), prisma.device.count({ where: { AND: [filter, { connectionStatus: DeviceConnectionStatus.UNKNOWN }] } })]); return { total, active, maintenance, inactive, online, offline, unknown }; },
};
