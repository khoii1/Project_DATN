// Offline React SSR/component and service tests, not browser E2E. No real API/DB/MQTT.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Intl, Date, AbortController, ...globals, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    throw Error(`Unmocked dependency prohibited: ${name}`);
  } });
  return exports;
}
const policy = load('utils/irrigation-control.ts');
const labels = load('types/actuator.ts');
const { PumpCard } = load('components/actuators/PumpCard.tsx', {
  '../../types/actuator': labels, '../../utils/irrigation-control': policy,
});
function fixture(extra = {}) {
  return { actuatorCode: 'PUMP_01', name: 'Pump', status: 'ACTIVE', canControl: true, controlEnabled: true,
    currentState: 'OFF', lastStateChangedAt: '2026-10-16T14:22:01.737Z', lastCommandAt: null,
    device: { deviceCode: 'ESP32-GF-A-01', status: 'ACTIVE', connectionStatus: 'ONLINE',
      zone: { name: 'Zone', status: 'ACTIVE', farm: { status: 'ACTIVE' } } }, ...extra };
}
const render = actuator => renderToStaticMarkup(React.createElement(PumpCard, {
  actuator, canManage: false, onEdit: () => assert.fail('no edits'), onCommand: () => assert.fail('no hardware commands'),
}));
test('ON button is explicitly one second, unknown disables ON while OFF remains available', () => {
  assert.match(render(fixture()), /Bật thử 1 giây/);
  const unknown = fixture({ currentState: 'UNKNOWN' });
  assert.equal(policy.pumpPresentation(unknown).canOn, false);
  assert.equal(policy.pumpPresentation(unknown).canOff, true);
  assert.match(render(unknown), /disabled=""[^>]*>Bật thử 1 giây/);
  assert.match(render(unknown), /Chưa xác định/);
});
test('PENDING never renders confirmed ON and OFF can supersede pending ON', () => {
  const item = fixture({ latestCommand: { command: 'TURN_ON', status: 'PENDING' } });
  const html = render(item);
  assert.match(html, /Đang chờ ACK/); assert.match(html, /Đang tắt/); assert.doesNotMatch(html, /Đang bật/);
  assert.equal(policy.pumpPresentation(item).canOn, false); assert.equal(policy.pumpPresentation(item).canOff, true);
  item.latestCommand.command = 'TURN_OFF'; assert.equal(policy.pumpPresentation(item).canOff, false);
});
test('REJECTED and ACK_TIMEOUT reasons remain visible; no fake successful ON', () => {
  for (const reason of ['REJECTED: PUMP_COMMANDS_DISABLED', 'ACK_TIMEOUT']) {
    const html = render(fixture({ currentState: reason === 'ACK_TIMEOUT' ? 'UNKNOWN' : 'OFF', latestCommand: { status: 'FAILED', failureReason: reason } }));
    assert.match(html, /Thất bại/); assert.ok(html.includes(reason)); assert.doesNotMatch(html, /Đang bật/);
  }
});
test('APPLIED success displays reported state, offline masks even historical ON', () => {
  assert.match(render(fixture({ currentState: 'ON', latestCommand: { status: 'SUCCESS' } })), /Đang bật/);
  const item = fixture({ currentState: 'ON' }); item.device.connectionStatus = 'OFFLINE';
  assert.match(render(item), /Chưa xác định/); assert.doesNotMatch(render(item), /Đang bật/);
  assert.equal(policy.pumpPresentation(item).canOn, false);
});
test('locked backend and RBAC never offer active control', () => {
  assert.match(render(fixture({ controlEnabled: false })), /MQTT chưa được bật/);
  assert.doesNotMatch(render(fixture({ controlEnabled: false })), />Bật thử/);
  assert.match(render(fixture({ canControl: false })), /Chỉ xem/);
});
test('dashboard shares the tested OFF/UNKNOWN/OFFLINE policy (source wiring)', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/dashboard/DashboardPage.tsx'), 'utf8');
  assert.match(source, /const \{ available, state, canOn, canOff \} = pumpPresentation\(pump\)/);
  assert.match(source, /disabled=\{!canOn \|\| pumpLoading\}/);
  assert.match(source, /actuatorStateLabels\[state\]/);
});
test('Axios service sends ON=1s and OFF without runtime, using mocked API only', async () => {
  const sent = [];
  const { actuatorService } = load('services/actuator.service.ts', {
    '../utils/irrigation-control': policy,
    './api': { api: { post: async (url, body) => { sent.push({ url, body }); return { data: { data: {} } }; } } },
  });
  await actuatorService.command('pump', 'TURN_ON'); await actuatorService.command('pump', 'TURN_OFF');
  assert.equal(sent[0].body.maxRunSeconds, 1); assert.equal(sent[0].body.command, 'TURN_ON');
  assert.equal('maxRunSeconds' in sent[1].body, false);
});
test('real polling controller re-renders new mock API state after 2s without physical requests', async () => {
  let timer, html, calls = 0;
  const { createPollingController } = load('utils/polling.ts', {}, {
    setTimeout: (fn, ms) => { timer = { fn, ms }; return 1; }, clearTimeout: () => { timer = null; },
  });
  const controller = createPollingController({ intervalMs: 2000,
    request: async () => fixture({ currentState: calls++ ? 'OFF' : 'UNKNOWN' }),
    onSuccess: item => { html = render(item); }, onError: error => { throw error; }, isVisible: () => true,
  });
  controller.start(); assert.equal(timer.ms, 0); timer.fn(); for (let i=0;i<20;i++) await Promise.resolve();
  assert.match(html, /Chưa xác định/); assert.equal(timer.ms, 2000);
  timer.fn(); for (let i=0;i<20;i++) await Promise.resolve();
  assert.match(html, /Đang tắt/); controller.dispose(); assert.equal(timer, null);
});

test('separate OFF button remains visible for confirmed OFF and ON', () => {
  for (const currentState of ['OFF', 'ON']) {
    const html = render(fixture({ currentState }));
    assert.match(html, />Bật thử 1 giây<\/button>/);
    assert.match(html, />Tắt<\/button>/);
    assert.match(html, /tự tắt trên ESP32/);
  }
  assert.match(render(fixture({ currentState: 'ON' })), /disabled=""[^>]*>Bật thử 1 giây/);
});

test('feedback changes from PENDING to actual ACK outcome, timeout is not success', () => {
  const pending = policy.manualCommandFeedback({ status: 'PENDING', command: 'TURN_ON', failureReason: null });
  const applied = policy.manualCommandFeedback({ status: 'SUCCESS', command: 'TURN_ON', failureReason: null });
  const off = policy.manualCommandFeedback({ status: 'SUCCESS', command: 'TURN_OFF', failureReason: null });
  assert.match(pending, /đang chờ ESP32/);
  assert.match(applied, /đã xác nhận relay bật/);
  assert.match(applied, /không xác nhận nước chảy/);
  assert.match(off, /đã xác nhận relay tắt/);
  const timeout = policy.manualCommandFeedback({ status: 'FAILED', command: 'TURN_ON', failureReason: 'ACK_TIMEOUT' });
  assert.match(timeout, /Hết thời gian chờ ACK/);
  assert.doesNotMatch(timeout, /đã xác nhận relay bật/);
  assert.match(policy.manualCommandFeedback({ status: 'FAILED', command: 'TURN_ON', failureReason: 'PUMP_COMMANDS_DISABLED' }), /ESP32 từ chối/);
});
