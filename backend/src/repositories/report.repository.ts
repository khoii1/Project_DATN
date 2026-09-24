import { AlertStatus, DeviceCommandSource, DeviceCommandStatus, DeviceCommandType, Prisma, SensorType } from '@prisma/client';
import { prisma } from '../config/database';
import { SENSOR_TYPE_METADATA } from '../constants/sensor-metadata';

export interface ReportScope { farmIds: string[]; farmId?: string; zoneId?: string; from: Date; to: Date }

const zoneWhere = (scope: ReportScope): Prisma.ZoneWhereInput => ({ farmId: { in: scope.farmIds }, ...(scope.farmId ? { farmId: scope.farmId } : {}), ...(scope.zoneId ? { id: scope.zoneId } : {}) });
const deviceWhere = (scope: ReportScope): Prisma.DeviceWhereInput => ({ zone: zoneWhere(scope) });
const sensorWhere = (scope: ReportScope): Prisma.SensorWhereInput => ({ device: deviceWhere(scope) });
const readingWhere = (scope: ReportScope): Prisma.SensorReadingWhereInput => ({ sensor: sensorWhere(scope), recordedAt: { gte: scope.from, lte: scope.to } });
const alertScope = (scope: ReportScope): Prisma.AlertWhereInput => ({ sensor: sensorWhere(scope) });
const commandScope = (scope: ReportScope): Prisma.DeviceCommandWhereInput => ({ actuator: { device: deviceWhere(scope) } });
const ruleScope = (scope: ReportScope): Prisma.AutomationRuleWhereInput => ({ sensor: sensorWhere(scope) });

export const reportRepository = {
  accessibleFarmIds(actor: { id: string; role: string }) {
    return prisma.farm.findMany({
      where: actor.role === 'ADMIN' ? {} : actor.role === 'FARM_OWNER' ? { ownerId: actor.id } : { staffAssignments: { some: { staffId: actor.id } } },
      select: { id: true },
    }).then((rows) => rows.map((row) => row.id));
  },

  async overview(scope: ReportScope) {
    const zones = zoneWhere(scope); const devices = deviceWhere(scope); const sensors = sensorWhere(scope);
    const commands = commandScope(scope); const range = { gte: scope.from, lte: scope.to };
    const [farmCount, zoneCount, cropCount, deviceCount, deviceOnline, deviceOffline, sensorCount, sensorReadingCount, activeAlertCount, newAlertCount, resolvedAlertCount, manualCommandCount, automationCommandCount, successfulCommandCount, failedCommandCount, automationRuleCount, enabledAutomationRuleCount] = await prisma.$transaction([
      prisma.farm.count({ where: { id: { in: scope.farmIds }, ...(scope.farmId ? { id: scope.farmId } : {}), ...(scope.zoneId ? { zones: { some: { id: scope.zoneId } } } : {}) } }),
      prisma.zone.count({ where: zones }), prisma.crop.count({ where: { zone: zones } }),
      prisma.device.count({ where: devices }), prisma.device.count({ where: { ...devices, connectionStatus: 'ONLINE' } }), prisma.device.count({ where: { ...devices, connectionStatus: { in: ['OFFLINE', 'UNKNOWN'] } } }),
      prisma.sensor.count({ where: sensors }), prisma.sensorReading.count({ where: readingWhere(scope) }),
      prisma.alert.count({ where: { ...alertScope(scope), status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } } }),
      prisma.alert.count({ where: { ...alertScope(scope), openedAt: range } }), prisma.alert.count({ where: { ...alertScope(scope), resolvedAt: range } }),
      prisma.deviceCommand.count({ where: { ...commands, requestedAt: range, source: DeviceCommandSource.MANUAL } }), prisma.deviceCommand.count({ where: { ...commands, requestedAt: range, source: DeviceCommandSource.AUTOMATION } }),
      prisma.deviceCommand.count({ where: { ...commands, requestedAt: range, status: DeviceCommandStatus.SUCCESS } }), prisma.deviceCommand.count({ where: { ...commands, requestedAt: range, status: DeviceCommandStatus.FAILED } }),
      prisma.automationRule.count({ where: ruleScope(scope) }), prisma.automationRule.count({ where: { ...ruleScope(scope), enabled: true } }),
    ]);
    return { farmCount, zoneCount, cropCount, deviceCount, deviceOnline, deviceOffline, sensorCount, sensorReadingCount, activeAlertCount, newAlertCount, resolvedAlertCount, manualCommandCount, automationCommandCount, successfulCommandCount, failedCommandCount, automationRuleCount, enabledAutomationRuleCount };
  },

  async sensors(scope: ReportScope, sensorType?: SensorType) {
    const sensorFilter = { ...sensorWhere(scope), ...(sensorType ? { type: sensorType } : {}) };
    const sensors = await prisma.sensor.findMany({ where: sensorFilter, select: { id: true, type: true } });
    const idsByType = new Map<SensorType, string[]>();
    for (const sensor of sensors) idsByType.set(sensor.type, [...(idsByType.get(sensor.type) ?? []), sensor.id]);
    return Promise.all([...idsByType.entries()].map(async ([type, sensorIds]) => {
      const where = { sensorId: { in: sensorIds }, recordedAt: { gte: scope.from, lte: scope.to } };
      const [aggregate, latest] = await prisma.$transaction([
        prisma.sensorReading.aggregate({ where, _count: { _all: true }, _min: { value: true }, _max: { value: true }, _avg: { value: true } }),
        prisma.sensorReading.findFirst({ where, orderBy: { recordedAt: 'desc' }, select: { value: true, recordedAt: true, sensorId: true } }),
      ]);
      return { sensorType: type, unit: SENSOR_TYPE_METADATA[type].unit, sensorCount: sensorIds.length, readingCount: aggregate._count._all, minimum: aggregate._min.value, maximum: aggregate._max.value, average: aggregate._avg.value, latest };
    }));
  },

  async alerts(scope: ReportScope, severity?: string) {
    const base: Prisma.AlertWhereInput = { ...alertScope(scope), openedAt: { gte: scope.from, lte: scope.to }, ...(severity ? { severitySnapshot: severity as never } : {}) };
    const [totalOpened, totalResolved, open, acknowledged, resolved, info, warning, critical, resolvedDurations] = await prisma.$transaction([
      prisma.alert.count({ where: base }), prisma.alert.count({ where: { ...base, resolvedAt: { not: null } } }),
      prisma.alert.count({ where: { ...base, status: AlertStatus.OPEN } }), prisma.alert.count({ where: { ...base, status: AlertStatus.ACKNOWLEDGED } }), prisma.alert.count({ where: { ...base, status: AlertStatus.RESOLVED } }),
      prisma.alert.count({ where: { AND: [base, { severitySnapshot: 'INFO' }] } }), prisma.alert.count({ where: { AND: [base, { severitySnapshot: 'WARNING' }] } }), prisma.alert.count({ where: { AND: [base, { severitySnapshot: 'CRITICAL' }] } }),
      prisma.alert.findMany({ where: { ...base, resolvedAt: { not: null } }, select: { openedAt: true, resolvedAt: true } }),
    ]);
    const averageResolutionMinutes = resolvedDurations.length ? resolvedDurations.reduce((sum, row) => sum + (row.resolvedAt!.getTime() - row.openedAt.getTime()) / 60_000, 0) / resolvedDurations.length : null;
    return { totalOpened, totalResolved, open, acknowledged, resolved, info, warning, critical, bySeverity: { INFO: info, WARNING: warning, CRITICAL: critical }, averageResolutionMinutes };
  },

  async irrigation(scope: ReportScope) {
    const base = { ...commandScope(scope), requestedAt: { gte: scope.from, lte: scope.to } };
    const [totalCommands, manualCommands, automationCommands, turnOnCommands, turnOffCommands, successfulCommands, failedCommands, pendingCommands, activePumps] = await prisma.$transaction([
      prisma.deviceCommand.count({ where: base }), prisma.deviceCommand.count({ where: { ...base, source: DeviceCommandSource.MANUAL } }), prisma.deviceCommand.count({ where: { ...base, source: DeviceCommandSource.AUTOMATION } }),
      prisma.deviceCommand.count({ where: { ...base, command: DeviceCommandType.TURN_ON } }), prisma.deviceCommand.count({ where: { ...base, command: DeviceCommandType.TURN_OFF } }),
      prisma.deviceCommand.count({ where: { ...base, status: DeviceCommandStatus.SUCCESS } }), prisma.deviceCommand.count({ where: { ...base, status: DeviceCommandStatus.FAILED } }), prisma.deviceCommand.count({ where: { ...base, status: DeviceCommandStatus.PENDING } }),
      prisma.actuator.count({ where: { device: deviceWhere(scope), type: 'PUMP', currentState: 'ON' } }),
    ]);
    const completed = successfulCommands + failedCommands;
    return { totalCommands, manualCommands, automationCommands, turnOnCommands, turnOffCommands, successfulCommands, failedCommands, pendingCommands, successRate: completed ? successfulCommands / completed : null, activePumps };
  },

  async automation(scope: ReportScope) {
    const rules = await prisma.automationRule.findMany({ where: ruleScope(scope), include: { sensor: { include: { device: { include: { zone: true } } } }, actuator: true } });
    const ruleIds = rules.map((rule) => rule.id); const range = { gte: scope.from, lte: scope.to };
    const commands = await prisma.deviceCommand.groupBy({ by: ['automationRuleId', 'status', 'command'], where: { automationRuleId: { in: ruleIds }, source: DeviceCommandSource.AUTOMATION, requestedAt: range }, _count: { _all: true } });
    const latest = await prisma.deviceCommand.findMany({ where: { automationRuleId: { in: ruleIds }, source: DeviceCommandSource.AUTOMATION, requestedAt: range }, orderBy: { requestedAt: 'desc' }, select: { automationRuleId: true, requestedAt: true, command: true, status: true } });
    const breakdown = rules.map((rule) => {
      const rows = commands.filter((row) => row.automationRuleId === rule.id); const count = rows.reduce((sum, row) => sum + row._count._all, 0);
      return { ruleId: rule.id, ruleName: rule.name, enabled: rule.enabled, zone: rule.sensor.device.zone.name, sensor: rule.sensor.sensorCode, pump: rule.actuator.actuatorCode, commandCount: count, successfulCommands: rows.filter((r) => r.status === 'SUCCESS').reduce((s, r) => s + r._count._all, 0), failedCommands: rows.filter((r) => r.status === 'FAILED').reduce((s, r) => s + r._count._all, 0), lastCommand: latest.find((item) => item.automationRuleId === rule.id) ?? null };
    });
    const automaticCommands = breakdown.reduce((sum, row) => sum + row.commandCount, 0);
    const automaticTurnOn = commands.filter((r) => r.command === 'TURN_ON').reduce((s, r) => s + r._count._all, 0); const automaticTurnOff = commands.filter((r) => r.command === 'TURN_OFF').reduce((s, r) => s + r._count._all, 0);
    const successfulCommands = commands.filter((r) => r.status === 'SUCCESS').reduce((s, r) => s + r._count._all, 0); const failedCommands = commands.filter((r) => r.status === 'FAILED').reduce((s, r) => s + r._count._all, 0);
    return { totalRules: rules.length, enabledRules: rules.filter((r) => r.enabled).length, disabledRules: rules.filter((r) => !r.enabled).length, automaticCommands, automaticTurnOn, automaticTurnOff, successfulCommands, failedCommands, rulesWithCommands: breakdown.filter((r) => r.commandCount > 0).length, rulesWithoutCommands: breakdown.filter((r) => r.commandCount === 0).length, breakdown };
  },

  exportSensorReadings(scope: ReportScope, take: number) { return prisma.sensorReading.findMany({ where: readingWhere(scope), take, orderBy: { recordedAt: 'asc' }, include: { sensor: { include: { device: { include: { zone: { include: { farm: true } } } } } } } }); },
  exportAlerts(scope: ReportScope, take: number) { return prisma.alert.findMany({ where: { ...alertScope(scope), openedAt: { gte: scope.from, lte: scope.to } }, take, orderBy: { openedAt: 'asc' }, include: { alertRule: true, sensor: { include: { device: { include: { zone: { include: { farm: true } } } } } }, acknowledgedBy: true, resolvedBy: true } }); },
  exportCommands(scope: ReportScope, take: number) { return prisma.deviceCommand.findMany({ where: { ...commandScope(scope), requestedAt: { gte: scope.from, lte: scope.to } }, take, orderBy: { requestedAt: 'asc' }, include: { actuator: { include: { device: { include: { zone: { include: { farm: true } } } } } }, requestedBy: true, automationRule: true } }); },
};
