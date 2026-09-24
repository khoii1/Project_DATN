import { ActivityAction, DeviceStatus } from '@prisma/client';
import { SENSOR_TYPE_METADATA } from '../constants/sensor-metadata';
import { sensorRepository } from '../repositories/sensor.repository';
import type { CreateSensorInput, SensorListQuery, UpdateSensorInput } from '../validators/sensor.schema';
import { AppError } from '../utils/app-error';
import { recordActivity } from './activity-log.service';
import { farmAccessService, type ResourceActor } from './farm-access.service';

interface Actor extends ResourceActor { fullName: string }
function present(sensor: any) { const { readings, ...rest } = sensor; return { ...rest, unit: SENSOR_TYPE_METADATA[sensor.type as keyof typeof SENSOR_TYPE_METADATA].unit, label: SENSOR_TYPE_METADATA[sensor.type as keyof typeof SENSOR_TYPE_METADATA].label, latestReading: readings?.[0] ?? null }; }

export const sensorService = {
  async list(query: SensorListQuery, actor: Actor) { const { items, total } = await sensorRepository.list(actor, query); return { items: items.map(present), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; },
  summary(actor: Actor) { return sensorRepository.summary(actor); },
  async getById(id: string, actor: Actor) { const sensor = await sensorRepository.findAccessibleById(id, actor); if (!sensor) throw new AppError(404, 'Không tìm thấy cảm biến'); return present(sensor); },
  async create(input: CreateSensorInput, actor: Actor, ipAddress?: string) {
    const device = await farmAccessService.assertDeviceManageable(input.deviceId, actor);
    if (device.status === DeviceStatus.INACTIVE) throw new AppError(400, 'Không thể cấu hình cảm biến cho thiết bị ngừng hoạt động');
    if (await sensorRepository.findByDeviceAndCode(input.deviceId, input.sensorCode)) throw new AppError(409, 'Mã cảm biến đã tồn tại trên thiết bị');
    const sensor = await sensorRepository.create(input);
    await recordActivity({ userId: actor.id, farmId: device.zone.farmId, action: ActivityAction.CREATE_SENSOR, entityType: 'SENSOR', entityId: sensor.id, description: `${actor.fullName} tạo cảm biến "${sensor.sensorCode}"`, ipAddress });
    return present(sensor);
  },
  async update(id: string, input: UpdateSensorInput, actor: Actor, ipAddress?: string) {
    await farmAccessService.assertSensorManageable(id, actor); const current = await sensorRepository.findAccessibleById(id, actor);
    if (!current) throw new AppError(404, 'Không tìm thấy cảm biến');
    const sensor = await sensorRepository.update(id, input); const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_SENSOR_STATUS : ActivityAction.UPDATE_SENSOR;
    await recordActivity({ userId: actor.id, farmId: current.device.zone.farmId, action, entityType: 'SENSOR', entityId: id, description: `${actor.fullName} cập nhật cảm biến "${sensor.sensorCode}"`, ipAddress });
    return present(sensor);
  },
  async latestForZone(zoneId: string, actor: Actor) { const zone = await farmAccessService.assertZoneReadable(zoneId, actor); const sensors = (await sensorRepository.latestForZone(zoneId, actor)).map(present); return { zone: { id: zone.id, name: (zone as any).name ?? 'Khu vực' }, sensors: sensors.map((sensor) => ({ sensorId: sensor.id, sensorCode: sensor.sensorCode, name: sensor.name, type: sensor.type, unit: sensor.unit, value: sensor.latestReading?.value ?? null, recordedAt: sensor.latestReading?.recordedAt ?? null })) }; },
  async latestForDevice(deviceId: string, actor: Actor) { await farmAccessService.assertDeviceReadable(deviceId, actor); return (await sensorRepository.latestForDevice(deviceId, actor)).map(present); },
};
