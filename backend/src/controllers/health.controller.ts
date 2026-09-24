import type { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service";

export async function healthCheck(_request: Request, response: Response): Promise<void> {
  const status = await getHealthStatus();
  const databaseConnected = status.database === "connected";

  response.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? "Smart Agriculture API is running"
      : "Smart Agriculture API is running, but the database is unavailable",
    data: status,
  });
}

