import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getZoneLatestReadings } from "../controllers/sensor.controller";
import { zoneLatestParamsSchema } from "../validators/sensor.schema";
import { createZone, getZone, listZones, updateZone } from "../controllers/zone.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createZoneSchema, updateZoneSchema, zoneIdParamsSchema, zoneListQuerySchema } from "../validators/zone.schema";

export const zoneRouter = Router();
zoneRouter.use(authenticate);
zoneRouter.get("/:zoneId/latest-readings", validate(zoneLatestParamsSchema, "params"), getZoneLatestReadings);
zoneRouter.get("/", validate(zoneListQuerySchema, "query"), listZones);
zoneRouter.get("/:id", validate(zoneIdParamsSchema, "params"), getZone);
zoneRouter.post("/", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(createZoneSchema), createZone);
zoneRouter.patch("/:id", authorize(UserRole.ADMIN, UserRole.FARM_OWNER), validate(zoneIdParamsSchema, "params"), validate(updateZoneSchema), updateZone);
