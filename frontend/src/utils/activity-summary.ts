import type { ActivityLog } from "../types/activity-log";

/** Human-readable display only; audit storage/export retains the original details. */
export function activitySummary(log: Pick<ActivityLog, "action" | "description"> & Partial<Pick<ActivityLog, "commandContext" | "user">>): string {
  if (log.action === "ISSUE_DEVICE_COMMAND") {
    const command = log.commandContext?.command ?? / yêu cầu (TURN_ON|TURN_OFF) "[^"]+"; /.exec(log.description)?.[1];
    const operation = command === "TURN_ON" ? "bật" : command === "TURN_OFF" ? "tắt" : "điều khiển";
    const zoneName = log.commandContext?.zoneName.trim();
    return `Yêu cầu ${operation} bơm${zoneName ? ` tại ${zoneName}` : ""}`;
  }

  // The actor is already shown separately in both activity views.
  const prefix = log.user?.fullName ? `${log.user.fullName} ` : "";
  const description = prefix && log.description.startsWith(prefix) ? log.description.slice(prefix.length) : log.description;
  return description ? description.charAt(0).toLocaleUpperCase("vi-VN") + description.slice(1) : description;
}
