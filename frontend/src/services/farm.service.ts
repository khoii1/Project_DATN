import type { AuthUser } from "../types/auth";
import type { Farm, FarmStaffAssignment, FarmStatus, Pagination } from "../types/farm";
import { api } from "./api";

interface Envelope<T> { data: T; message: string; success: true; }
export interface FarmInput { name: string; ownerId?: string; address?: string; areaHectares?: number | null; description?: string; }
export interface FarmFilters { search?: string; status?: FarmStatus | ""; ownerId?: string; page?: number; limit?: number; }
const queryParams = (filters: FarmFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));

export const farmService = {
  async list(filters: FarmFilters = {}) { const response = await api.get<Envelope<{ items: Farm[]; pagination: Pagination }>>("/farms", { params: queryParams(filters) }); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ farm: Farm }>>(`/farms/${id}`); return response.data.data.farm; },
  async create(input: FarmInput) { const response = await api.post<Envelope<{ farm: Farm }>>("/farms", input); return response.data.data.farm; },
  async update(id: string, input: Partial<Omit<FarmInput, "ownerId">> & { status?: FarmStatus }) { const response = await api.patch<Envelope<{ farm: Farm }>>(`/farms/${id}`, input); return response.data.data.farm; },
  async staff(farmId: string) { const response = await api.get<Envelope<{ items: FarmStaffAssignment[] }>>(`/farms/${farmId}/staff`); return response.data.data.items; },
  async staffCandidates(farmId: string) { const response = await api.get<Envelope<{ items: AuthUser[] }>>(`/farms/${farmId}/staff-candidates`); return response.data.data.items; },
  async assignStaff(farmId: string, staffId: string) { await api.post(`/farms/${farmId}/staff`, { staffId }); },
  async updateStaffPermission(farmId: string, staffId: string, canControlIrrigation: boolean) { const response = await api.patch<Envelope<{ assignment: FarmStaffAssignment }>>(`/farms/${farmId}/staff/${staffId}`, { canControlIrrigation }); return response.data.data.assignment; },
  async removeStaff(farmId: string, staffId: string) { await api.delete(`/farms/${farmId}/staff/${staffId}`); },
};
