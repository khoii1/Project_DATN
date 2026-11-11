import { prisma } from "../config/database";
import { env } from "../config/env";
import { pumpStateSchema } from "../gateways/mqtt-device.gateway";
import { mqttDeviceGateway } from "../gateways/mqtt-gateway.runtime";
import type { MqttMessageContext } from "./mqtt.types";
import { mqttStateObserver } from "./mqtt-state-observer";
import { liveEvidenceStore } from "../services/live-provenance/evidence-store";

export async function handlePumpState(topic: string, message: Buffer, context: MqttMessageContext) {
  if (!env.mqttEnabled || context.retain || context.dup || message.length > 4096) return;
  const generation = mqttStateObserver.generation;
  let payload: unknown; try { payload = JSON.parse(message.toString("utf8")); } catch { return; }
  const parsed = pumpStateSchema.safeParse(payload); if (!parsed.success) return;
  const state = parsed.data, at = new Date(state.recordedAt);
  // A recent but pre-session packet is still historical after backend/broker restart.
  if (at < mqttStateObserver.sessionStartedAt) return;
  if (state.deviceCode !== env.mqttCommandDeviceCode || state.actuatorCode !== env.mqttCommandActuatorCode || topic !== `${env.mqttTopicPrefix}/devices/${state.deviceCode}/actuator/state`) return;
  if (at.getTime() > context.receivedAt.getTime() + 2000 || context.receivedAt.getTime() - at.getTime() > 30_000) return;
  // Cancel an older in-flight ON before accepting OFF; a late ACK cannot resurrect ON.
  if (env.mqttCommandsEnabled) await mqttDeviceGateway.cancelActuator(state.deviceCode, state.actuatorCode, at);
  const result = await prisma.actuator.updateMany({ where: { actuatorCode: state.actuatorCode, device: { deviceCode: state.deviceCode }, OR: [{ lastStateChangedAt: null }, { lastStateChangedAt: { lt: at } }] }, data: { currentState: "OFF", lastStateChangedAt: at } });
  if (result?.count) {
    mqttStateObserver.confirmOff(state.deviceCode, state.actuatorCode, at, generation);
    try {
      if (generation === mqttStateObserver.generation && mqttStateObserver.ready) liveEvidenceStore.observeCommittedOff(topic, message, state, context);
    } catch { /* evidence failure cannot alter physical-state handling */ }
    console.log(`MQTT OFF-state committed: deviceCode=${state.deviceCode} actuatorCode=${state.actuatorCode} recordedAt=${at.toISOString()}`);
  }
}

export async function recoverMqttCommands() {
  await prisma.$transaction([
    prisma.deviceCommand.updateMany({ where: { transport: "MQTT", status: "PENDING" }, data: { status: "FAILED", completedAt: new Date(), failureReason: "BACKEND_RESTARTED_NO_REPLAY" } }),
    prisma.actuator.updateMany({ where: { actuatorCode: env.mqttCommandActuatorCode, device: { deviceCode: env.mqttCommandDeviceCode }, ...(env.mqttCommandsEnabled ? {} : { commands: { some: { transport: "MQTT" } } }) }, data: { currentState: "UNKNOWN" } }),
  ]);
}

export async function invalidatePumpState() {
  if (!env.mqttCommandsEnabled) return;
  // Absence of a timely auto-OFF event is uncertainty, never a fabricated OFF ACK.
  await prisma.actuator.updateMany({ where: { actuatorCode: env.mqttCommandActuatorCode, device: { deviceCode: env.mqttCommandDeviceCode }, currentState: "ON", OR: [{ device: { connectionStatus: { not: "ONLINE" } } }, { lastStateChangedAt: { lt: new Date(Date.now() - (env.mqttCommandExpirySeconds + env.mqttPumpMaxRunSeconds) * 1000) } }] }, data: { currentState: "UNKNOWN" } });
  await prisma.$transaction(async tx => {
    const expired = { transport: "MQTT", status: "PENDING" as const, expiresAt: { lte: new Date() } };
    await tx.actuator.updateMany({ where: { commands: { some: expired } }, data: { currentState: "UNKNOWN" } });
    await tx.deviceCommand.updateMany({ where: expired, data: { status: "FAILED", completedAt: new Date(), failureReason: "ACK_TIMEOUT" } });
  });
}
