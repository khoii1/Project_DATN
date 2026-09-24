import type { ActivityLogPage, ActivityLogQuery } from '../types/activity-log';
import { api } from './api';

interface Envelope<T> { success: true; message: string; data: T }
const params = (query: ActivityLogQuery) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== undefined));
export const activityLogService = {
  async list(query: ActivityLogQuery, signal?: AbortSignal) { const response = await api.get<Envelope<ActivityLogPage>>('/activity-logs', { params: params(query), signal }); return response.data.data; },
};
