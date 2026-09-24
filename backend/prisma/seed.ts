import { DeviceConnectionStatus, DeviceStatus, DeviceType, PrismaClient, SensorReadingSource, SensorStatus, SensorType, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ActuatorState, ActuatorStatus, ActuatorType, AlertOperator, AlertSeverity } from "@prisma/client";

const prisma = new PrismaClient();

const demoUsers = [
  { fullName: "Quản trị viên", email: "admin@smartagri.local", password: "Admin123", role: UserRole.ADMIN },
  { fullName: "Chủ trang trại", email: "owner@smartagri.local", password: "Owner123", role: UserRole.FARM_OWNER },
  { fullName: "Nhân viên nông trại", email: "staff@smartagri.local", password: "Staff123", role: UserRole.STAFF },
] as const;

async function seed(): Promise<void> {
  for (const demoUser of demoUsers) {
    const passwordHash = await bcrypt.hash(demoUser.password, 12);
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        fullName: demoUser.fullName,
        role: demoUser.role,
        status: UserStatus.ACTIVE,
      },
      create: {
        fullName: demoUser.fullName,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
      },
    });
  }

  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@smartagri.local" } });
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "staff@smartagri.local" } });
  const farm = await prisma.farm.upsert({
    where: { id: "demo_green_farm" },
    update: { ownerId: owner.id, name: "Green Farm", address: "Đà Lạt, Lâm Đồng", areaHectares: 3.5, status: "ACTIVE" },
    create: { id: "demo_green_farm", ownerId: owner.id, name: "Green Farm", address: "Đà Lạt, Lâm Đồng", description: "Trang trại mẫu phục vụ trình diễn hệ thống", areaHectares: 3.5 },
  });
  const zoneA = await prisma.zone.upsert({
    where: { id: "demo_zone_a" },
    update: { farmId: farm.id, name: "Khu A", areaHectares: 0.8, status: "ACTIVE" },
    create: { id: "demo_zone_a", farmId: farm.id, name: "Khu A", description: "Khu trồng cà chua", areaHectares: 0.8 },
  });
  const zoneB = await prisma.zone.upsert({
    where: { id: "demo_zone_b" },
    update: { farmId: farm.id, name: "Khu B", areaHectares: 0.6, status: "ACTIVE" },
    create: { id: "demo_zone_b", farmId: farm.id, name: "Khu B", description: "Khu trồng rau cải", areaHectares: 0.6 },
  });
  await prisma.crop.upsert({
    where: { id: "demo_crop_tomato" },
    update: { zoneId: zoneA.id, name: "Cà chua", variety: "Cherry", status: "GROWING" },
    create: { id: "demo_crop_tomato", zoneId: zoneA.id, name: "Cà chua", variety: "Cherry", plantingDate: new Date("2026-08-01"), expectedHarvestDate: new Date("2026-11-01"), status: "GROWING" },
  });
  await prisma.crop.upsert({
    where: { id: "demo_crop_greens" },
    update: { zoneId: zoneB.id, name: "Rau cải", variety: "Cải xanh", status: "PLANNED" },
    create: { id: "demo_crop_greens", zoneId: zoneB.id, name: "Rau cải", variety: "Cải xanh", plantingDate: new Date("2026-09-01"), expectedHarvestDate: new Date("2026-10-15"), status: "PLANNED" },
  });
  await prisma.farmStaffAssignment.upsert({
    where: { farmId_staffId: { farmId: farm.id, staffId: staff.id } },
    update: { canControlIrrigation: true },
    create: { farmId: farm.id, staffId: staff.id, canControlIrrigation: true },
  });
  const deviceA = await prisma.device.upsert({
    where: { deviceCode: "ESP32-GF-A-01" },
    update: { zoneId: zoneA.id, name: "ESP32 khu vực A", type: DeviceType.CONTROLLER, hardwareModel: "ESP32 DevKit V1", firmwareVersion: "1.0.0", status: DeviceStatus.ACTIVE, connectionStatus: DeviceConnectionStatus.ONLINE, lastSeenAt: new Date() },
    create: { id: "demo_device_esp32_a", zoneId: zoneA.id, deviceCode: "ESP32-GF-A-01", name: "ESP32 khu vực A", type: DeviceType.CONTROLLER, hardwareModel: "ESP32 DevKit V1", firmwareVersion: "1.0.0", installedAt: new Date("2026-08-10"), connectionStatus: DeviceConnectionStatus.ONLINE, lastSeenAt: new Date(), description: "Bộ điều khiển IoT mẫu của Khu A" },
  });
  await prisma.device.upsert({
    where: { deviceCode: "ESP32-GF-B-01" },
    update: { zoneId: zoneB.id, name: "ESP32 khu vực B", type: DeviceType.CONTROLLER, hardwareModel: "ESP32-WROOM-32", firmwareVersion: "1.0.0", status: DeviceStatus.MAINTENANCE, connectionStatus: DeviceConnectionStatus.OFFLINE },
    create: { id: "demo_device_esp32_b", zoneId: zoneB.id, deviceCode: "ESP32-GF-B-01", name: "ESP32 khu vực B", type: DeviceType.CONTROLLER, hardwareModel: "ESP32-WROOM-32", firmwareVersion: "1.0.0", status: DeviceStatus.MAINTENANCE, connectionStatus: DeviceConnectionStatus.OFFLINE, lastSeenAt: new Date("2026-08-25T08:00:00Z"), installedAt: new Date("2026-08-12") },
  });
  const sensorSeed = [
    { id: "demo_sensor_temp", sensorCode: "TEMP_01", name: "Nhiệt độ không khí", type: SensorType.TEMP, value: 28.5 },
    { id: "demo_sensor_hum", sensorCode: "HUM_01", name: "Độ ẩm không khí", type: SensorType.AIR_HUMIDITY, value: 72 },
    { id: "demo_sensor_soil", sensorCode: "SOIL_01", name: "Độ ẩm đất", type: SensorType.SOIL_MOISTURE, value: 35 },
    { id: "demo_sensor_light", sensorCode: "LIGHT_01", name: "Cường độ ánh sáng", type: SensorType.LIGHT, value: 650 },
  ];
  for (const item of sensorSeed) {
    const sensor = await prisma.sensor.upsert({ where: { id: item.id }, update: { deviceId: deviceA.id, sensorCode: item.sensorCode, name: item.name, type: item.type, status: SensorStatus.ACTIVE }, create: { id: item.id, deviceId: deviceA.id, sensorCode: item.sensorCode, name: item.name, type: item.type } });
    await prisma.sensorReading.upsert({ where: { sensorId_recordedAt: { sensorId: sensor.id, recordedAt: new Date("2026-08-26T06:00:00.000Z") } }, update: { value: item.value, source: SensorReadingSource.SIMULATOR }, create: { id: `demo_reading_${item.sensorCode.toLowerCase()}`, sensorId: sensor.id, value: item.value, source: SensorReadingSource.SIMULATOR, recordedAt: new Date("2026-08-26T06:00:00.000Z") } });
  }

  const demoRules = [
    { id: "demo_rule_soil_low", sensorId: "demo_sensor_soil", name: "Độ ẩm đất thấp", operator: AlertOperator.LT, threshold: 30, recoveryThreshold: 35, severity: AlertSeverity.WARNING, message: "Độ ẩm đất đang thấp, cần kiểm tra khu trồng." },
    { id: "demo_rule_temp_high", sensorId: "demo_sensor_temp", name: "Nhiệt độ cao", operator: AlertOperator.GT, threshold: 35, recoveryThreshold: 33, severity: AlertSeverity.CRITICAL, message: "Nhiệt độ khu trồng đang vượt ngưỡng an toàn." },
    { id: "demo_rule_humidity_low", sensorId: "demo_sensor_hum", name: "Độ ẩm không khí thấp", operator: AlertOperator.LT, threshold: 40, recoveryThreshold: 45, severity: AlertSeverity.WARNING, message: "Độ ẩm không khí đang thấp." },
  ];
  for (const rule of demoRules) await prisma.alertRule.upsert({ where: { id: rule.id }, update: { ...rule, enabled: true, createdById: owner.id }, create: { ...rule, createdById: owner.id } });

  const pump = await prisma.actuator.upsert({ where: { id: "demo_actuator_pump_a" }, update: { deviceId: deviceA.id, actuatorCode: "PUMP_01", name: "Máy bơm tưới Khu A", type: ActuatorType.PUMP, status: ActuatorStatus.ACTIVE, hardwareChannel: "RELAY_1" }, create: { id: "demo_actuator_pump_a", deviceId: deviceA.id, actuatorCode: "PUMP_01", name: "Máy bơm tưới Khu A", type: ActuatorType.PUMP, status: ActuatorStatus.ACTIVE, currentState: ActuatorState.OFF, hardwareChannel: "RELAY_1", description: "Kênh máy bơm logic dùng MockDeviceGateway" } });
  await prisma.automationRule.upsert({ where: { id: "demo_automation_soil_pump_a" }, update: { sensorId: "demo_sensor_soil", actuatorId: pump.id, name: "Tưới tự động Khu A", startThreshold: 30, stopThreshold: 45, enabled: true, createdById: owner.id }, create: { id: "demo_automation_soil_pump_a", sensorId: "demo_sensor_soil", actuatorId: pump.id, name: "Tưới tự động Khu A", startThreshold: 30, stopThreshold: 45, enabled: true, description: "Tự động tưới theo độ ẩm đất Khu A", createdById: owner.id } });

  console.log(`Seeded ${demoUsers.length} accounts, farm data, 2 devices, 4 sensors, 1 pump actuator, 1 automation rule, baseline readings and ${demoRules.length} alert rules`);
}

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

