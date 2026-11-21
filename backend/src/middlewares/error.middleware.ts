import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    });
    return;
  }

  console.error("[Unhandled API Error]", error);
  const raw = error instanceof Error ? error.message : "";
  const isDbConnection =
    raw.includes("Can't reach database server") ||
    raw.includes("PrismaClientInitializationError") ||
    raw.includes("pool timeout");

  response.status(500).json({
    success: false,
    message: isDbConnection
      ? "Kết nối cơ sở dữ liệu đang bận, vui lòng thử lại sau giây lát."
      : "Hệ thống đang xử lý hoặc tạm bận, vui lòng thử lại sau.",
  });
};
