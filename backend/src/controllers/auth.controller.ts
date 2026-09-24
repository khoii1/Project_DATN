import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import type { LoginInput } from "../validators/auth.schema";

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as LoginInput;
    const result = await authService.login(input.email, input.password, request.ip);
    response.status(200).json({ success: true, message: "Đăng nhập thành công", data: result });
  } catch (error) {
    next(error);
  }
}

export function me(request: Request, response: Response): void {
  response.status(200).json({ success: true, message: "Lấy thông tin tài khoản thành công", data: { user: request.user } });
}

export async function logout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.user) await authService.logout(request.user, request.ip);
    response.status(200).json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    next(error);
  }
}

