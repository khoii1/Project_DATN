import { randomUUID } from "node:crypto";
import { ActivityAction, ActuatorState, ActuatorStatus, DeviceCommandSource, DeviceCommandStatus, DeviceCommandType, DeviceConnectionStatus, DeviceStatus, FarmStatus, Prisma, UserRole, ZoneStatus } from "@prisma/client";
import { prisma } from "../config/database";
import type { DeviceGateway } from "../gateways/device.gateway";
import { deviceGateway } from "../gateways/mock-device.gateway";
import { actuatorInclude, actuatorRepository } from "../repositories/actuator.repository";
import { deviceCommandRepository } from "../repositories/device-command.repository";
import { AppError } from "../utils/app-error";
import type { CommandListQuery } from "../validators/device-command.schema";
import { recordActivity } from "./activity-log.service";
import type { ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string }
interface ExecutionOptions { gateway?: DeviceGateway; simulateFailure?: boolean }
type CommandActuator = NonNullable<Awaited<ReturnType<typeof actuatorRepository.findAccessibleById>>>;

function cleanFailure(value: unknown) { const message = value instanceof Error ? value.message : String(value || "Gateway không xác nhận lệnh"); return message.replace(/[\r\n\t]+/g, " ").slice(0, 500); }
async function assertControl(actuatorId: string, actor: Actor) { const actuator = await actuatorRepository.findAccessibleById(actuatorId, actor); if (!actuator) throw new AppError(404, "Không tìm thấy thiết bị chấp hành"); if (actor.role === UserRole.STAFF) { const assignment = await prisma.farmStaffAssignment.findUnique({ where: { farmId_staffId: { farmId: actuator.device.zone.farm.id, staffId: actor.id } } }); if (!assignment?.canControlIrrigation) throw new AppError(403, "Bạn chưa được cấp quyền điều khiển tưới tại trang trại này"); } return actuator; }
function assertAvailable(actuator: CommandActuator) { if (actuator.device.zone.farm.status !== FarmStatus.ACTIVE) throw new AppError(409, "Trang trại đang ngừng hoạt động"); if (actuator.device.zone.status !== ZoneStatus.ACTIVE) throw new AppError(409, "Khu vực đang ngừng hoạt động"); if (actuator.device.status !== DeviceStatus.ACTIVE) throw new AppError(409, "Thiết bị không ở trạng thái hoạt động"); if (actuator.device.connectionStatus === DeviceConnectionStatus.OFFLINE) throw new AppError(409, "Thiết bị hiện đang ngoại tuyến và không thể nhận lệnh"); if (actuator.device.connectionStatus !== DeviceConnectionStatus.ONLINE) throw new AppError(409, "Chưa xác định kết nối thiết bị, không thể gửi lệnh"); if (actuator.status !== ActuatorStatus.ACTIVE) throw new AppError(409, "Thiết bị chấp hành không ở trạng thái hoạt động"); }

async function execute(actuator: CommandActuator, command: DeviceCommandType, source: DeviceCommandSource, requestedById: string | null, automationRuleId: string | null, options: ExecutionOptions) {
  assertAvailable(actuator); const target = command === DeviceCommandType.TURN_ON ? ActuatorState.ON : ActuatorState.OFF;
  if (actuator.currentState === target) throw new AppError(409, `Máy bơm đã ở trạng thái ${target === ActuatorState.ON ? "bật" : "tắt"}`);
  if (await deviceCommandRepository.findPending(actuator.id)) throw new AppError(409, "Thiết bị chấp hành đang có lệnh chờ xử lý");
  let pending;
  try { pending = await prisma.deviceCommand.create({ data: { actuatorId: actuator.id, command, source, status: DeviceCommandStatus.PENDING, requestedById, automationRuleId, correlationId: randomUUID() } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "Thiết bị chấp hành đang có lệnh chờ xử lý"); throw error; }
  const sentAt = new Date(); let result;
  try { result = await (options.gateway ?? deviceGateway).sendCommand({ correlationId: pending.correlationId, deviceCode: actuator.device.deviceCode, actuatorCode: actuator.actuatorCode, command, simulateFailure: options.simulateFailure }); }
  catch (error) { result = { success: false, error: cleanFailure(error) }; }
  const completedAt = new Date(); let finalCommand; let updatedActuator = actuator;
  if (result.success && result.confirmedState) {
    [finalCommand, updatedActuator] = await prisma.$transaction([
      prisma.deviceCommand.update({ where: { id: pending.id }, data: { status: DeviceCommandStatus.SUCCESS, sentAt, completedAt, failureReason: null } }),
      prisma.actuator.update({ where: { id: actuator.id }, data: { currentState: result.confirmedState, lastCommandAt: completedAt, lastStateChangedAt: completedAt }, include: actuatorInclude }),
    ]);
  } else finalCommand = await prisma.deviceCommand.update({ where: { id: pending.id }, data: { status: DeviceCommandStatus.FAILED, sentAt, completedAt, failureReason: cleanFailure(result.error) } });
  return { command: finalCommand, actuator: updatedActuator };
}

export const deviceCommandService = {
  async issue(actuatorId: string, command: DeviceCommandType, actor: Actor, ipAddress?: string, options: ExecutionOptions = {}) {
    const actuator = await assertControl(actuatorId, actor); const result = await execute(actuator, command, DeviceCommandSource.MANUAL, actor.id, null, options);
    await recordActivity({ userId: actor.id, farmId: actuator.device.zone.farmId, action: ActivityAction.ISSUE_DEVICE_COMMAND, entityType: "DEVICE_COMMAND", entityId: result.command.id, description: `${actor.fullName} ${command === DeviceCommandType.TURN_ON ? "bật" : "tắt"} máy bơm "${actuator.actuatorCode}" tại ${actuator.device.zone.name}`, ipAddress });
    return result;
  },
  async executeAutomationCommand(actuatorId: string, command: DeviceCommandType, automationRuleId: string, options: ExecutionOptions = {}) {
    const actuator = await prisma.actuator.findUnique({ where: { id: actuatorId }, include: actuatorInclude });
    if (!actuator) throw new AppError(404, "Không tìm thấy thiết bị chấp hành");
    return execute(actuator, command, DeviceCommandSource.AUTOMATION, null, automationRuleId, options);
  },
  async list(query: CommandListQuery, actor: Actor) { const effective = actor.role === UserRole.ADMIN ? query : { ...query, requestedById: undefined }; const { items, total } = await deviceCommandRepository.list(actor, effective); return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
};
