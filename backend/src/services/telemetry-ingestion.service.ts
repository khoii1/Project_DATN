import { DeviceStatus, SensorReadingSource, SensorStatus } from "@prisma/client";
import { SENSOR_TYPE_METADATA } from "../constants/sensor-metadata";
import { deviceRepository } from "../repositories/device.repository";
import { sensorReadingRepository } from "../repositories/sensor-reading.repository";
import { AppError } from "../utils/app-error";
import { alertEvaluationService } from "./alert-evaluation.service";
import { devicePresenceService } from "./device-presence.service";
import { automationEvaluationService } from "./automation-evaluation.service";
import type { AutomationEvaluationOptions } from "./automation-evaluation.service";

export interface TelemetryBatch { deviceCode: string; recordedAt: Date; source: SensorReadingSource; readings: Array<{ sensorCode: string; value: number }>; evaluateAlerts?: boolean; evaluateAutomation?: boolean; automationEvaluationOptions?: AutomationEvaluationOptions }
export const telemetryIngestionService = {
  async ingest(batch: TelemetryBatch) {
    const code = batch.deviceCode.trim().toUpperCase();
    if (!(batch.recordedAt instanceof Date) || Number.isNaN(batch.recordedAt.getTime())) throw new AppError(400, "Thời gian telemetry không hợp lệ");
    if (!batch.readings.length) throw new AppError(400, "Telemetry không có reading");
    const device = await deviceRepository.findTelemetryContextByCode(code); if (!device) throw new AppError(404, "Không tìm thấy thiết bị"); if (device.status !== DeviceStatus.ACTIVE) throw new AppError(400, "Thiết bị không ở trạng thái hoạt động");
    const uniqueCodes = new Set<string>();
    const data = batch.readings.map((item) => { const sensorCode = item.sensorCode.trim().toUpperCase(); if (uniqueCodes.has(sensorCode)) throw new AppError(400, `Cảm biến ${sensorCode} bị lặp trong batch`); uniqueCodes.add(sensorCode); const sensor = device.sensors.find((candidate) => candidate.sensorCode === sensorCode); if (!sensor) throw new AppError(400, `Cảm biến ${sensorCode} chưa được cấu hình`); if (sensor.status !== SensorStatus.ACTIVE) throw new AppError(400, `Cảm biến ${sensorCode} đang ngừng hoạt động`); if (!Number.isFinite(item.value)) throw new AppError(400, `Giá trị ${sensorCode} không hợp lệ`); const metadata = SENSOR_TYPE_METADATA[sensor.type]; if (item.value < metadata.min || item.value > metadata.max) throw new AppError(400, `Giá trị ${sensorCode} ngoài phạm vi vật lý ${metadata.min}–${metadata.max} ${metadata.unit}`); return { sensorId: sensor.id, value: item.value, source: batch.source, recordedAt: batch.recordedAt }; });
    const created = await sensorReadingRepository.createMany(data);
    await devicePresenceService.markOnline(code);
    if (batch.evaluateAlerts !== false) await alertEvaluationService.evaluate(created);
    if (batch.evaluateAutomation !== false) await automationEvaluationService.evaluate(created, batch.automationEvaluationOptions);
    return { received: data.length, created: created.length, duplicates: data.length - created.length };
  },
};
