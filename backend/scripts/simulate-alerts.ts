import "dotenv/config";
import { SensorReadingSource } from "@prisma/client";
import { prisma } from "../src/config/database";
import { telemetryIngestionService } from "../src/services/telemetry-ingestion.service";

const deviceCode = (process.argv[2] ?? "ESP32-GF-A-01").trim().toUpperCase();
const intervalMs = 60_000; const base = new Date(Math.floor(Date.now() / intervalMs) * intervalMs);
const soil = [40, 28, 25, 32, 35, 28]; const temperature = [30, 36, 38, 34, 33, 36];
async function main() { let created = 0; let duplicates = 0; for (let index = 0; index < soil.length; index += 1) { const result = await telemetryIngestionService.ingest({ deviceCode, recordedAt: new Date(base.getTime() + index * intervalMs), source: SensorReadingSource.SIMULATOR, readings: [{ sensorCode: "SOIL_01", value: soil[index] }, { sensorCode: "TEMP_01", value: temperature[index] }], evaluateAlerts: true, evaluateAutomation: false }); created += result.created; duplicates += result.duplicates; } const outcome = created > 0 ? "recovery completed and new active incidents opened" : "all deterministic readings already existed; alert lifecycle unchanged"; console.log(`Alert simulation: ${created} readings created, ${duplicates} duplicate(s); ${outcome} for ${deviceCode}`); }
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
