import type { Alert, AlertRule, AlertRuleInput, AlertSeverity, AlertStatus, AlertSummary, Page } from "../types/alert";
import type { SensorType } from "../types/sensor";
import { api } from "./api";

interface Envelope<T> { success: true; message: string; data: T }
const params = (value: object) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));
export interface AlertFilters { farmId?: string; zoneId?: string; deviceId?: string; sensorId?: string; sensorType?: SensorType | ""; status?: AlertStatus | ""; severity?: AlertSeverity | ""; active?: boolean; from?: string; to?: string; page?: number; limit?: number }
export interface RuleFilters { search?: string; farmId?: string; zoneId?: string; deviceId?: string; sensorId?: string; sensorType?: SensorType | ""; severity?: AlertSeverity | ""; enabled?: boolean; page?: number; limit?: number }

export const alertService = {
  async list(filters: AlertFilters = {}) { const response = await api.get<Envelope<Page<Alert>>>("/alerts", { params: params(filters) }); return response.data.data; },
  async summary() { const response = await api.get<Envelope<AlertSummary>>("/alerts/summary"); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ alert: Alert }>>(`/alerts/${id}`); return response.data.data.alert; },
  async acknowledge(id: string) { const response = await api.post<Envelope<{ alert: Alert }>>(`/alerts/${id}/acknowledge`); return response.data.data.alert; },
  async resolve(id: string) { const response = await api.post<Envelope<{ alert: Alert }>>(`/alerts/${id}/resolve`); return response.data.data.alert; },
};
export const alertRuleService = {
  async list(filters: RuleFilters = {}) { const response = await api.get<Envelope<Page<AlertRule>>>("/alert-rules", { params: params(filters) }); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ rule: AlertRule }>>(`/alert-rules/${id}`); return response.data.data.rule; },
  async create(input: AlertRuleInput) { const response = await api.post<Envelope<{ rule: AlertRule }>>("/alert-rules", input); return response.data.data.rule; },
  async update(id: string, input: Partial<AlertRuleInput>) { const { sensorId: _sensorId, ...changes } = input; void _sensorId; const response = await api.patch<Envelope<{ rule: AlertRule }>>(`/alert-rules/${id}`, changes); return response.data.data.rule; },
};
