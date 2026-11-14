import { ActivityAction, ActuatorType, Prisma, SensorType } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { actuatorRepository } from "../repositories/actuator.repository";
import { automationRuleRepository } from "../repositories/automation-rule.repository";
import { sensorRepository } from "../repositories/sensor.repository";
import { SENSOR_TYPE_METADATA } from "../constants/sensor-metadata";
import { AppError } from "../utils/app-error";
import type { AutomationRuleListQuery, CreateAutomationRuleInput, UpdateAutomationRuleInput } from "../validators/automation-rule.schema";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string }
function validateThresholds(start: number, stop: number) { const metadata = SENSOR_TYPE_METADATA[SensorType.SOIL_MOISTURE]; if (start < metadata.min || start > metadata.max || stop < metadata.min || stop > metadata.max) throw new AppError(400, `Ngưỡng phải trong khoảng ${metadata.min}–${metadata.max} ${metadata.unit}`); if (start >= stop) throw new AppError(400, "Ngưỡng bật phải nhỏ hơn ngưỡng tắt để tạo vùng hysteresis"); }
async function ensureEnabledAvailable(actuatorId: string, excludeId?: string) { const existing = await prisma.automationRule.findFirst({ where: { actuatorId, enabled: true, id: excludeId ? { not: excludeId } : undefined } }); if (existing) throw new AppError(409, "Máy bơm đã có một quy tắc tự động đang bật"); }
function present(rule: any) {
  const { commands, sensor, actuator, ...base } = rule; const { readings, ...sensorData } = sensor; const { commands: manualCommands, ...actuatorData } = actuator;
  const floor = rule.updatedAt && rule.updatedAt > rule.createdAt ? rule.updatedAt : rule.createdAt;
  const latestManual = manualCommands[0] ?? null; const manualOverrideUntil = latestManual?.completedAt && latestManual.completedAt >= floor ? new Date(latestManual.completedAt.getTime() + env.automationManualOverrideMinutes * 60_000) : null;
  return { ...base, sensor: { ...sensorData, latestReading: readings[0] ?? null }, actuator: actuatorData, latestAutomationCommand: commands[0] ?? null, manualOverrideActive: !!manualOverrideUntil && manualOverrideUntil > new Date(), manualOverrideUntil };
}

export const automationRuleService = {
  async list(query: AutomationRuleListQuery, actor: Actor) { const { items, total } = await automationRuleRepository.list(actor, query); return { items: items.map(present), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  async get(id: string, actor: Actor) { const rule = await automationRuleRepository.findAccessibleById(id, actor); if (!rule) throw new AppError(404, "Không tìm thấy quy tắc tưới tự động"); return present(rule); },
  async create(input: CreateAutomationRuleInput, actor: Actor, ipAddress?: string) {
    await farmAccessService.assertSensorManageable(input.sensorId, actor); const sensor = await sensorRepository.findAccessibleById(input.sensorId, actor); if (!sensor) throw new AppError(404, "Không tìm thấy cảm biến"); if (sensor.type !== SensorType.SOIL_MOISTURE) throw new AppError(400, "Tưới tự động chỉ hỗ trợ cảm biến độ ẩm đất");
    const actuator = await actuatorRepository.findAccessibleById(input.actuatorId, actor); if (!actuator) throw new AppError(404, "Không tìm thấy máy bơm"); if (actuator.type !== ActuatorType.PUMP) throw new AppError(400, "Tưới tự động chỉ hỗ trợ actuator loại PUMP"); if (sensor.device.zoneId !== actuator.device.zoneId) throw new AppError(400, "Cảm biến và máy bơm phải thuộc cùng một khu vực");
    validateThresholds(input.startThreshold, input.stopThreshold); if (input.enabled !== false) await ensureEnabledAvailable(actuator.id);
    let rule; try { rule = await automationRuleRepository.create({ ...input, name: input.name.trim(), enabled: input.enabled ?? true, description: input.description || null, createdById: actor.id }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "Máy bơm đã có một quy tắc tự động đang bật"); throw error; }
    await recordActivity({ userId: actor.id, farmId: sensor.device.zone.farmId, action: ActivityAction.CREATE_AUTOMATION_RULE, entityType: "AUTOMATION_RULE", entityId: rule.id, description: `${actor.fullName} tạo quy tắc tưới tự động "${rule.name}"`, ipAddress }); return present(rule);
  },
  async update(id: string, input: UpdateAutomationRuleInput, actor: Actor, ipAddress?: string) {
    const current = await automationRuleRepository.findAccessibleById(id, actor); if (!current) throw new AppError(404, "Không tìm thấy quy tắc tưới tự động"); await farmAccessService.assertSensorManageable(current.sensorId, actor);
    const start = input.startThreshold ?? current.startThreshold; const stop = input.stopThreshold ?? current.stopThreshold; validateThresholds(start, stop); const enabling = !current.enabled && input.enabled === true; const disabling = current.enabled && input.enabled === false; if (enabling) await ensureEnabledAvailable(current.actuatorId, id);
    const data = input.enabled === true ? { ...input, lastEvaluatedAt: null, lastCommandAttemptAt: null, updatedAt: new Date() } : input;
    try { await prisma.automationRule.update({ where: { id }, data }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "Máy bơm đã có một quy tắc tự động đang bật"); throw error; }
    const updated = await automationRuleRepository.findAccessibleById(id, actor); const action = enabling ? ActivityAction.ENABLE_AUTOMATION_RULE : disabling ? ActivityAction.DISABLE_AUTOMATION_RULE : ActivityAction.UPDATE_AUTOMATION_RULE;
    await recordActivity({ userId: actor.id, farmId: current.sensor.device.zone.farmId, action, entityType: "AUTOMATION_RULE", entityId: id, description: `${actor.fullName} cập nhật quy tắc tưới tự động "${current.name}"`, ipAddress }); return present(updated!);
  },
};
