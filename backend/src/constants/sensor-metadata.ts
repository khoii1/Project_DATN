import { SensorType } from "@prisma/client";
export const SENSOR_TYPE_METADATA: Record<SensorType, { label: string; unit: string; min: number; max: number }> = {
  TEMP: { label: "Nhiệt độ", unit: "°C", min: -100, max: 150 },
  AIR_HUMIDITY: { label: "Độ ẩm không khí", unit: "%", min: 0, max: 100 },
  SOIL_MOISTURE: { label: "Độ ẩm đất", unit: "%", min: 0, max: 100 },
  LIGHT: { label: "Ánh sáng", unit: "lux", min: 0, max: 200000 },
};

