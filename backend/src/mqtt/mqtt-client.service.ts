import mqtt, { type MqttClient } from "mqtt";
import { env } from "../config/env";
import { mqttMessageRouter } from "./mqtt-message-router";
import { mqttTopics } from "./mqtt-topic";
import type { MqttConnectionState } from "./mqtt.types";

class MqttClientService {
  private client: MqttClient | null = null;
  private state: MqttConnectionState = env.mqttEnabled ? "disconnected" : "disabled";
  private messageQueue: Promise<void> = Promise.resolve();

  get connectionState(): MqttConnectionState { return this.state; }

  start(): void {
    if (!env.mqttEnabled || this.client) return;
    this.client = mqtt.connect(env.mqttBrokerUrl, {
      clientId: env.mqttBackendClientId,
      username: env.mqttUsername,
      password: env.mqttPassword,
      clean: true,
      reconnectPeriod: env.mqttReconnectPeriodMs,
    });
    this.client.on("connect", () => {
      this.state = "connected";
      console.log("MQTT connected");
      this.client?.subscribe([mqttTopics.telemetryFilter, mqttTopics.statusFilter], { qos: 1 }, (error) => {
        if (error) console.error(`MQTT subscription failed: ${error.message}`);
        else console.log("MQTT subscriptions restored");
      });
    });
    this.client.on("message", (topic, message) => {
      this.messageQueue = this.messageQueue.then(() => mqttMessageRouter.handle(topic, message)).catch((error: unknown) => {
        const summary = error instanceof Error ? error.message : "unknown routing error";
        console.error(`MQTT message handling failed: ${summary}`);
      });
    });
    this.client.on("reconnect", () => console.warn("MQTT reconnecting"));
    this.client.on("offline", () => { this.state = "disconnected"; console.warn("MQTT disconnected"); });
    this.client.on("close", () => { this.state = "disconnected"; });
    this.client.on("error", (error) => console.error(`MQTT connection error: ${error.message}`));
  }

  async stop(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (!client) return;
    await new Promise<void>((resolve) => client.end(false, {}, () => resolve()));
    await this.messageQueue;
    this.state = env.mqttEnabled ? "disconnected" : "disabled";
  }
}

export const mqttClientService = new MqttClientService();
