import type { Pagination } from "../types/farm"; import type { Device, DeviceConnectionStatus, DeviceStatus, DeviceSummary, DeviceType } from "../types/device"; import { api } from "./api";
interface Envelope<T> { success: true; message: string; data: T; }
export interface DeviceInput { zoneId: string; deviceCode: string; name: string; type: DeviceType; hardwareModel?: string; firmwareVersion?: string; installedAt?: string; description?: string; status?: DeviceStatus; }
export interface DeviceFilters { search?: string; farmId?: string; zoneId?: string; type?: DeviceType | ""; status?: DeviceStatus | ""; connectionStatus?: DeviceConnectionStatus | ""; page?: number; limit?: number; }
const params = (value: object) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));
export const deviceService = {
  async list(filters: DeviceFilters = {}, signal?: AbortSignal) { const response = await api.get<Envelope<{ items: Device[]; pagination: Pagination }>>("/devices", { params: params(filters), signal }); return response.data.data; },
  async summary(filters: Pick<DeviceFilters,"farmId"|"zoneId"> = {}, signal?: AbortSignal) { const response = await api.get<Envelope<DeviceSummary>>("/devices/summary", { params: params(filters), signal }); return response.data.data; },
  async get(id: string, signal?: AbortSignal) { const response = await api.get<Envelope<{ device: Device }>>(`/devices/${id}`, { signal }); return response.data.data.device; },
  async create(input: DeviceInput) { const response = await api.post<Envelope<{ device: Device }>>("/devices", input); return response.data.data.device; },
  async update(id: string, input: Partial<DeviceInput>) { const { zoneId: _zoneId, deviceCode: _deviceCode, ...changes } = input; void _zoneId; void _deviceCode; const response = await api.patch<Envelope<{ device: Device }>>(`/devices/${id}`, changes); return response.data.data.device; },
};
