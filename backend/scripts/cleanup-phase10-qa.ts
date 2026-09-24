import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() { const farms = await prisma.farm.findMany({ where: { name: { startsWith: 'QA_REPORT_' } }, select: { id: true } }); const farmIds = farms.map((farm) => farm.id); const logs = await prisma.activityLog.deleteMany({ where: { OR: [{ farmId: { in: farmIds } }, { description: { startsWith: 'QA_ACTIVITY_' } }] } }); const deleted = await prisma.farm.deleteMany({ where: { id: { in: farmIds } } }); console.log(`Phase 10 QA cleanup: ${deleted.count} farm(s), ${logs.count} activity log(s)`); }
run().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
