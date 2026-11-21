import { UserRole } from "../types/domain-enums";
import { Router } from "express";
import { createAlertRule, deleteAlertRule, getAlertRule, listAlertRules, updateAlertRule } from "../controllers/alert-rule.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { alertRuleIdParamsSchema, alertRuleListQuerySchema, createAlertRuleSchema, updateAlertRuleSchema } from "../validators/alert-rule.schema";
export const alertRuleRouter = Router(); alertRuleRouter.use(authenticate); alertRuleRouter.get("/", validate(alertRuleListQuerySchema, "query"), listAlertRules); alertRuleRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createAlertRuleSchema), createAlertRule); alertRuleRouter.get("/:id", validate(alertRuleIdParamsSchema, "params"), getAlertRule); alertRuleRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(alertRuleIdParamsSchema, "params"), validate(updateAlertRuleSchema), updateAlertRule); alertRuleRouter.delete("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(alertRuleIdParamsSchema, "params"), deleteAlertRule);
