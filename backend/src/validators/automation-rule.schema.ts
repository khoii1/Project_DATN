import { z } from "zod";

const editable = { name: z.string().trim().min(2).max(150), startThreshold: z.number().finite().min(0).max(100), stopThreshold: z.number().finite().min(0).max(100), enabled: z.boolean().optional(), description: z.string().trim().max(1000).nullable().optional() };
const thresholds = <T extends z.ZodTypeAny>(schema: T) => schema.refine((value: any) => value.startThreshold === undefined || value.stopThreshold === undefined || value.startThreshold < value.stopThreshold, { path: ["stopThreshold"], message: "Ngưỡng tắt phải lớn hơn ngưỡng bật" });
export const createAutomationRuleSchema = thresholds(z.object({ sensorId: z.string().trim().min(1), actuatorId: z.string().trim().min(1), ...editable }).strict());
export const updateAutomationRuleSchema = thresholds(z.object({ name: editable.name.optional(), startThreshold: editable.startThreshold.optional(), stopThreshold: editable.stopThreshold.optional(), enabled: editable.enabled, description: editable.description }).strict("Không được thay đổi cảm biến hoặc máy bơm của quy tắc").refine(value => Object.keys(value).length > 0, "Cần dữ liệu cập nhật"));
const booleanQuery = z.preprocess(value => value === "true" ? true : value === "false" ? false : value, z.boolean());
export const automationRuleListQuerySchema = z.object({ search: z.string().trim().max(100).optional(), farmId: z.string().trim().optional(), zoneId: z.string().trim().optional(), sensorId: z.string().trim().optional(), actuatorId: z.string().trim().optional(), enabled: booleanQuery.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const automationRuleIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;
export type AutomationRuleListQuery = z.infer<typeof automationRuleListQuerySchema>;
