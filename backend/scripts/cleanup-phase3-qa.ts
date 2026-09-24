import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  const farms = await prisma.farm.findMany({ where: { name: { startsWith: "QA_UI_" } }, select: { id: true, zones: { select: { id: true, crops: { select: { id: true } } } } } });
  const entityIds = farms.flatMap((farm) => [farm.id, ...farm.zones.flatMap((zone) => [zone.id, ...zone.crops.map((crop) => crop.id)])]);
  const activityLogs = entityIds.length ? await prisma.activityLog.deleteMany({ where: { entityId: { in: entityIds } } }) : { count: 0 };
  const deleted = await prisma.farm.deleteMany({ where: { id: { in: farms.map((farm) => farm.id) } } });
  const qaUsers = await prisma.user.findMany({ where: { email: "phase2.ui@smartagri.local" }, select: { id: true } });
  if (qaUsers.length) await prisma.activityLog.deleteMany({ where: { userId: { in: qaUsers.map((user) => user.id) } } });
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: qaUsers.map((user) => user.id) } } });
  console.log(`QA cleanup: ${deleted.count} farm(s), ${activityLogs.count} activity log(s), ${deletedUsers.count} user(s)`);
}
main().finally(() => prisma.$disconnect());
