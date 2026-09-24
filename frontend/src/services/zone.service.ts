import type { Pagination, Zone, ZoneStatus } from "../types/farm";
import { api } from "./api";

interface Envelope<T> { data: T; message: string; success: true; }
export interface ZoneInput { farmId: string; name: string; areaHectares?: number | null; description?: string; }
export interface ZoneFilters { farmId?: string; search?: string; status?: ZoneStatus | ""; page?: number; limit?: number; }
const queryParams = (filters: ZoneFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));

export const zoneService = {
  async list(filters: ZoneFilters = {}) { const response = await api.get<Envelope<{ items: Zone[]; pagination: Pagination }>>("/zones", { params: queryParams(filters) }); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ zone: Zone }>>(`/zones/${id}`); return response.data.data.zone; },
  async create(input: ZoneInput) { const response = await api.post<Envelope<{ zone: Zone }>>("/zones", input); return response.data.data.zone; },
  async update(id: string, input: (Partial<ZoneInput> & { status?: ZoneStatus })) { const { farmId: _farmId, ...changes } = input; void _farmId; const response = await api.patch<Envelope<{ zone: Zone }>>(`/zones/${id}`, changes); return response.data.data.zone; },
};
