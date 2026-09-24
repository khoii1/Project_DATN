import type { Actuator, DeviceCommand } from "./actuator";
import type { Sensor } from "./sensor";
import type { Pagination } from "./farm";

export interface AutomationRule {
  id: string; name: string; sensorId: string; actuatorId: string; startThreshold: number; stopThreshold: number; enabled: boolean; lastEvaluatedAt: string | null; lastCommandAttemptAt: string | null; description: string | null; createdAt: string; updatedAt: string;
  sensor: Omit<Sensor, "latestReading"> & { latestReading: { id: string; value: number; recordedAt: string } | null };
  actuator: Actuator;
  latestAutomationCommand: DeviceCommand | null;
  manualOverrideActive: boolean;
  manualOverrideUntil: string | null;
}
export interface AutomationRuleInput { name: string; sensorId: string; actuatorId: string; startThreshold: number; stopThreshold: number; enabled?: boolean; description?: string | null }
export interface AutomationRulePage { items: AutomationRule[]; pagination: Pagination }
