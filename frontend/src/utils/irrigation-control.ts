import type { Actuator, DeviceCommand, DeviceCommandType } from "../types/actuator";

export function manualCommandBody(command: DeviceCommandType) {
  return command === "TURN_ON" ? { command, maxRunSeconds: 1 } : { command };
}

export function manualCommandFeedback(command: Pick<DeviceCommand, "status" | "command" | "failureReason">) {
  if (command.status === "PENDING") return "Đã gửi yêu cầu, đang chờ ESP32 xác nhận relay. Chưa xác nhận có nước chảy.";
  if (command.status === "FAILED") {
    if (command.failureReason?.includes("ACK_TIMEOUT")) return "Hết thời gian chờ ACK từ ESP32. Không xác nhận lệnh đã được thực hiện; kiểm tra trạng thái relay mới nhất.";
    if (command.failureReason?.includes("PUMP_COMMANDS_DISABLED")) return "ESP32 từ chối yêu cầu vì điều khiển máy bơm đang bị khóa.";
    return `Yêu cầu thất bại${command.failureReason ? `: ${command.failureReason}` : "."}`;
  }
  return command.command === "TURN_ON"
    ? "ESP32 đã xác nhận relay bật cho lệnh thử tối đa 1 giây. Xem trạng thái mới nhất để xác nhận relay đã tắt; ACK không xác nhận nước chảy."
    : "ESP32 đã xác nhận relay tắt. Đây là báo cáo GPIO, không phải phản hồi động cơ hoặc lưu lượng nước.";
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
