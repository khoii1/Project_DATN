// Bounded passive probe only: subscribe MQTT, SELECT PostgreSQL, no publish/ingest.
import { env } from "../src/config/env";
import { prisma } from "../src/config/database";
import mqtt from "mqtt";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  if (env.mqttCommandsEnabled || env.mqttAutomationCommandsEnabled || !env.mqttPumpTestMode) throw new Error("SAFETY_FLAGS_MISMATCH_STOP");
  const endpoint = new URL(env.mqttBrokerUrl!);
  console.log(JSON.stringify({ observer: "SUBSCRIBE_ONLY_40_SECONDS", host: endpoint.hostname, port: endpoint.port || "1883" }));
  const startedAt = new Date();
  const packets: Array<{ receivedAt: string; topic: string; retained: boolean; duplicate: boolean; qos: number; digest: string; body: any }> = [];
  await new Promise<void>((done, reject) => {
    const client = mqtt.connect(env.mqttBrokerUrl!, { username: env.mqttUsername, password: env.mqttPassword,
      clientId: `phase13-3c-passive-${Date.now()}`, reconnectPeriod: 0, connectTimeout: 5000 });
    const timer = setTimeout(() => client.end(true, {}, done), 40000);
    client.once("error", () => { clearTimeout(timer); client.end(true); reject(new Error("PASSIVE_PROBE_FAILED")); });
    client.once("connect", () => client.subscribe(["telemetry", "status", "actuator/state"].map(suffix => `${env.mqttTopicPrefix}/devices/ESP32-GF-A-01/${suffix}`), { qos: 1 }, (error, grants) => {
      if (error || grants?.length !== 3 || grants.some(grant => Number(grant.qos) > 2)) { clearTimeout(timer); client.end(true); reject(new Error("SUBSCRIPTION_DENIED")); }
    }));
    client.on("message", (topic, bytes, packet) => {
      try {
        const raw = JSON.parse(bytes.toString("utf8"));
        const body = { deviceCode: raw.deviceCode, actuatorCode: raw.actuatorCode, recordedAt: raw.recordedAt, state: raw.state, reason: raw.reason, status: raw.status,
          readings: Array.isArray(raw.readings) ? raw.readings.map((r: any) => ({ sensorCode: r.sensorCode, value: r.value })) : undefined };
        const evidence = { receivedAt: new Date().toISOString(), topic, retained: packet.retain, duplicate: !!packet.dup, qos: packet.qos,
          digest: createHash("sha256").update(bytes).digest("hex"), body };
        if (packets.length < 100) packets.push(evidence);
        console.log(JSON.stringify(evidence));
      } catch { console.log("INVALID_JSON_OMITTED"); }
    });
  });
  const live = packets.filter(p => !p.retained && !p.duplicate);
  const telemetry = live.filter(p => p.topic.endsWith("/telemetry") && Number.isFinite(Date.parse(p.body.recordedAt)));
  const database = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const batches = [];
    for (const packet of telemetry) {
      const rows = await tx.sensorReading.findMany({ where: { recordedAt: new Date(packet.body.recordedAt), source: "MQTT", sensor: { device: { deviceCode: "ESP32-GF-A-01" } } },
        select: { id: true, value: true, source: true, recordedAt: true, receivedAt: true, sensor: { select: { sensorCode: true } } } });
      const expected = ["TEMP_01", "HUM_01", "LIGHT_01", "SOIL_01"];
      batches.push({ recordedAt: packet.body.recordedAt, allFourMatch: expected.every(code => {
        const row = rows.find(r => r.sensor.sensorCode === code), sent = packet.body.readings?.find((r: any) => r.sensorCode === code);
        return !!row && !!sent && row.value === sent.value;
      }), rows });
    }
    const device = await tx.device.findUnique({ where: { deviceCode: "ESP32-GF-A-01" }, select: { deviceCode: true, connectionStatus: true, lastSeenAt: true,
      actuators: { where: { actuatorCode: "PUMP_01" }, select: { currentState: true, lastStateChangedAt: true } } } });
    const pending = await tx.deviceCommand.count({ where: { status: "PENDING" } });
    return { batches, device, pending };
  });
  const output = resolve(__dirname, "../../report/phase13_3c"); mkdirSync(output, { recursive: true });
  const evidence = { startedAt: startedAt.toISOString(), endedAt: new Date().toISOString(), backendFlagsFromDiagnostic: { commands: false, automation: false, testMode: true }, packets, database,
    periodicOff: live.filter(p => p.topic.endsWith("/actuator/state") && p.body.state === "OFF" && p.body.reason === "PERIODIC"),
    productionDatabaseManuallyMutated: false, mqttPublished: false };
  writeFileSync(resolve(output, "mqtt-postgresql-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ complete: true, batchesObserved: telemetry.length, batchesMatched: database.batches.filter(b => b.allFourMatch).length, online: database.device?.connectionStatus, pending: database.pending }));
}
main().catch(() => { console.error("READ_ONLY_VERIFICATION_FAILED_DETAILS_REDACTED"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
