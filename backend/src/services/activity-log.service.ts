import type { ActivityAction } from "@prisma/client";
import { createActivityLog } from "../repositories/activity-log.repository";
import { exportActivityLogs, listActivityLogs, type ActivityActor } from '../repositories/activity-log.repository';
import { reportRepository } from '../repositories/report.repository';
import type { ActivityLogListQuery } from '../validators/activity-log.schema';
import { AppError } from '../utils/app-error';

interface RecordActivityInput {
  userId?: string;
  farmId?: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
}

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await createActivityLog(input);
  } catch {
    console.warn(`Activity log could not be recorded: ${input.action}`);
  }
}

export const activityLogService = {
  async list(query: ActivityLogListQuery, actor: ActivityActor) {
    const farmIds = await reportRepository.accessibleFarmIds(actor);
    if (query.farmId && !farmIds.includes(query.farmId) && actor.role !== 'ADMIN') throw new AppError(404, 'Không tìm thấy trang trại');
    const { items, total } = await listActivityLogs(actor, query, farmIds);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
  exportRows(query: Partial<ActivityLogListQuery>, actor: ActivityActor) {
    return reportRepository.accessibleFarmIds(actor).then((farmIds) => exportActivityLogs(actor, query, farmIds, 100_001));
  },
};
