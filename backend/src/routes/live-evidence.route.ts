import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { deviceRepository } from "../repositories/device.repository";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { liveEvidenceStore } from "../services/live-provenance/evidence-store";
import { liveClockHealth } from "../services/live-provenance/windows-time";
import { assembleLiveObservation } from "../services/live-provenance/snapshot-assembler";

export const liveEvidenceRouter = Router();
const querySchema = z.object({ deviceId: z.string().min(1).max(128) }).strict();
liveEvidenceRouter.use(authenticate);
liveEvidenceRouter.get("/", validate(querySchema, "query"), async (req, res, next) => {
  try {
    const device = await deviceRepository.findAccessibleById(req.query.deviceId as string, req.user!);
    if (!device || device.deviceCode !== "ESP32-GF-A-01") throw new AppError(404, "Không tìm thấy thiết bị trong phạm vi đọc");
    await liveClockHealth.refresh();
    // Recheck receipt/session AFTER async clock query: reconnect may invalidate cache.
    const candidate = liveEvidenceStore.latest(device.deviceCode, "SOIL_01");
    const data = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const presence = await tx.device.findUnique({ where: { id: device.id }, select: { connectionStatus: true, lastSeenAt: true } });
      const row = candidate?.reading ? await tx.sensorReading.findFirst({ where: { id: candidate.reading.id, sensor: { sensorCode: "SOIL_01", deviceId: device.id } },
        select: { id: true, value: true, source: true, recordedAt: true, receivedAt: true } }) : null;
      const receipt = row ? liveEvidenceStore.matchDatabase({ id: row.id, sensorCode: "SOIL_01", value: row.value, source: row.source,
        recordedAt: row.recordedAt.toISOString(), dbReceivedAt: row.receivedAt.toISOString() }, device.deviceCode) : null;
      const actuator = await tx.actuator.findFirst({ where: { deviceId: device.id, actuatorCode: "PUMP_01" }, select: { currentState: true, lastStateChangedAt: true } });
      const candidateOff = liveEvidenceStore.off(device.deviceCode, "PUMP_01");
      const off = actuator?.currentState === "OFF" && actuator.lastStateChangedAt?.toISOString() === candidateOff?.recordedAt ? candidateOff : null;
      return assembleLiveObservation({ receipt, off, clock: liveClockHealth.snapshot(),
        presence: { connectionStatus: presence?.connectionStatus ?? "UNKNOWN", lastSeenAt: presence?.lastSeenAt?.toISOString() ?? null } }, new Date().toISOString());
    });
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: { ...data, observer: liveEvidenceStore.diagnostics(),
      runtime: { commandsEnabled: env.mqttCommandsEnabled, automationEnabled: env.mqttAutomationCommandsEnabled, pumpTestMode: env.mqttPumpTestMode } } });
  } catch (error) { next(error); }
});
