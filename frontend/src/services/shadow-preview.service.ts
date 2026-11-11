import { api } from "./api";
import type { ShadowControls, ShadowPreview } from "../types/shadow-preview";

export const shadowPreviewService = {
  async get(deviceId: string, controls: ShadowControls, signal?: AbortSignal) {
    const response = await api.get<{ data: ShadowPreview }>("/shadow-preview", { params: { deviceId, ...controls }, signal });
    const data = response.data.data;
    if (!["FIXTURE", "MOCK"].includes(data.source) || data.liveVerification !== "NOT_VERIFIED" || data.decision.mode !== "SHADOW") {
      throw new Error("Nguồn preview không đúng hợp đồng mô phỏng");
    }
    return data;
  },
};
