import "dotenv/config";
import { ActuatorState, DeviceCommandSource, SensorReadingSource, PrismaClient } from "@prisma/client";

process.env.AUTOMATION_COMMAND_COOLDOWN_SECONDS = "0";
const prisma = new PrismaClient();
const soil = [50, 35, 28, 25, 33, 42, 45, 50, 28];
const base = new Date(); base.setUTCSeconds(5, 0);

async function main() {
  const pump = await prisma.actuator.findUniqueOrThrow({ where: { id: "demo_actuator_pump_a" } });
  const existingReadings = await prisma.sensorReading.count({ where: { sensorId: "demo_sensor_soil", recordedAt: { gte: base, lte: new Date(base.getTime() + (soil.length - 1) * 5_000) } } });
  if (existingReadings === 0 && pump.currentState !== ActuatorState.OFF) throw new Error("PUMP_01 phải ở trạng thái OFF trước lần chạy simulator mới");
  const commandsBefore = await prisma.deviceCommand.count({ where: { automationRuleId: "demo_automation_soil_pump_a", source: DeviceCommandSource.AUTOMATION } });
  const { telemetryIngestionService } = await import("../src/services/telemetry-ingestion.service"); let created = 0;
  for (let index = 0; index < soil.length; index += 1) { const result = await telemetryIngestionService.ingest({ deviceCode: "ESP32-GF-A-01", recordedAt: new Date(base.getTime() + index * 5_000), source: SensorReadingSource.SIMULATOR, readings: [{ sensorCode: "SOIL_01", value: soil[index] }], evaluateAlerts: false, evaluateAutomation: true }); created += result.created; }
  const commands = await prisma.deviceCommand.findMany({ where: { automationRuleId: "demo_automation_soil_pump_a", source: DeviceCommandSource.AUTOMATION }, orderBy: { requestedAt: "asc" }, skip: commandsBefore });
  const finalPump = await prisma.actuator.findUniqueOrThrow({ where: { id: pump.id } });
  console.log(`Automation simulation: ${created} new readings; ${commands.length} commands ${commands.map(command => command.command).join(" → ") || "none"}; final state ${finalPump.currentState}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
