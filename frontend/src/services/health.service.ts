import { api } from "./api";

export interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    database: "connected" | "disconnected";
    timestamp: string;
  };
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

