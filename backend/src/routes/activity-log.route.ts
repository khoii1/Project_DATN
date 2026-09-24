import { Router } from 'express';
import { listActivityLogs } from '../controllers/activity-log.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { activityLogListQuerySchema } from '../validators/activity-log.schema';

export const activityLogRouter = Router();
activityLogRouter.use(authenticate);
activityLogRouter.get('/', validate(activityLogListQuerySchema, 'query'), listActivityLogs);
