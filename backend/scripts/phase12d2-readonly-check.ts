// SELECT-only diagnostic. Never imports server, gateways or command service.
import { env } from "../src/config/env";
import { prisma } from "../src/config/database";
import mqtt from "mqtt";

async function main() {
  console.log(JSON.stringify({ configuration: { commandsEnabled: env.mqttCommandsEnabled, automationEnabled: env.mqttAutomationCommandsEnabled, pumpTestMode: env.mqttPumpTestMode } }));
  if (process.argv.includes("--observe")) {
    await new Promise<void>(resolve => {
      const client = mqtt.connect(env.mqttBrokerUrl, { username: env.mqttUsername, password: env.mqttPassword,
        clientId: `phase12d2-readonly-${Date.now()}`, reconnectPeriod: 0, connectTimeout: 5000 });
      const finish = () => { clearTimeout(timer); client.end(true, {}, () => resolve()); };
      const timer = setTimeout(finish, 20000);
      client.once("error", error => { console.log(JSON.stringify({ observer: "CONNECTION_FAILED", errorType: error.name, errorCode: (error as Error & { code?: string | number }).code })); finish(); });
      client.on("connect", () => client.subscribe(["telemetry", "status", "actuator/state"].map(suffix => `${env.mqttTopicPrefix}/devices/ESP32-GF-A-01/${suffix}`), { qos: 1 }, (error, grants) => {
        console.log(JSON.stringify({ observer: "SUBSCRIBE_ONLY", granted: !error && grants?.every(grant => grant.qos !== 128) }));
      }));
      client.on("message", (topic, bytes, packet) => {
        try {
          const body = JSON.parse(bytes.toString("utf8"));
          console.log(JSON.stringify({ receivedAt: new Date().toISOString(), topic, retained: packet.retain,
            recordedAt: body.recordedAt, status: body.status, state: body.state, reason: body.reason,
            sensorCodes: Array.isArray(body.readings) ? body.readings.map((reading: { sensorCode?: string }) => reading.sensorCode) : undefined }));
        } catch { console.log("Observer received invalid JSON; payload omitted"); }
      });
    });
  }
  const snapshot = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const device = await tx.device.findUnique({ where: { deviceCode: "ESP32-GF-A-01" }, select: {
      deviceCode: true, connectionStatus: true, lastSeenAt: true,
      actuators: { where: { actuatorCode: "PUMP_01" }, select: { actuatorCode: true, currentState: true, lastStateChangedAt: true } },
      sensors: { select: { sensorCode: true, readings: { orderBy: { recordedAt: "desc" }, take: 1, select: { value: true, source: true, recordedAt: true, receivedAt: true } } } },
    } });
    const pending = await tx.deviceCommand.count({ where: { status: "PENDING" } });
    const latestCommands = await tx.deviceCommand.findMany({ where: { actuator: { actuatorCode: "PUMP_01", device: { deviceCode: "ESP32-GF-A-01" } } }, orderBy: { requestedAt: "desc" }, take: 3, select: { correlationId: true, status: true, failureReason: true, requestedAt: true } });
    return { checkedAt: new Date().toISOString(), device, pending, latestCommands };
  });
  console.log(JSON.stringify(snapshot, null, 2));
  try { const response = await fetch(`http://127.0.0.1:${env.port}/api/health`); console.log(JSON.stringify({ healthStatus: response.status, health: await response.json() })); }
  catch { console.log("Health endpoint not reachable; not claiming runtime readiness"); }
}
main().catch(error => { console.error(error instanceof Error ? error.name : "Diagnostic failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
