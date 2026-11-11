// Component SSR + service contract tests. These are NOT browser E2E.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { previewShadow } = require('../../backend/scripts/shadow-preview-harness.cjs');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, Intl, Date, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['react', 'react/jsx-runtime'].includes(name)) return require(name);
    throw Error('Unapproved dependency: ' + name);
  } }); return exports;
}
const types = load('types/shadow-preview.ts', {});
const { ShadowPreviewResult } = load('components/automation/ShadowPreviewPanel.tsx', {
  './LiveObservationPanel': {},
  '../../hooks/usePolling': {}, '../../services/device.service': {}, '../../services/api': {}, '../../services/shadow-preview.service': {}, '../../types/shadow-preview': types,
});
for (const [controls, text] of [[{}, 'WOULD_ON'], [{ soilMoisture: 45 }, 'WOULD_SKIP'], [{ clockHealth: 'UNKNOWN' }, 'BLOCKED'], [{ soilMoisture: 0 }, '0%']]) test('renders server decision: ' + text, () => {
  const value = previewShadow({ deviceId: 'fixture-device', ...controls }, '2026-10-20T12:00:00Z');
  const html = renderToStaticMarkup(React.createElement(ShadowPreviewResult, { value }));
  assert.ok(html.includes(text)); assert.match(html, /không phải live/); assert.ok(html.includes(value.reasonVi));
  if (controls.soilMoisture === 0) assert.match(html, />0%<\/dd>/);
  assert.doesNotMatch(html, /Bật thử 1 giây|Tắt tưới/);
});
test('service uses cancellable GET only, rejects fake live provenance', async () => {
  const calls = [], value = previewShadow({ deviceId: 'fixture-device' }, '2026-10-20T12:00:00Z');
  let data = value;
  const service = load('services/shadow-preview.service.ts', { './api': { api: { get: async (...args) => { calls.push(args); return { data: { data } }; } } } }).shadowPreviewService;
  const controller = new AbortController();
  await service.get('fixture-device', types.shadowDefaults, controller.signal);
  assert.equal(calls[0][0], '/shadow-preview'); assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[0][1].params.soilMoisture, 18);
  data = { ...value, source: 'VERIFIED_LIVE' }; await assert.rejects(service.get('fixture-device', types.shadowDefaults));
});
