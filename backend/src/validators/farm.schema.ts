import { FarmStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((value) => value === "" ? null : value);

export const createFarmSchema = z.object({
  name: z.string({ required_error: "Tên trang trại là bắt buộc" }).trim().min(2, "Tên trang trại phải có ít nhất 2 ký tự").max(150),
  ownerId: z.string().trim().min(1).optional(),
  address: optionalText(255),
  description: optionalText(1000),
  areaHectares: z.coerce.number().positive("Diện tích phải lớn hơn 0").max(100000).optional().nullable(),
});

export const updateFarmSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  address: optionalText(255),
  description: optionalText(1000),
  areaHectares: z.coerce.number().positive("Diện tích phải lớn hơn 0").max(100000).optional().nullable(),
  status: z.nativeEnum(FarmStatus).optional(),
}).strict("Không được cập nhật trường không hỗ trợ").refine((value) => Object.keys(value).length > 0, "Cần cung cấp dữ liệu cập nhật");

export const farmListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(FarmStatus).optional(),
  ownerId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const farmIdParamsSchema = z.object({ id: z.string().trim().min(1, "ID trang trại không hợp lệ") });
export const farmStaffParamsSchema = z.object({ farmId: z.string().trim().min(1), staffId: z.string().trim().min(1) });
export const farmStaffListParamsSchema = z.object({ farmId: z.string().trim().min(1) });
export const updateStaffPermissionSchema = z.object({ canControlIrrigation: z.boolean() }).strict();
export const assignStaffSchema = z.object({ staffId: z.string({ required_error: "Nhân viên là bắt buộc" }).trim().min(1) });

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;
export type FarmListQuery = z.infer<typeof farmListQuerySchema>;
