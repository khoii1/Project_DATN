import "dotenv/config";
import {
  DeviceStatus,
  PrismaClient,
  SensorReadingSource,
} from "@prisma/client";
import { telemetryIngestionService } from "../src/services/telemetry-ingestion.service";
const prisma = new PrismaClient();
const base = `http://127.0.0.1:${process.env.PORT ?? 5000}/api`;
const results: Array<{ test: string; status: number; passed: boolean }> = [];
const check = (test: string, status: number, expected: number) => {
  const passed = status === expected;
  results.push({ test, status, passed });
  if (!passed) throw new Error(`${test}: ${status} != ${expected}`);
};
async function req(path: string, o: RequestInit = {}) {
  const r = await fetch(`${base}${path}`, {
    ...o,
    headers: { "Content-Type": "application/json", ...o.headers },
  });
  return { status: r.status, body: (await r.json()) as any };
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function login(email: string, password: string) {
  return (
    await req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  ).body.data.accessToken as string;
}
async function rejects(test: string, fn: () => Promise<unknown>) {
  let ok = false;
  try {
    await fn();
  } catch {
    ok = true;
  }
  if (!ok) throw new Error(`${test}: expected rejection`);
  results.push({ test, status: 400, passed: true });
}
async function cleanup() {
  const sensors = await prisma.sensor.findMany({
    where: { sensorCode: { startsWith: "QA_SENSOR_" } },
    select: { id: true },
  });
  const devices = await prisma.device.findMany({
    where: { deviceCode: { startsWith: "QA_DEVICE_SENSOR_" } },
    select: { id: true, sensors: { select: { id: true } } },
  });
  const farms = await prisma.farm.findMany({
    where: { name: { startsWith: "QA_SENSOR_" } },
    select: {
      id: true,
      zones: {
        select: {
          id: true,
          devices: { select: { id: true, sensors: { select: { id: true } } } },
        },
      },
    },
  });
  const ids = [
    ...sensors.map((x) => x.id),
    ...devices.flatMap((d) => [d.id, ...d.sensors.map((s) => s.id)]),
    ...farms.flatMap((f) => [
      f.id,
      ...f.zones.flatMap((z) => [
        z.id,
        ...z.devices.flatMap((d) => [d.id, ...d.sensors.map((s) => s.id)]),
      ]),
    ]),
  ];
  await prisma.activityLog.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.sensor.deleteMany({
    where: { sensorCode: { startsWith: "QA_SENSOR_" } },
  });
  await prisma.device.deleteMany({
    where: { deviceCode: { startsWith: "QA_DEVICE_SENSOR_" } },
  });
  await prisma.farm.deleteMany({
    where: { name: { startsWith: "QA_SENSOR_" } },
  });
}
async function run() {
  await cleanup();
  const [admin, owner, staff] = await Promise.all([
    login("admin@smartagri.local", "Admin123"),
    login("owner@smartagri.local", "Owner123"),
    login("staff@smartagri.local", "Staff123"),
  ]);
  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@smartagri.local" },
  });
  const farm = await prisma.farm.create({
    data: { name: "QA_SENSOR_OTHER_FARM", ownerId: adminUser.id },
  });
  const zone = await prisma.zone.create({
    data: { name: "QA_SENSOR_OTHER_ZONE", farmId: farm.id },
  });
  const device = await prisma.device.create({
    data: {
      deviceCode: "QA_DEVICE_SENSOR_OTHER",
      name: "QA Other ESP32",
      type: "CONTROLLER",
      zoneId: zone.id,
    },
  });
  const create = await req("/sensors", {
    method: "POST",
    headers: bearer(owner),
    body: JSON.stringify({
      deviceId: "demo_device_esp32_a",
      sensorCode: " qa_sensor_temp ",
      name: "QA nhiệt độ",
      type: "TEMP",
    }),
  });
  check("OWNER create own Sensor", create.status, 201);
  const sensor = create.body.data.sensor;
  if (sensor.sensorCode !== "QA_SENSOR_TEMP" || sensor.unit !== "°C")
    throw new Error("Sensor normalize/unit failed");
  results.push({
    test: "Normalize code and derive unit",
    status: 200,
    passed: true,
  });
  check(
    "Duplicate normalized Sensor",
    (
      await req("/sensors", {
        method: "POST",
        headers: bearer(owner),
        body: JSON.stringify({
          deviceId: "demo_device_esp32_a",
          sensorCode: "qa_sensor_temp",
          name: "Duplicate",
          type: "TEMP",
        }),
      })
    ).status,
    409,
  );
  const other = await req("/sensors", {
    method: "POST",
    headers: bearer(admin),
    body: JSON.stringify({
      deviceId: device.id,
      sensorCode: "QA_SENSOR_TEMP",
      name: "Same code other device",
      type: "TEMP",
    }),
  });
  check("Same code different Device", other.status, 201);
  const otherId = other.body.data.sensor.id;
  check(
    "ADMIN list Sensors",
    (await req("/sensors", { headers: bearer(admin) })).status,
    200,
  );
  check(
    "OWNER detail own Sensor",
    (await req(`/sensors/${sensor.id}`, { headers: bearer(owner) })).status,
    200,
  );
  check(
    "OWNER update own Sensor",
    (
      await req(`/sensors/${sensor.id}`, {
        method: "PATCH",
        headers: bearer(owner),
        body: JSON.stringify({ description: "Đã sửa" }),
      })
    ).status,
    200,
  );
  check(
    "OWNER cross-farm detail blocked",
    (await req(`/sensors/${otherId}`, { headers: bearer(owner) })).status,
    404,
  );
  check(
    "OWNER cross-farm update blocked",
    (
      await req(`/sensors/${otherId}`, {
        method: "PATCH",
        headers: bearer(owner),
        body: JSON.stringify({ name: "Leak" }),
      })
    ).status,
    404,
  );
  check(
    "OWNER cross-farm create blocked",
    (
      await req("/sensors", {
        method: "POST",
        headers: bearer(owner),
        body: JSON.stringify({
          deviceId: device.id,
          sensorCode: "QA_SENSOR_CROSS",
          name: "Cross",
          type: "LIGHT",
        }),
      })
    ).status,
    404,
  );
  check(
    "STAFF assigned detail",
    (await req(`/sensors/${sensor.id}`, { headers: bearer(staff) })).status,
    200,
  );
  check(
    "STAFF unassigned detail blocked",
    (await req(`/sensors/${otherId}`, { headers: bearer(staff) })).status,
    404,
  );
  check(
    "STAFF create forbidden",
    (
      await req("/sensors", {
        method: "POST",
        headers: bearer(staff),
        body: JSON.stringify({
          deviceId: "demo_device_esp32_a",
          sensorCode: "QA_SENSOR_STAFF",
          name: "Staff",
          type: "LIGHT",
        }),
      })
    ).status,
    403,
  );
  check(
    "STAFF update forbidden",
    (
      await req(`/sensors/${sensor.id}`, {
        method: "PATCH",
        headers: bearer(staff),
        body: JSON.stringify({ name: "Staff" }),
      })
    ).status,
    403,
  );
  for (const field of [
    { sensorCode: "CHANGED" },
    { deviceId: device.id },
    { type: "LIGHT" },
  ])
    check(
      `Immutable ${Object.keys(field)[0]}`,
      (
        await req(`/sensors/${sensor.id}`, {
          method: "PATCH",
          headers: bearer(owner),
          body: JSON.stringify(field),
        })
      ).status,
      400,
    );
  const t10 = new Date("2031-01-01T10:10:00Z"),
    t05 = new Date("2031-01-01T10:05:00Z");
  const logBefore = await prisma.activityLog.count();
  const first = await telemetryIngestionService.ingest({
    deviceCode: "ESP32-GF-A-01",
    recordedAt: t10,
    source: SensorReadingSource.SIMULATOR,
    readings: [{ sensorCode: "QA_SENSOR_TEMP", value: 29 }],
  });
  if (first.created !== 1) throw new Error("Telemetry create failed");
  results.push({
    test: "Telemetry ingestion",
    status: first.created,
    passed: true,
  });
  const duplicate = await telemetryIngestionService.ingest({
    deviceCode: "ESP32-GF-A-01",
    recordedAt: t10,
    source: SensorReadingSource.SIMULATOR,
    readings: [{ sensorCode: "QA_SENSOR_TEMP", value: 29 }],
  });
  if (duplicate.created !== 0 || duplicate.duplicates !== 1)
    throw new Error("Telemetry idempotency failed");
  results.push({
    test: "Duplicate telemetry idempotent",
    status: duplicate.duplicates,
    passed: true,
  });
  await telemetryIngestionService.ingest({
    deviceCode: "ESP32-GF-A-01",
    recordedAt: t05,
    source: SensorReadingSource.SIMULATOR,
    readings: [{ sensorCode: "QA_SENSOR_TEMP", value: 28 }],
  });
  const readings = await req(`/sensors/${sensor.id}/readings?limit=10`, {
    headers: bearer(owner),
  });
  check("OWNER read readings", readings.status, 200);
  if (readings.body.data.items[0].recordedAt !== t10.toISOString())
    throw new Error("Latest/out-of-order ordering failed");
  results.push({ test: "Latest uses recordedAt", status: 200, passed: true });
  const deviceAfter = await prisma.device.findUniqueOrThrow({
    where: { id: "demo_device_esp32_a" },
  });
  if (deviceAfter.connectionStatus !== "ONLINE" || !deviceAfter.lastSeenAt)
    throw new Error("Presence not updated");
  results.push({
    test: "Telemetry updates presence",
    status: 200,
    passed: true,
  });
  if ((await prisma.activityLog.count()) !== logBefore)
    throw new Error("Telemetry flooded ActivityLog");
  results.push({
    test: "Telemetry does not create ActivityLog",
    status: 200,
    passed: true,
  });
  await rejects("Unknown sensor rejected", () =>
    telemetryIngestionService.ingest({
      deviceCode: "ESP32-GF-A-01",
      recordedAt: new Date("2031-01-01T11:00:00Z"),
      source: SensorReadingSource.SIMULATOR,
      readings: [{ sensorCode: "UNKNOWN_99", value: 1 }],
    }),
  );
  for (const [sensorCode, value, label, recordedAt] of [
    ["QA_SENSOR_TEMP", 151, "Temperature range", "2031-01-01T11:01:00Z"],
    ["HUM_01", 150, "Humidity range", "2031-01-01T11:01:01Z"],
    ["SOIL_01", -10, "Soil moisture range", "2031-01-01T11:01:02Z"],
    ["LIGHT_01", -1, "Light range", "2031-01-01T11:01:03Z"],
  ] as const) {
    await rejects(label, () =>
      telemetryIngestionService.ingest({
        deviceCode: "ESP32-GF-A-01",
        recordedAt: new Date(recordedAt),
        source: SensorReadingSource.SIMULATOR,
        readings: [{ sensorCode, value }],
      }),
    );
  }
  await req(`/sensors/${sensor.id}`, {
    method: "PATCH",
    headers: bearer(owner),
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  await rejects("Inactive Sensor rejects telemetry", () =>
    telemetryIngestionService.ingest({
      deviceCode: "ESP32-GF-A-01",
      recordedAt: new Date("2031-01-01T11:02:00Z"),
      source: SensorReadingSource.SIMULATOR,
      readings: [{ sensorCode: "QA_SENSOR_TEMP", value: 28 }],
    }),
  );
  await req(`/sensors/${sensor.id}`, {
    method: "PATCH",
    headers: bearer(owner),
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  for (const status of [DeviceStatus.INACTIVE, DeviceStatus.MAINTENANCE]) {
    await prisma.device.update({
      where: { id: "demo_device_esp32_a" },
      data: { status },
    });
    await rejects(`${status} Device rejects telemetry`, () =>
      telemetryIngestionService.ingest({
        deviceCode: "ESP32-GF-A-01",
        recordedAt: new Date(),
        source: SensorReadingSource.SIMULATOR,
        readings: [{ sensorCode: "QA_SENSOR_TEMP", value: 28 }],
      }),
    );
  }
  await prisma.device.update({
    where: { id: "demo_device_esp32_a" },
    data: { status: DeviceStatus.ACTIVE },
  });
  check(
    "Zone latest endpoint",
    (
      await req("/zones/demo_zone_a/latest-readings", {
        headers: bearer(owner),
      })
    ).status,
    200,
  );
  check(
    "Zone latest cross-farm blocked",
    (await req(`/zones/${zone.id}/latest-readings`, { headers: bearer(owner) }))
      .status,
    404,
  );
  check(
    "Device latest endpoint",
    (
      await req("/devices/demo_device_esp32_a/latest-readings", {
        headers: bearer(staff),
      })
    ).status,
    200,
  );
  check(
    "Sensor search/filter",
    (
      await req(
        "/sensors?search=QA_SENSOR&type=TEMP&status=ACTIVE&page=1&limit=1",
        { headers: bearer(owner) },
      )
    ).status,
    200,
  );
  check(
    "OWNER summary scoped",
    (await req("/sensors/summary", { headers: bearer(owner) })).status,
    200,
  );
  check(
    "STAFF summary scoped",
    (await req("/sensors/summary", { headers: bearer(staff) })).status,
    200,
  );
  const logs = await prisma.activityLog.count({
    where: { entityId: sensor.id },
  });
  if (logs < 3) throw new Error("Sensor activity logs missing");
  results.push({ test: "Sensor ActivityLog", status: logs, passed: true });
  console.table(results);
  console.log(
    `Phase 5 API/telemetry tests passed: ${results.length}/${results.length}`,
  );
}
run()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });

