import { Prisma, type UserRole, type UserStatus } from "@prisma/client";
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
              { fullName: { contains: options.search, mode: "insensitive" } },
              { email: { contains: options.search, mode: "insensitive" } },
              { phone: { contains: options.search, mode: "insensitive" } },
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
  listActiveStaffCandidates(farmId: string) {
    return prisma.user.findMany({
      where: { role: "STAFF", status: "ACTIVE", farmAssignments: { none: { farmId } } },
      select: publicUserSelect,
      orderBy: { fullName: "asc" },
    });
  },
};
