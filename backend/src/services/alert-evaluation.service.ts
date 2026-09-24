import { AlertResolutionReason, AlertStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { alertRuleRepository } from "../repositories/alert-rule.repository";
import { SENSOR_TYPE_METADATA } from "../constants/sensor-metadata";
import { operatorSymbol, recovers, violates } from "../utils/alert-condition";

export interface EvaluatedReading { id: string; sensorId: string; value: number; recordedAt: Date }

async function evaluateRule(ruleId: string, reading: EvaluatedReading) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.alertRule.updateMany({ where: { id: ruleId, enabled: true, OR: [{ lastEvaluatedAt: null }, { lastEvaluatedAt: { lt: reading.recordedAt } }] }, data: { lastEvaluatedAt: reading.recordedAt } });
        if (claimed.count === 0) return;
        const rule = await transaction.alertRule.findUniqueOrThrow({ where: { id: ruleId }, include: { sensor: { include: { device: { include: { zone: true } } } } } });
        const active = await transaction.alert.findFirst({ where: { alertRuleId: rule.id, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } } });
        if (!active) {
          if (!violates(rule.operator, reading.value, rule.threshold)) return;
          const metadata = SENSOR_TYPE_METADATA[rule.sensor.type];
          const generated = `${rule.sensor.name} tại ${rule.sensor.device.zone.name} là ${reading.value} ${metadata.unit}, vi phạm điều kiện ${operatorSymbol[rule.operator]} ${rule.threshold} ${metadata.unit}.`;
          await transaction.alert.create({ data: { alertRuleId: rule.id, sensorId: rule.sensorId, status: AlertStatus.OPEN, title: rule.name, message: rule.message || generated, triggerValue: reading.value, lastValue: reading.value, thresholdSnapshot: rule.threshold, recoverySnapshot: rule.recoveryThreshold, operatorSnapshot: rule.operator, severitySnapshot: rule.severity, unitSnapshot: metadata.unit, openedAt: reading.recordedAt, lastReadingAt: reading.recordedAt } });
          return;
        }
        if (reading.recordedAt <= active.lastReadingAt) return;
        if (recovers(active.operatorSnapshot, reading.value, active.thresholdSnapshot, active.recoverySnapshot)) {
          await transaction.alert.update({ where: { id: active.id }, data: { status: AlertStatus.RESOLVED, lastValue: reading.value, lastReadingAt: reading.recordedAt, resolvedAt: reading.recordedAt, resolutionReason: AlertResolutionReason.AUTO_RECOVERED } });
        } else {
          await transaction.alert.update({ where: { id: active.id }, data: { lastValue: reading.value, lastReadingAt: reading.recordedAt } });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002") && attempt < 2) continue;
      throw error;
    }
  }
}

export const alertEvaluationService = {
  async evaluate(readings: EvaluatedReading[]) {
    if (readings.length === 0) return;
    const rules = await alertRuleRepository.enabledForSensors([...new Set(readings.map((reading) => reading.sensorId))]);
    const readingsBySensor = new Map(readings.map((reading) => [reading.sensorId, reading]));
    for (const rule of rules) { const reading = readingsBySensor.get(rule.sensorId); if (reading) await evaluateRule(rule.id, reading); }
  },
};
