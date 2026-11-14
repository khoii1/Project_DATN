import type { Actuator, DeviceCommand, DeviceCommandType } from "../types/actuator";

export function manualCommandBody(command: DeviceCommandType) {
  return { command };
}

export function formatFailureReason(reason: string | null | undefined): string {
  if (!reason) return "";
  if (reason.includes("PUMP_COMMANDS_DISABLED")) return "Chức năng điều khiển máy bơm đang tạm khóa";
  if (reason.includes("ACK_TIMEOUT")) return "Thiết bị không phản hồi đúng hạn";
  if (reason.includes("SUPERSEDED_BY_OFF")) return "Đã dừng theo lệnh tắt mới";
  if (reason.includes("DEVICE_REPORTED_OFF")) return "Thiết bị đang ở trạng thái tắt";
  if (reason.includes("BACKEND_RESTARTED_NO_REPLAY")) return "Phiên điều khiển trước đã kết thúc";
  if (reason.includes("BROKER_DISCONNECTED") || reason.includes("BROKER_UNAVAILABLE")) return "Mất kết nối máy chủ tín hiệu";
  if (reason.includes("DEVICE_OFFLINE")) return "Thiết bị đang ngoại tuyến";
  return reason;
}

export function isBenignFailureReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return (
    reason.includes("SUPERSEDED_BY_OFF") ||
    reason.includes("BACKEND_RESTARTED_NO_REPLAY") ||
    reason.includes("DEVICE_REPORTED_OFF")
  );
}

export function visibleCommandNotice(actuator: Actuator): string {
  const cmd = actuator.latestCommand;
  if (!cmd) return "";
  if (cmd.status === "PENDING") return "Đang chờ phản hồi từ thiết bị...";
  if (cmd.status === "FAILED") {
    if (isBenignFailureReason(cmd.failureReason) && actuator.currentState !== "UNKNOWN") return "";
    const detail = formatFailureReason(cmd.failureReason);
    return detail ? `Thất bại: ${detail}` : "Thất bại";
  }
  return "";
}

export function manualCommandFeedback(command: Pick<DeviceCommand, "status" | "command" | "failureReason">) {
  if (command.status === "PENDING") return "Đã gửi lệnh điều khiển, đang chờ thiết bị xác nhận...";
  if (command.status === "FAILED") {
    if (command.failureReason?.includes("ACK_TIMEOUT")) return "Hết thời gian chờ phản hồi từ thiết bị. Vui lòng kiểm tra kết nối của thiết bị.";
    if (command.failureReason?.includes("PUMP_COMMANDS_DISABLED")) return "Thiết bị từ chối yêu cầu vì chức năng điều khiển máy bơm đang bị khóa.";
    const detail = formatFailureReason(command.failureReason);
    return `Yêu cầu không thành công${detail ? `: ${detail}` : "."}`;
  }
  return command.command === "TURN_ON"
    ? "Máy bơm đã bật thành công. Nhấn Tắt khi bạn muốn dừng tưới."
    : "Máy bơm đã tắt thành công.";
}

export function pumpPresentation(actuator: Actuator) {
  const state = actuator.device.connectionStatus === "ONLINE" ? actuator.currentState : "UNKNOWN";
  const pending = actuator.latestCommand?.status === "PENDING";
  const available = actuator.controlEnabled === true && actuator.status === "ACTIVE"
    && actuator.device.status === "ACTIVE" && actuator.device.zone.status === "ACTIVE"
    && actuator.device.zone.farm.status === "ACTIVE";
  return {
    state, pending, available,
    canOn: available && actuator.canControl && state === "OFF" && !pending,
    // OFF can supersede pending ON; it never asserts physical state until a valid report.
    canOff: available && actuator.canControl && !(pending && actuator.latestCommand?.command === "TURN_OFF"),
  };
}
