import { ActivityAction } from '@prisma/client';
import { z } from 'zod';

const optionalDate = z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional();

export const activityLogListQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  userId: z.string().trim().min(1).optional(),
  action: z.nativeEnum(ActivityAction).optional(),
  entityType: z.string().trim().max(80).optional(),
  farmId: z.string().trim().min(1).optional(),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict().superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu' });
});

export type ActivityLogListQuery = z.infer<typeof activityLogListQuerySchema>;
