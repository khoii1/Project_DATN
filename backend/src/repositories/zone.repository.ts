import { Prisma, type UserRole, type ZoneStatus } from "@prisma/client";
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
    const where: Prisma.ZoneWhereInput = { AND: [zoneScope(actor), options.farmId ? { farmId: options.farmId } : {}, options.status ? { status: options.status } : {}, options.search ? { name: { contains: options.search, mode: "insensitive" } } : {}] };
    const [items, total] = await prisma.$transaction([
      prisma.zone.findMany({ where, include: zoneInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }),
      prisma.zone.count({ where }),
    ]);
    return { items, total };
  },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.zone.findFirst({ where: { id, AND: [zoneScope(actor)] }, include: { ...zoneInclude, crops: { include: { zone: { select: { id: true, name: true, farmId: true, farm: { select: { id: true, name: true, ownerId: true, status: true } } } } }, orderBy: { createdAt: "desc" } } } }); },
  findAccessContext(id: string) { return prisma.zone.findUnique({ where: { id }, select: { id: true, name: true, farmId: true, status: true, areaHectares: true, farm: { select: { id: true, ownerId: true, status: true, areaHectares: true } } } }); },
  findByFarmAndName(farmId: string, name: string) { return prisma.zone.findFirst({ where: { farmId, name: { equals: name, mode: "insensitive" } } }); },
  create(data: Prisma.ZoneUncheckedCreateInput) { return prisma.zone.create({ data, include: zoneInclude }); },
  update(id: string, data: Prisma.ZoneUpdateInput) { return prisma.zone.update({ where: { id }, data, include: zoneInclude }); },
};
