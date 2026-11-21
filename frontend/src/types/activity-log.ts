import type { Pagination } from './farm';
import type { UserRole } from './auth';
import type { DeviceCommandType } from './actuator';

export interface ActivityLog { commandContext?: { command: DeviceCommandType; zoneName: string } | null; id: string; userId: string | null; farmId: string | null; action: string; entityType: string; entityId: string | null; description: string; ipAddress: string | null; createdAt: string; user: { id: string; fullName: string; email: string; role: UserRole } | null; farm: { id: string; name: string } | null }
export interface ActivityLogQuery { search?: string; userId?: string; action?: string; entityType?: string; farmId?: string; from?: string; to?: string; page?: number; limit?: number }
export interface ActivityLogPage { items: ActivityLog[]; pagination: Pagination }
