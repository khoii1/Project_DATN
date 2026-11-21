import { Prisma } from "@prisma/client"; import { type UserRole, type UserStatus } from "../types/domain-enums";
import { prisma } from "../config/database";

export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export interface UserListOptions {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  limit: number;
}

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findPublicById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  async list(options: UserListOptions): Promise<{ items: PublicUser[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      role: options.role,
      status: options.status,
      ...(options.search
        ? {
            OR: [
              { fullName: { contains: options.search } },
              { email: { contains: options.search } },
              { phone: { contains: options.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },
  countOwnedFarms(id: string) {
    return prisma.farm.count({ where: { ownerId: id } });
  },
  async remove(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.farmStaffAssignment.deleteMany({ where: { staffId: id } });
      await tx.alertRule.updateMany({ where: { createdById: id }, data: { createdById: null } });
      await tx.automationRule.updateMany({ where: { createdById: id }, data: { createdById: null } });
      await tx.deviceCommand.updateMany({ where: { requestedById: id }, data: { requestedById: null } });
      await tx.alert.updateMany({ where: { acknowledgedById: id }, data: { acknowledgedById: null } });
      await tx.alert.updateMany({ where: { resolvedById: id }, data: { resolvedById: null } });
      await tx.activityLog.updateMany({ where: { userId: id }, data: { userId: null } });
      return tx.user.delete({ where: { id } });
    });
  },
  listActiveStaffCandidates(farmId: string) {
    return prisma.user.findMany({
      where: { role: "STAFF", status: "ACTIVE", farmAssignments: { none: { farmId } } },
      select: publicUserSelect,
      orderBy: { fullName: "asc" },
    });
  },
};
