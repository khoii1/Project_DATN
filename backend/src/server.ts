import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { mqttClientService } from "./mqtt/mqtt-client.service";

async function bootstrap(): Promise<void> {
  const databaseConnected = await connectDatabase();

  if (databaseConnected) {
    console.log("Database: connected");
  } else {
    console.warn("Database: unavailable - check DATABASE_URL and PostgreSQL");
  }

  const server = app.listen(env.port, () => {
    console.log(`Smart Agriculture API running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });
  mqttClientService.start();

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await mqttClientService.stop();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
