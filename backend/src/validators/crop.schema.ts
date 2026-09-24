import { CropStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((value) => value === "" ? null : value);
const optionalDate = z.string().date("Ngày không hợp lệ").transform((value) => new Date(`${value}T00:00:00.000Z`)).optional().nullable();

function validateDates(value: { plantingDate?: Date | null; expectedHarvestDate?: Date | null; actualHarvestDate?: Date | null }, context: z.RefinementCtx) {
  if (value.plantingDate && value.expectedHarvestDate && value.expectedHarvestDate < value.plantingDate) context.addIssue({ code: "custom", path: ["expectedHarvestDate"], message: "Ngày thu hoạch dự kiến không được trước ngày trồng" });
  if (value.plantingDate && value.actualHarvestDate && value.actualHarvestDate < value.plantingDate) context.addIssue({ code: "custom", path: ["actualHarvestDate"], message: "Ngày thu hoạch thực tế không được trước ngày trồng" });
}

export const createCropSchema = z.object({
  zoneId: z.string({ required_error: "Khu vực là bắt buộc" }).trim().min(1),
  name: z.string({ required_error: "Tên cây trồng là bắt buộc" }).trim().min(2).max(150),
  variety: optionalText(150),
  plantingDate: optionalDate,
  expectedHarvestDate: optionalDate,
  actualHarvestDate: optionalDate,
  status: z.nativeEnum(CropStatus).default(CropStatus.PLANNED),
  description: optionalText(1000),
}).superRefine(validateDates);

export const updateCropSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  variety: optionalText(150),
  plantingDate: optionalDate,
  expectedHarvestDate: optionalDate,
  actualHarvestDate: optionalDate,
  status: z.nativeEnum(CropStatus).optional(),
  description: optionalText(1000),
}).strict("Không được thay đổi zoneId hoặc trường không hỗ trợ").refine((value) => Object.keys(value).length > 0, "Cần cung cấp dữ liệu cập nhật").superRefine(validateDates);

export const cropListQuerySchema = z.object({
  farmId: z.string().trim().optional(),
  zoneId: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(CropStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const cropIdParamsSchema = z.object({ id: z.string().trim().min(1, "ID cây trồng không hợp lệ") });
export type CreateCropInput = z.infer<typeof createCropSchema>;
export type UpdateCropInput = z.infer<typeof updateCropSchema>;
export type CropListQuery = z.infer<typeof cropListQuerySchema>;
