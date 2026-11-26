import axios from "axios";
import { tokenStorage } from "../utils/token-storage";

function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:5000/api";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi, vui lòng thử lại"): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

