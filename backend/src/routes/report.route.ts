import { Router } from 'express';
import { exportReport, reportAlerts, reportAutomation, reportIrrigation, reportOverview, reportSensors } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { alertReportQuerySchema, reportExportQuerySchema, reportQuerySchema, sensorReportQuerySchema } from '../validators/report.schema';

export const reportRouter = Router();
reportRouter.use(authenticate);
reportRouter.get('/overview', validate(reportQuerySchema, 'query'), reportOverview);
reportRouter.get('/sensors', validate(sensorReportQuerySchema, 'query'), reportSensors);
reportRouter.get('/alerts', validate(alertReportQuerySchema, 'query'), reportAlerts);
reportRouter.get('/irrigation', validate(reportQuerySchema, 'query'), reportIrrigation);
reportRouter.get('/automation', validate(reportQuerySchema, 'query'), reportAutomation);
reportRouter.get('/export', validate(reportExportQuerySchema, 'query'), exportReport);
