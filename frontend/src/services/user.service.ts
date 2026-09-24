import type { AuthUser, UserRole, UserStatus } from "../types/auth";
import { api } from "./api";

export interface UserRecord extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | "";
  status?: UserStatus | "";
  page: number;
  limit: number;
}

export interface UserListData {
  items: UserRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
}

interface ApiEnvelope<T> { success: true; message: string; data: T; }

export const userService = {
  async getUsers(filters: UserFilters): Promise<UserListData> {
    const response = await api.get<ApiEnvelope<UserListData>>("/users", {
      params: { search: filters.search || undefined, role: filters.role || undefined, status: filters.status || undefined, page: filters.page, limit: filters.limit },
    });
    return response.data.data;
  },
  async getUser(id: string): Promise<UserRecord> {
    const response = await api.get<ApiEnvelope<{ user: UserRecord }>>(`/users/${id}`);
    return response.data.data.user;
  },
  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const response = await api.post<ApiEnvelope<{ user: UserRecord }>>("/users", input);
    return response.data.data.user;
  },
  async updateUser(id: string, input: UpdateUserInput): Promise<UserRecord> {
    const response = await api.patch<ApiEnvelope<{ user: UserRecord }>>(`/users/${id}`, input);
    return response.data.data.user;
  },
};

