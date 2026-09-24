import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { apiRouter } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
const developmentOrigins = [env.clientUrl];
if (env.nodeEnv === "development") {
  developmentOrigins.push("http://127.0.0.1:5173");
}

app.use(cors({ origin: developmentOrigins, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: "1mb" }));

if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use("/api", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
