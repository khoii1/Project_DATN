import { UserRole } from "@prisma/client";
import { Router } from "express";
import { acknowledgeAlert, getAlert, getAlertSummary, listAlerts, resolveAlert } from "../controllers/alert.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { alertIdParamsSchema, alertListQuerySchema } from "../validators/alert.schema";
export const alertRouter = Router(); alertRouter.use(authenticate); alertRouter.get("/summary", getAlertSummary); alertRouter.get("/", validate(alertListQuerySchema, "query"), listAlerts); alertRouter.get("/:id", validate(alertIdParamsSchema, "params"), getAlert); alertRouter.post("/:id/acknowledge", validate(alertIdParamsSchema, "params"), acknowledgeAlert); alertRouter.post("/:id/resolve", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(alertIdParamsSchema, "params"), resolveAlert);
