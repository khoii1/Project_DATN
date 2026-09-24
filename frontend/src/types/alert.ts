import type { DeviceStatus } from "./device";
import type { Pagination } from "./farm";
import type { SensorStatus, SensorType } from "./sensor";

export type AlertOperator = "LT" | "LTE" | "GT" | "GTE";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type AlertResolutionReason = "AUTO_RECOVERED" | "MANUAL" | "RULE_DISABLED" | "RULE_UPDATED";

export interface AlertLocation {
  id: string;
  sensorCode: string;
  name: string;
  type: SensorType;
  unit: string;
  status: SensorStatus;
  deviceId: string;
  device: { id: string; deviceCode: string; name: string; status: DeviceStatus; zoneId: string; zone: { id: string; name: string; farmId: string; farm: { id: string; name: string } } };
}

export interface AlertRule {
  id: string; sensorId: string; name: string; operator: AlertOperator; threshold: number; recoveryThreshold: number | null; message: string | null;
  severity: AlertSeverity; enabled: boolean; lastEvaluatedAt: string | null; createdAt: string; updatedAt: string;
  sensor: AlertLocation;
}

export interface Alert {
  id: string; alertRuleId: string; sensorId: string; status: AlertStatus; severitySnapshot: AlertSeverity; title: string; message: string;
  operatorSnapshot: AlertOperator; thresholdSnapshot: number; recoverySnapshot: number | null; unitSnapshot: string;
  triggerValue: number; lastValue: number; openedAt: string; lastReadingAt: string; acknowledgedAt: string | null;
  resolvedAt: string | null; resolutionReason: AlertResolutionReason | null;
  alertRule: { id: string; name: string; enabled: boolean }; sensor: AlertLocation;
  acknowledgedBy: { id: string; fullName: string; email: string } | null;
  resolvedBy: { id: string; fullName: string; email: string } | null;
}

export interface AlertSummary { active: number; open: number; acknowledged: number; critical: number; warning: number; resolvedToday: number }
export interface AlertRuleInput { sensorId: string; name: string; operator: AlertOperator; threshold: number; recoveryThreshold?: number | null; severity: AlertSeverity; message?: string | null; enabled?: boolean }
export interface Page<T> { items: T[]; pagination: Pagination }

export const severityLabels: Record<AlertSeverity, string> = { INFO: "Thông tin", WARNING: "Cảnh báo", CRITICAL: "Nghiêm trọng" };
export const statusLabels: Record<AlertStatus, string> = { OPEN: "Đang mở", ACKNOWLEDGED: "Đã xác nhận", RESOLVED: "Đã xử lý" };
export const resolutionLabels: Record<AlertResolutionReason, string> = { AUTO_RECOVERED: "Tự phục hồi", MANUAL: "Đóng thủ công", RULE_DISABLED: "Rule bị tắt", RULE_UPDATED: "Rule được cập nhật" };
export const operatorSymbols: Record<AlertOperator, string> = { LT: "<", LTE: "≤", GT: ">", GTE: "≥" };
