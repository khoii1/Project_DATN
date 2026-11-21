import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import type { SensorReadingSource } from "../types/domain-enums";

export type ReadingSort = "asc" | "desc";
interface HistoryOptions { from?: Date; to?: Date; page: number; limit: number; sort: ReadingSort }
export interface BucketPoint { epoch: bigint | number; value: number; min: number; max: number; count: bigint | number }

export const sensorReadingRepository = {
  async list(sensorId: string, options: HistoryOptions) {
    const where: Prisma.SensorReadingWhereInput = { sensorId, recordedAt: { gte: options.from, lte: options.to } };
    const [items, total] = await prisma.$transaction([
      prisma.sensorReading.findMany({ where, orderBy: { recordedAt: options.sort }, skip: (options.page - 1) * options.limit, take: options.limit }),
      prisma.sensorReading.count({ where }),
    ]);
    return { items, total };
  },
  statistics(sensorId: string, from: Date, to: Date) {
    const where = { sensorId, recordedAt: { gte: from, lte: to } };
    return prisma.$transaction([
      prisma.sensorReading.aggregate({ where, _count: { _all: true }, _min: { value: true }, _max: { value: true }, _avg: { value: true } }),
      prisma.sensorReading.findFirst({ where, orderBy: { recordedAt: "desc" }, select: { value: true, recordedAt: true } }),
    ]);
  },
  rawPoints(sensorId: string, from: Date, to: Date, limit: number) {
    return prisma.sensorReading.findMany({ where: { sensorId, recordedAt: { gte: from, lte: to } }, orderBy: { recordedAt: "asc" }, take: limit, select: { value: true, recordedAt: true } });
  },
  countRange(sensorId: string, from: Date, to: Date) {
    return prisma.sensorReading.count({ where: { sensorId, recordedAt: { gte: from, lte: to } } });
  },
  bucketPoints(sensorId: string, from: Date, to: Date, bucketSeconds: number) {
    return prisma.$queryRaw<BucketPoint[]>(Prisma.sql`
      SELECT b.epoch AS epoch,
             CAST(AVG(b.value) AS FLOAT) AS value,
             CAST(MIN(b.value) AS FLOAT) AS min,
             CAST(MAX(b.value) AS FLOAT) AS max,
             COUNT_BIG(*) AS count
      FROM (
        SELECT (DATEDIFF_BIG(SECOND, '1970-01-01T00:00:00', recorded_at) / CAST(${bucketSeconds} AS BIGINT)) * CAST(${bucketSeconds} AS BIGINT) AS epoch,
               value
        FROM sensor_readings
        WHERE sensor_id = ${sensorId}
          AND recorded_at >= ${from}
          AND recorded_at <= ${to}
      ) AS b
      GROUP BY b.epoch
      ORDER BY b.epoch ASC
    `);
  },
  async createMany(data: Array<{ sensorId: string; value: number; source: SensorReadingSource; recordedAt: Date }>) {
    if (data.length === 0) return [];
    const existing = await prisma.sensorReading.findMany({
      where: { OR: data.map((d) => ({ sensorId: d.sensorId, recordedAt: d.recordedAt })) },
      select: { sensorId: true, recordedAt: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.sensorId}|${e.recordedAt.getTime()}`));
    const fresh = data.filter((d) => !existingKeys.has(`${d.sensorId}|${d.recordedAt.getTime()}`));
    if (fresh.length === 0) return [];
    const created: Array<{ id: string; sensorId: string; value: number; recordedAt: Date; receivedAt: Date }> = [];
    for (const item of fresh) {
      try {
        const row = await prisma.sensorReading.create({
          data: item,
          select: { id: true, sensorId: true, value: true, recordedAt: true, receivedAt: true },
        });
        created.push(row);
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }
    return created;
  },
  latest(sensorId: string) { return prisma.sensorReading.findFirst({ where: { sensorId }, orderBy: { recordedAt: "desc" } }); },
  countAt(sensorIds: string[], recordedAt: Date) { return prisma.sensorReading.count({ where: { sensorId: { in: sensorIds }, recordedAt } }); },
};
