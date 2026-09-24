import { Prisma, type CropStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { farmScope, type FarmActor } from "./farm.repository";

export interface CropListOptions { farmId?: string; zoneId?: string; search?: string; status?: CropStatus; page: number; limit: number; }
const cropInclude = { zone: { include: { farm: { select: { id: true, name: true, ownerId: true, status: true } } } } } satisfies Prisma.CropInclude;

function cropScope(actor: FarmActor): Prisma.CropWhereInput { return { zone: { farm: farmScope(actor) } }; }

export const cropRepository = {
  async list(actor: FarmActor, options: CropListOptions) {
    const where: Prisma.CropWhereInput = { AND: [cropScope(actor), options.farmId ? { zone: { farmId: options.farmId } } : {}, options.zoneId ? { zoneId: options.zoneId } : {}, options.status ? { status: options.status } : {}, options.search ? { OR: [{ name: { contains: options.search, mode: "insensitive" } }, { variety: { contains: options.search, mode: "insensitive" } }] } : {}] };
    const [items, total] = await prisma.$transaction([
      prisma.crop.findMany({ where, include: cropInclude, orderBy: { createdAt: "desc" }, skip: (options.page - 1) * options.limit, take: options.limit }),
      prisma.crop.count({ where }),
    ]);
    return { items, total };
  },
  findAccessibleById(id: string, actor: FarmActor) { return prisma.crop.findFirst({ where: { id, AND: [cropScope(actor)] }, include: cropInclude }); },
  findAccessContext(id: string) { return prisma.crop.findUnique({ where: { id }, select: { id: true, zoneId: true, plantingDate: true, expectedHarvestDate: true, actualHarvestDate: true, status: true, zone: { select: { id: true, farmId: true, status: true, farm: { select: { id: true, ownerId: true, status: true } } } } } }); },
  create(data: Prisma.CropUncheckedCreateInput) { return prisma.crop.create({ data, include: cropInclude }); },
  update(id: string, data: Prisma.CropUpdateInput) { return prisma.crop.update({ where: { id }, data, include: cropInclude }); },
};

