// Deterministic, in-memory tests. No server, credentials, database or files are written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/polling.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const rangeContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/sensor-history-range.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, rangeContext);
const { presetRange, refreshedRange } = rangeContext.exports;

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function fixture(extra = {}) {
  let now = 0, id = 0, visible = true;
  const timers = new Map(), calls = [], values = [], errors = [];
  const context = { exports: {}, AbortController,
    setTimeout: (fn, delay) => { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout: key => timers.delete(key),
  };
  vm.runInNewContext(compiled, context);
  const options = {
    request: signal => new Promise((resolve, reject) => calls.push({ signal, resolve, reject })),
    onSuccess: value => values.push(value), onError: error => errors.push(error),
    isVisible: () => visible, ...extra,
  };
  const create = () => context.exports.createPollingController(options);
  const polling = create();
  async function tick(ms = 0) {
    const end = now + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
    }
    now = end; await flush();
  }
  return { polling, create, calls, values, errors, timers, tick, setVisible: value => { visible = value; polling.visibilityChanged(); } };
}

const tests = [
  ['relative history refresh advances the end and preserves the selected duration', async () => {
    const old = presetRange('7d', new Date('2026-10-13T02:30:00Z'));
    const next = refreshedRange('7d', old, new Date('2026-10-13T02:31:00Z'));
    assert.equal(next.to, '2026-10-13T02:31:00.000Z');
    assert.equal(new Date(next.to) - new Date(next.from), 7 * 86_400_000);
    assert.notEqual(next.to, old.to);
  }],
  ['custom history refresh never expands the applied range', async () => {
    const old = { from: '2026-10-13T02:29:00Z', to: '2026-10-13T02:31:00Z' };
    assert.equal(refreshedRange('custom', old, new Date('2026-10-14T00:00:00Z')), old);
  }],
  ['foreground waits for the cancelled batch before dispatching another', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); f.setVisible(false); f.setVisible(true);
    assert.equal(f.calls.length, 1); f.calls[0].resolve('hidden'); await flush(); assert.equal(f.calls.length, 2);
    f.calls[1].resolve('visible'); await flush(); assert.deepEqual(f.values, ['visible']); f.polling.dispose();
  }],
  ['StrictMode setup/cleanup/setup dispatches only once', async () => {
    const f = fixture(); f.polling.start(); f.polling.dispose(); const next = f.create(); next.start();
    await f.tick(); assert.equal(f.calls.length, 1); next.dispose();
  }],
  ['slow requests never overlap; manual refresh is coalesced', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); await f.tick(60_000); assert.equal(f.calls.length, 1);
    const refreshes = [f.polling.refresh(), f.polling.refresh(), f.polling.refresh()];
    f.calls[0].resolve(1); await flush(); assert.equal(f.calls.length, 2);
    f.calls[1].resolve(2); await Promise.all(refreshes); await flush(); assert.equal(f.calls.length, 2);
    await f.tick(9_999); assert.equal(f.calls.length, 2); await f.tick(1); assert.equal(f.calls.length, 3); f.polling.dispose();
  }],
  ['network failure retries and recovers', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); f.calls[0].reject(new Error('offline')); await flush();
    assert.equal(f.errors.length, 1); await f.tick(10_000); f.calls[1].resolve(42); await flush();
    assert.deepEqual(f.values, [42]); f.polling.dispose();
  }],
  ['hidden tab cancels and suppresses stale responses; foreground reloads', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); f.setVisible(false); assert.equal(f.calls[0].signal.aborted, true);
    f.calls[0].resolve('stale'); await flush(); await f.tick(60_000); assert.equal(f.calls.length, 1); assert.equal(f.values.length, 0);
    f.setVisible(true); await flush(); assert.equal(f.calls.length, 2); f.calls[1].resolve('fresh'); await flush(); assert.deepEqual(f.values, ['fresh']); f.polling.dispose();
  }],
  ['unmount clears timer and ignores late completion', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); f.polling.dispose(); f.calls[0].resolve(99); await flush();
    assert.equal(f.calls[0].signal.aborted, true); assert.equal(f.values.length, 0); assert.equal(f.timers.size, 0);
  }],
  ['changing device/filter cannot commit the previous request', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); f.polling.dispose(); const next = f.create(); next.start(); await f.tick();
    f.calls[1].resolve('zone-b'); f.calls[0].resolve('zone-a'); await flush(); assert.deepEqual(f.values, ['zone-b']); next.dispose();
  }],
  ['zero and server measurement timestamp are preserved', async () => {
    const f = fixture(); f.polling.start(); await f.tick(); const value = { value: 0, recordedAt: '2026-10-13T02:30:02Z' };
    f.calls[0].resolve(value); await flush(); assert.equal(f.values[0], value); assert.equal(f.values[0].value, 0); f.polling.dispose();
  }],
  ['one failed batch member cancels siblings', async () => {
    let signal; const f = fixture({ request: current => { signal = current; return Promise.all([Promise.reject(new Error('failed')), new Promise(() => {})]); } });
    f.polling.start(); await f.tick(); assert.equal(signal.aborted, true); assert.equal(f.errors.length, 1); f.polling.dispose();
  }],
  ['initially hidden does not fetch until visible', async () => {
    const f = fixture(); f.setVisible(false); f.polling.start(); await f.tick(60_000); assert.equal(f.calls.length, 0);
    f.setVisible(true); await flush(); assert.equal(f.calls.length, 1); f.polling.dispose();
  }],
];
(async () => { for (const [name, test] of tests) { await test(); console.log(`PASS ${name}`); } console.log(`${tests.length}/${tests.length} polling tests passed`); })().catch(error => { console.error(error); process.exitCode = 1; });
