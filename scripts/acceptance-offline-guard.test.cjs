const test = require('node:test');
const assert = require('node:assert/strict');
test('offline preload rejects network before any socket can open', () => {
  for (const work of [
    () => require('node:net').connect(5432, '127.0.0.1'),
    () => new (require('node:net').Socket)().connect(1883),
    () => require('node:tls').connect(443),
    () => require('node:http').get('http://127.0.0.1:5000'),
    () => require('node:https').get('https://example.invalid'),
    () => require('node:dgram').createSocket('udp4'),
    () => fetch('http://127.0.0.1:5000'),
    () => new WebSocket('ws://127.0.0.1:5000'),
  ]) assert.throws(work, /ACCEPTANCE_OFFLINE_NETWORK_PROHIBITED/);
});
test('offline preload rejects local env and production runtime imports', () => {
  assert.throws(() => require('../backend/node_modules/dotenv'), /ENV_FILE_PROHIBITED|PRODUCTION_RUNTIME/);
});
test('only owned ephemeral loopback mock servers can be reached', async () => {
  const http = require('node:http');
  const server = http.createServer((_req, res) => res.end('mock-only'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { assert.equal(await (await fetch('http://127.0.0.1:' + server.address().port)).text(), 'mock-only'); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('fixed-port listeners are prohibited by the offline preload', () => {
  assert.throws(() => require('node:http').createServer().listen(5000, '127.0.0.1'), /NETWORK_PROHIBITED/);
});
