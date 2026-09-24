import { AlertSeverity, SensorType } from '@prisma/client';
import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

const rangeFields = {
  from: isoDate,
  to: isoDate,
  farmId: z.string().trim().min(1).optional(),
  zoneId: z.string().trim().min(1).optional(),
};

function validRange<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict().superRefine((value, context) => {
    const range = value as unknown as { from: Date; to: Date };
    if (range.from > range.to) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu' });
    if (range.to.getTime() - range.from.getTime() > 365 * 86_400_000) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Khoảng báo cáo không được vượt quá 365 ngày' });
  });
}

export const reportQuerySchema = validRange(rangeFields);
export const sensorReportQuerySchema = validRange({ ...rangeFields, sensorType: z.nativeEnum(SensorType).optional() });
export const alertReportQuerySchema = validRange({ ...rangeFields, severity: z.nativeEnum(AlertSeverity).optional() });
export const reportExportQuerySchema = validRange({
  ...rangeFields,
  type: z.enum(['sensor-readings', 'alerts', 'device-commands', 'activity-logs']),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type SensorReportQuery = z.infer<typeof sensorReportQuerySchema>;
export type AlertReportQuery = z.infer<typeof alertReportQuerySchema>;
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
