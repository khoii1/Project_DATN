import { ActivityAction, DeviceStatus, FarmStatus, ZoneStatus } from "@prisma/client";
import { deviceRepository } from "../repositories/device.repository";
import type { CreateDeviceInput, DeviceListQuery, DeviceSummaryQuery, UpdateDeviceInput } from "../validators/device.schema";
import { AppError } from "../utils/app-error";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";
interface Actor extends ResourceActor { fullName: string; }
export const deviceService = {
  async list(query: DeviceListQuery, actor: Actor) { const { items, total } = await deviceRepository.list(actor, query); return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  async summary(query: DeviceSummaryQuery, actor: Actor) { return deviceRepository.summary(actor, query); },
  async getById(id: string, actor: Actor) { const device = await deviceRepository.findAccessibleById(id, actor); if (!device) throw new AppError(404, "Không tìm thấy thiết bị"); return device; },
  async create(input: CreateDeviceInput, actor: Actor, ipAddress?: string) {
    const zone = await farmAccessService.assertZoneManageable(input.zoneId, actor);
    if (zone.status === ZoneStatus.INACTIVE || zone.farm.status === FarmStatus.INACTIVE) throw new AppError(400, "Không thể tạo thiết bị trong trang trại hoặc khu vực ngừng hoạt động");
    if (await deviceRepository.findByCode(input.deviceCode)) throw new AppError(409, "Mã thiết bị đã tồn tại");
    const device = await deviceRepository.create(input);
    await recordActivity({ userId: actor.id, farmId: zone.farmId, action: ActivityAction.CREATE_DEVICE, entityType: "DEVICE", entityId: device.id, description: `${actor.fullName} đăng ký thiết bị "${device.deviceCode}"`, ipAddress });
    return device;
  },
  async update(id: string, input: UpdateDeviceInput, actor: Actor, ipAddress?: string) {
    await farmAccessService.assertDeviceManageable(id, actor);
    const current = await deviceRepository.findAccessibleById(id, actor); if (!current) throw new AppError(404, "Không tìm thấy thiết bị");
    const device = await deviceRepository.update(id, input);
    const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_DEVICE_STATUS : ActivityAction.UPDATE_DEVICE;
    const description = action === ActivityAction.CHANGE_DEVICE_STATUS ? `${actor.fullName} chuyển thiết bị "${device.deviceCode}" sang ${input.status === DeviceStatus.MAINTENANCE ? "bảo trì" : input.status === DeviceStatus.INACTIVE ? "ngừng hoạt động" : "hoạt động"}` : `${actor.fullName} cập nhật thiết bị "${device.deviceCode}"`;
    await recordActivity({ userId: actor.id, farmId: current.zone.farmId, action, entityType: "DEVICE", entityId: device.id, description, ipAddress }); return device;
  },
};
