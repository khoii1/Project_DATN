import { ActivityAction, CropStatus, FarmStatus, ZoneStatus } from "@prisma/client";
import { cropRepository } from "../repositories/crop.repository";
import type { CreateCropInput, CropListQuery, UpdateCropInput } from "../validators/crop.schema";
import { AppError } from "../utils/app-error";
import { recordActivity } from "./activity-log.service";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

interface Actor extends ResourceActor { fullName: string; }

function validateDates(planting?: Date | null, expected?: Date | null, actual?: Date | null) {
  if (planting && expected && expected < planting) throw new AppError(400, "Ngày thu hoạch dự kiến không được trước ngày trồng");
  if (planting && actual && actual < planting) throw new AppError(400, "Ngày thu hoạch thực tế không được trước ngày trồng");
}

function assertGrowingAllowed(status: CropStatus | undefined, zoneStatus: ZoneStatus, farmStatus: FarmStatus) {
  if (status === CropStatus.GROWING && (zoneStatus === ZoneStatus.INACTIVE || farmStatus === FarmStatus.INACTIVE)) throw new AppError(400, "Không thể tạo hoặc chuyển cây trồng sang Đang trồng khi khu vực hoặc trang trại ngừng hoạt động");
}

export const cropService = {
  async list(query: CropListQuery, actor: Actor) {
    const { items, total } = await cropRepository.list(actor, query);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
  async getById(id: string, actor: Actor) {
    const crop = await cropRepository.findAccessibleById(id, actor);
    if (!crop) throw new AppError(404, "Không tìm thấy cây trồng");
    return crop;
  },
  async create(input: CreateCropInput, actor: Actor, ipAddress?: string) {
    const zone = await farmAccessService.assertZoneManageable(input.zoneId, actor);
    assertGrowingAllowed(input.status, zone.status, zone.farm.status);
    validateDates(input.plantingDate, input.expectedHarvestDate, input.actualHarvestDate);
    const crop = await cropRepository.create({ zoneId: input.zoneId, name: input.name, variety: input.variety, plantingDate: input.plantingDate, expectedHarvestDate: input.expectedHarvestDate, actualHarvestDate: input.actualHarvestDate, status: input.status, description: input.description });
    await recordActivity({ userId: actor.id, farmId: zone.farmId, action: ActivityAction.CREATE_CROP, entityType: "CROP", entityId: crop.id, description: `${actor.fullName} tạo cây trồng "${crop.name}${crop.variety ? ` ${crop.variety}` : ""}"`, ipAddress });
    return crop;
  },
  async update(id: string, input: UpdateCropInput, actor: Actor, ipAddress?: string) {
    const context = await farmAccessService.assertCropManageable(id, actor);
    assertGrowingAllowed(input.status, context.zone.status, context.zone.farm.status);
    const planting = input.plantingDate === undefined ? context.plantingDate : input.plantingDate;
    const expected = input.expectedHarvestDate === undefined ? context.expectedHarvestDate : input.expectedHarvestDate;
    const actual = input.actualHarvestDate === undefined ? context.actualHarvestDate : input.actualHarvestDate;
    validateDates(planting, expected, actual);
    const current = await cropRepository.findAccessibleById(id, actor);
    if (!current) throw new AppError(404, "Không tìm thấy cây trồng");
    const crop = await cropRepository.update(id, input);
    const action = input.status && input.status !== current.status ? ActivityAction.CHANGE_CROP_STATUS : ActivityAction.UPDATE_CROP;
    await recordActivity({ userId: actor.id, farmId: context.zone.farmId, action, entityType: "CROP", entityId: crop.id, description: `${actor.fullName} cập nhật cây trồng "${crop.name}"`, ipAddress });
    return crop;
  },
};
