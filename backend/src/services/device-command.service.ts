import { randomUUID } from "node:crypto";
import { pumpRuntimeLimit } from "./pump-command-policy";
import { mqttStateObserver } from "../mqtt/mqtt-state-observer";
import { ActivityAction, DeviceCommandSource, Prisma, UserRole, type DeviceCommandType } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import type { DeviceGateway, DeviceGatewayResult } from "../gateways/device.gateway";
import { mqttDeviceGateway } from "../gateways/mqtt-gateway.runtime";
import { mqttCommandChannel } from "../mqtt/mqtt-command-channel";
import { actuatorInclude, actuatorRepository } from "../repositories/actuator.repository";
import { deviceCommandRepository } from "../repositories/device-command.repository";
import { AppError } from "../utils/app-error";
import type { CommandListQuery } from "../validators/device-command.schema";
import { recordActivity } from "./activity-log.service";
import type { ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string }
interface ExecutionOptions { gateway?: DeviceGateway; simulateFailure?: boolean; maxRunSeconds?: number }
type CommandActuator = NonNullable<Awaited<ReturnType<typeof actuatorRepository.findAccessibleById>>>;
const locks = new Map<string, Promise<unknown>>();
function serial<T>(id: string, work: () => Promise<T>): Promise<T> {
  const next = (locks.get(id) ?? Promise.resolve()).catch(() => {}).then(work);
  locks.set(id, next); void next.finally(() => { if (locks.get(id) === next) locks.delete(id); }).catch(() => {}); return next;
}
const cleanFailure = (value: unknown) => String(value || "UNKNOWN_GATEWAY_ERROR").replace(/[\r\n\t]+/g, " ").slice(0, 500);
async function assertControl(actuatorId: string, actor: Actor) {
  const actuator = await actuatorRepository.findAccessibleById(actuatorId, actor);
  if (!actuator) throw new AppError(404, "Không tìm thấy thiết bị chấp hành");
  if (actor.role === UserRole.STAFF) {
    const assignment = await prisma.farmStaffAssignment.findUnique({ where: { farmId_staffId: { farmId: actuator.device.zone.farm.id, staffId: actor.id } } });
    if (!assignment?.canControlIrrigation) throw new AppError(403, "Bạn chưa được cấp quyền điều khiển tưới tại trang trại này");
  }
  return actuator;
}
async function execute(initial: CommandActuator, command: DeviceCommandType, source: DeviceCommandSource, requestedById: string | null, automationRuleId: string | null, options: ExecutionOptions) {
  return serial(initial.id, async () => {
    const actuator = await prisma.actuator.findUnique({ where: { id: initial.id }, include: actuatorInclude });
    if (!actuator) throw new AppError(404, "Không tìm thấy thiết bị chấp hành");
    if ([actuator.status, actuator.device.status, actuator.device.zone.status, actuator.device.zone.farm.status].some(status => status !== "ACTIVE")) throw new AppError(409, "Thiết bị hoặc tài nguyên chứa thiết bị không hoạt động");
    if (command === "TURN_ON" && (actuator.device.connectionStatus !== "ONLINE" || !actuator.device.lastSeenAt || Date.now() - actuator.device.lastSeenAt.getTime() > env.devicePresenceTimeoutSeconds * 1000)) throw new AppError(409, "Thiết bị không ONLINE hoặc heartbeat quá hạn");
    const real = !options.gateway;
    if (real && (!env.mqttEnabled || !env.mqttCommandsEnabled)) throw new AppError(503, "Điều khiển MQTT đang bị khóa; không fallback mock");
    if (real && (actuator.device.deviceCode !== env.mqttCommandDeviceCode || actuator.actuatorCode !== env.mqttCommandActuatorCode || actuator.type !== "PUMP")) throw new AppError(409, "Máy bơm không nằm trong allowlist MQTT");
    if (real && command === "TURN_ON" && (actuator.currentState === "UNKNOWN" || (actuator.currentState === "OFF" && !mqttStateObserver.isConfirmedOff(actuator.device.deviceCode, actuator.actuatorCode, actuator.lastStateChangedAt)))) throw new AppError(409, "Chưa có báo cáo relay đáng tin cậy; không thể bật máy bơm");
    if (real && source === "AUTOMATION" && !env.mqttAutomationCommandsEnabled) throw new AppError(409, "Tưới tự động MQTT chưa được bật");
    if (real && !mqttCommandChannel.transport?.connected()) throw new AppError(503, "MQTT Broker chưa sẵn sàng");
    const runtimeLimit = pumpRuntimeLimit(env.mqttPumpMaxRunSeconds, env.mqttPumpTestMode);
    const maxRunSeconds = options.maxRunSeconds ?? (env.mqttPumpTestMode ? runtimeLimit : undefined);
    if (command === "TURN_ON" && maxRunSeconds !== undefined && (!Number.isInteger(maxRunSeconds) || maxRunSeconds < 1 || maxRunSeconds > runtimeLimit)) throw new AppError(400, `maxRunSeconds phải từ 1 đến ${runtimeLimit}`);
    if (command === "TURN_OFF" && options.maxRunSeconds !== undefined) throw new AppError(400, "OFF không nhận maxRunSeconds");
    if (command === "TURN_ON" && actuator.currentState === "ON") throw new AppError(409, "Máy bơm đã được xác nhận ON");
    const previous = await deviceCommandRepository.findPending(actuator.id);
    if (previous && (command === "TURN_ON" || previous.command === "TURN_OFF")) throw new AppError(409, "Máy bơm đang chờ ACK");
    if (real && command === "TURN_ON") {
      const recent = await prisma.deviceCommand.findFirst({ where: { actuatorId: actuator.id, requestedAt: { gte: new Date(Date.now() - 2000) } } });
      if (recent) throw new AppError(429, "Chờ ít nhất 2 giây giữa các lệnh ON");
      if (source === "AUTOMATION") {
        const ruleRow = automationRuleId && "automationRule" in prisma ? await prisma.automationRule.findUnique({ where: { id: automationRuleId } }) : null;
        const overrideWindowStart = new Date(Date.now() - env.automationManualOverrideMinutes * 60_000);
        const overrideFloor = ruleRow?.updatedAt && ruleRow.updatedAt > overrideWindowStart ? ruleRow.updatedAt : overrideWindowStart;
        const manual = await prisma.deviceCommand.findFirst({ where: { actuatorId: actuator.id, source: "MANUAL", requestedAt: { gte: overrideFloor } } });
        if (manual) throw new AppError(409, "Thao tác thủ công đang được ưu tiên");
      }
    }
    const issuedAt = new Date(), expiresAt = new Date(issuedAt.getTime() + env.mqttCommandExpirySeconds * 1000);
    let pending;
    try {
      pending = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM actuators WHERE id = ${actuator.id} FOR UPDATE`;
        if (command === "TURN_OFF") await tx.deviceCommand.updateMany({ where: { actuatorId: actuator.id, status: "PENDING", command: "TURN_ON" }, data: { status: "FAILED", completedAt: issuedAt, failureReason: "SUPERSEDED_BY_OFF" } });
        return tx.deviceCommand.create({ data: { actuatorId: actuator.id, command, source, requestedById, automationRuleId, correlationId: randomUUID(), transport: real ? "MQTT" : "MOCK", requestedAt: issuedAt, expiresAt: real ? expiresAt : null, maxRunSeconds: command === "TURN_ON" ? maxRunSeconds : null } });
      });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "Máy bơm có lệnh chờ xử lý"); throw error; }
    if (previous && real) await mqttDeviceGateway.cancel(previous.correlationId, "SUPERSEDED_BY_OFF");
    const settle = async (result: DeviceGatewayResult) => {
      const completedAt = new Date();
      await prisma.$transaction(async tx => {
        const updated = await tx.deviceCommand.updateMany({ where: { id: pending.id, status: "PENDING" }, data: { status: result.success && result.confirmedState ? "SUCCESS" : "FAILED", completedAt, acknowledgedAt: result.acknowledgedAt ?? null, failureReason: result.success ? null : cleanFailure(result.error) } });
        if (!updated.count) return;
        const stateAt = result.recordedAt ?? completedAt;
        await tx.actuator.updateMany({ where: { id: actuator.id, OR: [{ lastStateChangedAt: null }, { lastStateChangedAt: { lte: result.success ? stateAt : issuedAt } }] }, data: { currentState: result.success && result.confirmedState ? result.confirmedState : "UNKNOWN", lastCommandAt: completedAt, ...(result.success ? { lastStateChangedAt: stateAt } : {}) } });
      });
    };
    let result: DeviceGatewayResult;
    try { result = await (options.gateway ?? mqttDeviceGateway).sendCommand({ correlationId: pending.correlationId, deviceCode: actuator.device.deviceCode, actuatorCode: actuator.actuatorCode, command, simulateFailure: options.simulateFailure, issuedAt, expiresAt, maxRunSeconds: command === "TURN_ON" ? maxRunSeconds : undefined, onPublished: async () => { await prisma.deviceCommand.updateMany({ where: { id: pending.id }, data: { sentAt: new Date() } }); }, onResult: settle }); }
    catch { result = { success: false, error: "GATEWAY_FAILED" }; }
    if (!result.pending) await settle(result);

    return { command: await prisma.deviceCommand.findUniqueOrThrow({ where: { id: pending.id } }), actuator: await prisma.actuator.findUniqueOrThrow({ where: { id: actuator.id }, include: actuatorInclude }) };
  });
}
export const deviceCommandService = {
  async issue(actuatorId: string, command: DeviceCommandType, actor: Actor, ipAddress?: string, options: ExecutionOptions = {}) {
    const actuator = await assertControl(actuatorId, actor);
    const result = await execute(actuator, command, DeviceCommandSource.MANUAL, actor.id, null, options);
    await recordActivity({ userId: actor.id, farmId: actuator.device.zone.farmId, action: ActivityAction.ISSUE_DEVICE_COMMAND, entityType: "DEVICE_COMMAND", entityId: result.command.id, description: `${actor.fullName} yêu cầu ${command} "${actuator.actuatorCode}"; ${result.command.status}; ${result.command.transport}`, ipAddress });
    return result;
  },
  async executeAutomationCommand(actuatorId: string, command: DeviceCommandType, automationRuleId: string, options: ExecutionOptions = {}) {
    const actuator = await prisma.actuator.findUnique({ where: { id: actuatorId }, include: actuatorInclude });
    if (!actuator) throw new AppError(404, "Không tìm thấy thiết bị chấp hành");
    return execute(actuator, command, DeviceCommandSource.AUTOMATION, null, automationRuleId, options);
  },
  async list(query: CommandListQuery, actor: Actor) { const effective = actor.role === UserRole.ADMIN ? query : { ...query, requestedById: undefined }; const { items, total } = await deviceCommandRepository.list(actor, effective); return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
};
