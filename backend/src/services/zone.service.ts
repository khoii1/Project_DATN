import { ActivityAction, FarmStatus, ZoneStatus } from "@prisma/client";
import { zoneRepository } from "../repositories/zone.repository";
import type { CreateZoneInput, UpdateZoneInput, ZoneListQuery } from "../validators/zone.schema";
import { AppError } from "../utils/app-error";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string; }

async function assertAreaValid(area: number | null | undefined, farmArea: unknown) {
  if (area != null && farmArea != null && area > Number(farmArea)) throw new AppError(400, "Diện tích khu vực không được lớn hơn diện tích trang trại");
}

export const zoneService = {
  async list(query: ZoneListQuery, actor: Actor) {
    const { items, total } = await zoneRepository.list(actor, query);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
  async getById(id: string, actor: Actor) {
    const zone = await zoneRepository.findAccessibleById(id, actor);
    if (!zone) throw new AppError(404, "Không tìm thấy khu vực");
    return zone;
  },
  async create(input: CreateZoneInput, actor: Actor, ipAddress?: string) {
    const farm = await farmAccessService.assertFarmManageable(input.farmId, actor);
    if (farm.status === FarmStatus.INACTIVE) throw new AppError(400, "Không thể tạo khu vực trong trang trại ngừng hoạt động");
    await assertAreaValid(input.areaHectares, farm.areaHectares);
    if (await zoneRepository.findByFarmAndName(input.farmId, input.name)) throw new AppError(409, "Tên khu vực đã tồn tại trong trang trại");
    const zone = await zoneRepository.create({ farmId: input.farmId, name: input.name, description: input.description, areaHectares: input.areaHectares });
    await recordActivity({ userId: actor.id, farmId: input.farmId, action: ActivityAction.CREATE_ZONE, entityType: "ZONE", entityId: zone.id, description: `${actor.fullName} tạo khu vực "${zone.name}"`, ipAddress });
    return zone;
  },
  async update(id: string, input: UpdateZoneInput, actor: Actor, ipAddress?: string) {
    const context = await farmAccessService.assertZoneManageable(id, actor);
    await assertAreaValid(input.areaHectares, context.farm.areaHectares);
    if (input.name) {
      const duplicate = await zoneRepository.findByFarmAndName(context.farmId, input.name);
      if (duplicate && duplicate.id !== id) throw new AppError(409, "Tên khu vực đã tồn tại trong trang trại");
    }
    const current = await zoneRepository.findAccessibleById(id, actor);
    if (!current) throw new AppError(404, "Không tìm thấy khu vực");
    const zone = await zoneRepository.update(id, input);
    const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_ZONE_STATUS : ActivityAction.UPDATE_ZONE;
    await recordActivity({ userId: actor.id, farmId: context.farmId, action, entityType: "ZONE", entityId: zone.id, description: `${actor.fullName} cập nhật khu vực "${zone.name}"`, ipAddress });
    return zone;
  },
};
