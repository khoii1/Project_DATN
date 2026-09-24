import "dotenv/config";
import mqtt from "mqtt";

const args = process.argv.slice(2);
const deviceCode = (args.find((arg) => !arg.startsWith("--")) ?? process.env.MQTT_DEVICE_USERNAME ?? "").trim().toUpperCase();
const option = (name: string, fallback: number) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const count = option("--count", 10);
const interval = option("--interval", 5000);
const brokerUrl = process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1:1883";
const username = process.env.MQTT_DEVICE_USERNAME;
const password = process.env.MQTT_DEVICE_PASSWORD;
const prefix = process.env.MQTT_TOPIC_PREFIX ?? "smart-agriculture/v1";

if (!/^[A-Z0-9_-]{3,64}$/.test(deviceCode)) throw new Error("Provide a valid deviceCode argument");
if (!username || !password) throw new Error("MQTT_DEVICE_USERNAME and MQTT_DEVICE_PASSWORD are required");
if (username.toUpperCase() !== deviceCode) throw new Error("MQTT_DEVICE_USERNAME must match deviceCode");
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(interval) || interval < 100) throw new Error("Invalid --count or --interval");

const statusTopic = `${prefix}/devices/${deviceCode}/status`;
const telemetryTopic = `${prefix}/devices/${deviceCode}/telemetry`;
const status = (value: "ONLINE" | "OFFLINE") => JSON.stringify({ schemaVersion: 1, deviceCode, status: value });
const client = mqtt.connect(brokerUrl, {
  clientId: `sim-${deviceCode}-${process.pid}`,
  username,
  password,
  clean: true,
  reconnectPeriod: 3000,
  will: { topic: statusTopic, payload: Buffer.from(status("OFFLINE")), qos: 1, retain: true },
});

const publish = (topic: string, payload: string, retain: boolean) => new Promise<void>((resolve, reject) => {
  client.publish(topic, payload, { qos: 1, retain }, (error) => error ? reject(error) : resolve());
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const soil = [40, 35, 28, 25, 45];

async function run(): Promise<void> {
  await new Promise<void>((resolve, reject) => { client.once("connect", () => resolve()); client.once("error", reject); });
  await publish(statusTopic, status("ONLINE"), true);
  console.log(`MQTT simulator ${deviceCode}: ONLINE`);
  for (let index = 0; index < count; index += 1) {
    const payload = JSON.stringify({
      schemaVersion: 1,
      deviceCode,
      recordedAt: new Date().toISOString(),
      readings: [
        { sensorCode: "TEMP_01", value: 28 + (index % 3) * 0.2 },
        { sensorCode: "HUM_01", value: 70 + (index % 3) },
        { sensorCode: "SOIL_01", value: soil[index % soil.length] },
        { sensorCode: "LIGHT_01", value: 600 + (index % 3) * 25 },
      ],
    });
    await publish(telemetryTopic, payload, false);
    console.log(`MQTT simulator ${deviceCode}: telemetry ${index + 1}/${count}`);
    if (index + 1 < count) await delay(interval);
  }
  await publish(statusTopic, status("OFFLINE"), true);
  await new Promise<void>((resolve) => client.end(false, {}, () => resolve()));
  console.log(`MQTT simulator ${deviceCode}: OFFLINE`);
}

let stopping = false;
async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  if (client.connected) await publish(statusTopic, status("OFFLINE"), true).catch(() => undefined);
  client.end(false);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
void run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); client.end(true); process.exitCode = 1; });
