import { Prisma } from "@prisma/client"; import { ActivityAction, type UserRole } from "../types/domain-enums";
import { prisma } from "../config/database";
import type { ActivityLogListQuery } from '../validators/activity-log.schema';

interface ActivityInput {
  userId?: string;
  farmId?: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
}

export async function createActivityLog(input: ActivityInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: input.userId,
      farmId: input.farmId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      ipAddress: input.ipAddress,
    },
  });
}

export interface ActivityActor { id: string; role: UserRole }

export function activityLogWhere(actor: ActivityActor, query: Partial<ActivityLogListQuery>, accessibleFarmIds: string[]): Prisma.ActivityLogWhereInput {
  const roleScope: Prisma.ActivityLogWhereInput = actor.role === 'ADMIN'
    ? {}
    : actor.role === 'FARM_OWNER'
      ? { OR: [{ farmId: { in: accessibleFarmIds } }, { userId: actor.id }] }
      : { userId: actor.id };
  const searchFilter: Prisma.ActivityLogWhereInput = query.search ? { OR: [
    { description: { contains: query.search } },
    { user: { fullName: { contains: query.search } } },
    { user: { email: { contains: query.search } } },
    ...(Object.values(ActivityAction).includes(query.search as ActivityAction) ? [{ action: query.search as ActivityAction }] : []),
  ] } : {};
  return {
    AND: [
      roleScope,
      searchFilter,
      query.userId ? { userId: query.userId } : {}, query.action ? { action: query.action } : {},
      query.entityType ? { entityType: { equals: query.entityType } } : {}, query.farmId ? { farmId: query.farmId } : {},
      query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {},
    ],
  };
}

export async function listActivityLogs(actor: ActivityActor, query: ActivityLogListQuery, accessibleFarmIds: string[]) {
  const where = activityLogWhere(actor, query, accessibleFarmIds);
  const include = { user: { select: { id: true, fullName: true, email: true, role: true } }, farm: { select: { id: true, name: true } } } satisfies Prisma.ActivityLogInclude;
  const [items, total] = await prisma.$transaction([
    prisma.activityLog.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.activityLog.count({ where }),
  ]);
  // Enrich this already-scoped page without changing historical audit descriptions.
  // The zone name is current display context, not a historical location snapshot.
  const commandIds = items.filter(item => item.action === ActivityAction.ISSUE_DEVICE_COMMAND && item.entityType === 'DEVICE_COMMAND' && item.entityId).map(item => item.entityId!);
  const commands = commandIds.length ? await prisma.deviceCommand.findMany({
    where: { id: { in: commandIds }, ...(actor.role !== 'ADMIN' ? { actuator: { device: { zone: { farmId: { in: accessibleFarmIds } } } } } : {}) },
    select: { id: true, command: true, actuator: { select: { device: { select: { zone: { select: { name: true, farmId: true } } } } } } },
  }) : [];
  const byId = new Map(commands.map(command => [command.id, command]));
  return { items: items.map(item => {
    const command = item.action === ActivityAction.ISSUE_DEVICE_COMMAND && item.entityType === 'DEVICE_COMMAND' && item.entityId ? byId.get(item.entityId) : undefined;
    const zone = command?.actuator.device.zone;
    return { ...item, commandContext: command && zone && item.farmId === zone.farmId ? { command: command.command, zoneName: zone.name } : null };
  }), total };
}

export function exportActivityLogs(actor: ActivityActor, query: Partial<ActivityLogListQuery>, accessibleFarmIds: string[], take: number) {
  return prisma.activityLog.findMany({ where: activityLogWhere(actor, query, accessibleFarmIds), take, orderBy: { createdAt: 'asc' }, include: { user: { select: { fullName: true, email: true, role: true } }, farm: { select: { name: true } } } });
}
