import { UserRole } from "@prisma/client";
import { Router } from "express";
import { createAutomationRule, getAutomationRule, listAutomationRules, updateAutomationRule } from "../controllers/automation-rule.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { automationRuleIdParamsSchema, automationRuleListQuerySchema, createAutomationRuleSchema, updateAutomationRuleSchema } from "../validators/automation-rule.schema";
export const automationRuleRouter = Router(); automationRuleRouter.use(authenticate); automationRuleRouter.get("/", validate(automationRuleListQuerySchema, "query"), listAutomationRules); automationRuleRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createAutomationRuleSchema), createAutomationRule); automationRuleRouter.get("/:id", validate(automationRuleIdParamsSchema, "params"), getAutomationRule); automationRuleRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(automationRuleIdParamsSchema, "params"), validate(updateAutomationRuleSchema), updateAutomationRule);
