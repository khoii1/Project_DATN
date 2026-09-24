import type { Crop, CropStatus, Pagination } from "../types/farm";
import { api } from "./api";

interface Envelope<T> { data: T; message: string; success: true; }
export interface CropInput { zoneId: string; name: string; variety?: string; plantingDate?: string; expectedHarvestDate?: string; actualHarvestDate?: string; status: CropStatus; description?: string; }
export interface CropFilters { farmId?: string; zoneId?: string; search?: string; status?: CropStatus | ""; page?: number; limit?: number; }
const queryParams = (filters: CropFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));

export const cropService = {
  async list(filters: CropFilters = {}) { const response = await api.get<Envelope<{ items: Crop[]; pagination: Pagination }>>("/crops", { params: queryParams(filters) }); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ crop: Crop }>>(`/crops/${id}`); return response.data.data.crop; },
  async create(input: CropInput) { const response = await api.post<Envelope<{ crop: Crop }>>("/crops", input); return response.data.data.crop; },
  async update(id: string, input: Partial<CropInput>) { const { zoneId: _zoneId, ...changes } = input; void _zoneId; const response = await api.patch<Envelope<{ crop: Crop }>>(`/crops/${id}`, changes); return response.data.data.crop; },
};
