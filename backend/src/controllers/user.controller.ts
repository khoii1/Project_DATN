import type { NextFunction, Request, Response } from "express";
import { userService } from "../services/user.service";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../validators/user.schema";

export async function listUsers(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userService.list(request.query as unknown as UserListQuery);
    response.status(200).json({ success: true, message: "Lấy danh sách người dùng thành công", data });
  } catch (error) { next(error); }
}

export async function getUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getById(request.params.id as string);
    response.status(200).json({ success: true, message: "Lấy người dùng thành công", data: { user } });
  } catch (error) { next(error); }
}

export async function createUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.create(request.body as CreateUserInput, request.user!, request.ip);
    response.status(201).json({ success: true, message: "Tạo người dùng thành công", data: { user } });
  } catch (error) { next(error); }
}

export async function updateUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.update(request.params.id as string, request.body as UpdateUserInput, request.user!, request.ip);
    response.status(200).json({ success: true, message: "Cập nhật người dùng thành công", data: { user } });
  } catch (error) { next(error); }
}
