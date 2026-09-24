import type { AuthUser } from "../types/auth";
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
  async login(email: string, password: string): Promise<LoginResponse["data"]> {
    const response = await api.post<LoginResponse>("/auth/login", { email, password });
    return response.data.data;
  },
  async getMe(): Promise<AuthUser> {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data.data.user;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};

