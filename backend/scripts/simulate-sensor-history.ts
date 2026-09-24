import "dotenv/config";
import { SensorReadingSource } from "@prisma/client";
import { prisma } from "../src/config/database";
import { telemetryIngestionService } from "../src/services/telemetry-ingestion.service";

const deviceCode = (process.argv[2] ?? "ESP32-GF-A-01").trim().toUpperCase();
const days = Math.min(90, Math.max(1, Number.parseInt(process.argv[3] ?? "30", 10)));
const intervalMs = 30 * 60 * 1000;
const end = new Date(Math.floor(Date.now() / intervalMs) * intervalMs);
const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

function valuesAt(index: number, recordedAt: Date) {
  const localHour = (recordedAt.getUTCHours() + 7 + recordedAt.getUTCMinutes() / 60) % 24;
  const dailyWave = Math.sin(((localHour - 6) / 24) * Math.PI * 2);
  const daylight = localHour >= 6 && localHour <= 18 ? Math.sin(((localHour - 6) / 12) * Math.PI) : 0;
  return [
    { sensorCode: "TEMP_01", value: Number((27 + dailyWave * 4 + (index % 5) * 0.05).toFixed(2)) },
    { sensorCode: "HUM_01", value: Number((72 - dailyWave * 12 + (index % 3) * 0.1).toFixed(2)) },
    { sensorCode: "SOIL_01", value: Number((45 - (index % 96) * 0.12).toFixed(2)) },
    { sensorCode: "LIGHT_01", value: Number((daylight * 900).toFixed(2)) },
  ];
}

async function main() {
  let created = 0;
  let duplicates = 0;
  const batches = days * 48 + 1;
  for (let index = 0; index < batches; index += 1) {
    const recordedAt = new Date(start.getTime() + index * intervalMs);
    const result = await telemetryIngestionService.ingest({ deviceCode, recordedAt, source: SensorReadingSource.SIMULATOR, readings: valuesAt(index, recordedAt), evaluateAlerts: false, evaluateAutomation: false });
    created += result.created;
    duplicates += result.duplicates;
  }
  console.log(`Historical simulation: ${batches} batches, ${created} reading(s) created, ${duplicates} duplicate(s), ${days} day(s), ${deviceCode}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
