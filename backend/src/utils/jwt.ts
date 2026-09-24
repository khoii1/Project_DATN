import type { UserRole } from "@prisma/client";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./app-error";

interface TokenSubject {
  userId: string;
  role: UserRole;
}

export function signAccessToken(user: { id: string; role: UserRole }): string {
  return jwt.sign(
    { role: user.role },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] },
  );
}

export function verifyAccessToken(token: string): TokenSubject {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (!payload.sub || typeof payload.role !== "string") {
      throw new Error("Invalid token payload");
    }
    return { userId: payload.sub, role: payload.role as UserRole };
  } catch {
    throw new AppError(401, "Token không hợp lệ hoặc đã hết hạn");
  }
}

