import { prisma } from "../config/database";
import { mqttClientService } from "../mqtt/mqtt-client.service";

export interface HealthStatus {
  database: "connected" | "disconnected";
  mqtt: "connected" | "disconnected" | "disabled";
  timestamp: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { database: "connected", mqtt: mqttClientService.connectionState, timestamp: new Date().toISOString() };
  } catch {
    return { database: "disconnected", mqtt: mqttClientService.connectionState, timestamp: new Date().toISOString() };
  }
}
