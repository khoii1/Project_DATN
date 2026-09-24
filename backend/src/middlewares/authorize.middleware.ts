import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export function authorize(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError(401, "Bạn cần đăng nhập để tiếp tục"));
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(new AppError(403, "Bạn không có quyền thực hiện thao tác này"));
      return;
    }
    next();
  };
}

