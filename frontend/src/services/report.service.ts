import type { AlertReport, AutomationReport, IrrigationReport, ReportExportType, ReportOverview, ReportQuery, SensorReportItem } from '../types/report';
import { api } from './api';

interface Envelope<T> { success: true; message: string; data: T }
const params = (query: ReportQuery) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== undefined));

export const reportService = {
  async overview(query: ReportQuery, signal?: AbortSignal) { const response = await api.get<Envelope<ReportOverview>>('/reports/overview', { params: params(query), signal }); return response.data.data; },
  async sensors(query: ReportQuery, signal?: AbortSignal) { const response = await api.get<Envelope<{ items: SensorReportItem[] }>>('/reports/sensors', { params: params(query), signal }); return response.data.data.items; },
  async alerts(query: ReportQuery, signal?: AbortSignal) { const response = await api.get<Envelope<AlertReport>>('/reports/alerts', { params: params(query), signal }); return response.data.data; },
  async irrigation(query: ReportQuery, signal?: AbortSignal) { const response = await api.get<Envelope<IrrigationReport>>('/reports/irrigation', { params: params(query), signal }); return response.data.data; },
  async automation(query: ReportQuery, signal?: AbortSignal) { const response = await api.get<Envelope<AutomationReport>>('/reports/automation', { params: params(query), signal }); return response.data.data; },
  async download(type: ReportExportType, query: ReportQuery) {
    const response = await api.get<Blob>('/reports/export', { params: { type, ...params(query) }, responseType: 'blob' });
    const filename = /filename="?([^";]+)"?/.exec(response.headers['content-disposition'] ?? '')?.[1] ?? `smart-agriculture-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  },
};
