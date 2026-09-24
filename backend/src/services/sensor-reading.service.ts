import { SENSOR_TYPE_METADATA } from "../constants/sensor-metadata";
import { sensorReadingRepository } from "../repositories/sensor-reading.repository";
import { AppError } from "../utils/app-error";
import type { ChartQuery, ReadingsQuery, StatisticsQuery } from "../validators/sensor.schema";
import { farmAccessService, type ResourceActor } from "./farm-access.service";

const RAW_POINT_LIMIT = 800;
const bucketSeconds = { "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200, "6h": 21600, "1d": 86400 } as const;
type BucketResolution = keyof typeof bucketSeconds;
type ResolvedResolution = BucketResolution | "raw";
function autoResolution(from: Date, to: Date): ResolvedResolution { const hours = (to.getTime() - from.getTime()) / 3_600_000; if (hours <= 24) return "5m"; if (hours <= 24 * 7) return "30m"; if (hours <= 24 * 30) return "2h"; return "6h"; }
async function context(sensorId: string, actor: ResourceActor) { const sensor = await farmAccessService.assertSensorReadable(sensorId, actor); return { sensor, metadata: SENSOR_TYPE_METADATA[sensor.type] }; }

export const sensorReadingService = {
  async list(sensorId: string, query: ReadingsQuery, actor: ResourceActor) {
    const { sensor, metadata } = await context(sensorId, actor); const { items, total } = await sensorReadingRepository.list(sensorId, query);
    return { sensor: { id: sensor.id, sensorCode: sensor.sensorCode, name: sensor.name, type: sensor.type, unit: metadata.unit }, items: items.map((item) => ({ ...item, unit: metadata.unit })), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
  async statistics(sensorId: string, query: StatisticsQuery, actor: ResourceActor) {
    const { metadata } = await context(sensorId, actor); const [aggregate, latest] = await sensorReadingRepository.statistics(sensorId, query.from, query.to);
    return { sensorId, unit: metadata.unit, from: query.from, to: query.to, count: aggregate._count._all, minimum: aggregate._min.value, maximum: aggregate._max.value, average: aggregate._avg.value, latest };
  },
  async chart(sensorId: string, query: ChartQuery, actor: ResourceActor) {
    const { sensor, metadata } = await context(sensorId, actor); const resolution: ResolvedResolution = query.resolution === "auto" ? autoResolution(query.from, query.to) : query.resolution;
    let points: Array<{ timestamp: Date; value: number; min: number; max: number; count: number }>;
    if (resolution === "raw") {
      const count = await sensorReadingRepository.countRange(sensorId, query.from, query.to); if (count > RAW_POINT_LIMIT) throw new AppError(400, `Dữ liệu raw vượt giới hạn ${RAW_POINT_LIMIT} điểm; hãy chọn auto hoặc độ phân giải lớn hơn`);
      const rows = await sensorReadingRepository.rawPoints(sensorId, query.from, query.to, RAW_POINT_LIMIT); points = rows.map((row) => ({ timestamp: row.recordedAt, value: row.value, min: row.value, max: row.value, count: 1 }));
    } else {
      const rows = await sensorReadingRepository.bucketPoints(sensorId, query.from, query.to, bucketSeconds[resolution]); points = rows.map((row) => ({ timestamp: new Date(Number(row.epoch) * 1000), value: row.value, min: row.min, max: row.max, count: Number(row.count) }));
    }
    return { sensor: { id: sensor.id, sensorCode: sensor.sensorCode, name: sensor.name, type: sensor.type, unit: metadata.unit }, range: { from: query.from, to: query.to }, resolution, points };
  },
};
