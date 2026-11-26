import { randomInt } from "node:crypto";
import { env } from "../config/env";
import { ActivityAction, UserRole, UserStatus } from "../types/domain-enums";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { signAccessToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import type { ChangePasswordInput, ForgotPasswordInput, RegisterInput, ResetPasswordInput, UpdateProfileInput } from "../validators/auth.schema";
import { recordActivity } from "./activity-log.service";
import { emailService } from "./email.service";

interface ResetTokenRecord {
  otpCode: string;
  expiresAt: number;
  attempts: number;
}

const passwordResetStore = new Map<string, ResetTokenRecord>();
const RESET_TTL_MS = 5 * 60 * 1000;

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
  async register(input: RegisterInput, ipAddress?: string): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(409, "Email này đã được đăng ký sử dụng");
    }

    const passwordHash = await hashPassword(input.password);
    const chosenRole = input.role === UserRole.STAFF ? UserRole.STAFF : UserRole.FARM_OWNER;
    const created = await userRepository.create({
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      phone: input.phone ?? null,
      passwordHash,
      role: chosenRole,
      status: UserStatus.ACTIVE,
    });

    await recordActivity({
      userId: created.id,
      action: ActivityAction.CREATE_USER,
      entityType: "USER",
      entityId: created.id,
      description: `${created.fullName} đăng ký tài khoản mới`,
      ipAddress,
    });

    return {
      user: created,
      accessToken: signAccessToken({ id: created.id, role: created.role as UserRole }),
    };
  },

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

    return { user: toPublicUser(user), accessToken: signAccessToken({ id: user.id, role: user.role as UserRole }) };
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

  async requestPasswordReset(
    input: ForgotPasswordInput,
  ): Promise<{ expiresInSeconds: number; emailSent: boolean; verificationCode?: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError(404, "Không tìm thấy tài khoản với địa chỉ Email này");
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(403, "Tài khoản này hiện đang bị khóa, vui lòng liên hệ Quản trị viên");
    }

    const otpCode = String(randomInt(100000, 1000000));
    passwordResetStore.set(normalizedEmail, {
      otpCode,
      expiresAt: Date.now() + RESET_TTL_MS,
      attempts: 0,
    });

    if (emailService.isConfigured()) {
      try {
        await emailService.sendPasswordResetOtpEmail({
          to: user.email,
          fullName: user.fullName,
          otpCode,
          expiresInMinutes: 5,
        });
      } catch (error) {
        passwordResetStore.delete(normalizedEmail);
        throw error;
      }

      console.log(`[Password Reset OTP] Sent real OTP email to ${normalizedEmail} (valid 5m)`);
      return {
        expiresInSeconds: 300,
        emailSent: true,
      };
    }

    if (env.nodeEnv === "production") {
      passwordResetStore.delete(normalizedEmail);
      throw new AppError(
        503,
        "Máy chủ chưa cấu hình dịch vụ gửi Email (vui lòng thêm biến EMAIL_WEBHOOK_URL trên Render)",
      );
    }

    console.log(`[Password Reset OTP - Local Dev] Email=${normalizedEmail} Code=${otpCode} (valid 5m)`);
    return {
      expiresInSeconds: 300,
      emailSent: false,
      verificationCode: otpCode,
    };
  },

  async resetPassword(input: ResetPasswordInput, ipAddress?: string): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const record = passwordResetStore.get(normalizedEmail);
    if (!record || Date.now() > record.expiresAt) {
      passwordResetStore.delete(normalizedEmail);
      throw new AppError(400, "Mã xác thực không tồn tại hoặc đã hết hạn (5 phút). Vui lòng lấy mã mới.");
    }

    if (record.otpCode !== input.otpCode.trim()) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        passwordResetStore.delete(normalizedEmail);
        throw new AppError(429, "Nhập sai mã xác thực quá 5 lần. Vui lòng yêu cầu mã mới.");
      }
      throw new AppError(400, "Mã xác thực 6 chữ số không chính xác");
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user || user.status === UserStatus.INACTIVE) {
      passwordResetStore.delete(normalizedEmail);
      throw new AppError(404, "Tài khoản không hợp lệ hoặc đang bị khóa");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.update(user.id, { passwordHash });
    passwordResetStore.delete(normalizedEmail);

    await recordActivity({
      userId: user.id,
      action: ActivityAction.UPDATE_USER,
      entityType: "USER",
      entityId: user.id,
      description: `${user.fullName} đã đặt lại mật khẩu tài khoản`,
      ipAddress,
    });
  },
};
