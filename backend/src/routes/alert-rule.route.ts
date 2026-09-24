import { UserRole } from "@prisma/client";
import { Router } from "express";
import { createAlertRule, getAlertRule, listAlertRules, updateAlertRule } from "../controllers/alert-rule.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { alertRuleIdParamsSchema, alertRuleListQuerySchema, createAlertRuleSchema, updateAlertRuleSchema } from "../validators/alert-rule.schema";
export const alertRuleRouter = Router(); alertRuleRouter.use(authenticate); alertRuleRouter.get("/", validate(alertRuleListQuerySchema, "query"), listAlertRules); alertRuleRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createAlertRuleSchema), createAlertRule); alertRuleRouter.get("/:id", validate(alertRuleIdParamsSchema, "params"), getAlertRule); alertRuleRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(alertRuleIdParamsSchema, "params"), validate(updateAlertRuleSchema), updateAlertRule);
