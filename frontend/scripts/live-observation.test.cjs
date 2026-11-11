const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const fixture = require('./live-observation.fixture.cjs');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, Intl, Date, Number, require(name) { if (Object.hasOwn(mocks, name)) return mocks[name]; if (['react', 'react/jsx-runtime'].includes(name)) return require(name); throw Error(name); } });
  return exports;
}
const utils = load('utils/live-observation.ts');
const { projectObservation: project } = utils;
const { LiveObservationView } = load('components/automation/LiveObservationPanel.tsx', { '../../hooks/usePolling': {}, '../../services/live-evidence.service': {}, '../../utils/live-observation': utils });
test('zero and provenance render, UTC+7, missing trust never becomes a decision', () => {
  const value = fixture(), html = renderToStaticMarkup(React.createElement(LiveObservationView, { value }));
  for (const text of ['0%', 'mock-reading-0', 'PERIODIC', 'LIVE_OBSERVED_NOT_VERIFIED', 'Persistent budget', 'Persistent cycle', 'Persistent safety', 'NOT_READY', 'NOT_PROVIDED_BY_FIRMWARE', 'GPIO']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /WOULD_ON|Bật thử 1 giây/);
  assert.match(utils.observationTime('2026-10-21T03:00:00Z'), /10:00:00/);
  assert.equal(project(value, 0).relay, 'OFF'); assert.equal(project(value, 0).readingFresh, true);
});
for (const [name, alter, expected] of [
  ['expired reading/off/presence', v => [v, 61000], 'UNKNOWN / STALE'],
  ['offline', v => [{ ...v, presence: { ...v.presence, connectionStatus: 'OFFLINE' } }, 0], 'OFFLINE'],
  ['API error', v => [v, 0, true], 'UNKNOWN (API không khả dụng)'],
]) test(name + ' invalidates OFF without a fake ON', () => {
  const state = project(...alter(fixture())); assert.equal(state.presence, expected); assert.equal(state.relay, 'UNKNOWN'); assert.equal(state.readingFresh, false);
});
for (const field of ['retain', 'dup', 'sessionId', 'generation', 'qos', 'recordedAt', 'topic']) test('reject untrusted receipt ' + field, () => {
  const v = fixture(); v.reading[field] = ({ retain: true, dup: true, sessionId: 'old', generation: 0, qos: 0, recordedAt: 'invalid', topic: 'wrong' })[field];
  assert.equal(project(v, 0).readingFresh, false);
});
test('reconnect requires new OFF in observer session, no database-only fallback', () => {
  const v = fixture(); v.observer.sessionId = 'backend-observer:NEW';
  assert.equal(project(v, 0).relay, 'UNKNOWN'); assert.equal(project(v, 0).readingFresh, false);
  v.reading = null; v.off = null; assert.equal(project(v, 0).relay, 'UNKNOWN');
});
test('OFF requires backend commit observation, not physical/publisher authentication', () => {
  const v = fixture(); v.off.sourceVerification = 'MOCK'; assert.equal(project(v, 0).relay, 'UNKNOWN');
});
test('clock stale/unknown/jump fails closed', () => {
  const v = fixture(); assert.equal(project(v, 61000).clock, 'UNKNOWN');
  v.clock.health = 'UNKNOWN'; assert.equal(project(v, 0).clock, 'UNKNOWN');
  v.clock.health = 'HEALTHY'; v.clock.clockJumpDetected = true; assert.equal(project(v, 0).clock, 'UNKNOWN');
});
test('DB mismatch and null value cannot masquerade as zero', () => {
  const v = fixture(); v.reading.reading.value = 1; assert.equal(project(v, 0).correlated, false);
  v.reading.value = null; v.reading.reading.value = null; assert.equal(project(v, 0).correlated, false);
});
test('read-only cancellable service, no trust upgrade or fixture fallback', async () => {
  let value = fixture(); const calls = [];
  const service = load('services/live-evidence.service.ts', { './api': { api: { get: async (...args) => { calls.push(args); return { data: { data: value } }; } } } }).liveEvidenceService;
  const signal = new AbortController().signal; await service.get('scoped-device', signal);
  assert.equal(calls[0][0], '/live-evidence'); assert.equal(calls[0][1].params.deviceId, 'scoped-device'); assert.equal(calls[0][1].signal, signal);
  assert.equal(calls[0][1].timeout, 20000);
  for (const change of [{ source: 'FIXTURE' }, { verifiedLiveReady: true }, { decision: {} }, { budget: {} }, { engineCalled: true }]) {
    value = fixture(change); await assert.rejects(service.get('scoped-device'));
  }
});
