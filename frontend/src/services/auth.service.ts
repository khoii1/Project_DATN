import type { AuthUser, ChangePasswordInput, RegisterInput, UpdateProfileInput } from "../types/auth";
import { api } from "./api";

interface LoginResponse {
  success: true;
  message: string;
  data: { user: AuthUser; accessToken: string };
}

interface MeResponse {
  success: true;
  message: string;
  data: { user: AuthUser };
}

export const authService = {
  async requestRegisterOtp(email: string, fullName?: string): Promise<{ expiresInSeconds: number; emailSent?: boolean; verificationCode?: string }> {
    const response = await api.post<{
      success: true;
      message: string;
      data: { expiresInSeconds: number; emailSent?: boolean; verificationCode?: string };
    }>("/auth/register/request-otp", { email, fullName });
    return response.data.data;
  },
  async register(input: RegisterInput): Promise<LoginResponse["data"]> {
    const response = await api.post<LoginResponse>("/auth/register", input);
    return response.data.data;
  },
  async login(email: string, password: string): Promise<LoginResponse["data"]> {
    const response = await api.post<LoginResponse>("/auth/login", { email, password });
    return response.data.data;
  },
  async getMe(): Promise<AuthUser> {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data.data.user;
  },
  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    const response = await api.patch<MeResponse>("/auth/me", input);
    return response.data.data.user;
  },
  async changePassword(input: ChangePasswordInput): Promise<void> {
    await api.patch("/auth/change-password", input);
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
  async forgotPassword(email: string): Promise<{ expiresInSeconds: number; emailSent?: boolean; verificationCode?: string }> {
    const response = await api.post<{
      success: true;
      message: string;
      data: { expiresInSeconds: number; emailSent?: boolean; verificationCode?: string };
    }>("/auth/forgot-password", { email });
    return response.data.data;
  },
  async resetPassword(input: { email: string; otpCode: string; newPassword: string }): Promise<void> {
    await api.post("/auth/reset-password", input);
  },
};

