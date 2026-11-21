// Synthetic report generation only. No browser, network, database or device is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(window = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/visual-report.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Intl, Date, window, require(name) { throw Error(`Unexpected dependency: ${name}`); } });
  return exports;
}
function fixture() {
  return {
    query: { from: '2026-11-09T17:00:00.000Z', to: '2026-11-16T16:59:59.999Z' },
    farmName: 'Trang trại minh họa', zoneName: 'Khu A', generatedAt: new Date('2026-11-16T01:00:00.000Z'),
    overview: { farmCount: 1, zoneCount: 2, cropCount: 2, deviceCount: 2, deviceOnline: 1, deviceOffline: 1, sensorCount: 4, sensorReadingCount: 3000, newAlertCount: 3, activeAlertCount: 1 },
    sensors: [
      { sensorType: 'TEMP', unit: '°C', readingCount: 750, minimum: -5, average: 20, maximum: 30, latest: { value: 29, recordedAt: '2026-11-16T00:00:00.000Z' } },
      { sensorType: 'LIGHT', unit: 'lux', readingCount: 0, minimum: null, average: null, maximum: null, latest: null },
    ],
    alerts: { info: 0, warning: 2, critical: 1, totalOpened: 3, totalResolved: 1, averageResolutionMinutes: null },
    irrigation: { totalCommands: 5, manualCommands: 3, automationCommands: 2, successfulCommands: 3, failedCommands: 1, pendingCommands: 1, successRate: 0.6 },
    automation: { totalRules: 1, enabledRules: 0, automaticCommands: 2, rulesWithCommands: 1, rulesWithoutCommands: 0, breakdown: [{ ruleName: 'Tưới Khu A', zone: 'Khu A', commandCount: 2, successfulCommands: 1, failedCommands: 1 }] },
  };
}
const { buildVisualReport } = load();
test('standalone report includes vector charts and essential sections', () => {
  const html = buildVisualReport(fixture());
  assert.ok((html.match(/<svg /g) || []).length >= 4);
  for (const text of ['Tổng quan hệ thống', 'Chỉ số môi trường', 'Mức độ cảnh báo', 'Nguồn lệnh tưới', 'Kết quả xử lý lệnh', 'Hoạt động theo quy tắc', 'Lưu dưới dạng PDF']) assert.ok(html.includes(text), text);
  assert.match(html, /@page\{size:A4/);
});
test('uses exact applied period in UTC+7', () => {
  const html = buildVisualReport(fixture());
  assert.match(html, /10\/11\/2026/); assert.match(html, /16\/11\/2026/); assert.match(html, /UTC\+7/);
});
test('sensor charts keep units separate and do not invent a time series', () => {
  const html = buildVisualReport(fixture());
  assert.match(html, /20 °C/); assert.match(html, /lux/);
  assert.match(html, /không phải biểu đồ diễn biến theo thời gian/);
});
test('missing measurements stay missing, not fabricated zero readings', () => {
  const html = buildVisualReport(fixture());
  assert.match(html, /Chưa có dữ liệu đo/); assert.match(html, /Mới nhất: <b>— lux/);
});
test('negative values and all-zero charts never create negative SVG heights or NaN', () => {
  const data = fixture(); data.alerts.info = data.alerts.warning = data.alerts.critical = 0;
  const html = buildVisualReport(data);
  assert.match(html, /-5 °C/); assert.doesNotMatch(html, /height="-|NaN|Infinity/);
});
test('escapes untrusted farm, zone, unit and rule labels', () => {
  const data = fixture(); data.farmName = '<img src=x onerror=alert(1)>'; data.zoneName = '<script>bad()</script>';
  data.automation.breakdown[0].ruleName = 'Rule <b>unsafe</b>'; data.sensors[0].unit = '" onload="bad()';
  const html = buildVisualReport(data);
  assert.doesNotMatch(html, /<img|<script|<b>unsafe<\/b>/);
  assert.match(html, /&lt;img/); assert.match(html, /&lt;script/); assert.match(html, /&quot; onload=&quot;/);
});
test('no external resource or credentials are embedded', () => {
  const html = buildVisualReport(fixture());
  assert.doesNotMatch(html, /<script|<link|<img|https?:\/\/|Bearer |Authorization|fetch\(/);
});
test('does not mutate report data and explicitly limits physical interpretation', () => {
  const data = fixture(), before = JSON.stringify(data); const html = buildVisualReport(data);
  assert.equal(JSON.stringify(data), before);
  assert.match(html, /không xác nhận động cơ hoặc nước chảy/);
  assert.match(html, /không xác nhận hiệu chuẩn/);
  assert.match(html, /Đang chờ/); assert.match(html, /60%/);
});
test('blocked popup is reported, not silently treated as an export', () => {
  assert.throws(() => load({ open: () => null }).printVisualReport(fixture()), /chặn cửa sổ/);
});
test('preview is opened once, with load handler after document.open, and supports reprint', () => {
  const calls = []; let onLoad, reprint;
  const preview = { document: {
    open() { calls.push('document.open'); }, write(html) { assert.match(html, /<svg/); calls.push('write'); },
    close() { calls.push('close'); }, getElementById() { return { addEventListener(_, handler) { reprint = handler; } }; },
  }, addEventListener(_, callback) { onLoad = callback; calls.push('listener'); }, focus() {}, print() { calls.push('print'); } };
  load({ open() { calls.push('window.open'); return preview; } }).printVisualReport(fixture());
  assert.deepEqual(calls, ['window.open', 'document.open', 'write', 'listener', 'close']);
  assert.equal(preview.opener, null); onLoad(); reprint();
  assert.equal(calls.filter(value => value === 'print').length, 2);
});
