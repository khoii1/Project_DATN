// Real headless Edge, isolated browser context. ALL /api requests are mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { previewShadow } = require('../../backend/scripts/shadow-preview-harness.cjs');
const output = path.resolve(__dirname, '../../report/phase13_2');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const user = { id: 'owner', role: 'FARM_OWNER', fullName: 'Chủ trại MOCK', email: 'mock@example.invalid', status: 'ACTIVE' };
  const farm = { id: 'fixture-farm', name: 'Trang trại MOCK', ownerId: 'owner', status: 'ACTIVE' };
  const device = { id: 'fixture-device', deviceCode: 'ESP32-GF-A-01', name: 'ESP32 MOCK', status: 'ACTIVE', connectionStatus: 'ONLINE', zone: { id: 'zone', name: 'Khu MOCK', farm } };
  const errors = [], mutations = [], checks = []; let previews = 0, fail = false;
  await context.addInitScript(() => sessionStorage.setItem('smart_agriculture_access_token', 'offline-mock-token-not-valid-on-server'));
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.method() !== 'GET') { mutations.push(request.method() + ' ' + url.pathname); return route.abort('blockedbyclient'); }
    let data;
    if (url.pathname === '/api/shadow-preview') {
      previews++;
      if (fail) return route.fulfill({ status: 500, headers, json: { message: 'Lỗi API mô phỏng' } });
      try { data = previewShadow(Object.fromEntries(url.searchParams), new Date().toISOString()); }
      catch { return route.fulfill({ status: 400, headers, json: { message: 'Tham số mô phỏng không hợp lệ' } }); }
      if (url.searchParams.get('soilMoisture') === '11') await pause(400);
    } else if (url.pathname === '/api/auth/me') data = { user };
    else if (url.pathname === '/api/devices') data = { items: [device], pagination: { total: 1 } };
    else if (url.pathname === '/api/farms') data = { items: [farm], pagination: { total: 1 } };
    else if (url.pathname.includes('summary')) data = { total: 0, active: 0, on: 0, off: 0, unknown: 0, unavailable: 0 };
    else data = { items: [], pagination: { total: 0 } };
    try { await route.fulfill({ headers, json: { success: true, data } }); } catch { /* cancelled/unmounted request */ }
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const reason = async expected => { await page.waitForFunction(text => document.querySelector('[data-testid="shadow-reason"]')?.textContent === text, expected); };
  async function change(label, value, select = false) { const field = page.getByLabel(label, { exact: true }); if (select) await field.selectOption(value); else await field.fill(String(value)); }
  async function submit(expected) {
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/shadow-preview'), page.getByRole('button', { name: 'Chạy mô phỏng', exact: true }).click()]);
    await reason(expected); checks.push(expected);
  }
  async function reset() { await page.getByRole('button', { name: 'Đặt lại fixture', exact: true }).click(); await reason('SOIL_BELOW_THRESHOLD'); }
  try {
    await page.goto('http://127.0.0.1:5173/irrigation', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Mô phỏng tưới tự động', exact: true }).click(); await reason('SOIL_BELOW_THRESHOLD');
    await page.getByRole('checkbox').uncheck();
    assert.match(await page.locator('main').innerText(), /CHẾ ĐỘ SHADOW — KHÔNG ĐIỀU KHIỂN MÁY BƠM/);
    await page.screenshot({ path: path.join(output, 'shadow-would-on.png'), fullPage: true });
    for (const [value, code] of [[0, 'SOIL_BELOW_THRESHOLD'], [100, 'SOIL_MOISTURE_SUFFICIENT'], [20, 'HYSTERESIS_IDLE'], [40, 'SOIL_MOISTURE_SUFFICIENT']]) {
      await change('SOIL_01 mô phỏng (%)', value); await submit(code);
    }
    const scenarios = [
      ['Clock health mô phỏng', 'UNKNOWN', 'CLOCK_UNKNOWN'], ['ESP32 mô phỏng', 'OFFLINE', 'DEVICE_NOT_ONLINE'],
      ['Relay mô phỏng', 'UNKNOWN', 'PUMP_STATE_UNKNOWN'], ['Dữ liệu cảm biến mô phỏng', 'STALE', 'STALE_READING'],
      ['Dữ liệu cảm biến mô phỏng', 'FUTURE', 'FUTURE_READING'], ['Fault latch mô phỏng', 'true', 'FAULT_LATCHED'],
      ['Cycle mô phỏng đầu vào', 'PENDING_ACK', 'COMMAND_PENDING'],
    ];
    for (const [label, value, code] of scenarios) { await reset(); await change(label, value, true); await submit(code); }
    for (const [label, value, code] of [['Cooldown còn lại (giây)', 10, 'COOLDOWN_ACTIVE'], ['Soak còn lại (giây)', 10, 'SOAK_ACTIVE'], ['Lượt đã giữ trong ngày', 3, 'DAILY_RUN_LIMIT'], ['Ngân sách đã giữ (giây)', 3, 'DAILY_BUDGET_EXHAUSTED']]) {
      await reset(); await change(label, value); await submit(code);
    }
    await page.screenshot({ path: path.join(output, 'shadow-blocked.png'), fullPage: true });
    await reset(); await change('SOIL_01 mô phỏng (%)', 30); await change('Cycle mô phỏng đầu vào', 'REEVALUATE', true); await submit('HYSTERESIS_HOLD');
    await reset(); await change('SOIL_01 mô phỏng (%)', 11); await page.getByRole('button', { name: 'Chạy mô phỏng', exact: true }).click();
    await change('SOIL_01 mô phỏng (%)', 85); await submit('SOIL_MOISTURE_SUFFICIENT'); await pause(600); await reason('SOIL_MOISTURE_SUFFICIENT'); checks.push('stale response ignored');
    fail = true; await page.getByRole('button', { name: 'Làm mới kết quả', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Lỗi API mô phỏng' }).waitFor(); checks.push('mock error visible');
    fail = false; await submit('SOIL_MOISTURE_SUFFICIENT');
    await page.getByRole('checkbox').check(); const before = previews; await pause(11000); assert.ok(previews > before); checks.push('10-second GET polling');
    await page.getByRole('button', { name: 'Lịch sử lệnh', exact: true }).click(); await pause(300);
    const afterUnmount = previews; await pause(11000); assert.equal(previews, afterUnmount); checks.push('unmount stops polling');
    await page.getByRole('button', { name: 'Mô phỏng tưới tự động', exact: true }).click(); await reason('SOIL_BELOW_THRESHOLD'); checks.push('navigation resets ephemeral state');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Mô phỏng tưới tự động', exact: true }).click(); await reason('SOIL_BELOW_THRESHOLD'); checks.push('refresh restores defaults');
    assert.deepEqual(mutations, []); assert.deepEqual(errors, []);
    const result = { status: 'PASS', browser: 'Headless Edge', mockOnly: true, strictMode: true, checks, previewRequests: previews, mutationRequests: mutations, pageErrors: errors, mqttPublished: 0, deviceCommandCreated: 0, productionDbWrites: 0 };
    fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
