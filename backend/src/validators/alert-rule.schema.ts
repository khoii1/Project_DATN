import { AlertOperator, AlertSeverity, SensorType } from "@prisma/client";
import { z } from "zod";

const conditionFields = { name: z.string().trim().min(2).max(150), operator: z.nativeEnum(AlertOperator), threshold: z.number().finite(), recoveryThreshold: z.number().finite().nullable().optional(), severity: z.nativeEnum(AlertSeverity), message: z.string().trim().max(1000).nullable().optional(), enabled: z.boolean().optional() };
export const createAlertRuleSchema = z.object({ sensorId: z.string().trim().min(1), ...conditionFields }).strict();
export const updateAlertRuleSchema = z.object({ name: conditionFields.name.optional(), operator: conditionFields.operator.optional(), threshold: conditionFields.threshold.optional(), recoveryThreshold: conditionFields.recoveryThreshold, severity: conditionFields.severity.optional(), message: conditionFields.message, enabled: conditionFields.enabled }).strict("Không được thay đổi cảm biến của quy tắc").refine((value) => Object.keys(value).length > 0, "Cần dữ liệu cập nhật");
const booleanQuery = z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean());
export const alertRuleListQuerySchema = z.object({ search: z.string().trim().max(100).optional(), farmId: z.string().trim().optional(), zoneId: z.string().trim().optional(), deviceId: z.string().trim().optional(), sensorId: z.string().trim().optional(), sensorType: z.nativeEnum(SensorType).optional(), severity: z.nativeEnum(AlertSeverity).optional(), enabled: booleanQuery.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const alertRuleIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type AlertRuleListQuery = z.infer<typeof alertRuleListQuerySchema>;
