import type { UserRole, UserStatus } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        role: UserRole;
        status: UserStatus;
      };
    }
  }
}

export {};
