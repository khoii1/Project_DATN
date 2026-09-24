import "dotenv/config";
import { DeviceStatus, PrismaClient, SensorReadingSource, SensorStatus, SensorType } from "@prisma/client";
import { telemetryIngestionService } from "../src/services/telemetry-ingestion.service";

const prisma = new PrismaClient();
const base = `http://127.0.0.1:${process.env.PORT ?? 5000}/api`;
const results: Array<{ test: string; status: number; passed: boolean }> = [];
function check(test: string, passed: boolean, status = passed ? 200 : 500) { results.push({ test, status, passed }); if (!passed) throw new Error(test); }
async function request(path: string, options: RequestInit = {}) { const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } }); return { status: response.status, body: await response.json() as Record<string, unknown> }; }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
async function login(email: string, password: string) { const response = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); return ((response.body.data as { accessToken: string }).accessToken); }
async function cleanup() { const farms = await prisma.farm.findMany({ where: { name: { startsWith: "QA_HISTORY_" } }, select: { id: true } }); const sensors = await prisma.sensor.findMany({ where: { sensorCode: { startsWith: "QA_SENSOR_HISTORY_" } }, select: { id: true } }); await prisma.activityLog.deleteMany({ where: { entityId: { in: [...farms.map((item) => item.id), ...sensors.map((item) => item.id)] } } }); await prisma.sensor.deleteMany({ where: { sensorCode: { startsWith: "QA_SENSOR_HISTORY_" } } }); await prisma.farm.deleteMany({ where: { name: { startsWith: "QA_HISTORY_" } } }); }

async function run() {
  await cleanup();
  const [adminToken, ownerToken, staffToken] = await Promise.all([login("admin@smartagri.local", "Admin123"), login("owner@smartagri.local", "Owner123"), login("staff@smartagri.local", "Staff123")]);
  const sensor = await prisma.sensor.create({ data: { deviceId: "demo_device_esp32_a", sensorCode: "QA_SENSOR_HISTORY_TEMP", name: "QA History Temperature", type: SensorType.TEMP } });
  const start = new Date("2032-01-01T00:00:00.000Z");
  for (let index = 0; index < 45; index += 1) { const values = [10, 20, 30, 40]; await telemetryIngestionService.ingest({ deviceCode: "ESP32-GF-A-01", recordedAt: new Date(start.getTime() + index * 10 * 60_000), source: SensorReadingSource.SIMULATOR, readings: [{ sensorCode: sensor.sensorCode, value: values[index] ?? 25 }] }); }
  const from = start.toISOString(); const to = new Date(start.getTime() + 30 * 60_000).toISOString();

  const statistics = await request(`/sensors/${sensor.id}/statistics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: bearer(adminToken) });
  const stats = statistics.body.data as { count: number; minimum: number; maximum: number; average: number; latest: { value: number } };
  check("Statistics min/max/avg/count/latest", statistics.status === 200 && stats.count === 4 && stats.minimum === 10 && stats.maximum === 40 && stats.average === 25 && stats.latest.value === 40, statistics.status);

  const page1 = await request(`/sensors/${sensor.id}/readings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(new Date(start.getTime() + 44 * 10 * 60_000).toISOString())}&page=1&limit=20`, { headers: bearer(ownerToken) });
  const page3 = await request(`/sensors/${sensor.id}/readings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(new Date(start.getTime() + 44 * 10 * 60_000).toISOString())}&page=3&limit=20`, { headers: bearer(ownerToken) });
  const firstData = page1.body.data as { items: Array<{ value: number; recordedAt: string }>; pagination: { total: number } }; const thirdData = page3.body.data as { items: unknown[] };
  check("History pagination 20/20/5", page1.status === 200 && firstData.items.length === 20 && firstData.pagination.total === 45 && thirdData.items.length === 5);
  check("History default recordedAt DESC", new Date(firstData.items[0].recordedAt) > new Date(firstData.items[1].recordedAt));

  const chart = await request(`/sensors/${sensor.id}/chart?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&resolution=30m`, { headers: bearer(staffToken) });
  const chartData = chart.body.data as { resolution: string; points: Array<{ timestamp: string; value: number; min: number; max: number; count: number }> };
  check("Bucket average/min/max/count", chart.status === 200 && chartData.points[0].value === 20 && chartData.points[0].min === 10 && chartData.points[0].max === 30 && chartData.points[0].count === 3);
  check("Bucket boundary counted once", chartData.points.length === 2 && chartData.points[1].value === 40 && chartData.points[1].count === 1);
  check("Chart recordedAt ASC", new Date(chartData.points[0].timestamp) < new Date(chartData.points[1].timestamp));

  for (const [label, days, expected] of [["Today auto", 1, "5m"], ["7 days auto", 7, "30m"], ["30 days auto", 30, "2h"]] as const) { const rangeFrom = new Date(start.getTime() - days * 86_400_000); const response = await request(`/sensors/${sensor.id}/chart?from=${encodeURIComponent(rangeFrom.toISOString())}&to=${encodeURIComponent(start.toISOString())}&resolution=auto`, { headers: bearer(adminToken) }); const data = response.body.data as { resolution: string; points: unknown[] }; check(label, response.status === 200 && data.resolution === expected && data.points.length <= 800, response.status); }

  const emptyFrom = new Date("2033-01-01T00:00:00Z").toISOString(); const emptyTo = new Date("2033-01-02T00:00:00Z").toISOString();
  const [emptyStats, emptyChart, emptyTable] = await Promise.all([request(`/sensors/${sensor.id}/statistics?from=${emptyFrom}&to=${emptyTo}`, { headers: bearer(adminToken) }), request(`/sensors/${sensor.id}/chart?from=${emptyFrom}&to=${emptyTo}`, { headers: bearer(adminToken) }), request(`/sensors/${sensor.id}/readings?from=${emptyFrom}&to=${emptyTo}`, { headers: bearer(adminToken) })]);
  const emptyStatsData = emptyStats.body.data as { count: number; minimum: null; maximum: null; average: null; latest: null }; check("Empty range null semantics", emptyStatsData.count === 0 && emptyStatsData.minimum === null && emptyStatsData.maximum === null && emptyStatsData.average === null && emptyStatsData.latest === null && (emptyChart.body.data as { points: unknown[] }).points.length === 0 && (emptyTable.body.data as { items: unknown[] }).items.length === 0);
  check("Invalid range", (await request(`/sensors/${sensor.id}/statistics?from=${emptyTo}&to=${emptyFrom}`, { headers: bearer(adminToken) })).status === 400, 400);
  check("Range over 90 days", (await request(`/sensors/${sensor.id}/chart?from=2032-01-01T00%3A00%3A00Z&to=2032-05-01T00%3A00%3A00Z`, { headers: bearer(adminToken) })).status === 400, 400);
  const demoRawFrom = new Date(Date.now() - 30 * 86_400_000).toISOString(); const demoRawTo = new Date().toISOString(); check("Raw point safety limit", (await request(`/sensors/demo_sensor_temp/chart?from=${encodeURIComponent(demoRawFrom)}&to=${encodeURIComponent(demoRawTo)}&resolution=raw`, { headers: bearer(adminToken) })).status === 400, 400);

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@smartagri.local" } }); const otherFarm = await prisma.farm.create({ data: { name: "QA_HISTORY_OTHER_FARM", ownerId: admin.id, zones: { create: { name: "QA_HISTORY_OTHER_ZONE", devices: { create: { deviceCode: "QA_HISTORY_DEVICE", name: "QA History Device", type: "CONTROLLER", sensors: { create: { sensorCode: "QA_SENSOR_HISTORY_OTHER", name: "Other History", type: SensorType.TEMP } } } } } } }, include: { zones: { include: { devices: { include: { sensors: true } } } } } });
  const otherSensor = otherFarm.zones[0].devices[0].sensors[0];
  for (const [label, path, token] of [["OWNER cross-farm readings", "readings", ownerToken], ["OWNER cross-farm chart", "chart", ownerToken], ["OWNER cross-farm statistics", "statistics", ownerToken], ["STAFF unassigned chart", "chart", staffToken]] as const) { const query = path === "readings" ? "" : `?from=${from}&to=${to}`; check(label, (await request(`/sensors/${otherSensor.id}/${path}${query}`, { headers: bearer(token) })).status === 404, 404); }
  for (const [label, path] of [["STAFF assigned readings", "readings"], ["STAFF assigned chart", "chart"], ["STAFF assigned statistics", "statistics"]] as const) { const query = path === "readings" ? `?from=${from}&to=${to}` : `?from=${from}&to=${to}`; check(label, (await request(`/sensors/${sensor.id}/${path}${query}`, { headers: bearer(staffToken) })).status === 200); }

  await prisma.sensor.update({ where: { id: sensor.id }, data: { status: SensorStatus.INACTIVE } }); check("Inactive Sensor history", (await request(`/sensors/${sensor.id}/chart?from=${from}&to=${to}`, { headers: bearer(ownerToken) })).status === 200);
  await prisma.device.update({ where: { id: "demo_device_esp32_a" }, data: { status: DeviceStatus.INACTIVE } }); check("Inactive Device history", (await request(`/sensors/${sensor.id}/statistics?from=${from}&to=${to}`, { headers: bearer(ownerToken) })).status === 200); await prisma.device.update({ where: { id: "demo_device_esp32_a" }, data: { status: DeviceStatus.ACTIVE } });
  await prisma.zone.update({ where: { id: "demo_zone_a" }, data: { status: "INACTIVE" } }); check("Inactive Zone history", (await request(`/sensors/${sensor.id}/readings?from=${from}&to=${to}`, { headers: bearer(ownerToken) })).status === 200); await prisma.zone.update({ where: { id: "demo_zone_a" }, data: { status: "ACTIVE" } });
  await prisma.farm.update({ where: { id: "demo_green_farm" }, data: { status: "INACTIVE" } }); check("Inactive Farm history", (await request(`/sensors/${sensor.id}/chart?from=${from}&to=${to}`, { headers: bearer(ownerToken) })).status === 200); await prisma.farm.update({ where: { id: "demo_green_farm" }, data: { status: "ACTIVE" } });
  check("History views create no ActivityLog", await prisma.activityLog.count({ where: { entityId: sensor.id } }) === 0);
  console.table(results); console.log(`Phase 6 history/statistics/aggregation tests passed: ${results.length}/${results.length}`);
}

run().finally(async () => { await prisma.device.updateMany({ where: { id: "demo_device_esp32_a" }, data: { status: DeviceStatus.ACTIVE } }); await prisma.zone.updateMany({ where: { id: "demo_zone_a" }, data: { status: "ACTIVE" } }); await prisma.farm.updateMany({ where: { id: "demo_green_farm" }, data: { status: "ACTIVE" } }); await cleanup(); await prisma.$disconnect(); }).catch((error) => { console.error(error); process.exitCode = 1; });
