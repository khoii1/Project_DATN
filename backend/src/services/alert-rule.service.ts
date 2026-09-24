import { ActivityAction, AlertResolutionReason, AlertStatus, type AlertOperator } from "@prisma/client";
import { prisma } from "../config/database";
import { SENSOR_TYPE_METADATA } from "../constants/sensor-metadata";
import { alertRuleRepository } from "../repositories/alert-rule.repository";
import { AppError } from "../utils/app-error";
import type { AlertRuleListQuery, CreateAlertRuleInput, UpdateAlertRuleInput } from "../validators/alert-rule.schema";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string }
function validateCondition(type: keyof typeof SENSOR_TYPE_METADATA, operator: AlertOperator, threshold: number, recoveryThreshold?: number | null) { const metadata = SENSOR_TYPE_METADATA[type]; if (threshold < metadata.min || threshold > metadata.max) throw new AppError(400, `Ngưỡng phải trong khoảng ${metadata.min}–${metadata.max} ${metadata.unit}`); if (recoveryThreshold !== undefined && recoveryThreshold !== null) { if (recoveryThreshold < metadata.min || recoveryThreshold > metadata.max) throw new AppError(400, `Ngưỡng phục hồi phải trong khoảng ${metadata.min}–${metadata.max} ${metadata.unit}`); if (["LT", "LTE"].includes(operator) && recoveryThreshold <= threshold) throw new AppError(400, "Ngưỡng phục hồi phải lớn hơn ngưỡng kích hoạt cho điều kiện thấp"); if (["GT", "GTE"].includes(operator) && recoveryThreshold >= threshold) throw new AppError(400, "Ngưỡng phục hồi phải nhỏ hơn ngưỡng kích hoạt cho điều kiện cao"); } }

export const alertRuleService = {
  async list(query: AlertRuleListQuery, actor: Actor) { const { items, total } = await alertRuleRepository.list(actor, query); return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  async get(id: string, actor: Actor) { const rule = await alertRuleRepository.findAccessibleById(id, actor); if (!rule) throw new AppError(404, "Không tìm thấy quy tắc cảnh báo"); return rule; },
  async create(input: CreateAlertRuleInput, actor: Actor, ipAddress?: string) { const sensor = await farmAccessService.assertSensorManageable(input.sensorId, actor); validateCondition(sensor.type, input.operator, input.threshold, input.recoveryThreshold); const rule = await alertRuleRepository.create({ ...input, recoveryThreshold: input.recoveryThreshold ?? null, message: input.message || null, enabled: input.enabled ?? true, createdById: actor.id }); await recordActivity({ userId: actor.id, farmId: sensor.device.zone.farmId, action: ActivityAction.CREATE_ALERT_RULE, entityType: "ALERT_RULE", entityId: rule.id, description: `${actor.fullName} tạo quy tắc "${rule.name}"`, ipAddress }); return rule; },
  async update(id: string, input: UpdateAlertRuleInput, actor: Actor, ipAddress?: string) {
    const context = await alertRuleRepository.findContext(id); if (!context) throw new AppError(404, "Không tìm thấy quy tắc cảnh báo"); await farmAccessService.assertSensorManageable(context.sensorId, actor);
    const current = await alertRuleRepository.findAccessibleById(id, actor); if (!current) throw new AppError(404, "Không tìm thấy quy tắc cảnh báo"); const operator = input.operator ?? current.operator; const threshold = input.threshold ?? current.threshold; const recovery = input.recoveryThreshold === undefined ? current.recoveryThreshold : input.recoveryThreshold; validateCondition(current.sensor.type, operator, threshold, recovery);
    const conditionChanged = input.operator !== undefined && input.operator !== current.operator || input.threshold !== undefined && input.threshold !== current.threshold || input.recoveryThreshold !== undefined && input.recoveryThreshold !== current.recoveryThreshold;
    const disabling = current.enabled && input.enabled === false; const enabling = !current.enabled && input.enabled === true;
    await prisma.$transaction(async (transaction) => { if (conditionChanged || disabling) await transaction.alert.updateMany({ where: { alertRuleId: id, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } }, data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolutionReason: disabling ? AlertResolutionReason.RULE_DISABLED : AlertResolutionReason.RULE_UPDATED } }); await transaction.alertRule.update({ where: { id }, data: input }); });
    const rule = await alertRuleRepository.findAccessibleById(id, actor); const action = disabling ? ActivityAction.DISABLE_ALERT_RULE : enabling ? ActivityAction.ENABLE_ALERT_RULE : ActivityAction.UPDATE_ALERT_RULE; await recordActivity({ userId: actor.id, farmId: current.sensor.device.zone.farmId, action, entityType: "ALERT_RULE", entityId: id, description: `${actor.fullName} cập nhật quy tắc "${current.name}"`, ipAddress }); return rule;
  },
};
