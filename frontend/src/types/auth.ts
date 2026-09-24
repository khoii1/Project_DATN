export type UserRole = "ADMIN" | "FARM_OWNER" | "STAFF";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  FARM_OWNER: "Chủ trang trại",
  STAFF: "Nhân viên",
};

