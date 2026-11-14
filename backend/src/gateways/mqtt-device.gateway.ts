import { z } from "zod";
import type { DeviceGateway, DeviceGatewayInput, DeviceGatewayResult } from "./device.gateway";

export interface CommandTransport {
  connected(): boolean;
  publish(topic: string, payload: string, callback: (error?: Error | null) => void): void;
  discard(commandId: string): void;
}
const code = z.string().regex(/^[A-Z0-9_-]{3,64}$/);
const ackSchema = z.object({ schemaVersion: z.literal(1), commandId: z.string().uuid(), deviceCode: code, actuatorCode: code, type: z.literal("PUMP_SET"), state: z.enum(["ON", "OFF"]), result: z.enum(["APPLIED", "REJECTED"]), recordedAt: z.string().datetime({ offset: true }), reason: z.string().max(200).optional() }).strict();
export const pumpStateSchema = z.object({ schemaVersion: z.literal(1), deviceCode: code, actuatorCode: code, state: z.literal("OFF"), reason: z.enum(["MAX_RUNTIME", "BOOT", "MQTT_LOST", "WIFI_LOST", "COMMAND", "PERIODIC"]), recordedAt: z.string().datetime({ offset: true }) }).strict();
type Waiting = { input: DeviceGatewayInput; timer: ReturnType<typeof setTimeout> };

/** No network/DB dependency; only live, in-memory commands can receive an ACK. */
export class MqttDeviceGateway implements DeviceGateway {
  private waiting = new Map<string, Waiting>();
  private settling = new Set<Promise<void>>();
  constructor(private transport: CommandTransport, private prefix: string, private clock = () => new Date()) {}
  get pendingCount() { return this.waiting.size; }
  async sendCommand(input: DeviceGatewayInput): Promise<DeviceGatewayResult> {
    const now = this.clock();
    if (!this.transport.connected()) return { success: false, error: "BROKER_UNAVAILABLE" };
    if (!input.onResult || !input.issuedAt || !input.expiresAt || input.expiresAt <= now) return { success: false, error: "EXPIRED_OR_INVALID_COMMAND" };
    if (input.command === "TURN_ON" && input.maxRunSeconds !== undefined && (!Number.isInteger(input.maxRunSeconds) || input.maxRunSeconds < 1 || input.maxRunSeconds > 30)) return { success: false, error: "INVALID_MAX_RUNTIME" };
    const conflicting = [...this.waiting.values()].filter(item => item.input.deviceCode === input.deviceCode && item.input.actuatorCode === input.actuatorCode);
    if (input.command === "TURN_ON" && conflicting.length) return { success: false, error: "COMMAND_PENDING" };
    for (const item of conflicting) await this.cancel(item.input.correlationId, "SUPERSEDED_BY_OFF");
    const timer = setTimeout(() => { void this.settle(input.correlationId, { success: false, error: "ACK_TIMEOUT" }).catch(() => console.error("MQTT command timeout persistence failed")); }, input.expiresAt.getTime() - now.getTime());
    this.waiting.set(input.correlationId, { input, timer });
    const payload = { schemaVersion: 1, commandId: input.correlationId, deviceCode: input.deviceCode, actuatorCode: input.actuatorCode, type: "PUMP_SET", state: input.command === "TURN_ON" ? "ON" : "OFF", ...(input.command === "TURN_ON" && input.maxRunSeconds !== undefined ? { maxRunSeconds: input.maxRunSeconds } : {}), issuedAt: input.issuedAt.toISOString(), expiresAt: input.expiresAt.toISOString() };
    try {
      this.transport.publish(`${this.prefix}/devices/${input.deviceCode}/commands/${input.actuatorCode}`, JSON.stringify(payload), error => {
        if (error) void this.settle(input.correlationId, { success: false, error: "PUBLISH_FAILED" }).catch(() => console.error("MQTT publish failure persistence failed"));
        else void input.onPublished?.().catch(() => console.error("MQTT PUBACK persistence failed"));
        // PUBACK is not an actuator ACK. Keep waiting.
      });
    } catch { await this.settle(input.correlationId, { success: false, error: "PUBLISH_FAILED" }); }
    return { success: false, pending: true };
  }
  async handleAck(topic: string, message: Buffer, context: { retain: boolean; receivedAt: Date }) {
    if (context.retain || message.length > 4096) return false;
    let json: unknown; try { json = JSON.parse(message.toString("utf8")); } catch { return false; }
    const parsed = ackSchema.safeParse(json); if (!parsed.success) return false;
    const ack = parsed.data, waiting = this.waiting.get(ack.commandId); if (!waiting) return false;
    const input = waiting.input, at = new Date(ack.recordedAt);
    if (topic !== `${this.prefix}/devices/${input.deviceCode}/command-acks/${input.actuatorCode}` || ack.deviceCode !== input.deviceCode || ack.actuatorCode !== input.actuatorCode || ack.state !== (input.command === "TURN_ON" ? "ON" : "OFF")) return false;
    if (context.receivedAt >= input.expiresAt! || at.getTime() < input.issuedAt!.getTime() - 2000 || at.getTime() > context.receivedAt.getTime() + 2000 || context.receivedAt.getTime() - at.getTime() > 30_000) return false;
    await this.settle(ack.commandId, { success: ack.result === "APPLIED", confirmedState: ack.result === "APPLIED" ? ack.state : undefined, error: ack.result === "REJECTED" ? `REJECTED: ${ack.reason ?? "DEVICE_REJECTED"}` : undefined, acknowledgedAt: context.receivedAt, recordedAt: at });
    return true;
  }
  async cancel(commandId: string, reason: string) { await this.settle(commandId, { success: false, error: reason }); }
  async disconnect() {
    const results = await Promise.allSettled([...this.waiting.keys()].map(id => this.cancel(id, "BROKER_DISCONNECTED")).concat([...this.settling]));
    if (results.some(result => result.status === "rejected")) throw new Error("COMMAND_PERSISTENCE_FAILED");
  }
  async cancelActuator(deviceCode: string, actuatorCode: string, at: Date) {
    for (const item of [...this.waiting.values()]) if (item.input.command === "TURN_ON" && item.input.deviceCode === deviceCode && item.input.actuatorCode === actuatorCode && item.input.issuedAt! <= at) await this.cancel(item.input.correlationId, "DEVICE_REPORTED_OFF");
  }
  private settle(id: string, result: DeviceGatewayResult): Promise<void> {
    const item = this.waiting.get(id); if (!item) return Promise.resolve();
    this.waiting.delete(id); clearTimeout(item.timer); this.transport.discard(id);
    const task = item.input.onResult!(result).finally(() => this.settling.delete(task));
    this.settling.add(task);
    return task;
  }
}
