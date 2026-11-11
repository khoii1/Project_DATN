// Test-process boundary only. Never preload into the application runtime.
const { syncBuiltinESMExports } = require('node:module');
const Module = require('node:module');
const deny = () => { throw new Error('ACCEPTANCE_OFFLINE_NETWORK_PROHIBITED'); };
const ownedPorts = new Set();
const permitted = (host, port) => host === '127.0.0.1' && ownedPorts.has(Number(port));
const allowedUrl = input => { const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); return url.protocol === 'http:' && permitted(url.hostname, url.port); };
for (const name of ['node:http', 'node:https']) {
  const mod = require(name);
  mod.request = deny;
  mod.get = deny;
  if (name === 'node:https') mod.createServer = deny;
}
const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === 'object' ? first : { port: first, host: args[1] };
  if (!permitted(options.host, options.port)) deny();
  return originalConnect.apply(this, args);
};
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (args[0] !== 0 || args[1] !== '127.0.0.1') deny();
  let port;
  this.once('listening', () => { port = this.address().port; ownedPorts.add(port); });
  this.once('close', () => ownedPorts.delete(port));
  return originalListen.apply(this, args);
};
require('node:tls').connect = deny;
require('node:dgram').createSocket = deny;
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => { if (!allowedUrl(input)) deny(); return originalFetch(input, options); };
globalThis.WebSocket = class { constructor() { deny(); } };
syncBuiltinESMExports();
const originalLoad = Module._load;
Module._load = function (name, parent, ...rest) {
  if (name === 'dotenv' || name.startsWith('dotenv/')) throw new Error('ACCEPTANCE_ENV_FILE_PROHIBITED');
  const filename = Module._resolveFilename(name, parent);
  if (typeof filename === 'string' && /node_modules[\\/]dotenv[\\/]/.test(filename)) throw new Error('ACCEPTANCE_ENV_FILE_PROHIBITED');
  if (typeof filename === 'string' && /backend[\\/]src[\\/]config[\\/](database|env)\.[cm]?[jt]s$/.test(filename)) {
    throw new Error('ACCEPTANCE_PRODUCTION_RUNTIME_IMPORT_PROHIBITED');
  }
  return originalLoad.call(this, name, parent, ...rest);
};
