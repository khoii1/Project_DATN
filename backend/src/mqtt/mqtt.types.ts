export type MqttConnectionState = "connected" | "disconnected" | "disabled";

/** Transport metadata, never part of the device JSON contract. */
export interface MqttMessageContext {
  retain: boolean;
  dup?: boolean;
  receivedAt: Date;
  qos?: number;
  observerGeneration?: number;
  observerSessionStartedAt?: Date;
}

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
