import { ZoneStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().max(1000).optional().nullable().transform((value) => value === "" ? null : value);

export const createZoneSchema = z.object({
  farmId: z.string({ required_error: "Trang trại là bắt buộc" }).trim().min(1),
  name: z.string({ required_error: "Tên khu vực là bắt buộc" }).trim().min(2).max(150),
  description: optionalText,
  areaHectares: z.coerce.number().positive("Diện tích phải lớn hơn 0").max(100000).optional().nullable(),
});

export const updateZoneSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: optionalText,
  areaHectares: z.coerce.number().positive("Diện tích phải lớn hơn 0").max(100000).optional().nullable(),
  status: z.nativeEnum(ZoneStatus).optional(),
}).strict("Không được thay đổi farmId hoặc trường không hỗ trợ").refine((value) => Object.keys(value).length > 0, "Cần cung cấp dữ liệu cập nhật");

export const zoneListQuerySchema = z.object({
  farmId: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(ZoneStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const zoneIdParamsSchema = z.object({ id: z.string().trim().min(1, "ID khu vực không hợp lệ") });
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type ZoneListQuery = z.infer<typeof zoneListQuerySchema>;
