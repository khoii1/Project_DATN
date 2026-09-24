import { prisma } from "../config/database";

const staffSelect = { id: true, fullName: true, email: true, phone: true, role: true, status: true } as const;

export const farmStaffRepository = {
  list(farmId: string) {
    return prisma.farmStaffAssignment.findMany({ where: { farmId }, orderBy: { createdAt: "desc" }, include: { staff: { select: staffSelect } } });
  },
  find(farmId: string, staffId: string) {
    return prisma.farmStaffAssignment.findUnique({ where: { farmId_staffId: { farmId, staffId } } });
  },
  create(farmId: string, staffId: string) {
    return prisma.farmStaffAssignment.create({ data: { farmId, staffId }, include: { staff: { select: staffSelect } } });
  },
  updatePermission(farmId: string, staffId: string, canControlIrrigation: boolean) {
    return prisma.farmStaffAssignment.update({ where: { farmId_staffId: { farmId, staffId } }, data: { canControlIrrigation }, include: { staff: { select: staffSelect } } });
  },
  remove(farmId: string, staffId: string) {
    return prisma.farmStaffAssignment.delete({ where: { farmId_staffId: { farmId, staffId } } });
  },
};
