import { Router } from "express";
import rateLimit from "express-rate-limit";
import { changePassword, forgotPassword, login, logout, me, register, requestRegisterOtp, resetPassword, updateProfile } from "../controllers/auth.controller";
import { env } from "../config/env";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerOtpRequestSchema, registerSchema, resetPasswordSchema, updateProfileSchema } from "../validators/auth.schema";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "development" ? 50 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều lần đăng nhập, vui lòng thử lại sau" },
});

authRouter.post("/register/request-otp", loginLimiter, validate(registerOtpRequestSchema), requestRegisterOtp);
authRouter.post("/register", loginLimiter, validate(registerSchema), register);
authRouter.post("/login", loginLimiter, validate(loginSchema), login);
authRouter.post("/forgot-password", loginLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", loginLimiter, validate(resetPasswordSchema), resetPassword);
authRouter.get("/me", authenticate, me);
authRouter.patch("/me", authenticate, validate(updateProfileSchema), updateProfile);
authRouter.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);
authRouter.post("/logout", authenticate, logout);

