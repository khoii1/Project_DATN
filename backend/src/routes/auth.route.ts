import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/auth.controller";
import { env } from "../config/env";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema } from "../validators/auth.schema";

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
authRouter.post("/logout", authenticate, logout);

