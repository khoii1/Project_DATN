import { ActivityAction, ActuatorStatus, DeviceStatus, FarmStatus, UserRole, ZoneStatus } from "@prisma/client";
import { env } from "../config/env";
import { mqttCommandChannel } from "../mqtt/mqtt-command-channel";
import { mqttStateObserver } from "../mqtt/mqtt-state-observer";
import { prisma } from "../config/database";
import { actuatorRepository } from "../repositories/actuator.repository";
import type { ActuatorListQuery, ActuatorSummaryQuery, CreateActuatorInput, UpdateActuatorInput } from "../validators/actuator.schema";
import { AppError } from "../utils/app-error";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";
interface Actor extends ResourceActor { fullName: string }
async function withPermission<T extends { device: { zone: { farm: { id: string; ownerId: string } } } }>(items: T[], actor: Actor) { if (actor.role !== UserRole.STAFF) return items.map(item => ({ ...item, canControl: true })); const farmIds = [...new Set(items.map(item => item.device.zone.farm.id))]; const assignments = await prisma.farmStaffAssignment.findMany({ where: { staffId: actor.id, farmId: { in: farmIds }, canControlIrrigation: true }, select: { farmId: true } }); const allowed = new Set(assignments.map(item => item.farmId)); return items.map(item => ({ ...item, canControl: allowed.has(item.device.zone.farm.id) })); }
export const actuatorService = {
  async list(query: ActuatorListQuery, actor: Actor) { const { items, total } = await actuatorRepository.list(actor, query); return { items: await withRuntime(await withPermission(items, actor)), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  summary(query: ActuatorSummaryQuery, actor: Actor) { return actuatorRepository.summary(actor, query); },
  async get(id: string, actor: Actor) { const item = await actuatorRepository.findAccessibleById(id, actor); if (!item) throw new AppError(404, "Không tìm thấy thiết bị chấp hành"); return (await withRuntime(await withPermission([item], actor)))[0]; },
  async create(input: CreateActuatorInput, actor: Actor, ipAddress?: string) { const device = await farmAccessService.assertDeviceManageable(input.deviceId, actor); if (device.zone.farm.status === FarmStatus.INACTIVE || device.zone.status === ZoneStatus.INACTIVE || device.status === DeviceStatus.INACTIVE) throw new AppError(400, "Không thể tạo actuator trong tài nguyên ngừng hoạt động"); if (await actuatorRepository.findByDeviceAndCode(input.deviceId, input.actuatorCode)) throw new AppError(409, "Mã actuator đã tồn tại trong thiết bị"); const actuator = await actuatorRepository.create({ ...input, status: ActuatorStatus.ACTIVE }); await recordActivity({ userId: actor.id, farmId: device.zone.farmId, action: ActivityAction.CREATE_ACTUATOR, entityType: "ACTUATOR", entityId: actuator.id, description: `${actor.fullName} tạo thiết bị chấp hành "${actuator.actuatorCode}"`, ipAddress }); return { ...actuator, canControl: true }; },
  async update(id: string, input: UpdateActuatorInput, actor: Actor, ipAddress?: string) { const current = await actuatorRepository.findAccessibleById(id, actor); if (!current) throw new AppError(404, "Không tìm thấy thiết bị chấp hành"); await farmAccessService.assertDeviceManageable(current.deviceId, actor); const actuator = await actuatorRepository.update(id, input); const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_ACTUATOR_STATUS : ActivityAction.UPDATE_ACTUATOR; await recordActivity({ userId: actor.id, farmId: current.device.zone.farmId, action, entityType: "ACTUATOR", entityId: actuator.id, description: `${actor.fullName} cập nhật thiết bị chấp hành "${actuator.actuatorCode}"`, ipAddress }); return { ...actuator, canControl: true }; },
};
async function withRuntime<T extends { id: string; actuatorCode: string; currentState: string; lastStateChangedAt: Date | null; device: { deviceCode: string; connectionStatus: string } }>(items: T[]) {
  const latest = await prisma.deviceCommand.findMany({ where: { actuatorId: { in: items.map(item => item.id) } }, distinct: ["actuatorId"], orderBy: { requestedAt: "desc" }, select: { id: true, actuatorId: true, status: true, command: true, failureReason: true, transport: true, maxRunSeconds: true, expiresAt: true, acknowledgedAt: true } });
  return items.map(item => {
    const command = latest.find(row => row.actuatorId === item.id);
    const allowed = env.mqttCommandsEnabled && item.device.deviceCode === env.mqttCommandDeviceCode && item.actuatorCode === env.mqttCommandActuatorCode;
    const connected = !!mqttCommandChannel.transport?.connected();
    const observedOff = item.currentState === "OFF" && mqttStateObserver.isConfirmedOff(item.device.deviceCode, item.actuatorCode, item.lastStateChangedAt);
    const staleOn = item.currentState === "ON" && (!item.lastStateChangedAt || Date.now() - item.lastStateChangedAt.getTime() > ((command?.maxRunSeconds ?? env.mqttPumpMaxRunSeconds) + 2) * 1000);
    return { ...item, currentState: (item.device.connectionStatus !== "ONLINE" || (item.currentState === "OFF" ? !observedOff : !connected) || staleOn ? "UNKNOWN" : item.currentState) as T["currentState"], controlEnabled: allowed && connected, gatewayMode: env.mqttCommandsEnabled ? "MQTT" : "DISABLED", latestCommand: command ?? null };
  });
}
