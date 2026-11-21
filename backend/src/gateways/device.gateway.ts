import { type ActuatorState, type DeviceCommandType } from "../types/domain-enums";
export interface DeviceGatewayInput { correlationId: string; deviceCode: string; actuatorCode: string; command: DeviceCommandType; simulateFailure?: boolean; issuedAt?: Date; expiresAt?: Date; maxRunSeconds?: number; onPublished?: () => Promise<void>; onResult?: (result: DeviceGatewayResult) => Promise<void> }
export interface DeviceGatewayResult { success: boolean; pending?: boolean; confirmedState?: ActuatorState; error?: string; acknowledgedAt?: Date; recordedAt?: Date }
export interface DeviceGateway { sendCommand(input: DeviceGatewayInput): Promise<DeviceGatewayResult> }
