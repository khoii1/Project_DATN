import type { UserRole } from "@prisma/client";
import { farmRepository } from "../repositories/farm.repository";
import { zoneRepository } from "../repositories/zone.repository";
import { cropRepository } from "../repositories/crop.repository";
import { deviceRepository } from "../repositories/device.repository";
import { sensorRepository } from "../repositories/sensor.repository";
import { AppError } from "../utils/app-error";

export interface ResourceActor { id: string; role: UserRole; }

async function assertFarmAccess(farmId: string, actor: ResourceActor, manage: boolean) {
  const farm = await farmRepository.findAccessContext(farmId, actor.id);
  const allowed = farm && (actor.role === "ADMIN" || farm.ownerId === actor.id || (!manage && actor.role === "STAFF" && farm.staffAssignments.length > 0));
  if (!allowed) throw new AppError(404, "Không tìm thấy trang trại");
  return farm;
}

export const farmAccessService = {
  assertFarmReadable(farmId: string, actor: ResourceActor) { return assertFarmAccess(farmId, actor, false); },
  assertFarmManageable(farmId: string, actor: ResourceActor) { return assertFarmAccess(farmId, actor, true); },
  async assertZoneReadable(zoneId: string, actor: ResourceActor) {
    const zone = await zoneRepository.findAccessContext(zoneId);
    if (!zone) throw new AppError(404, "Không tìm thấy khu vực");
    await assertFarmAccess(zone.farmId, actor, false);
    return zone;
  },
  async assertZoneManageable(zoneId: string, actor: ResourceActor) {
    const zone = await zoneRepository.findAccessContext(zoneId);
    if (!zone) throw new AppError(404, "Không tìm thấy khu vực");
    await assertFarmAccess(zone.farmId, actor, true);
    return zone;
  },
  async assertCropReadable(cropId: string, actor: ResourceActor) {
    const crop = await cropRepository.findAccessContext(cropId);
    if (!crop) throw new AppError(404, "Không tìm thấy cây trồng");
    await assertFarmAccess(crop.zone.farmId, actor, false);
    return crop;
  },
  async assertCropManageable(cropId: string, actor: ResourceActor) {
    const crop = await cropRepository.findAccessContext(cropId);
    if (!crop) throw new AppError(404, "Không tìm thấy cây trồng");
    await assertFarmAccess(crop.zone.farmId, actor, true);
    return crop;
  },
  async assertDeviceReadable(deviceId: string, actor: ResourceActor) {
    const device = await deviceRepository.findAccessContext(deviceId);
    if (!device) throw new AppError(404, "Không tìm thấy thiết bị");
    await assertFarmAccess(device.zone.farmId, actor, false);
    return device;
  },
  async assertDeviceManageable(deviceId: string, actor: ResourceActor) {
    const device = await deviceRepository.findAccessContext(deviceId);
    if (!device) throw new AppError(404, "Không tìm thấy thiết bị");
    await assertFarmAccess(device.zone.farmId, actor, true);
    return device;
  },
  async assertSensorReadable(sensorId: string, actor: ResourceActor) {
    const sensor = await sensorRepository.findAccessContext(sensorId); if (!sensor) throw new AppError(404, "Không tìm thấy cảm biến"); await assertFarmAccess(sensor.device.zone.farmId, actor, false); return sensor;
  },
  async assertSensorManageable(sensorId: string, actor: ResourceActor) {
    const sensor = await sensorRepository.findAccessContext(sensorId); if (!sensor) throw new AppError(404, "Không tìm thấy cảm biến"); await assertFarmAccess(sensor.device.zone.farmId, actor, true); return sensor;
  },
};
