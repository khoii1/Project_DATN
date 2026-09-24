import { Prisma, type SensorReadingSource } from "@prisma/client";
import { prisma } from "../config/database";

export type ReadingSort = "asc" | "desc";
interface HistoryOptions { from?: Date; to?: Date; page: number; limit: number; sort: ReadingSort }
export interface BucketPoint { epoch: bigint; value: number; min: number; max: number; count: bigint }

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
      SELECT (floor(extract(epoch FROM "recorded_at") / ${bucketSeconds}) * ${bucketSeconds})::bigint AS "epoch",
             avg("value")::double precision AS "value", min("value")::double precision AS "min",
             max("value")::double precision AS "max", count(*)::bigint AS "count"
      FROM "sensor_readings"
      WHERE "sensor_id" = ${sensorId}
        AND "recorded_at" >= (${from} AT TIME ZONE 'UTC')
        AND "recorded_at" <= (${to} AT TIME ZONE 'UTC')
      GROUP BY 1 ORDER BY 1 ASC
    `);
  },
  createMany(data: Array<{ sensorId: string; value: number; source: SensorReadingSource; recordedAt: Date }>) { return prisma.sensorReading.createManyAndReturn({ data, skipDuplicates: true, select: { id: true, sensorId: true, value: true, recordedAt: true } }); },
  latest(sensorId: string) { return prisma.sensorReading.findFirst({ where: { sensorId }, orderBy: { recordedAt: "desc" } }); },
  countAt(sensorIds: string[], recordedAt: Date) { return prisma.sensorReading.count({ where: { sensorId: { in: sensorIds }, recordedAt } }); },
};
