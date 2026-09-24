import { Prisma, type FarmStatus, type UserRole } from "@prisma/client";
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
        options.search ? { OR: [{ name: { contains: options.search, mode: "insensitive" } }, { address: { contains: options.search, mode: "insensitive" } }] } : {},
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
  countCrops(id: string) { return prisma.crop.count({ where: { zone: { farmId: id } } }); },
};

