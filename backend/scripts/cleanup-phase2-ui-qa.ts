import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() { const user = await prisma.user.findUnique({ where: { email: 'phase2.ui@smartagri.local' }, select: { id: true } }); if (!user) { console.log('Phase 2 UI QA cleanup: 0 user(s)'); return; } await prisma.activityLog.deleteMany({ where: { OR: [{ userId: user.id }, { entityId: user.id }] } }); await prisma.user.delete({ where: { id: user.id } }); console.log('Phase 2 UI QA cleanup: 1 user(s)'); }
run().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
