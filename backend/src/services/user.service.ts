import { Prisma } from "@prisma/client"; import { ActivityAction, type UserRole, type UserStatus } from "../types/domain-enums";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../validators/user.schema";
import { AppError } from "../utils/app-error";
import { hashPassword } from "../utils/password";
import { recordActivity } from "./activity-log.service";

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Actor {
  id: string;
  fullName: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export const userService = {
  async list(query: UserListQuery): Promise<{ items: PublicUser[]; pagination: PaginationResult }> {
    const result = await userRepository.list({
      search: query.search,
      role: query.role as UserRole | undefined,
      status: query.status as UserStatus | undefined,
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    };
  },

  async getById(id: string): Promise<PublicUser> {
    const user = await userRepository.findPublicById(id);
    if (!user) throw new AppError(404, "Không tìm thấy người dùng");
    return user;
  },

  async create(input: CreateUserInput, actor: Actor, ipAddress?: string): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    if (await userRepository.findByEmail(email)) {
      throw new AppError(409, "Email đã được sử dụng");
    }

    try {
      const user = await userRepository.create({
        fullName: input.fullName,
        email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      });
      await recordActivity({
        userId: actor.id,
        action: ActivityAction.CREATE_USER,
        entityType: "USER",
        entityId: user.id,
        description: `${actor.fullName} tạo tài khoản ${user.email}`,
        ipAddress,
      });
      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError(409, "Email đã được sử dụng");
      throw error;
    }
  },

  async update(id: string, input: UpdateUserInput, actor: Actor, ipAddress?: string): Promise<PublicUser> {
    const existing = await this.getById(id);
    if (id === actor.id && input.status === "INACTIVE") {
      throw new AppError(400, "Bạn không thể tự vô hiệu hóa tài khoản của mình");
    }

    const user = await userRepository.update(id, {
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
      status: input.status,
    });

    let action: ActivityAction = ActivityAction.UPDATE_USER;
    if (existing.status !== user.status) {
      action = user.status === "ACTIVE" ? ActivityAction.ACTIVATE_USER : ActivityAction.DEACTIVATE_USER;
    }
    await recordActivity({
      userId: actor.id,
      action,
      entityType: "USER",
      entityId: user.id,
      description: `${actor.fullName} cập nhật tài khoản ${user.email}`,
      ipAddress,
    });
    return user;
  },

  async remove(id: string, actor: Actor, ipAddress?: string): Promise<void> {
    if (id === actor.id) {
      throw new AppError(400, "Bạn không thể tự xóa tài khoản đang đăng nhập");
    }
    const existing = await this.getById(id);
    const ownedCount = await userRepository.countOwnedFarms(id);
    if (ownedCount > 0) {
      throw new AppError(400, `Tài khoản này đang sở hữu ${ownedCount} trang trại. Vui lòng xóa trang trại trước khi xóa tài khoản.`);
    }
    await userRepository.remove(id);
    await recordActivity({
      userId: actor.id,
      action: ActivityAction.DELETE_USER,
      entityType: "USER",
      entityId: id,
      description: `${actor.fullName} xóa tài khoản ${existing.email}`,
      ipAddress,
    });
  },
};
