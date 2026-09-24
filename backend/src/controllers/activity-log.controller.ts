import type { NextFunction, Request, Response } from 'express';
import { activityLogService } from '../services/activity-log.service';
import type { ActivityLogListQuery } from '../validators/activity-log.schema';

export async function listActivityLogs(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: 'Lấy nhật ký hoạt động thành công', data: await activityLogService.list(req.query as unknown as ActivityLogListQuery, req.user!) }); } catch (error) { next(error); } }
