import "dotenv/config";
import mqtt, { type MqttClient } from "mqtt";
import { ActuatorState, ActuatorStatus, ActuatorType, AlertOperator, AlertSeverity, DeviceConnectionStatus, DeviceType, SensorReadingSource, SensorType } from "@prisma/client";
import { prisma } from "../src/config/database";

const brokerUrl = process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1:1883";
const username = process.env.MQTT_DEVICE_USERNAME;
const password = process.env.MQTT_DEVICE_PASSWORD;
const deviceCode = (username ?? "QA_MQTT_DEVICE").toUpperCase();
const prefix = process.env.MQTT_TOPIC_PREFIX ?? "smart-agriculture/v1";
const base = `http://127.0.0.1:${process.env.PORT ?? 5000}/api`;
if (!username || !password) throw new Error("MQTT_DEVICE_USERNAME and MQTT_DEVICE_PASSWORD are required");
const results: string[] = [];
function ok(condition: unknown, label: string): asserts condition { if (!condition) throw new Error(`FAILED: ${label}`); results.push(label); }
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const connect = (options: Parameters<typeof mqtt.connect>[1]) => new Promise<MqttClient>((resolve, reject) => { const client = mqtt.connect(brokerUrl, options); client.once("connect", () => resolve(client)); client.once("error", reject); });
const publish = (client: MqttClient, topic: string, payload: string | Buffer, retain = false) => new Promise<void>((resolve, reject) => client.publish(topic, payload, { qos: 1, retain }, (error) => error ? reject(error) : resolve()));
const close = (client: MqttClient) => new Promise<void>((resolve) => client.end(false, {}, () => resolve()));
async function cleanup() { const farms = await prisma.farm.findMany({ where: { name: { startsWith: "QA_MQTT_" } }, select: { id: true } }); await prisma.farm.deleteMany({ where: { id: { in: farms.map((farm) => farm.id) } } }); }

async function run(): Promise<void> {
  await cleanup();
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@smartagri.local" } });
  const farm = await prisma.farm.create({ data: { ownerId: owner.id, name: "QA_MQTT_FARM" } });
  const zone = await prisma.zone.create({ data: { farmId: farm.id, name: "QA_MQTT_ZONE" } });
  const device = await prisma.device.create({ data: { zoneId: zone.id, deviceCode, name: "QA MQTT Device", type: DeviceType.CONTROLLER } });
  const temp = await prisma.sensor.create({ data: { deviceId: device.id, sensorCode: "TEMP_01", name: "QA temperature", type: SensorType.TEMP } });
  const soil = await prisma.sensor.create({ data: { deviceId: device.id, sensorCode: "SOIL_01", name: "QA soil", type: SensorType.SOIL_MOISTURE } });
  const pump = await prisma.actuator.create({ data: { deviceId: device.id, actuatorCode: "PUMP_01", name: "QA pump", type: ActuatorType.PUMP, status: ActuatorStatus.ACTIVE, currentState: ActuatorState.OFF } });
  const alertRule = await prisma.alertRule.create({ data: { sensorId: temp.id, name: "QA MQTT hot", operator: AlertOperator.GT, threshold: 30, recoveryThreshold: 28, severity: AlertSeverity.WARNING, createdById: owner.id } });
  const automationRule = await prisma.automationRule.create({ data: { sensorId: soil.id, actuatorId: pump.id, name: "QA MQTT irrigation", startThreshold: 30, stopThreshold: 45, createdById: owner.id } });
  ok(Boolean(device && temp && soil), "QA resources created without simulator DB insertion");
  const telemetryTopic = `${prefix}/devices/${deviceCode}/telemetry`; const statusTopic = `${prefix}/devices/${deviceCode}/status`;
  const client = await connect({ clientId: `phase11-test-${process.pid}`, username, password, clean: true, reconnectPeriod: 0 });
  ok(client.connected, "device authenticates with broker");
  const at = new Date(Date.now() - 1500);
  const payload = JSON.stringify({ schemaVersion: 1, deviceCode, recordedAt: at.toISOString(), readings: [{ sensorCode: "TEMP_01", value: 35 }, { sensorCode: "SOIL_01", value: 25 }] });
  await publish(client, telemetryTopic, payload); await wait(700);
  const readings = await prisma.sensorReading.findMany({ where: { sensorId: { in: [temp.id, soil.id] }, recordedAt: at } });
  ok(readings.length === 2 && readings.every((item) => item.source === SensorReadingSource.MQTT), "fresh QoS1 telemetry persists with MQTT source");
  ok(await prisma.alert.count({ where: { alertRuleId: alertRule.id } }) === 1, "fresh MQTT telemetry runs AlertEvaluationService");
  ok(await prisma.deviceCommand.count({ where: { automationRuleId: automationRule.id, source: "AUTOMATION" } }) === 1 && (await prisma.actuator.findUniqueOrThrow({ where: { id: pump.id } })).currentState === "ON", "fresh MQTT telemetry runs automation through MockDeviceGateway");
  await publish(client, telemetryTopic, payload); await wait(400);
  ok(await prisma.sensorReading.count({ where: { sensorId: { in: [temp.id, soil.id] }, recordedAt: at } }) === 2 && await prisma.deviceCommand.count({ where: { automationRuleId: automationRule.id } }) === 1, "duplicate delivery has no duplicate reading or side effect");
  const offAt = new Date();
  await publish(client, telemetryTopic, JSON.stringify({ schemaVersion: 1, deviceCode, recordedAt: offAt.toISOString(), readings: [{ sensorCode: "TEMP_01", value: 25 }, { sensorCode: "SOIL_01", value: 50 }] })); await wait(600);
  ok(await prisma.deviceCommand.count({ where: { automationRuleId: automationRule.id } }) === 2 && (await prisma.actuator.findUniqueOrThrow({ where: { id: pump.id } })).currentState === "OFF", "fresh MQTT recovery issues TURN_OFF through MockDeviceGateway");
  const staleAt = new Date(Date.now() - 30 * 60_000); const before = { alerts: await prisma.alert.count({ where: { alertRuleId: alertRule.id } }), commands: await prisma.deviceCommand.count({ where: { automationRuleId: automationRule.id } }) };
  await publish(client, telemetryTopic, JSON.stringify({ schemaVersion: 1, deviceCode, recordedAt: staleAt.toISOString(), readings: [{ sensorCode: "TEMP_01", value: 40 }, { sensorCode: "SOIL_01", value: 20 }] })); await wait(500);
  ok(await prisma.sensorReading.count({ where: { sensorId: { in: [temp.id, soil.id] }, recordedAt: staleAt } }) === 2 && before.alerts === await prisma.alert.count({ where: { alertRuleId: alertRule.id } }) && before.commands === await prisma.deviceCommand.count({ where: { automationRuleId: automationRule.id } }), "stale history is stored without operational side effects");
  const mutationBefore = await prisma.sensorReading.count({ where: { sensorId: { in: [temp.id, soil.id] } } });
  await publish(client, telemetryTopic, "not-json");
  await publish(client, telemetryTopic, JSON.stringify({ schemaVersion: 1, deviceCode: "OTHER_DEVICE", recordedAt: new Date().toISOString(), readings: [{ sensorCode: "TEMP_01", value: 20 }] }));
  await publish(client, telemetryTopic, JSON.stringify({ schemaVersion: 1, deviceCode, recordedAt: new Date().toISOString(), readings: [{ sensorCode: "UNKNOWN_01", value: 20 }] }));
  await publish(client, telemetryTopic, JSON.stringify({ schemaVersion: 1, deviceCode, recordedAt: new Date().toISOString(), readings: [{ sensorCode: "TEMP_01", value: 151 }] }));
  await publish(client, telemetryTopic, Buffer.alloc(33_000, 65)); await wait(500);
  ok(client.connected && mutationBefore === await prisma.sensorReading.count({ where: { sensorId: { in: [temp.id, soil.id] } } }), "invalid JSON/topic/sensor/range/oversize are rejected safely");
  await publish(client, statusTopic, JSON.stringify({ schemaVersion: 1, deviceCode, status: "ONLINE" }), true); await wait(350);
  ok((await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).connectionStatus === DeviceConnectionStatus.ONLINE, "retained ONLINE birth updates presence");
  await publish(client, statusTopic, JSON.stringify({ schemaVersion: 1, deviceCode, status: "OFFLINE" }), true); await wait(350);
  ok((await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).connectionStatus === DeviceConnectionStatus.OFFLINE, "OFFLINE updates presence");
  const lwt = await connect({ clientId: `phase11-lwt-${process.pid}`, username, password, clean: true, reconnectPeriod: 0, will: { topic: statusTopic, payload: Buffer.from(JSON.stringify({ schemaVersion: 1, deviceCode, status: "OFFLINE" })), qos: 1, retain: true } });
  await publish(lwt, statusTopic, JSON.stringify({ schemaVersion: 1, deviceCode, status: "ONLINE" }), true); await wait(300); lwt.stream.destroy(); await wait(700);
  ok((await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).connectionStatus === DeviceConnectionStatus.OFFLINE, "abrupt disconnect LWT marks device OFFLINE");
  const login = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@smartagri.local", password: "Owner123" }) }); const token = ((await login.json()) as any).data.accessToken as string;
  const from = new Date(staleAt.getTime() - 1000).toISOString(); const to = new Date(Date.now() + 60_000).toISOString();
  const overview = await fetch(`${base}/reports/overview?from=${from}&to=${to}&farmId=${farm.id}`, { headers: { Authorization: `Bearer ${token}` } }); const report = (await overview.json()) as any;
  const csvResponse = await fetch(`${base}/reports/export?type=sensor-readings&from=${from}&to=${to}&farmId=${farm.id}`, { headers: { Authorization: `Bearer ${token}` } }); const csv = await csvResponse.text();
  ok(overview.ok && report.data.sensorReadingCount === 6 && csvResponse.ok && csv.includes("MQTT"), "MQTT readings appear in reports and CSV source");
  const health = await fetch(`${base}/health`); const healthBody = (await health.json()) as any;
  ok(health.ok && healthBody.data.mqtt === "connected", "health endpoint reports MQTT connected");
  await close(client);
  console.log(`Phase 11 MQTT integration: ${results.length}/${results.length} passed`); results.forEach((label) => console.log(`PASS ${label}`));
}

void run().finally(async () => { await cleanup(); await prisma.$disconnect(); }).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
