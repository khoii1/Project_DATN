// Real browser + built React assets; every API operation is an in-memory mock.
// Starts only a loopback static server on an OS-assigned port, never backend/Vite/MQTT.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const { previewShadow } = require('../backend/scripts/shadow-preview-harness.cjs');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'frontend', 'dist');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function main(args) {
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--headed'), 'Only --headed is accepted; no live targets');
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Build frontend first');
  const output = path.join(root, 'build', 'project-acceptance', 'browser-' + Date.now());
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) { res.writeHead(503); return res.end('Mock routing required'); }
    const asset = path.resolve(dist, '.' + pathname);
    if (!asset.startsWith(dist + path.sep) && asset !== dist) { res.writeHead(403); return res.end(); }
    const file = fs.existsSync(asset) && fs.statSync(asset).isFile() ? asset : path.join(dist, 'index.html');
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.html': 'text/html' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const checks = [], errors = [], mockCommands = [], blocked = [];
  const user = { id: 'mock-owner', role: 'FARM_OWNER', fullName: 'DEMO SIMULATION', status: 'ACTIVE', email: 'demo@example.invalid' };
  const farm = { id: 'mock-farm', name: 'SIMULATION FARM', status: 'ACTIVE' };
  const device = { id: 'mock-device', deviceCode: 'ESP32-GF-A-01', name: 'SIMULATION ESP32', status: 'ACTIVE', connectionStatus: 'ONLINE', zone: { id: 'mock-zone', name: 'SIMULATION ZONE', status: 'ACTIVE', farm } };
  const actuator = { id: 'mock-pump', actuatorCode: 'PUMP_01', name: 'SIMULATION PUMP — NO HARDWARE', type: 'PUMP', status: 'ACTIVE', currentState: 'OFF', canControl: true, controlEnabled: false, gatewayMode: 'DISABLED', lastCommandAt: null, lastStateChangedAt: new Date().toISOString(), device, latestCommand: null };
  let listRequests = 0;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: !args.includes('--headed') });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', serviceWorkers: 'block' });
    await context.addInitScript(() => sessionStorage.setItem('smart_agriculture_access_token', 'MOCK_ONLY_NOT_A_VALID_TOKEN'));
    await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.textContent = 'SIMULATION — API MOCK — KHÔNG KẾT NỐI DATABASE/MQTT/MÁY BƠM';
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#78350f;color:white;text-align:center;padding:8px;font: bold 13px sans-serif;pointer-events:none';
      document.body.appendChild(banner);
    }));
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (!url.pathname.startsWith('/api/')) {
        if (url.origin === origin) return route.continue();
        blocked.push(url.origin); return route.abort();
      }
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let data;
      if (req.method() === 'POST' && url.pathname === '/api/actuators/mock-pump/commands') {
        const body = req.postDataJSON();
        assert.deepEqual(body, { command: 'TURN_ON' });
        mockCommands.push(body);
        actuator.latestCommand = { id: 'mock-command-' + mockCommands.length, command: 'TURN_ON', status: 'PENDING', source: 'MANUAL', transport: 'MQTT', requestedAt: new Date().toISOString(), failureReason: null };
        data = { command: actuator.latestCommand, actuator };
      } else if (req.method() !== 'GET') {
        blocked.push(req.method() + ' ' + url.pathname); return route.abort();
      } else if (url.pathname === '/api/auth/me') data = { user };
      else if (url.pathname === '/api/alerts/summary') data = { active: 0, open: 0, acknowledged: 0, critical: 0, warning: 0, resolvedToday: 0 };
      else if (url.pathname === '/api/farms') data = { items: [farm], pagination: { total: 1 } };
      else if (url.pathname === '/api/devices') data = { items: [device], pagination: { total: 1 } };
      else if (url.pathname === '/api/automation-rules') data = { items: [], pagination: { total: 0 } };
      else if (url.pathname === '/api/device-commands') data = { items: [], pagination: { total: 0 } };
      else if (url.pathname === '/api/actuators/summary') data = { total: 1, active: 1, on: actuator.currentState === 'ON' ? 1 : 0, off: actuator.currentState === 'OFF' ? 1 : 0, unknown: actuator.currentState === 'UNKNOWN' ? 1 : 0, unavailable: 0 };
      else if (url.pathname === '/api/actuators') { listRequests++; data = { items: [actuator], pagination: { total: 1 } }; }
      else if (url.pathname === '/api/shadow-preview') data = previewShadow(Object.fromEntries(url.searchParams), new Date().toISOString());
      else { blocked.push(req.method() + ' ' + url.pathname); return route.abort(); }
      return route.fulfill({ headers, json: { success: true, data } });
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const card = page.locator('article').filter({ hasText: 'SIMULATION PUMP — NO HARDWARE' });
    const on = () => card.getByRole('button', { name: 'Bật', exact: true });
    const until = async predicate => { const end = Date.now() + 10000; while (!await predicate()) { assert.ok(Date.now() < end, 'UI state deadline'); await pause(80); } };
    const snap = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    await page.goto(origin + '/irrigation');
    await card.waitFor();
    await until(async () => (await card.innerText()).includes('Đang tắt'));
    assert.equal(await on().count(), 0); assert.equal(mockCommands.length, 0);
    checks.push('backend-disabled UI cannot issue command'); await snap('01-disabled');
    actuator.controlEnabled = true; actuator.gatewayMode = 'MQTT'; actuator.currentState = 'UNKNOWN';
    await until(async () => await on().count() === 1 && await on().isDisabled());
    checks.push('UNKNOWN locks ON');
    device.connectionStatus = 'OFFLINE'; actuator.currentState = 'OFF';
    await pause(2300); assert.equal(await on().isDisabled(), true);
    assert.match(await card.innerText(), /Chưa xác định/); checks.push('OFFLINE masks historical OFF');
    device.connectionStatus = 'ONLINE';
    await until(async () => await on().isEnabled());
    async function sendMockOn() {
      const before = mockCommands.length;
      await on().click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Bật tưới', exact: true }).click();
      await until(async () => await page.getByRole('alertdialog').count() === 0);
      assert.equal(mockCommands.length, before + 1);
      assert.match(await card.innerText(), /Đang chờ/);
      assert.equal(await on().isDisabled(), true);
      assert.match(await card.innerText(), /Đang tắt/);
    }
    await sendMockOn(); checks.push('mock ON body capped1s, confirmation, PENDING never means ON'); await snap('02-pending');
    actuator.latestCommand = { ...actuator.latestCommand, status: 'FAILED', failureReason: 'PUMP_COMMANDS_DISABLED' };
    await until(async () => (await card.innerText()).includes('Chức năng điều khiển máy bơm đang tạm khóa'));
    assert.match(await card.innerText(), /Đang tắt/); checks.push('REJECTED visible, no false ON'); await snap('03-rejected');
    await sendMockOn();
    actuator.latestCommand = { ...actuator.latestCommand, status: 'SUCCESS' }; actuator.currentState = 'ON';
    await until(async () => (await card.innerText()).includes('Đang bật'));
    checks.push('APPLIED simulation becomes ON only after polling accepted state');
    actuator.currentState = 'OFF'; actuator.lastStateChangedAt = new Date().toISOString();
    await until(async () => await on().count() === 1 && await on().isEnabled());
    checks.push('simulated automatic OFF appears without F5; not hardware timing evidence');
    await sendMockOn();
    actuator.latestCommand = { ...actuator.latestCommand, status: 'FAILED', failureReason: 'ACK_TIMEOUT' }; actuator.currentState = 'UNKNOWN';
    await until(async () => (await card.innerText()).includes('Thiết bị không phản hồi đúng hạn'));
    assert.equal(await on().isDisabled(), true); checks.push('timeout is failure/UNKNOWN'); await snap('04-timeout');
    assert.ok(listRequests >= 8); checks.push('2-second irrigation polling observed');
    await page.getByRole('button', { name: 'Lịch sử lệnh', exact: true }).click();
    assert.match(await page.locator('main').innerText(), /Lịch sử lệnh/);
    assert.equal(mockCommands.length, 3); checks.push('History tab renders cleanly'); await snap('05-history');
    // Browser route guard only; this cannot verify server RBAC.
    user.role = 'STAFF'; await page.goto(origin + '/users');
    await until(async () => new URL(page.url()).pathname === '/forbidden');
    checks.push('STAFF browser route guard; backend RBAC not verified by mocks');
    assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
    const result = { status: 'PASS', kind: 'BROWSER_MOCK_API_ONLY', at: new Date().toISOString(), browser: args.includes('--headed') ? 'Visible Edge' : 'Headless Edge', checks, listRequests, mockCommandCount: mockCommands.length, mockCommandBodies: mockCommands, blockedRequests: blocked, pageErrors: errors, realHardwareCommands: 0, productionDataVerified: false, output };
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(result));
  } catch (e) {
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', message: e.message, checks, errors, blocked, mockCommandCount: mockCommands.length }, null, 2), { flag: 'wx' });
    throw e;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main(process.argv.slice(2)).catch(e => { console.error(e); process.exitCode = 1; });
