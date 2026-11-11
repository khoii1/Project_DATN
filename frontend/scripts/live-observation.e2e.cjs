// Actual headless Edge. Every API request intercepted; no hardware/DB control.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const fixture = require('./live-observation.fixture.cjs');
const { previewShadow } = require('../../backend/scripts/shadow-preview-harness.cjs');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const output = path.resolve(__dirname, '../../report/phase13_4b'); fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const user = { id: 'owner', role: 'FARM_OWNER', fullName: 'Chủ trại MOCK', status: 'ACTIVE' };
  const farm = { id: 'farm-mock', name: 'Trang trại MOCK', ownerId: 'owner', status: 'ACTIVE' };
  const devices = ['device-a', 'device-b'].map(id => ({ id, deviceCode: 'ESP32-GF-A-01', name: 'MOCK ' + id, status: 'ACTIVE', connectionStatus: 'ONLINE', zone: { id: 'zone', name: 'Khu MOCK', farm } }));
  let status = 200, modify = v => v, delay = 0, liveRequests = 0, fixtureRequests = 0, active = 0, maxActive = 0;
  const mutations = [], errors = [], checks = [];
  await context.addInitScript(() => sessionStorage.setItem('smart_agriculture_access_token', 'offline-mock-token-not-valid-on-server'));
  await context.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.method() !== 'GET') { mutations.push(req.method() + ' ' + url.pathname); return route.abort(); }
    let data;
    try {
      if (url.pathname === '/api/live-evidence') {
        liveRequests++; active++; maxActive = Math.max(active, maxActive);
        const responseStatus = status, value = modify(fixture()), wait = delay;
        value.reading && (value.reading.reading.id = 'mock-reading-' + url.searchParams.get('deviceId'));
        try { if (wait) await pause(wait); await route.fulfill({ status: responseStatus, headers, json: responseStatus === 200 ? { success: true, data: value } : { message: 'Mock API ' + responseStatus } }); }
        finally { active--; } return;
      }
      if (url.pathname === '/api/shadow-preview') { fixtureRequests++; data = previewShadow(Object.fromEntries(url.searchParams), new Date().toISOString()); }
      else if (url.pathname === '/api/auth/me') data = { user };
      else if (url.pathname === '/api/devices') data = { items: devices, pagination: { total: 2 } };
      else if (url.pathname === '/api/farms') data = { items: [farm], pagination: { total: 1 } };
      else if (url.pathname.includes('summary')) data = { total: 0, active: 0, on: 0, off: 0, unknown: 0, unavailable: 0 };
      else data = { items: [], pagination: { total: 0 } };
      await route.fulfill({ headers, json: { success: true, data } });
    } catch { /* expected abort on scope change/unmount */ }
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const panel = page.getByTestId('live-observation-result');
  const expectField = async (name, expected) => { await page.waitForFunction(({ name, expected }) => [...document.querySelectorAll('[data-testid="live-observation-result"] dt')].some(dt => dt.textContent === name && dt.nextElementSibling?.textContent?.includes(expected)), { name, expected }); };
  const refresh = async () => { await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/live-evidence'), page.getByRole('button', { name: 'Đọc lại dữ liệu thật', exact: true }).click()]); };
  try {
    await page.goto('http://127.0.0.1:5173/irrigation', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Mô phỏng tưới tự động', exact: true }).click(); await page.getByTestId('shadow-outcome').waitFor();
    await page.getByRole('tab', { name: 'Dữ liệu cảm biến thực tế', exact: true }).click();
    await expectField('SOIL_01 đã quan sát', '0%'); await expectField('PUMP_01 relay được báo', 'OFF');
    assert.match(await panel.innerText(), /Persistent cycle[\s\S]*Persistent budget[\s\S]*Persistent safety/);
    assert.doesNotMatch(await panel.innerText(), /WOULD_ON/); assert.equal(await page.getByTestId('shadow-outcome').count(), 0);
    checks.push('live zero%, OFF, DB provenance, missing trust, fixture isolated');
    await page.screenshot({ path: path.join(output, 'live-zero-off.png'), fullPage: true });
    modify = v => ({ ...v, clock: { ...v.clock, health: 'UNKNOWN' } }); await refresh(); await expectField('Clock health', 'UNKNOWN'); checks.push('clock UNKNOWN');
    modify = v => ({ ...v, presence: { ...v.presence, connectionStatus: 'OFFLINE' } }); await refresh();
    await expectField('ESP32', 'OFFLINE'); await expectField('PUMP_01 relay được báo', 'UNKNOWN'); checks.push('offline never confirms relay');
    modify = v => ({ ...v, reading: null, off: null, reasons: ['MQTT_RECONNECT_AWAIT_NEW_EVIDENCE'] }); await refresh();
    await expectField('MQTT receipt status', 'NOT_VERIFIED'); await expectField('PUMP_01 relay được báo', 'UNKNOWN'); checks.push('MQTT loss/reconnect waits for evidence');
    modify = v => ({ ...v, observer: { ...v.observer, sessionId: 'backend-observer:NEW' } }); await refresh(); await expectField('PUMP_01 relay được báo', 'UNKNOWN'); checks.push('old observer OFF rejected');
    modify = v => v; await refresh(); await expectField('PUMP_01 relay được báo', 'OFF'); checks.push('fresh evidence recovers');
    // Presentation TTL without any replacement response (real component clock accelerated in isolated context).
    await page.clock.install();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hiddenCount = liveRequests; await page.clock.fastForward(61000); assert.equal(liveRequests, hiddenCount);
    delay = 1200;
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    // Foreground GET held briefly: presentation must expire the previous snapshot itself.
    await expectField('PUMP_01 relay được báo', 'UNKNOWN'); await expectField('MQTT receipt status', 'STALE');
    delay = 0; await pause(1400); await page.clock.resume(); checks.push('hidden cancels polling, local TTL ages, foreground reloads');
    await refresh(); await expectField('PUMP_01 relay được báo', 'OFF');
    modify = v => { const old = new Date(Date.now() - 70000).toISOString(); v.reading.recordedAt = old; v.reading.reading.recordedAt = old; v.off.recordedAt = old; return v; };
    await refresh(); await expectField('MQTT receipt status', 'STALE'); await expectField('PUMP_01 relay được báo', 'UNKNOWN'); checks.push('expired evidence STALE');
    await page.screenshot({ path: path.join(output, 'live-stale.png'), fullPage: true });
    modify = v => v;
    for (const code of [403, 404, 500]) {
      status = code; await refresh(); await page.getByRole('alert').filter({ hasText: 'Mock API ' + code }).waitFor();
      await expectField('PUMP_01 relay được báo', 'UNKNOWN'); assert.doesNotMatch(await panel.innerText(), /WOULD_ON/); checks.push('API ' + code + ' no fallback');
      status = 200; await refresh(); await expectField('PUMP_01 relay được báo', 'OFF');
    }
    // Slow same-scope GET and repeated refresh cannot overlap in the polling controller.
    delay = 600; const before = liveRequests; await page.getByRole('button', { name: 'Đọc lại dữ liệu thật' }).click();
    await pause(100); await page.getByRole('button', { name: 'Đọc lại dữ liệu thật' }).click(); await pause(1500);
    assert.equal(maxActive, 1); assert.ok(liveRequests - before <= 2); checks.push('serial refresh no overlap');
    // Old device response cannot win after scope changes.
    delay = 800; await page.getByRole('button', { name: 'Đọc lại dữ liệu thật' }).click(); await pause(100);
    delay = 0; await page.getByLabel('Phạm vi thiết bị mô phỏng').selectOption('device-b');
    await expectField('ReadingId', 'mock-reading-device-b'); await pause(1000); await expectField('ReadingId', 'mock-reading-device-b'); checks.push('device race ignored');
    const fixturesBefore = fixtureRequests, liveBefore = liveRequests;
    await pause(11000); assert.ok(liveRequests > liveBefore); assert.equal(fixtureRequests, fixturesBefore); checks.push('10s live GET polling only');
    await page.getByRole('tab', { name: 'Kịch bản FIXTURE / MOCK' }).click(); await page.getByTestId('shadow-outcome').waitFor();
    const unmounted = liveRequests; await pause(11000); assert.equal(liveRequests, unmounted); assert.equal(await panel.count(), 0); checks.push('mode switch/unmount stops live polling');
    await page.getByRole('tab', { name: 'Dữ liệu cảm biến thực tế' }).click(); await expectField('SOIL_01 đã quan sát', '0%');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Mô phỏng tưới tự động', exact: true }).click();
    await page.getByTestId('shadow-outcome').waitFor(); assert.equal(await panel.count(), 0); checks.push('refresh defaults to fixture, no live mixing');
    await page.getByRole('tab', { name: 'Dữ liệu cảm biến thực tế' }).click(); await expectField('SOIL_01 đã quan sát', '0%');
    status = 401; await refresh(); await page.waitForURL('**/login'); checks.push('401 preserves global logout/session contract');
    assert.deepEqual(mutations, []); assert.deepEqual(errors, []);
    const result = { status: 'PASS', browser: 'Actual headless Microsoft Edge', mockOnly: true, checks, liveRequests, fixtureRequests,
      mutationRequests: mutations, pageErrors: errors, hardwareCommands: 0, productionDbWrites: 0 };
    fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } catch (error) { await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); throw error; }
  finally { await browser.close(); }
}
main().catch(e => { console.error(e.stack); process.exitCode = 1; });
