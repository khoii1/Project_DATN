import { UserRole } from "@prisma/client";
import { Router } from "express";
import { createUser, getUser, listUsers, updateUser } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema, userIdParamsSchema, userListQuerySchema } from "../validators/user.schema";

export const userRouter = Router();

userRouter.use(authenticate, authorize(UserRole.ADMIN));
userRouter.get("/", validate(userListQuerySchema, "query"), listUsers);
userRouter.get("/:id", validate(userIdParamsSchema, "params"), getUser);
userRouter.post("/", validate(createUserSchema), createUser);
userRouter.patch("/:id", validate(userIdParamsSchema, "params"), validate(updateUserSchema), updateUser);

