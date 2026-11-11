import { recoverMqttCommands } from "./mqtt/mqtt-pump-state.adapter";
import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { mqttClientService } from "./mqtt/mqtt-client.service";
import { presenceWatchdog } from "./services/presence-watchdog.service";
import { pumpRuntimeLimit } from "./services/pump-command-policy";

async function bootstrap(): Promise<void> {
  const databaseConnected = await connectDatabase();

  if (databaseConnected) {
    console.log("Database: connected");
  } else {
    console.warn("Database: unavailable - check DATABASE_URL and PostgreSQL");
  }

  if (env.mqttCommandsEnabled && !databaseConnected) throw new Error("MQTT command recovery requires database");
  if (databaseConnected) await recoverMqttCommands();
  const server = app.listen(env.port, () => {
    console.log(`Smart Agriculture API running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
    // Attest the serving process's safety policy, never credentials or raw env.
    console.log(`MQTT pump safety runtime: ${JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      testMode: env.mqttPumpTestMode,
      effectiveMaxRunSeconds: pumpRuntimeLimit(env.mqttPumpMaxRunSeconds, env.mqttPumpTestMode),
      commandsEnabled: env.mqttCommandsEnabled,
      automationEnabled: env.mqttAutomationCommandsEnabled,
    })}`);
  });
  mqttClientService.start();
  if (env.mqttEnabled) presenceWatchdog.start();

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await presenceWatchdog.stop();
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
