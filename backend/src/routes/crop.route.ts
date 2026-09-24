import { UserRole } from "@prisma/client";
import { Router } from "express";
import { createCrop, getCrop, listCrops, updateCrop } from "../controllers/crop.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createCropSchema, cropIdParamsSchema, cropListQuerySchema, updateCropSchema } from "../validators/crop.schema";

export const cropRouter = Router();
cropRouter.use(authenticate);
cropRouter.get("/", validate(cropListQuerySchema, "query"), listCrops);
cropRouter.get("/:id", validate(cropIdParamsSchema, "params"), getCrop);
cropRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createCropSchema), createCrop);
cropRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(cropIdParamsSchema, "params"), validate(updateCropSchema), updateCrop);

