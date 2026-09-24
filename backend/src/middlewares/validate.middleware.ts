import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type RequestSource = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, source: RequestSource = "body") {
  return (request: Request, response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const errors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]),
      );
      response.status(400).json({ success: false, message: "Dữ liệu không hợp lệ", errors });
      return;
    }
    const target = request[source] as Record<string, unknown>;
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, result.data);
    next();
  };
}
