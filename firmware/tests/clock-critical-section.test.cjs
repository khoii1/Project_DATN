const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sketch = fs.readFileSync(path.join(__dirname, '../SmartAgricultureESP32/SmartAgricultureESP32.ino'), 'utf8');
const state = fs.readFileSync(path.join(__dirname, '../SmartAgricultureESP32/SntpRecovery.h'), 'utf8');
const clean = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim().replace(/\s+/g, ' ');
function checkClockSections(source) {
  const sections = [...source.matchAll(/portENTER_CRITICAL\(&clockMux\);([\s\S]*?)portEXIT_CRITICAL\(&clockMux\);/g)].map(m => clean(m[1]));
  // Exact allowlist: prevents hidden I/O, nested locks, UTC, millis or arbitrary helpers.
  assert.deepEqual(sections, ['ClockReadState read=ntpClock.load();', 'const bool committed=ntpClock.commit(read);', 'ntpClock.onCallback(mono,utc);']);
  assert.equal((source.match(/portENTER_CRITICAL\(&clockMux\)/g) || []).length, sections.length);
}
test('all three clockMux sections contain only reviewed copy/update operations', () => checkClockSections(sketch));
test('source guard rejects original gettimeofday/utcNow-under-lock regression', () => {
  assert.throws(() => checkClockSections(sketch.replace('ClockReadState read=ntpClock.load();', 'const int64_t utc=utcNow(); ClockReadState read=ntpClock.load();')));
});
test('state/header contains no I/O, newlib time, RTOS or nested locking calls', () => {
  assert.doesNotMatch(clean(state), /\b(gettimeofday|utcNow|millis|gmtime_r|localtime|printf|Serial|WiFi|mqtt|portENTER_CRITICAL|vTaskDelay|yield|mutex|semaphore)\s*(?:\(|\.)/);
  assert.doesNotMatch(clean(state), /\bvolatile\b/);
});
test('snapshot obtains time outside store locking and fails closed on bounded conflicts', () => {
  assert.match(sketch, /consistentClockSnapshot\(loadClockState,readClockTime,commitClockState,measuredUtc\)/);
  assert.match(state, /CLOCK_SNAPSHOT_ATTEMPTS=3/);
  assert.match(state, /read\.revision!=revision_/);
  assert.match(sketch, /if\(gettimeofday\(&tv,nullptr\)!=0\) return 0/);
});
test('physical and telemetry guards remain wired, not weakened by clock hotfix', () => {
  assert.match(sketch, /SMART_AGRI_FIRMWARE_VERSION\[\]="13\.4F\.1"/);
  assert.match(sketch, /if\(on && !ENABLE_PUMP_COMMANDS\) return false/);
  assert.match(sketch, /clockSampleEligible\(sample.recordedAt,sample.clockGeneration,clockSnapshot\(\)\)/);
  assert.match(sketch, /pendingOffReason.compare_exchange_strong\(empty,"PERIODIC"\)/);
  assert.match(sketch, /if\(pump->isOn\(\) && !clockReady\) \{ pump->forceOff\(\)/);
});
