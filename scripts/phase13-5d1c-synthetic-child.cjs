'use strict';
// No imports, network, database, MQTT, configuration or production endpoints.
const scenario = process.argv[2], nonce = process.argv[3];
if (!['graceful','exit0','exit7','no-ready','ignore-stop','logs'].includes(scenario) || !/^[a-f0-9]{32}$/.test(nonce || '')) process.exit(9);
if (['DATABASE_URL','MQTT_PASSWORD','JWT_SECRET','PHASE13_OFFLINE_CANARY'].some(key => process.env[key])) process.exit(8);
let closing = false;
const resource = setInterval(() => {}, 100);
// All negative fixtures self-expire; tests never need force-kill cleanup.
setTimeout(() => { console.log('FIXTURE_SELF_EXPIRY'); process.exit(23); }, 4500).unref();
process.on('SIGINT', () => {
  console.log('SHUTDOWN_SIGNAL:SIGINT');
  if (scenario === 'ignore-stop') return;
  if (closing) return;
  closing = true;
  clearInterval(resource);
  setTimeout(() => { console.log('RESOURCE_CLOSED'); process.exit(0); }, 50);
});
if (scenario !== 'no-ready') console.log(JSON.stringify({ kind: 'READY', nonce, pid: process.pid }));
if (scenario === 'logs') { console.log('STDOUT_FIXTURE'); console.error('STDERR_FIXTURE'); }
if (scenario === 'exit0' || scenario === 'exit7') setTimeout(() => {
  console.log('FINAL_STDOUT_TAIL'); console.error('FINAL_STDERR_TAIL'); clearInterval(resource); process.exit(scenario === 'exit7' ? 7 : 0);
}, 200);
