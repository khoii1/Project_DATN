import type { DeviceStatus } from "./device";
import type { Pagination } from "./farm";

export type SensorType = "TEMP" | "AIR_HUMIDITY" | "SOIL_MOISTURE" | "LIGHT";
export type SensorStatus = "ACTIVE" | "INACTIVE";
export type SensorReadingSource = "SIMULATOR" | "MQTT";
export type SensorChartResolution = "auto" | "raw" | "5m" | "15m" | "30m" | "1h" | "2h" | "6h" | "1d";
export interface SensorReading { id: string; value: number; unit?: string; source: SensorReadingSource; recordedAt: string; receivedAt: string }
export interface Sensor { id: string; deviceId: string; sensorCode: string; name: string; type: SensorType; unit: string; label: string; status: SensorStatus; description: string | null; createdAt: string; updatedAt: string; latestReading: SensorReading | null; device: { id: string; deviceCode: string; name: string; status: DeviceStatus; zoneId: string; zone: { id: string; name: string; farmId: string; farm: { id: string; name: string; ownerId: string; status: string } } } }
export interface SensorSummary { total: number; active: number; inactive: number; withData: number; withoutData: number }
export interface ZoneLatestReading { sensorId: string; sensorCode: string; name: string; type: SensorType; unit: string; value: number | null; recordedAt: string | null }
export interface SensorHistoryQuery { from: string; to: string; page?: number; limit?: 10 | 20 | 50 | 100; sort?: "asc" | "desc" }
export interface SensorReadingPage { sensor: Pick<Sensor, "id" | "sensorCode" | "name" | "type" | "unit">; items: SensorReading[]; pagination: Pagination }
export interface SensorChartPoint { timestamp: string; value: number; min: number; max: number; count: number }
export interface SensorChartResponse { sensor: Pick<Sensor, "id" | "sensorCode" | "name" | "type" | "unit">; range: { from: string; to: string }; resolution: Exclude<SensorChartResolution, "auto">; points: SensorChartPoint[] }
export interface SensorStatistics { sensorId: string; unit: string; from: string; to: string; count: number; minimum: number | null; maximum: number | null; average: number | null; latest: { value: number; recordedAt: string } | null }
export const sensorMetadata: Record<SensorType, { label: string; unit: string }> = { TEMP: { label: "Nhiệt độ", unit: "°C" }, AIR_HUMIDITY: { label: "Độ ẩm không khí", unit: "%" }, SOIL_MOISTURE: { label: "Độ ẩm đất", unit: "%" }, LIGHT: { label: "Ánh sáng", unit: "lux" } };
