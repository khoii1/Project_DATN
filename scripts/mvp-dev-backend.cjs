// Dedicated DEV entrypoint. Does not modify production startup/configuration.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const u = new URL(process.env.DATABASE_URL || 'invalid:');
if (u.hostname !== '127.0.0.1' || u.port !== '55433' || u.pathname !== '/smart_agriculture_mvp_dev' || u.username !== 'sa_mvp_dev_app' ||
    process.env.PORT !== '55001' || process.env.MQTT_ENABLED !== 'false' || process.env.MQTT_COMMANDS_ENABLED !== 'false' || process.env.MQTT_AUTOMATION_COMMANDS_ENABLED !== 'false' ||
    process.env.MQTT_PUMP_TEST_MODE !== 'true' || process.env.MQTT_PUMP_MAX_RUN_SECONDS !== '1' || process.env.NODE_OPTIONS) throw Error('DEV_RUNTIME_TARGET_REFUSED');
const productionEnv = f => typeof f === 'string' && path.resolve(f).toLowerCase().startsWith(root.toLowerCase() + path.sep) && /^\.env(?:\.|$)/.test(path.basename(f));
const exists = fs.existsSync, read = fs.readFileSync;
fs.existsSync = function (f) { return productionEnv(f) ? false : exists.apply(this, arguments); };
fs.readFileSync = function (f) { if (productionEnv(f)) throw Error('DEV_PRODUCTION_ENV_READ_REFUSED'); return read.apply(this, arguments); };
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === 'dotenv') return { config: () => ({ parsed: {} }) };
  const value = original.call(this, name, ...args);
  if (name === 'mqtt') return new Proxy(value, { get(obj, key) { if (key === 'connect') return () => { throw Error('DEV_MQTT_CONNECT_REFUSED'); }; return obj[key]; } });
  return value;
};
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (port, callback) {
  if (port !== 55001) throw Error('DEV_HTTP_BIND_REFUSED');
  return listen.call(this, 55001, '127.0.0.1', callback);
};
process.on('message', message => {
  if (message === 'STOP' && process.listenerCount('SIGTERM') > 0) process.emit('SIGTERM');
});
require(path.join(root, 'backend/node_modules/tsx/dist/cjs/index.cjs'));
require(path.join(root, 'backend/src/server.ts'));
