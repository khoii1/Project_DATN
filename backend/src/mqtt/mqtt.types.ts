export type MqttConnectionState = "connected" | "disconnected" | "disabled";

export interface MqttTelemetryPayload {
  schemaVersion: 1;
  deviceCode: string;
  recordedAt: string;
  readings: Array<{ sensorCode: string; value: number }>;
}

export interface MqttStatusPayload {
  schemaVersion: 1;
  deviceCode: string;
  status: "ONLINE" | "OFFLINE";
}
