import type { AutomationRule, AutomationRuleInput, AutomationRulePage } from "../types/automation";
import { api } from "./api";
interface Envelope<T> { success: true; message: string; data: T }
export interface AutomationFilters { search?: string; farmId?: string; zoneId?: string; sensorId?: string; actuatorId?: string; enabled?: boolean; page?: number; limit?: number }
const params = (value: object) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));
export const automationService = {
  async list(filters: AutomationFilters = {}) { const response = await api.get<Envelope<AutomationRulePage>>("/automation-rules", { params: params(filters) }); return response.data.data; },
  async get(id: string) { const response = await api.get<Envelope<{ rule: AutomationRule }>>(`/automation-rules/${id}`); return response.data.data.rule; },
  async create(input: AutomationRuleInput) { const response = await api.post<Envelope<{ rule: AutomationRule }>>("/automation-rules", input); return response.data.data.rule; },
  async update(id: string, input: Partial<AutomationRuleInput>) { const { sensorId: _sensorId, actuatorId: _actuatorId, ...changes } = input; void _sensorId; void _actuatorId; const response = await api.patch<Envelope<{ rule: AutomationRule }>>(`/automation-rules/${id}`, changes); return response.data.data.rule; },
};
