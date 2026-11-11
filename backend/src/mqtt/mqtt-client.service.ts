import { mqttDeviceGateway } from "../gateways/mqtt-gateway.runtime";
import { mqttCommandChannel } from "./mqtt-command-channel";
import { handlePumpState } from "./mqtt-pump-state.adapter";
import { mqttStateObserver } from "./mqtt-state-observer";
import mqtt, { type MqttClient } from "mqtt";
import { env } from "../config/env";
import { mqttMessageRouter } from "./mqtt-message-router";
import { mqttTopics } from "./mqtt-topic";
import type { MqttConnectionState } from "./mqtt.types";

/** Fail closed if MQTT.js is still replaying its store or has queued publishes.
 * MQTT.js 5.x has no public queue-ready event. Re-test this guard on upgrades. */
function commandPublishReady(client: MqttClient | null): boolean {
  const internal = client as unknown as { _storeProcessing?: boolean; _storeProcessingQueue?: unknown[] } | null;
  return !!client?.connected && internal?._storeProcessing === false && Array.isArray(internal._storeProcessingQueue) && internal._storeProcessingQueue.length === 0;
}

class MqttClientService {
  private client: MqttClient | null = null;
  private state: MqttConnectionState = env.mqttEnabled ? "disconnected" : "disabled";
  private commandPackets = new Map<string, number>();
  private commandQueue: Promise<void> = Promise.resolve();
  private messageQueue: Promise<void> = Promise.resolve();

  get connectionState(): MqttConnectionState { return this.state; }

  private discardCommand(id: string) {
    const packet = this.commandPackets.get(id);
    this.commandPackets.delete(id);
    if (packet !== undefined) this.client?.removeOutgoingMessage(packet);
  }

  private disconnected() {
    this.state = "disconnected";
    mqttStateObserver.reset();
    // Flush QoS1 outgoing storage BEFORE reconnect can resend an old ON.
    for (const id of [...this.commandPackets.keys()]) this.discardCommand(id);
    void mqttDeviceGateway.disconnect().catch(() => console.error("MQTT command disconnect persistence failed"));
  }

  start(): void {
    if (!env.mqttEnabled || this.client) return;
    this.client = mqtt.connect(env.mqttBrokerUrl, {
      clientId: env.mqttBackendClientId,
      username: env.mqttUsername,
      password: env.mqttPassword,
      clean: true,
      resubscribe: false, // Restore explicitly in connect; avoid duplicate SUBSCRIBEs/replays.
      reconnectPeriod: env.mqttReconnectPeriodMs,
    });
    mqttCommandChannel.transport = {
      connected: () => env.mqttCommandsEnabled && this.state === "connected" && commandPublishReady(this.client),
      discard: id => this.discardCommand(id),
      publish: (topic, payload, callback) => {
        if (!env.mqttCommandsEnabled || this.state !== "connected" || !commandPublishReady(this.client)) { callback(new Error("BROKER_UNAVAILABLE_OR_COMMANDS_DISABLED")); return; }
        const id = (JSON.parse(payload) as { commandId: string }).commandId;
        this.client!.publish(topic, payload, { qos: 1, retain: false }, error => {
          this.commandPackets.delete(id);
          callback(error);
        });
      },
    };
    this.client.on("packetsend", packet => {
      if (packet.cmd === "publish" && packet.topic.includes("/commands/") && packet.messageId !== undefined) {
        try { const id = (JSON.parse(packet.payload.toString()) as { commandId: string }).commandId; this.commandPackets.set(id, packet.messageId); } catch { /* not a command */ }
      }
    });
    const stateFilter = `${env.mqttTopicPrefix}/devices/+/actuator/state`;
    const filters = [mqttTopics.telemetryFilter, mqttTopics.statusFilter, ...(env.mqttCommandsEnabled ? [`${env.mqttTopicPrefix}/devices/+/command-acks/+`, stateFilter] : [])];
    this.client.on("connect", () => {
      this.state = "disconnected";
      mqttStateObserver.reset();
      const generation = mqttStateObserver.generation;
      // Log endpoint only, never URL userinfo/password or connection options.
      const endpoint = new URL(env.mqttBrokerUrl ?? "mqtt://127.0.0.1:1883");
      console.log(`MQTT connected: host=${endpoint.hostname} port=${endpoint.port || (endpoint.protocol === "mqtts:" ? "8883" : "1883")}`);
      this.client?.subscribe(filters, { qos: 1 }, (error, grants) => {
        if (generation !== mqttStateObserver.generation) return;
        if (error || !grants || grants.length !== filters.length || grants.some(grant => Number(grant.qos) > 2)) { this.state = "disconnected"; console.error(`MQTT subscription failed: ${error?.message ?? "subscription not granted"}`); }
        else { this.state = "connected"; if (env.mqttCommandsEnabled) mqttStateObserver.ready = true; console.log("MQTT subscriptions restored"); }
      });
      if (!env.mqttCommandsEnabled) {
        // A missing state ACL must not take down working telemetry/presence.
        this.client?.subscribe([stateFilter], { qos: 1 }, (error, grants) => {
          if (generation !== mqttStateObserver.generation) return;
          mqttStateObserver.ready = !error && grants?.length === 1 && Number(grants[0].qos) <= 2;
          console.log(mqttStateObserver.ready ? "MQTT OFF-state observation subscribed (commands disabled)" : "MQTT OFF-state observation unavailable; check ACL");
        });
      }
    });
    this.client.on("message", (topic, message, packet) => {
      const context = { retain: packet.retain, dup: packet.dup, receivedAt: new Date(), qos: packet.qos,
        observerGeneration: mqttStateObserver.generation, observerSessionStartedAt: new Date(mqttStateObserver.sessionStartedAt) };
      if (topic.endsWith("/actuator/state") || (env.mqttCommandsEnabled && topic.includes("/command-acks/"))) {
        const generation = mqttStateObserver.generation;
        // Separate from telemetry queue: automation dispatch must never wait on its own ACK.
        this.commandQueue = this.commandQueue.then(async () => {
          if (topic.includes("/command-acks/")) await mqttDeviceGateway.handleAck(topic, message, context);
          else if (mqttStateObserver.ready && generation === mqttStateObserver.generation) await handlePumpState(topic, message, context);
        }).catch(() => console.error("MQTT command/state handling failed"));
        return;
      }
      this.messageQueue = this.messageQueue.then(() => mqttMessageRouter.handle(topic, message, context)).catch((error: unknown) => {
        const summary = error instanceof Error ? error.message : "unknown routing error";
        console.error(`MQTT message handling failed: ${summary}`);
      });
    });
    this.client.on("reconnect", () => console.warn("MQTT reconnecting"));
    this.client.on("offline", () => { this.disconnected(); console.warn("MQTT disconnected"); });
    this.client.on("close", () => { this.disconnected(); });
    this.client.on("error", (error) => console.error(`MQTT connection error: ${error.message}`));
  }

  async stop(): Promise<void> {
    const client = this.client;
    if (!client) return;
    this.disconnected();
    await mqttDeviceGateway.disconnect();
    mqttCommandChannel.transport = null;
    await new Promise<void>((resolve) => client.end(true, {}, () => resolve()));
    await this.messageQueue;
    await this.commandQueue;
    this.client = null;
    this.state = env.mqttEnabled ? "disconnected" : "disabled";
  }
}

export const mqttClientService = new MqttClientService();
