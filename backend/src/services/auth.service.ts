import { ActivityAction, UserStatus } from "@prisma/client";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { signAccessToken } from "../utils/jwt";
import { comparePassword } from "../utils/password";
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
};
