import type { ActuatorState, DeviceCommandType } from "@prisma/client";
export interface DeviceGatewayInput { correlationId: string; deviceCode: string; actuatorCode: string; command: DeviceCommandType; simulateFailure?: boolean }
export interface DeviceGatewayResult { success: boolean; confirmedState?: ActuatorState; error?: string }
export interface DeviceGateway { sendCommand(input: DeviceGatewayInput): Promise<DeviceGatewayResult> }
