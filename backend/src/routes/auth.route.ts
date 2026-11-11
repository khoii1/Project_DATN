import { Router } from "express";
import rateLimit from "express-rate-limit";
import { changePassword, login, logout, me, updateProfile } from "../controllers/auth.controller";
import { env } from "../config/env";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { changePasswordSchema, loginSchema, updateProfileSchema } from "../validators/auth.schema";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "development" ? 50 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều lần đăng nhập, vui lòng thử lại sau" },
});

authRouter.post("/login", loginLimiter, validate(loginSchema), login);
authRouter.get("/me", authenticate, me);
authRouter.patch("/me", authenticate, validate(updateProfileSchema), updateProfile);
authRouter.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);
authRouter.post("/logout", authenticate, logout);

