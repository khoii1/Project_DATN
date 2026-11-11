// Read-only probe: SELECT + SUBSCRIBE only. Never publish, seed or update presence.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const mqtt = require('mqtt');
const prisma = new PrismaClient();
const deviceCode = 'ESP32-GF-A-01';
const clients = [];
const report = (event, details = {}) => console.log(JSON.stringify({ event, at: new Date(), ...details }));
async function snapshot() {
  const device = await prisma.device.findUnique({ where: { deviceCode }, select: {
    id: true, deviceCode: true, status: true, connectionStatus: true, lastSeenAt: true, updatedAt: true,
    zone: { select: { name: true, farm: { select: { name: true } } } },
    sensors: { select: { sensorCode: true, readings: { take: 1, orderBy: { recordedAt: 'desc' },
      select: { value: true, source: true, recordedAt: true, receivedAt: true } } } },
  } });
  report('DATABASE_SELECT', { device });
}
async function main() {
  if (process.env.MQTT_COMMANDS_ENABLED === 'true' || process.env.MQTT_AUTOMATION_COMMANDS_ENABLED === 'true') {
    throw new Error('PUMP_FLAGS_MUST_BE_DISABLED');
  }
  await snapshot();
  const configured = new URL(process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883');
  const endpoints = [['configured', configured]];
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(configured.hostname)) {
    endpoints.push(['loopback-comparison', new URL('mqtt://127.0.0.1:1883')]);
  }
  for (const [label, endpoint] of endpoints) {
    const client = mqtt.connect(endpoint.toString(), {
      clientId: `presence-readonly-${label}-${Date.now()}`, clean: true, reconnectPeriod: 0, connectTimeout: 5000,
      username: process.env.MQTT_USERNAME, password: process.env.MQTT_PASSWORD,
    });
    clients.push(client);
    client.on('connect', () => {
      report('BROKER_CONNECTED', { label, host: endpoint.hostname, port: endpoint.port || '1883' });
      const prefix = process.env.MQTT_TOPIC_PREFIX || 'smart-agriculture/v1';
      client.subscribe([`${prefix}/devices/${deviceCode}/status`, `${prefix}/devices/${deviceCode}/telemetry`], { qos: 1 }, (error, grants) => {
        report('SUBACK', { label, granted: !error && grants?.length === 2 && grants.every(g => g.qos <= 2) });
      });
    });
    client.on('message', (topic, payload, packet) => {
      try {
        const data = JSON.parse(payload.toString());
        report('MQTT_OBSERVED', { label, topic, retain: packet.retain, dup: packet.dup,
          deviceCode: data.deviceCode, status: data.status, recordedAt: data.recordedAt,
          readingCount: Array.isArray(data.readings) ? data.readings.length : undefined });
      } catch { report('INVALID_JSON', { label }); }
    });
    client.on('error', error => report('BROKER_ERROR', { label, code: error.code || 'CONNECTION_FAILED' }));
  }
  await new Promise(resolve => setTimeout(resolve, 30_000));
  await snapshot();
}
main().catch(error => {
  report('PROBE_FAILED', { code: error.code || (error.message === 'PUMP_FLAGS_MUST_BE_DISABLED' ? error.message : 'CHECK_CONNECTION') });
  process.exitCode = 1;
}).finally(async () => {
  await Promise.all(clients.map(client => new Promise(resolve => client.end(true, {}, resolve))));
  await prisma.$disconnect();
});
