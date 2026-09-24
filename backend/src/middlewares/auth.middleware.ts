import { UserStatus } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/jwt";

export async function authenticate(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError(401, "Bạn cần đăng nhập để tiếp tục");
    }
    const token = authorization.slice(7).trim();
    if (!token) throw new AppError(401, "Bạn cần đăng nhập để tiếp tục");

    const payload = verifyAccessToken(token);
    const user = await userRepository.findPublicById(payload.userId);
    if (!user) throw new AppError(401, "Tài khoản không còn tồn tại");
    if (user.status !== UserStatus.ACTIVE) throw new AppError(401, "Tài khoản hiện không hoạt động");

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

