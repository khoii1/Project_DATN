import { ActuatorState, DeviceCommandSource, DeviceCommandStatus, DeviceCommandType } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import type { DeviceGateway } from "../gateways/device.gateway";
import { automationRuleRepository } from "../repositories/automation-rule.repository";
import { deviceCommandService } from "./device-command.service";

export interface AutomationReading { id: string; sensorId: string; value: number; recordedAt: Date }
export interface AutomationEvaluationOptions { now?: Date; gateway?: DeviceGateway; simulateFailure?: boolean }

async function evaluateRule(ruleId: string, reading: AutomationReading, options: AutomationEvaluationOptions) {
  const now = options.now ?? new Date();
  if (reading.recordedAt.getTime() > now.getTime() + 60_000) return "FUTURE_READING";
  const claimed = await prisma.automationRule.updateMany({ where: { id: ruleId, enabled: true, OR: [{ lastEvaluatedAt: null }, { lastEvaluatedAt: { lt: reading.recordedAt } }] }, data: { lastEvaluatedAt: reading.recordedAt } });
  if (claimed.count === 0) return "OUT_OF_ORDER";
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId }, include: { actuator: true } }); if (!rule || !rule.enabled) return "DISABLED";
  if (now.getTime() - reading.recordedAt.getTime() > env.automationMaxReadingAgeSeconds * 1000) return "STALE_READING";
  const desired = reading.value < rule.startThreshold ? ActuatorState.ON : reading.value >= rule.stopThreshold ? ActuatorState.OFF : null;
  if (!desired) return "NEUTRAL";
  if (rule.actuator.currentState === desired) return "SAME_STATE";
  const latestManual = await prisma.deviceCommand.findFirst({ where: { actuatorId: rule.actuatorId, source: DeviceCommandSource.MANUAL, status: DeviceCommandStatus.SUCCESS, completedAt: { not: null, gte: rule.createdAt } }, orderBy: { completedAt: "desc" } });
  if (latestManual?.completedAt && latestManual.completedAt.getTime() + env.automationManualOverrideMinutes * 60_000 > now.getTime()) return "MANUAL_OVERRIDE";
  const cooldownBefore = new Date(now.getTime() - env.automationCommandCooldownSeconds * 1000);
  const attempt = await prisma.automationRule.updateMany({ where: { id: rule.id, enabled: true, OR: [{ lastCommandAttemptAt: null }, { lastCommandAttemptAt: { lte: cooldownBefore } }] }, data: { lastCommandAttemptAt: now } });
  if (attempt.count === 0) return "COOLDOWN";
  try {
    const result = await deviceCommandService.executeAutomationCommand(rule.actuatorId, desired === ActuatorState.ON ? DeviceCommandType.TURN_ON : DeviceCommandType.TURN_OFF, rule.id, { gateway: options.gateway, simulateFailure: options.simulateFailure });
    return result.command.status === DeviceCommandStatus.SUCCESS ? "SUCCESS" : result.command.status === DeviceCommandStatus.PENDING ? "PENDING" : "FAILED";
  } catch { return "SAFETY_BLOCKED"; }
}

export const automationEvaluationService = {
  async evaluate(readings: AutomationReading[], options: AutomationEvaluationOptions = {}) {
    if (readings.length === 0) return [];
    const rules = await automationRuleRepository.enabledForSensors([...new Set(readings.map(reading => reading.sensorId))]); const outcomes: Array<{ ruleId: string; readingId: string; outcome: string }> = [];
    const bySensor = new Map<string, AutomationReading[]>(); for (const reading of readings) bySensor.set(reading.sensorId, [...(bySensor.get(reading.sensorId) ?? []), reading]);
    for (const rule of rules) for (const reading of (bySensor.get(rule.sensorId) ?? []).sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())) outcomes.push({ ruleId: rule.id, readingId: reading.id, outcome: await evaluateRule(rule.id, reading, options) });
    return outcomes;
  },
};
