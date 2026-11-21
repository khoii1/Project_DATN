import { createContext } from "react";
import type { AuthUser, LoginCredentials, RegisterInput } from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(credentials: LoginCredentials): Promise<void>;
  register?(input: RegisterInput, remember?: boolean): Promise<void>;
  logout(): Promise<void>;
  updateUser?(user: AuthUser): void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

