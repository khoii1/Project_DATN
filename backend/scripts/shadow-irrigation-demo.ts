// Offline JSON input only. No env/config/database/MQTT/gateway imports.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decideIrrigation } from "../src/services/automatic-irrigation/decision-engine";

const fixture = JSON.parse(readFileSync(resolve(process.argv[2] ?? "scripts/fixtures/shadow-irrigation.json"), "utf8"));
console.log(fixture.notice);
for (const example of fixture.examples) {
  const snapshot = structuredClone(fixture.snapshot);
  snapshot.reading.value = example.soilMoisture;
  snapshot.clock.health = example.clockHealth;
  const decision = decideIrrigation(snapshot);
  console.log(JSON.stringify({ example: example.name, decision, sideEffects: {
    mqttPublished: 0, deviceCommandsCreated: 0, productionDbWrites: 0, actuatorMutations: 0,
    evidence: "Pure engine only; additionally enforced by offline boundary tests, not runtime production metrics",
  } }, null, 2));
}
