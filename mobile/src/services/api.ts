import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  ActivityLogModel,
  ActuatorModel,
  AlertModel,
  AlertRuleModel,
  AlertSummaryModel,
  AuthUser,
  AutomationRuleModel,
  CropModel,
  DeviceCommandModel,
  DeviceModel,
  DeviceSummaryModel,
  FarmModel,
  FarmStaffAssignmentModel,
  PagedResult,
  ReportBundleModel,
  SensorChartPointModel,
  SensorModel,
  SensorReadingModel,
  SensorStatisticsModel,
  ZoneLatestSensorModel,
  ZoneModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function detectDefaultServerUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      ?.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0];
    if (host && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `http://${host}:5000`;
    }
  }
  return 'http://172.20.10.2:5000';
}

export function normalizeServerUrl(raw: string): string {
  let trimmed = raw.trim();
  if (!trimmed) return detectDefaultServerUrl();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `http://${trimmed}`;
  }
  trimmed = trimmed.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    trimmed = trimmed.slice(0, -4);
  }
  return trimmed;
}

class ApiClient {
  private serverUrl: string = detectDefaultServerUrl();
  private accessToken: string | null = null;
  public onUnauthorized?: () => void;

  getServerUrl(): string {
    return this.serverUrl;
  }

  setServerUrl(url: string): void {
    this.serverUrl = normalizeServerUrl(url);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.serverUrl}/api${cleanPath}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  private headers(hasBody = false): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (hasBody) h['Content-Type'] = 'application/json';
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options?: { query?: Record<string, unknown>; body?: unknown; rawText?: boolean },
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(this.buildUrl(path, options?.query), {
        method,
        headers: this.headers(options?.body !== undefined),
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 && this.accessToken) {
        this.onUnauthorized?.();
      }

      const text = await response.text();
      if (options?.rawText && response.ok) {
        return text as unknown as T;
      }

      let json: Record<string, unknown> = {};
      if (text) {
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {}
      }

      if (!response.ok) {
        let msg = typeof json.message === 'string' ? json.message : 'Yêu cầu chưa hoàn tất';
        if (Array.isArray(json.errors) && json.errors.length > 0) {
          const first = json.errors[0] as { message?: string };
          if (first?.message) msg = first.message;
        }
        throw new Error(AppFormatters.friendlyError(msg));
      }

      return (json.data !== undefined ? json.data : json) as T;
    } catch (err) {
      throw new Error(AppFormatters.friendlyError(err));
    } finally {
      clearTimeout(timer);
    }
  }
}

export const apiClient = new ApiClient();

export const smartAgriApi = {
  // AUTH & HEALTH
  checkHealth() {
    return apiClient.request<{ database: string; mqtt: string }>('GET', '/health');
  },
  login(email: string, password: string) {
    return apiClient.request<{ user: AuthUser; accessToken: string }>('POST', '/auth/login', {
      body: { email: email.trim(), password },
    });
  },
  register(input: {
    fullName: string;
    email: string;
    phone?: string | null;
    password: string;
    role?: string;
  }) {
    return apiClient.request<{ user: AuthUser; accessToken: string }>('POST', '/auth/register', {
      body: {
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        password: input.password,
        role: input.role || 'FARM_OWNER',
      },
    });
  },
  requestPasswordReset(email: string) {
    return apiClient.request<{ expiresInSeconds: number; emailSent?: boolean; verificationCode?: string }>(
      'POST',
      '/auth/forgot-password',
      { body: { email: email.trim() } },
    );
  },
  resetPassword(input: { email: string; otpCode: string; newPassword: string }) {
    return apiClient.request<void>('POST', '/auth/reset-password', {
      body: {
        email: input.email.trim(),
        otpCode: input.otpCode.trim(),
        newPassword: input.newPassword,
      },
    });
  },
  async getMe() {
    const res = await apiClient.request<{ user: AuthUser }>('GET', '/auth/me');
    return res.user;
  },
  async updateProfile(fullName: string, phone?: string | null) {
    const res = await apiClient.request<{ user: AuthUser }>('PATCH', '/auth/me', {
      body: { fullName: fullName.trim(), phone: phone?.trim() || null },
    });
    return res.user;
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiClient.request<void>('PATCH', '/auth/change-password', {
      body: { currentPassword, newPassword },
    });
  },
  async logout() {
    try {
      await apiClient.request<void>('POST', '/auth/logout');
    } catch {}
  },

  // FARMS & STAFF
  listFarms(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<FarmModel>>('GET', '/farms', { query });
  },
  async createFarm(body: Record<string, unknown>) {
    const res = await apiClient.request<{ farm: FarmModel }>('POST', '/farms', { body });
    return res.farm;
  },
  async updateFarm(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ farm: FarmModel }>('PATCH', `/farms/${id}`, { body });
    return res.farm;
  },
  deleteFarm(id: string) {
    return apiClient.request<void>('DELETE', `/farms/${id}`);
  },
  async listFarmStaff(farmId: string) {
    const res = await apiClient.request<{ items: FarmStaffAssignmentModel[] }>(
      'GET',
      `/farms/${farmId}/staff`,
    );
    return res.items;
  },
  async listStaffCandidates(farmId: string) {
    const res = await apiClient.request<{ items: AuthUser[] }>(
      'GET',
      `/farms/${farmId}/staff-candidates`,
    );
    return res.items;
  },
  assignStaff(farmId: string, staffId: string) {
    return apiClient.request<void>('POST', `/farms/${farmId}/staff`, { body: { staffId } });
  },
  updateStaffPermission(farmId: string, staffId: string, canControlIrrigation: boolean) {
    return apiClient.request<void>('PATCH', `/farms/${farmId}/staff/${staffId}`, {
      body: { canControlIrrigation },
    });
  },
  removeStaff(farmId: string, staffId: string) {
    return apiClient.request<void>('DELETE', `/farms/${farmId}/staff/${staffId}`);
  },

  // ZONES
  listZones(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<ZoneModel>>('GET', '/zones', { query });
  },
  async createZone(body: Record<string, unknown>) {
    const res = await apiClient.request<{ zone: ZoneModel }>('POST', '/zones', { body });
    return res.zone;
  },
  async updateZone(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ zone: ZoneModel }>('PATCH', `/zones/${id}`, { body });
    return res.zone;
  },
  deleteZone(id: string) {
    return apiClient.request<void>('DELETE', `/zones/${id}`);
  },

  // CROPS
  listCrops(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<CropModel>>('GET', '/crops', { query });
  },
  async createCrop(body: Record<string, unknown>) {
    const res = await apiClient.request<{ crop: CropModel }>('POST', '/crops', { body });
    return res.crop;
  },
  async updateCrop(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ crop: CropModel }>('PATCH', `/crops/${id}`, { body });
    return res.crop;
  },
  deleteCrop(id: string) {
    return apiClient.request<void>('DELETE', `/crops/${id}`);
  },

  // DEVICES
  deviceSummary(query: Record<string, unknown> = {}) {
    return apiClient.request<DeviceSummaryModel>('GET', '/devices/summary', { query });
  },
  listDevices(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<DeviceModel>>('GET', '/devices', { query });
  },
  async createDevice(body: Record<string, unknown>) {
    const res = await apiClient.request<{ device: DeviceModel }>('POST', '/devices', { body });
    return res.device;
  },
  async updateDevice(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ device: DeviceModel }>('PATCH', `/devices/${id}`, {
      body,
    });
    return res.device;
  },
  deleteDevice(id: string) {
    return apiClient.request<void>('DELETE', `/devices/${id}`);
  },

  // SENSORS & HISTORY
  async zoneLatestReadings(zoneId: string) {
    const res = await apiClient.request<{ sensors: ZoneLatestSensorModel[] }>(
      'GET',
      `/zones/${zoneId}/latest-readings`,
    );
    return res.sensors ?? [];
  },
  listSensors(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<SensorModel>>('GET', '/sensors', { query });
  },
  async createSensor(body: Record<string, unknown>) {
    const res = await apiClient.request<{ sensor: SensorModel }>('POST', '/sensors', { body });
    return res.sensor;
  },
  async updateSensor(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ sensor: SensorModel }>('PATCH', `/sensors/${id}`, {
      body,
    });
    return res.sensor;
  },
  deleteSensor(id: string) {
    return apiClient.request<void>('DELETE', `/sensors/${id}`);
  },
  async sensorChart(sensorId: string, query: { from: string; to: string; resolution?: string }) {
    const res = await apiClient.request<{ points: SensorChartPointModel[] }>(
      'GET',
      `/sensors/${sensorId}/chart`,
      { query },
    );
    return res.points ?? [];
  },
  sensorStatistics(sensorId: string, query: { from: string; to: string }) {
    return apiClient.request<SensorStatisticsModel>('GET', `/sensors/${sensorId}/statistics`, {
      query,
    });
  },
  sensorReadings(sensorId: string, query: { from: string; to: string; limit?: number }) {
    return apiClient.request<PagedResult<SensorReadingModel>>(
      'GET',
      `/sensors/${sensorId}/readings`,
      { query: { ...query, sort: 'desc' } },
    );
  },

  // ACTUATORS, COMMANDS & AUTOMATION
  listActuators(query: Record<string, unknown> = { limit: 50 }) {
    return apiClient.request<PagedResult<ActuatorModel>>('GET', '/actuators', { query });
  },
  async createActuator(body: Record<string, unknown>) {
    const res = await apiClient.request<{ actuator: ActuatorModel }>('POST', '/actuators', {
      body,
    });
    return res.actuator;
  },
  async updateActuator(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ actuator: ActuatorModel }>(
      'PATCH',
      `/actuators/${id}`,
      { body },
    );
    return res.actuator;
  },
  deleteActuator(id: string) {
    return apiClient.request<void>('DELETE', `/actuators/${id}`);
  },
  issueCommand(actuatorId: string, command: 'TURN_ON' | 'TURN_OFF') {
    return apiClient.request<{ command: DeviceCommandModel; actuator: ActuatorModel }>(
      'POST',
      `/actuators/${actuatorId}/commands`,
      { body: { command } },
    );
  },
  listCommands(query: Record<string, unknown> = { limit: 30 }) {
    return apiClient.request<PagedResult<DeviceCommandModel>>('GET', '/device-commands', {
      query,
    });
  },
  listAutomationRules(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<AutomationRuleModel>>('GET', '/automation-rules', {
      query,
    });
  },
  async createAutomationRule(body: Record<string, unknown>) {
    const res = await apiClient.request<{ rule: AutomationRuleModel }>(
      'POST',
      '/automation-rules',
      { body },
    );
    return res.rule;
  },
  async updateAutomationRule(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ rule: AutomationRuleModel }>(
      'PATCH',
      `/automation-rules/${id}`,
      { body },
    );
    return res.rule;
  },
  deleteAutomationRule(id: string) {
    return apiClient.request<void>('DELETE', `/automation-rules/${id}`);
  },

  // ALERTS & ALERT RULES
  alertSummary() {
    return apiClient.request<AlertSummaryModel>('GET', '/alerts/summary');
  },
  listAlerts(query: Record<string, unknown> = { limit: 50 }) {
    return apiClient.request<PagedResult<AlertModel>>('GET', '/alerts', { query });
  },
  acknowledgeAlert(id: string) {
    return apiClient.request<{ alert: AlertModel }>('POST', `/alerts/${id}/acknowledge`);
  },
  resolveAlert(id: string) {
    return apiClient.request<{ alert: AlertModel }>('POST', `/alerts/${id}/resolve`);
  },
  listAlertRules(query: Record<string, unknown> = { limit: 100 }) {
    return apiClient.request<PagedResult<AlertRuleModel>>('GET', '/alert-rules', { query });
  },
  async createAlertRule(body: Record<string, unknown>) {
    const res = await apiClient.request<{ rule: AlertRuleModel }>('POST', '/alert-rules', {
      body,
    });
    return res.rule;
  },
  async updateAlertRule(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ rule: AlertRuleModel }>(
      'PATCH',
      `/alert-rules/${id}`,
      { body },
    );
    return res.rule;
  },
  deleteAlertRule(id: string) {
    return apiClient.request<void>('DELETE', `/alert-rules/${id}`);
  },

  // REPORTS & CSV
  async loadReportBundle(query: { from: string; to: string; farmId?: string; zoneId?: string }) {
    const [overview, sensorsRes, alerts, irrigation, automation] = await Promise.all([
      apiClient.request<Record<string, number>>('GET', '/reports/overview', { query }),
      apiClient.request<{ items: Array<Record<string, unknown>> }>('GET', '/reports/sensors', {
        query,
      }),
      apiClient.request<Record<string, number | null>>('GET', '/reports/alerts', { query }),
      apiClient.request<Record<string, number | null>>('GET', '/reports/irrigation', { query }),
      apiClient.request<Record<string, unknown>>('GET', '/reports/automation', { query }),
    ]);
    return {
      overview,
      sensors: sensorsRes.items ?? [],
      alerts,
      irrigation,
      automation,
    } satisfies ReportBundleModel;
  },
  exportReportCsv(query: { type: string; from: string; to: string }) {
    return apiClient.request<string>('GET', '/reports/export', { query, rawText: true });
  },

  // USERS & LOGS
  listUsers(query: Record<string, unknown> = { limit: 50 }) {
    return apiClient.request<PagedResult<AuthUser>>('GET', '/users', { query });
  },
  async createUser(body: Record<string, unknown>) {
    const res = await apiClient.request<{ user: AuthUser }>('POST', '/users', { body });
    return res.user;
  },
  async updateUser(id: string, body: Record<string, unknown>) {
    const res = await apiClient.request<{ user: AuthUser }>('PATCH', `/users/${id}`, { body });
    return res.user;
  },
  deleteUser(id: string) {
    return apiClient.request<void>('DELETE', `/users/${id}`);
  },
  listActivityLogs(query: Record<string, unknown> = { limit: 40 }) {
    return apiClient.request<PagedResult<ActivityLogModel>>('GET', '/activity-logs', { query });
  },
};
