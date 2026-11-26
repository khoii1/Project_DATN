import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput, RegisterOtpRequestInput, ResetPasswordInput, UpdateProfileInput } from "../validators/auth.schema";

export async function requestRegisterOtp(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as RegisterOtpRequestInput;
    const data = await authService.requestRegisterOtp(input);
    response.status(200).json({
      success: true,
      message: data.emailSent
        ? "Mã xác thực OTP 6 chữ số đã được gửi tới Email đăng ký (hiệu lực 5 phút)"
        : "Đã tạo mã xác thực đăng ký (hiệu lực 5 phút)",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as RegisterInput;
    const result = await authService.register(input, request.ip);
    response.status(201).json({ success: true, message: "Đăng ký tài khoản thành công", data: result });
  } catch (error) {
    next(error);
  }
}

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

export async function updateProfile(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as UpdateProfileInput;
    const user = await authService.updateProfile(request.user!.id, input, request.ip);
    response.status(200).json({ success: true, message: "Cập nhật hồ sơ thành công", data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as ChangePasswordInput;
    await authService.changePassword(request.user!.id, input, request.ip);
    response.status(200).json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    next(error);
  }
}

export async function logout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.user) await authService.logout(request.user, request.ip);
    response.status(200).json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as ForgotPasswordInput;
    const data = await authService.requestPasswordReset(input);
    response.status(200).json({
      success: true,
      message: data.emailSent
        ? "Mã xác thực OTP 6 chữ số đã được gửi tới Email của bạn (hiệu lực 5 phút)"
        : "Đã tạo mã xác thực khôi phục mật khẩu (hiệu lực 5 phút)",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = request.body as ResetPasswordInput;
    await authService.resetPassword(input, request.ip);
    response.status(200).json({ success: true, message: "Đặt lại mật khẩu mới thành công" });
  } catch (error) {
    next(error);
  }
}

