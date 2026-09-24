import { UserRole } from "@prisma/client";
import { Router } from "express";
import { createSensor, getSensor, getSensorChart, getSensorReadings, getSensorStatistics, getSensorSummary, listSensors, updateSensor } from "../controllers/sensor.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { chartQuerySchema, createSensorSchema, readingsQuerySchema, sensorIdParamsSchema, sensorListQuerySchema, statisticsQuerySchema, updateSensorSchema } from "../validators/sensor.schema";

export const sensorRouter = Router();
sensorRouter.use(authenticate);
sensorRouter.get("/summary", getSensorSummary);
sensorRouter.get("/", validate(sensorListQuerySchema, "query"), listSensors);
sensorRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createSensorSchema), createSensor);
sensorRouter.get("/:id/readings", validate(sensorIdParamsSchema, "params"), validate(readingsQuerySchema, "query"), getSensorReadings);
sensorRouter.get("/:id/chart", validate(sensorIdParamsSchema, "params"), validate(chartQuerySchema, "query"), getSensorChart);
sensorRouter.get("/:id/statistics", validate(sensorIdParamsSchema, "params"), validate(statisticsQuerySchema, "query"), getSensorStatistics);
sensorRouter.get("/:id", validate(sensorIdParamsSchema, "params"), getSensor);
sensorRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(sensorIdParamsSchema, "params"), validate(updateSensorSchema), updateSensor);
