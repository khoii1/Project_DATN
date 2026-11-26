import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { apiRouter } from "./routes";

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

const configuredClientOrigins = env.clientUrl
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/+$/, "");
  if (configuredClientOrigins.includes(normalized) || configuredClientOrigins.includes("*")) {
    return callback(null, true);
  }
  if (env.allowVercelOrigins && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
    return callback(null, true);
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(normalized)) {
    return callback(null, true);
  }
  return callback(null, false);
};

app.use(cors({ origin: allowedOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: "1mb" }));

if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use("/api", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
