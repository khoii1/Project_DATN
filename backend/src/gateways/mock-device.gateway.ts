import { ActuatorState, DeviceCommandType } from "../types/domain-enums";
import type { DeviceGateway, DeviceGatewayInput, DeviceGatewayResult } from "./device.gateway";
export class MockDeviceGateway implements DeviceGateway { async sendCommand(input: DeviceGatewayInput): Promise<DeviceGatewayResult> { if (input.simulateFailure) return { success: false, error: "Lỗi gateway mô phỏng có chủ đích" }; return { success: true, confirmedState: input.command === DeviceCommandType.TURN_ON ? ActuatorState.ON : ActuatorState.OFF }; } }
export const deviceGateway: DeviceGateway = new MockDeviceGateway();
