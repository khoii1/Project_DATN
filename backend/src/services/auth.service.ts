import { ActivityAction, UserStatus } from "@prisma/client";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { signAccessToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import type { ChangePasswordInput, UpdateProfileInput } from "../validators/auth.schema";
import { recordActivity } from "./activity-log.service";

interface LoginResult {
  user: PublicUser;
  accessToken: string;
}

function toPublicUser(user: Awaited<ReturnType<typeof userRepository.findByEmail>>): PublicUser {
  if (!user) throw new AppError(401, "Email hoặc mật khẩu không chính xác");
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const authService = {
  async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    const passwordMatches = user ? await comparePassword(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(403, "Tài khoản hiện không hoạt động");
    }

    await recordActivity({
      userId: user.id,
      action: ActivityAction.LOGIN_SUCCESS,
      entityType: "USER",
      entityId: user.id,
      description: `${user.fullName} đăng nhập hệ thống`,
      ipAddress,
    });

    return { user: toPublicUser(user), accessToken: signAccessToken(user) };
  },

  async logout(user: Pick<PublicUser, "id" | "fullName">, ipAddress?: string): Promise<void> {
    await recordActivity({
      userId: user.id,
      action: ActivityAction.LOGOUT,
      entityType: "USER",
      entityId: user.id,
      description: `${user.fullName} đăng xuất hệ thống`,
      ipAddress,
    });
  },

  async updateProfile(userId: string, input: UpdateProfileInput, ipAddress?: string): Promise<PublicUser> {
    const existing = await userRepository.findPublicById(userId);
    if (!existing) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }

    const updated = await userRepository.update(userId, {
      fullName: input.fullName,
      phone: input.phone,
    });

    await recordActivity({
      userId: updated.id,
      action: ActivityAction.UPDATE_USER,
      entityType: "USER",
      entityId: updated.id,
      description: `${updated.fullName} cập nhật hồ sơ cá nhân`,
      ipAddress,
    });

    return updated;
  },

  async changePassword(userId: string, input: ChangePasswordInput, ipAddress?: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }

    const matches = await comparePassword(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError(400, "Mật khẩu hiện tại không chính xác");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.update(userId, { passwordHash });

    await recordActivity({
      userId: user.id,
      action: ActivityAction.UPDATE_USER,
      entityType: "USER",
      entityId: user.id,
      description: `${user.fullName} đổi mật khẩu tài khoản`,
      ipAddress,
    });
  },
};
