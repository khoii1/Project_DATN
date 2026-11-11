import { z } from "zod";

const phoneSchema = z.string().trim().max(20, "Số điện thoại tối đa 20 ký tự").regex(/^[0-9+().\s-]*$/, "Số điện thoại không hợp lệ");

export const loginSchema = z.object({
  email: z.string({ required_error: "Email là bắt buộc" }).trim().email("Email không hợp lệ").transform((value) => value.toLowerCase()),
  password: z.string({ required_error: "Mật khẩu là bắt buộc" }).min(1, "Mật khẩu là bắt buộc"),
});

export const updateProfileSchema = z.object({
  fullName: z.string({ required_error: "Họ tên là bắt buộc" }).trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
  phone: phoneSchema.optional().nullable().transform((value) => (value === "" || value === undefined ? null : value)),
}).strict("Không được cập nhật trường không hỗ trợ");

export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: "Mật khẩu hiện tại là bắt buộc" }).min(1, "Mật khẩu hiện tại là bắt buộc"),
  newPassword: z
    .string({ required_error: "Mật khẩu mới là bắt buộc" })
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .regex(/[A-Za-z]/, "Mật khẩu mới phải có ít nhất một chữ cái")
    .regex(/[0-9]/, "Mật khẩu mới phải có ít nhất một chữ số"),
}).strict("Không được cập nhật trường không hỗ trợ").refine((data) => data.currentPassword !== data.newPassword, {
  message: "Mật khẩu mới phải khác mật khẩu hiện tại",
  path: ["newPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

