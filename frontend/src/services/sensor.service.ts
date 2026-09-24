import type { Pagination } from "../types/farm";
import type { Sensor, SensorChartResolution, SensorChartResponse, SensorHistoryQuery, SensorReadingPage, SensorStatistics, SensorStatus, SensorSummary, SensorType, ZoneLatestReading } from "../types/sensor";
import { api } from "./api";

interface Envelope<T> { success: true; message: string; data: T }
export interface SensorInput { deviceId: string; sensorCode: string; name: string; type: SensorType; description?: string; status?: SensorStatus }
export interface SensorFilters { search?: string; farmId?: string; zoneId?: string; deviceId?: string; type?: SensorType | ""; status?: SensorStatus | ""; page?: number; limit?: number }
const params = (value: object) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));

export const sensorService = {
  async list(filters: SensorFilters = {}) { const response = await api.get<Envelope<{ items: Sensor[]; pagination: Pagination }>>("/sensors", { params: params(filters) }); return response.data.data; },
  async summary() { const response = await api.get<Envelope<SensorSummary>>("/sensors/summary"); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ sensor: Sensor }>>(`/sensors/${id}`); return response.data.data.sensor; },
  async create(input: SensorInput) { const response = await api.post<Envelope<{ sensor: Sensor }>>("/sensors", input); return response.data.data.sensor; },
  async update(id: string, input: Partial<SensorInput>) { const { deviceId: _deviceId, sensorCode: _sensorCode, type: _type, ...changes } = input; void _deviceId; void _sensorCode; void _type; const response = await api.patch<Envelope<{ sensor: Sensor }>>(`/sensors/${id}`, changes); return response.data.data.sensor; },
  async readings(id: string, query: Partial<SensorHistoryQuery> = {}, signal?: AbortSignal) { const response = await api.get<Envelope<SensorReadingPage>>(`/sensors/${id}/readings`, { params: params(query), signal }); return response.data.data; },
  async chart(id: string, query: Pick<SensorHistoryQuery, "from" | "to"> & { resolution?: SensorChartResolution }, signal?: AbortSignal) { const response = await api.get<Envelope<SensorChartResponse>>(`/sensors/${id}/chart`, { params: query, signal }); return response.data.data; },
  async statistics(id: string, query: Pick<SensorHistoryQuery, "from" | "to">, signal?: AbortSignal) { const response = await api.get<Envelope<SensorStatistics>>(`/sensors/${id}/statistics`, { params: query, signal }); return response.data.data; },
  async zoneLatest(zoneId: string) { const response = await api.get<Envelope<{ zone: { id: string; name: string }; sensors: ZoneLatestReading[] }>>(`/zones/${zoneId}/latest-readings`); return response.data.data; },
  async deviceLatest(deviceId: string) { const response = await api.get<Envelope<{ items: Sensor[] }>>(`/devices/${deviceId}/latest-readings`); return response.data.data.items; },
};
