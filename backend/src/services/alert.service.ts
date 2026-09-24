import { ActivityAction, AlertResolutionReason, AlertStatus, DeviceStatus, SensorStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { alertRepository } from "../repositories/alert.repository";
import { sensorReadingRepository } from "../repositories/sensor-reading.repository";
import { AppError } from "../utils/app-error";
import { violates } from "../utils/alert-condition";
import type { AlertListQuery } from "../validators/alert.schema";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string }
async function accessible(id: string, actor: Actor) { const alert = await alertRepository.findAccessibleById(id, actor); if (!alert) throw new AppError(404, "Không tìm thấy cảnh báo"); return alert; }
export const alertService = {
  async list(query: AlertListQuery, actor: Actor) { const { items, total } = await alertRepository.list(actor, query); return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  summary(actor: Actor) { return alertRepository.summary(actor); },
  get(id: string, actor: Actor) { return accessible(id, actor); },
  async acknowledge(id: string, actor: Actor, ipAddress?: string) { const alert = await accessible(id, actor); if (alert.status === AlertStatus.RESOLVED) throw new AppError(409, "Cảnh báo đã được xử lý"); if (alert.status === AlertStatus.ACKNOWLEDGED) return alert; const updated = await prisma.alert.update({ where: { id }, data: { status: AlertStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedById: actor.id }, include: { alertRule: true, sensor: { include: { device: { include: { zone: { include: { farm: true } } } } } }, acknowledgedBy: { select: { id: true, fullName: true, email: true } }, resolvedBy: { select: { id: true, fullName: true, email: true } } } }); await recordActivity({ userId: actor.id, farmId: alert.sensor.device.zone.farmId, action: ActivityAction.ACKNOWLEDGE_ALERT, entityType: "ALERT", entityId: id, description: `${actor.fullName} xác nhận cảnh báo "${alert.title}"`, ipAddress }); return updated; },
  async resolve(id: string, actor: Actor, ipAddress?: string) { const alert = await accessible(id, actor); if (alert.status === AlertStatus.RESOLVED) return alert; await farmAccessService.assertSensorManageable(alert.sensorId, actor); const latest = await sensorReadingRepository.latest(alert.sensorId); const operational = alert.sensor.status === SensorStatus.ACTIVE && alert.sensor.device.status === DeviceStatus.ACTIVE; if (operational && latest && violates(alert.operatorSnapshot, latest.value, alert.thresholdSnapshot)) throw new AppError(409, "Không thể đóng cảnh báo vì điều kiện bất thường vẫn đang tồn tại"); const updated = await prisma.alert.update({ where: { id }, data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolvedById: actor.id, resolutionReason: AlertResolutionReason.MANUAL, ...(latest ? { lastValue: latest.value, lastReadingAt: latest.recordedAt } : {}) }, include: { alertRule: true, sensor: { include: { device: { include: { zone: { include: { farm: true } } } } } }, acknowledgedBy: { select: { id: true, fullName: true, email: true } }, resolvedBy: { select: { id: true, fullName: true, email: true } } } }); await recordActivity({ userId: actor.id, farmId: alert.sensor.device.zone.farmId, action: ActivityAction.MANUAL_RESOLVE_ALERT, entityType: "ALERT", entityId: id, description: `${actor.fullName} đóng cảnh báo "${alert.title}"`, ipAddress }); return updated; },
};
