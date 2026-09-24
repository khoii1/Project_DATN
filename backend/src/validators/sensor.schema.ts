import { SensorStatus, SensorType } from "@prisma/client";
import { z } from "zod";

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const optionalText = z.string().trim().max(1000).optional().nullable().transform((value) => value === "" ? null : value);
const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const validateRange = <T extends { from?: Date; to?: Date }>(value: T, context: z.RefinementCtx) => {
  if (value.from && value.to && value.from >= value.to) context.addIssue({ code: z.ZodIssueCode.custom, message: "Thời gian bắt đầu phải trước thời gian kết thúc", path: ["from"] });
  if (value.from && value.to && value.to.getTime() - value.from.getTime() > MAX_RANGE_MS) context.addIssue({ code: z.ZodIssueCode.custom, message: "Khoảng thời gian không được vượt quá 90 ngày", path: ["to"] });
};

export const createSensorSchema = z.object({ deviceId: z.string().trim().min(1), sensorCode: z.string().trim().toUpperCase().min(2).max(32).regex(/^[A-Z0-9_-]+$/), name: z.string().trim().min(2).max(150), type: z.nativeEnum(SensorType), description: optionalText }).strict();
export const updateSensorSchema = z.object({ name: z.string().trim().min(2).max(150).optional(), description: optionalText, status: z.nativeEnum(SensorStatus).optional() }).strict("Không được thay đổi mã, loại hoặc thiết bị").refine((value) => Object.keys(value).length > 0, "Cần dữ liệu cập nhật");
export const sensorListQuerySchema = z.object({ search: z.string().trim().max(100).optional(), farmId: z.string().trim().optional(), zoneId: z.string().trim().optional(), deviceId: z.string().trim().optional(), type: z.nativeEnum(SensorType).optional(), status: z.nativeEnum(SensorStatus).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(10) });
export const readingsQuerySchema = z.object({ from: isoDate.optional(), to: isoDate.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().refine((value) => [10, 20, 50, 100].includes(value), "Limit phải là 10, 20, 50 hoặc 100").default(20), sort: z.enum(["asc", "desc"]).default("desc") }).superRefine(validateRange);
export const chartQuerySchema = z.object({ from: isoDate, to: isoDate, resolution: z.enum(["auto", "raw", "5m", "15m", "30m", "1h", "2h", "6h", "1d"]).default("auto") }).superRefine(validateRange);
export const statisticsQuerySchema = z.object({ from: isoDate, to: isoDate }).superRefine(validateRange);
export const sensorIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const zoneLatestParamsSchema = z.object({ zoneId: z.string().trim().min(1) });
export const deviceLatestParamsSchema = z.object({ deviceId: z.string().trim().min(1) });

export type CreateSensorInput = z.infer<typeof createSensorSchema>;
export type UpdateSensorInput = z.infer<typeof updateSensorSchema>;
export type SensorListQuery = z.infer<typeof sensorListQuerySchema>;
export type ReadingsQuery = z.infer<typeof readingsQuerySchema>;
export type ChartQuery = z.infer<typeof chartQuerySchema>;
export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>;
