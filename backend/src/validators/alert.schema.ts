import { AlertSeverity, AlertStatus, SensorType } from "@prisma/client";
import { z } from "zod";
const booleanQuery = z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean());
const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));
export const alertListQuerySchema = z.object({ farmId: z.string().trim().optional(), zoneId: z.string().trim().optional(), deviceId: z.string().trim().optional(), sensorId: z.string().trim().optional(), sensorType: z.nativeEnum(SensorType).optional(), status: z.nativeEnum(AlertStatus).optional(), severity: z.nativeEnum(AlertSeverity).optional(), active: booleanQuery.optional(), from: isoDate.optional(), to: isoDate.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).refine((value) => !value.from || !value.to || value.from < value.to, { message: "Thời gian bắt đầu phải trước thời gian kết thúc", path: ["from"] });
export const alertIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;
