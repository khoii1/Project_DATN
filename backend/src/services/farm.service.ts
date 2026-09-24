import { ActivityAction, FarmStatus, UserRole, UserStatus } from "@prisma/client";
import { farmRepository } from "../repositories/farm.repository";
import { userRepository } from "../repositories/user.repository";
import type { CreateFarmInput, FarmListQuery, UpdateFarmInput } from "../validators/farm.schema";
import { AppError } from "../utils/app-error";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface FarmActor extends ResourceActor { fullName: string; }

export const farmService = {
  async list(query: FarmListQuery, actor: FarmActor) {
    const { items, total } = await farmRepository.list(actor, query);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
  async getById(id: string, actor: FarmActor) {
    const farm = await farmRepository.findAccessibleById(id, actor);
    if (!farm) throw new AppError(404, "Không tìm thấy trang trại");
    return { ...farm, cropCount: await farmRepository.countCrops(id) };
  },
  async create(input: CreateFarmInput, actor: FarmActor, ipAddress?: string) {
    let ownerId = actor.id;
    if (actor.role === UserRole.ADMIN) {
      if (!input.ownerId) throw new AppError(400, "Chủ trang trại là bắt buộc");
      const owner = await userRepository.findPublicById(input.ownerId);
      if (!owner || owner.role !== UserRole.FARM_OWNER || owner.status !== UserStatus.ACTIVE) throw new AppError(400, "Chủ trang trại phải là FARM_OWNER đang hoạt động");
      ownerId = owner.id;
    } else if (input.ownerId) {
      throw new AppError(400, "Chủ trang trại không được tự chỉ định ownerId");
    }
    const farm = await farmRepository.create({ ownerId, name: input.name, address: input.address, description: input.description, areaHectares: input.areaHectares });
    await recordActivity({ userId: actor.id, farmId: farm.id, action: ActivityAction.CREATE_FARM, entityType: "FARM", entityId: farm.id, description: `${actor.fullName} tạo trang trại "${farm.name}"`, ipAddress });
    return farm;
  },
  async update(id: string, input: UpdateFarmInput, actor: FarmActor, ipAddress?: string) {
    await farmAccessService.assertFarmManageable(id, actor);
    const current = await farmRepository.findAccessibleById(id, actor);
    if (!current) throw new AppError(404, "Không tìm thấy trang trại");
    const farm = await farmRepository.update(id, input);
    const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_FARM_STATUS : ActivityAction.UPDATE_FARM;
    await recordActivity({ userId: actor.id, farmId: farm.id, action, entityType: "FARM", entityId: farm.id, description: `${actor.fullName} cập nhật trang trại "${farm.name}"`, ipAddress });
    return farm;
  },
};
