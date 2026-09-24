import { z } from "zod";

export const loginSchema = z.object({
  email: z.string({ required_error: "Email là bắt buộc" }).trim().email("Email không hợp lệ").transform((value) => value.toLowerCase()),
  password: z.string({ required_error: "Mật khẩu là bắt buộc" }).min(1, "Mật khẩu là bắt buộc"),
});

export type LoginInput = z.infer<typeof loginSchema>;

