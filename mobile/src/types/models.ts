export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'FARM_OWNER' | 'STAFF' | string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
}

export interface FarmModel {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  description: string | null;
  areaHectares: string | number | null;
  status: string;
  owner?: { id: string; fullName: string; email: string };
  _count?: { zones: number; staffAssignments: number };
}

export interface FarmStaffAssignmentModel {
  id: string;
  farmId: string;
  staffId: string;
  canControlIrrigation: boolean;
  staff: AuthUser;
}

export interface ZoneModel {
  id: string;
  farmId: string;
  name: string;
  description: string | null;
  areaHectares: string | number | null;
  status: string;
  farm?: { id: string; name: string };
  _count?: { crops: number };
}

export interface CropModel {
  id: string;
  zoneId: string;
  name: string;
  variety: string | null;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  status: string;
  description: string | null;
  zone?: { id: string; name: string; farm?: { id: string; name: string } };
}

export interface DeviceModel {
  id: string;
  zoneId: string;
  deviceCode: string;
  name: string;
  type: string;
  hardwareModel: string | null;
  firmwareVersion: string | null;
  status: string;
  connectionStatus: string;
  lastSeenAt: string | null;
  description: string | null;
  zone?: { id: string; name: string; farmId: string; farm?: { id: string; name: string } };
}

export interface DeviceSummaryModel {
  total: number;
  active: number;
  online: number;
  offline: number;
  unknown: number;
}

export interface SensorReadingModel {
  id: string;
  value: number;
  source: string;
  recordedAt: string;
  receivedAt?: string;
}

export interface SensorModel {
  id: string;
  deviceId: string;
  sensorCode: string;
  name: string;
  type: 'TEMP' | 'AIR_HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT' | string;
  unit: string;
  status: string;
  description: string | null;
  latestReading: SensorReadingModel | null;
  device?: {
    id: string;
    deviceCode: string;
    name: string;
    status: string;
    zoneId: string;
    zone?: { id: string; name: string; farmId: string; farm?: { id: string; name: string } };
  };
}

export interface ZoneLatestSensorModel {
  sensorId: string;
  sensorCode: string;
  name: string;
  type: string;
  unit: string;
  value: number | null;
  recordedAt: string | null;
}

export interface SensorChartPointModel {
  timestamp: string;
  value: number;
  min: number;
  max: number;
  count: number;
}

export interface SensorStatisticsModel {
  count: number;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
  unit: string;
}

export interface ActuatorModel {
  id: string;
  deviceId: string;
  actuatorCode: string;
  name: string;
  type: string;
  status: string;
  currentState: 'ON' | 'OFF' | 'UNKNOWN' | string;
  hardwareChannel: string | null;
  description: string | null;
  lastCommandAt: string | null;
  lastStateChangedAt: string | null;
  canControl: boolean;
  controlEnabled?: boolean;
  latestCommand?: {
    id: string;
    status: string;
    command: string;
    failureReason: string | null;
  } | null;
  device?: {
    id: string;
    deviceCode: string;
    name: string;
    status: string;
    connectionStatus: string;
    zoneId: string;
    zone?: { id: string; name: string; farmId: string; farm?: { id: string; name: string } };
  };
}

export interface DeviceCommandModel {
  id: string;
  actuatorId: string;
  command: 'TURN_ON' | 'TURN_OFF' | string;
  source: 'MANUAL' | 'AUTOMATION' | string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  requestedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  actuator?: ActuatorModel;
  requestedBy?: { id: string; fullName: string; email: string } | null;
  automationRule?: { id: string; name: string } | null;
}

export interface AutomationRuleModel {
  id: string;
  name: string;
  sensorId: string;
  actuatorId: string;
  startThreshold: number;
  stopThreshold: number;
  enabled: boolean;
  description: string | null;
  lastEvaluatedAt: string | null;
  manualOverrideActive: boolean;
  manualOverrideUntil: string | null;
  sensor?: SensorModel;
  actuator?: ActuatorModel;
}

export interface AlertSummaryModel {
  active: number;
  open: number;
  acknowledged: number;
  critical: number;
  warning: number;
  resolvedToday: number;
}

export interface AlertModel {
  id: string;
  alertRuleId: string;
  sensorId: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  severitySnapshot: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  title: string;
  message: string;
  operatorSnapshot: string;
  thresholdSnapshot: number;
  recoverySnapshot: number | null;
  unitSnapshot: string;
  triggerValue: number;
  lastValue: number;
  openedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  sensor?: {
    id: string;
    sensorCode: string;
    name: string;
    device?: {
      id: string;
      name: string;
      zone?: { id: string; name: string; farm?: { id: string; name: string } };
    };
  };
}

export interface AlertRuleModel {
  id: string;
  sensorId: string;
  name: string;
  operator: 'LT' | 'LTE' | 'GT' | 'GTE' | string;
  threshold: number;
  recoveryThreshold: number | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  enabled: boolean;
  message: string | null;
  sensor?: {
    id: string;
    sensorCode: string;
    name: string;
    unit: string;
    device?: { zone?: { id: string; name: string } };
  };
}

export interface ActivityLogModel {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; role: string } | null;
  farm?: { id: string; name: string } | null;
}

export interface ReportBundleModel {
  overview: Record<string, number>;
  sensors: Array<Record<string, unknown>>;
  alerts: Record<string, number | null>;
  irrigation: Record<string, number | null>;
  automation: Record<string, unknown>;
}
