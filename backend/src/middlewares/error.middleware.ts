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

  const message = error instanceof Error ? error.message : "Something went wrong";

  response.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : message,
  });
};
