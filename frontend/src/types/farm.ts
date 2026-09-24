import type { AuthUser } from "./auth";

export type FarmStatus = "ACTIVE" | "INACTIVE";
export type ZoneStatus = "ACTIVE" | "INACTIVE";
export type CropStatus = "PLANNED" | "GROWING" | "HARVESTED" | "CANCELLED";

export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface OwnerSummary { id: string; fullName: string; email: string; }

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  description: string | null;
  areaHectares: string | null;
  status: FarmStatus;
  createdAt: string;
  updatedAt: string;
  owner: OwnerSummary;
  _count: { zones: number; staffAssignments: number };
  cropCount?: number;
}

export interface FarmStaffAssignment {
  id: string;
  farmId: string;
  staffId: string;
  createdAt: string;
  canControlIrrigation: boolean;
  staff: AuthUser;
}

export interface Zone {
  id: string;
  farmId: string;
  name: string;
  description: string | null;
  areaHectares: string | null;
  status: ZoneStatus;
  createdAt: string;
  updatedAt: string;
  farm: { id: string; name: string; ownerId: string; status: FarmStatus };
  _count: { crops: number };
  crops?: Crop[];
}

export interface Crop {
  id: string;
  zoneId: string;
  name: string;
  variety: string | null;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  status: CropStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  zone: { id: string; name: string; farmId: string; farm: { id: string; name: string; ownerId: string; status: FarmStatus } };
}

export const farmStatusLabels: Record<FarmStatus, string> = { ACTIVE: "Hoạt động", INACTIVE: "Ngừng hoạt động" };
export const zoneStatusLabels: Record<ZoneStatus, string> = { ACTIVE: "Hoạt động", INACTIVE: "Ngừng hoạt động" };
export const cropStatusLabels: Record<CropStatus, string> = { PLANNED: "Dự kiến", GROWING: "Đang trồng", HARVESTED: "Đã thu hoạch", CANCELLED: "Đã hủy" };
