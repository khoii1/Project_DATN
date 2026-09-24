import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const phoneSchema = z.string().trim().max(20, "Số điện thoại tối đa 20 ký tự").regex(/^[0-9+().\s-]*$/, "Số điện thoại không hợp lệ");

export const createUserSchema = z.object({
  fullName: z.string({ required_error: "Họ tên là bắt buộc" }).trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100),
  email: z.string({ required_error: "Email là bắt buộc" }).trim().email("Email không hợp lệ").transform((value) => value.toLowerCase()),
  phone: phoneSchema.optional().nullable().transform((value) => value === "" ? null : value),
  password: z.string({ required_error: "Mật khẩu là bắt buộc" }).min(8, "Mật khẩu phải có ít nhất 8 ký tự").regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất một chữ cái").regex(/[0-9]/, "Mật khẩu phải có ít nhất một chữ số"),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: "Vai trò không hợp lệ" }) }),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100).optional(),
  phone: phoneSchema.optional().nullable().transform((value) => value === "" ? null : value),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: "Vai trò không hợp lệ" }) }).optional(),
  status: z.nativeEnum(UserStatus, { errorMap: () => ({ message: "Trạng thái không hợp lệ" }) }).optional(),
}).strict("Không được cập nhật trường không hỗ trợ").refine((data) => Object.keys(data).length > 0, { message: "Cần cung cấp ít nhất một trường để cập nhật" });

export const userListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const userIdParamsSchema = z.object({ id: z.string().cuid("ID người dùng không hợp lệ") });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
