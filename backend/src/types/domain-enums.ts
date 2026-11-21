export const UserRole = {
  ADMIN: "ADMIN",
  FARM_OWNER: "FARM_OWNER",
  STAFF: "STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ActivityAction = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGOUT: "LOGOUT",
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DEACTIVATE_USER: "DEACTIVATE_USER",
  ACTIVATE_USER: "ACTIVATE_USER",
  DELETE_USER: "DELETE_USER",
  CREATE_FARM: "CREATE_FARM",
  UPDATE_FARM: "UPDATE_FARM",
  CHANGE_FARM_STATUS: "CHANGE_FARM_STATUS",
  DELETE_FARM: "DELETE_FARM",
  ASSIGN_STAFF: "ASSIGN_STAFF",
  REMOVE_STAFF: "REMOVE_STAFF",
  CREATE_ZONE: "CREATE_ZONE",
  UPDATE_ZONE: "UPDATE_ZONE",
  CHANGE_ZONE_STATUS: "CHANGE_ZONE_STATUS",
  DELETE_ZONE: "DELETE_ZONE",
  CREATE_CROP: "CREATE_CROP",
  UPDATE_CROP: "UPDATE_CROP",
  CHANGE_CROP_STATUS: "CHANGE_CROP_STATUS",
  DELETE_CROP: "DELETE_CROP",
  CREATE_DEVICE: "CREATE_DEVICE",
  UPDATE_DEVICE: "UPDATE_DEVICE",
  CHANGE_DEVICE_STATUS: "CHANGE_DEVICE_STATUS",
  DELETE_DEVICE: "DELETE_DEVICE",
  CREATE_SENSOR: "CREATE_SENSOR",
  UPDATE_SENSOR: "UPDATE_SENSOR",
  CHANGE_SENSOR_STATUS: "CHANGE_SENSOR_STATUS",
  DELETE_SENSOR: "DELETE_SENSOR",
  CREATE_ALERT_RULE: "CREATE_ALERT_RULE",
  UPDATE_ALERT_RULE: "UPDATE_ALERT_RULE",
  ENABLE_ALERT_RULE: "ENABLE_ALERT_RULE",
  DISABLE_ALERT_RULE: "DISABLE_ALERT_RULE",
  DELETE_ALERT_RULE: "DELETE_ALERT_RULE",
  ACKNOWLEDGE_ALERT: "ACKNOWLEDGE_ALERT",
  MANUAL_RESOLVE_ALERT: "MANUAL_RESOLVE_ALERT",
  CREATE_ACTUATOR: "CREATE_ACTUATOR",
  UPDATE_ACTUATOR: "UPDATE_ACTUATOR",
  CHANGE_ACTUATOR_STATUS: "CHANGE_ACTUATOR_STATUS",
  DELETE_ACTUATOR: "DELETE_ACTUATOR",
  ISSUE_DEVICE_COMMAND: "ISSUE_DEVICE_COMMAND",
  UPDATE_STAFF_IRRIGATION_PERMISSION: "UPDATE_STAFF_IRRIGATION_PERMISSION",
  CREATE_AUTOMATION_RULE: "CREATE_AUTOMATION_RULE",
  UPDATE_AUTOMATION_RULE: "UPDATE_AUTOMATION_RULE",
  ENABLE_AUTOMATION_RULE: "ENABLE_AUTOMATION_RULE",
  DISABLE_AUTOMATION_RULE: "DISABLE_AUTOMATION_RULE",
  DELETE_AUTOMATION_RULE: "DELETE_AUTOMATION_RULE",
} as const;
export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];

export const FarmStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type FarmStatus = (typeof FarmStatus)[keyof typeof FarmStatus];

export const ZoneStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type ZoneStatus = (typeof ZoneStatus)[keyof typeof ZoneStatus];

export const CropStatus = {
  PLANNED: "PLANNED",
  GROWING: "GROWING",
  HARVESTED: "HARVESTED",
  CANCELLED: "CANCELLED",
} as const;
export type CropStatus = (typeof CropStatus)[keyof typeof CropStatus];

export const DeviceType = {
  CONTROLLER: "CONTROLLER",
  GATEWAY: "GATEWAY",
  OTHER: "OTHER",
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export const DeviceStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
} as const;
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

export const DeviceConnectionStatus = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  UNKNOWN: "UNKNOWN",
} as const;
export type DeviceConnectionStatus = (typeof DeviceConnectionStatus)[keyof typeof DeviceConnectionStatus];

export const SensorType = {
  TEMP: "TEMP",
  AIR_HUMIDITY: "AIR_HUMIDITY",
  SOIL_MOISTURE: "SOIL_MOISTURE",
  LIGHT: "LIGHT",
} as const;
export type SensorType = (typeof SensorType)[keyof typeof SensorType];

export const SensorStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type SensorStatus = (typeof SensorStatus)[keyof typeof SensorStatus];

export const SensorReadingSource = {
  SIMULATOR: "SIMULATOR",
  MQTT: "MQTT",
} as const;
export type SensorReadingSource = (typeof SensorReadingSource)[keyof typeof SensorReadingSource];

export const AlertOperator = {
  LT: "LT",
  LTE: "LTE",
  GT: "GT",
  GTE: "GTE",
} as const;
export type AlertOperator = (typeof AlertOperator)[keyof typeof AlertOperator];

export const AlertSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertStatus = {
  OPEN: "OPEN",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

export const AlertResolutionReason = {
  AUTO_RECOVERED: "AUTO_RECOVERED",
  MANUAL: "MANUAL",
  RULE_DISABLED: "RULE_DISABLED",
  RULE_UPDATED: "RULE_UPDATED",
} as const;
export type AlertResolutionReason = (typeof AlertResolutionReason)[keyof typeof AlertResolutionReason];

export const ActuatorType = {
  PUMP: "PUMP",
  VALVE: "VALVE",
  RELAY: "RELAY",
  OTHER: "OTHER",
} as const;
export type ActuatorType = (typeof ActuatorType)[keyof typeof ActuatorType];

export const ActuatorStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
} as const;
export type ActuatorStatus = (typeof ActuatorStatus)[keyof typeof ActuatorStatus];

export const ActuatorState = {
  ON: "ON",
  OFF: "OFF",
  UNKNOWN: "UNKNOWN",
} as const;
export type ActuatorState = (typeof ActuatorState)[keyof typeof ActuatorState];

export const DeviceCommandType = {
  TURN_ON: "TURN_ON",
  TURN_OFF: "TURN_OFF",
} as const;
export type DeviceCommandType = (typeof DeviceCommandType)[keyof typeof DeviceCommandType];

export const DeviceCommandSource = {
  MANUAL: "MANUAL",
  AUTOMATION: "AUTOMATION",
} as const;
export type DeviceCommandSource = (typeof DeviceCommandSource)[keyof typeof DeviceCommandSource];

export const DeviceCommandStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
export type DeviceCommandStatus = (typeof DeviceCommandStatus)[keyof typeof DeviceCommandStatus];
