// Closed, pure loader: NO process/env/DB/MQTT/fs/network/timers in policy execution.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const names = ['identity-policy', 'soil-quality', 'readiness-policy'];
function load(name) {
  assert.ok(names.includes(name));
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/live-readiness', name + '.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, Number, Set, Math, require(name) { throw Error('Forbidden side effect dependency: ' + name); } });
  return exports;
}
const { assessPublisher, assessSession } = load('identity-policy');
const { assessSoilQuality, soilQualityProposal } = load('soil-quality');
const { assessLiveReadiness, requiredLiveGates } = load('readiness-policy');
const now = Date.parse('2026-10-21T06:00:00Z'), iso = ms => new Date(ms).toISOString();
function broker() {
  return { correlatedReceipt: true, principal: 'ESP32-GF-A-01', deviceCode: 'ESP32-GF-A-01', attestation: {
    reviewId: 'SYNTHETIC-ONLY', approved: true, principal: 'ESP32-GF-A-01', deviceCode: 'ESP32-GF-A-01', checkedAt: iso(now - 1000), expiresAt: iso(now + 60000),
    configHash: 'a'.repeat(64), runningConfigHash: 'a'.repeat(64), aclHash: 'b'.repeat(64), runningAclHash: 'b'.repeat(64),
    anonymousDenied: true, topicPrincipalBindingTested: true, credentialIsolationAudited: true, revocationAudited: true, protectedTransport: true, protectedConnectionAudit: true } };
}
test('MQTT receipt observed != authenticated publisher', () => {
  const r = assessPublisher({ correlatedReceipt: true, deviceCode: 'ESP32-GF-A-01' }, iso(now));
  assert.equal(r.level, 'OBSERVED'); assert.equal(r.packetPublisherIdentity, 'NOT_VERIFIED'); assert.equal(r.deviceIdentity, 'NOT_VERIFIED');
});
test('username/anonymous=false/client trusted flag/ACL on disk cannot attest policy', () => {
  const v = broker(); v.attestation = null; v.trusted = true; v.allowAnonymous = false;
  assert.equal(assessPublisher(v, iso(now)).level, 'OBSERVED');
});
test('no receipt cannot create OBSERVED', () => { const v = broker(); v.correlatedReceipt = false; assert.equal(assessPublisher(v, iso(now)).level, 'NOT_VERIFIED'); });
for (const key of ['approved', 'anonymousDenied', 'topicPrincipalBindingTested', 'credentialIsolationAudited', 'revocationAudited', 'protectedTransport', 'protectedConnectionAudit']) test('broker missing control ' + key, () => {
  const v = broker(); v.attestation[key] = false; assert.equal(assessPublisher(v, iso(now)).level, 'OBSERVED');
});
for (const [key, value] of [['runningAclHash', 'c'.repeat(64)], ['configHash', 'invalid'], ['principal', 'other'], ['deviceCode', 'other'], ['checkedAt', iso(now + 1)], ['expiresAt', iso(now)], ['expiresAt', iso(now + 600000)], ['checkedAt', 'invalid'], ['reviewId', '']]) test('broker evidence fails closed ' + key + ':' + value, () => {
  const v = broker(); v.attestation[key] = value; assert.equal(assessPublisher(v, iso(now)).level, 'OBSERVED');
});
test('synthetic broker attestation only upgrades policy level, NEVER packet/device identity', () => {
  const r = assessPublisher(broker(), iso(now)); assert.equal(r.level, 'BROKER_POLICY_ATTESTED'); assert.equal(r.packetPublisherIdentity, 'NOT_VERIFIED'); assert.equal(r.deviceIdentityVerifierImplemented, false);
});
function session() {
  return { observer: { id: 'backend-observer:one', generation: 1, startedAt: iso(now - 10000), connected: true },
    context: { deviceCode: 'ESP32-GF-A-01', bootId: 'SYNTHETIC-BOOT', credentialVersion: 'test-v1', establishedByTrustedAdapter: true,
      establishedAt: iso(now - 10000), expiresAt: iso(now + 30000), revoked: false },
    message: { deviceCode: 'ESP32-GF-A-01', bootId: 'SYNTHETIC-BOOT', sequence: 1, credentialVersion: 'test-v1', observerId: 'backend-observer:one', observerGeneration: 1,
      recordedAt: iso(now - 1000), receivedAt: iso(now - 900), digest: 'digest-1', retain: false, duplicate: false } };
}
const checkSession = (v, previous = null) => assessSession(v.observer, v.context, v.message, previous, iso(now));
test('session proposal observes sequence without authenticating device', () => { const r = checkSession(session()); assert.equal(r.status, 'SEQUENCE_OBSERVED'); assert.equal(r.deviceIdentityVerified, false); });
for (const [key, value] of [['bootId', undefined], ['credentialVersion', undefined], ['sequence', undefined], ['sequence', -1], ['sequence', 1.1], ['sequence', Number.MAX_SAFE_INTEGER + 1], ['observerId', 'old'], ['observerGeneration', 0], ['retain', true], ['duplicate', true], ['digest', ''], ['recordedAt', iso(now + 2001)], ['receivedAt', 'bad']]) test('session rejects ' + key + ':' + value, () => {
  const v = session(); v.message[key] = value; assert.equal(checkSession(v).status, 'NOT_VERIFIED'); assert.equal(checkSession(v).next, null);
});
test('observer cannot stand in for ESP32 boot identity', () => { const v = session(); v.context = null; assert.equal(checkSession(v).reason, 'DEVICE_SESSION_METADATA_UNPROVEN'); });
test('untrusted caller boot id does not establish session', () => { const v = session(); v.context.establishedByTrustedAdapter = false; assert.equal(checkSession(v).status, 'NOT_VERIFIED'); });
test('session revocation, expired/missing lifetime, pre-establishment message fail closed', () => {
  for (const change of [{ revoked: true }, { expiresAt: iso(now) }, { expiresAt: 'bad' }, { establishedAt: iso(now - 500) }]) {
    const v = session(); Object.assign(v.context, change); assert.equal(checkSession(v).reason, 'DEVICE_SESSION_REVOKED_OR_EXPIRED');
  }
});
test('duplicate sequence/digest and out-of-order receipt rejected, inputs immutable', () => {
  const v = session(), original = JSON.stringify(v), old = checkSession(v).next;
  assert.equal(checkSession(v, old).reason, 'DUPLICATE_OR_OUT_OF_ORDER');
  v.message.sequence = 2; assert.equal(checkSession(v, old).status, 'NOT_VERIFIED');
  v.message.digest = 'new'; v.message.receivedAt = iso(now - 950); assert.equal(checkSession(v, old).status, 'NOT_VERIFIED');
  assert.equal(JSON.stringify(session()), original);
});
test('disconnect/generation invalidate cursor; old callback cannot be reused', () => {
  const v = session(), old = checkSession(v).next; v.observer.connected = false; assert.equal(checkSession(v, old).reason, 'OBSERVER_INVALIDATED');
  v.observer.connected = true; v.observer.generation = 2; assert.equal(checkSession(v, old).reason, 'OBSERVER_SESSION_MISMATCH');
  v.message.observerGeneration = 2; v.observer.startedAt = iso(now - 500); assert.equal(checkSession(v, old).reason, 'SESSION_TIME_UNTRUSTED');
  v.message.recordedAt = iso(now); v.message.receivedAt = iso(now); assert.equal(checkSession(v, old).reason, 'DUPLICATE_OR_OUT_OF_ORDER');
  v.message.sequence = 2; v.message.digest = 'fresh-after-reconnect'; assert.equal(checkSession(v, old).status, 'SEQUENCE_OBSERVED');
});
test('boot/credential rotation requires explicit trusted re-establishment', () => {
  const v = session(), old = checkSession(v).next; v.message.bootId = 'new'; assert.equal(checkSession(v, old).reason, 'DEVICE_SESSION_MISMATCH');
  v.context.bootId = 'new'; assert.equal(checkSession(v, old).reason, 'EXPLICIT_SESSION_REESTABLISHMENT_REQUIRED');
  v.message.bootId = v.context.bootId = 'SYNTHETIC-BOOT'; v.message.credentialVersion = v.context.credentialVersion = 'v2';
  assert.equal(checkSession(v, old).reason, 'EXPLICIT_SESSION_REESTABLISHMENT_REQUIRED');
});
const policy = () => ({ ...soilQualityProposal, approvedForObservation: true, calibration: { ...soilQualityProposal.calibration, approved: true } });
function soil(index = 0, value = 30, overrides = {}) {
  return { readingId: 'synthetic-' + index, deviceCode: 'ESP32-GF-A-01', sensorCode: 'SOIL_01', source: 'MQTT', value,
    recordedAt: iso(now + index * 15000), receivedAt: iso(now + index * 15000 + 10), observerSession: 'backend-observer:one',
    rawAdc: Math.round(3500 - value / 100 * 1993), calibrationVersion: soilQualityProposal.calibration.version, disconnected: false, ...overrides };
}
function quality(edit = v => v, history = [soil(-2, 29), soil(-1, 29.5)], p = policy()) { return assessSoilQuality(edit(soil()), history, p, iso(now + 100)); }
test('synthetic fully described consecutive samples valid OBSERVED, not irrigation permission', () => {
  const r = quality(); assert.equal(r.status, 'VALID_OBSERVED'); assert.equal(r.consecutiveValidSamples, 3); assert.equal(r.irrigationAuthorized, false); assert.equal(r.publisherIdentityVerified, false);
});
test('real v1 metadata absent -> NOT_VERIFIED even 30%', () => {
  const r = quality(v => { delete v.rawAdc; delete v.calibrationVersion; delete v.disconnected; return v; }, [], soilQualityProposal);
  assert.equal(r.status, 'NOT_VERIFIED'); for (const code of ['RAW_ADC_MISSING', 'CALIBRATION_VERSION_MISSING', 'CONTACT_HEALTH_MISSING']) assert.ok(r.reasons.includes(code));
});
for (const [key, value, status] of [['value', null, 'INVALID'], ['value', NaN, 'INVALID'], ['value', Infinity, 'INVALID'], ['value', -1, 'INVALID'], ['value', 101, 'INVALID'], ['source', 'HTTP', 'INVALID'], ['sensorCode', 'TEMP_01', 'INVALID'], ['deviceCode', 'OTHER', 'INVALID'], ['rawAdc', 0, 'INVALID'], ['rawAdc', 4095, 'INVALID'], ['rawAdc', 4096, 'INVALID'], ['rawAdc', 2500.5, 'INVALID'], ['rawAdc', undefined, 'NOT_VERIFIED'], ['calibrationVersion', undefined, 'NOT_VERIFIED'], ['calibrationVersion', 'other', 'INVALID'], ['disconnected', true, 'INVALID'], ['recordedAt', iso(now - 45001), 'INVALID'], ['receivedAt', iso(now - 45001), 'INVALID'], ['recordedAt', iso(now + 2200), 'INVALID'], ['receivedAt', 'bad', 'INVALID']]) test('soil ' + key + ':' + value, () => {
  assert.equal(quality(v => ({ ...v, [key]: value })).status, status);
});
for (const [value, rawAdc] of [[0, 3500], [100, 1507], [0, 3700], [100, 1400]]) test('soil endpoint/clamp ' + value + '/' + rawAdc + ' remains value not missing', () => {
  const r = quality(v => ({ ...v, value, rawAdc })); assert.equal(r.status, 'SUSPECT'); assert.equal(r.value, value); assert.ok(r.reasons.includes('ENDPOINT_CLAMP_POSSIBLE'));
});
test('stuck/noise/spike/rate flagged', () => {
  assert.ok(quality(v => v, [soil(-3), soil(-2), soil(-1)]).reasons.includes('STUCK_READING_SUSPECTED'));
  const noisy = quality(v => ({ ...v, value: 90, rawAdc: 1706 }), [soil(-2, 10), soil(-1, 80)]);
  assert.equal(noisy.status, 'SUSPECT'); assert.ok(noisy.reasons.includes('NOISY_WINDOW')); assert.ok(noisy.reasons.includes('OUTLIER_SPIKE'));
  assert.ok(quality(v => ({ ...v, value: 50, rawAdc: 2504 }), [soil(-1, 30, { recordedAt: iso(now - 1000) })]).reasons.includes('RATE_OF_CHANGE'));
});
test('ADC percent mismatch is suspect', () => { assert.ok(quality(v => ({ ...v, rawAdc: 2000 })).reasons.includes('ADC_PERCENT_MISMATCH')); });
test('missing consecutive window, duplicates, cross-session, old/future/invalid history cannot pass', () => {
  for (const history of [[], [soil(-1)], [soil(-1), soil(-1)], [soil(-2, 29, { observerSession: 'old' }), soil(-1, 29.5)],
    [soil(-2, 29, { recordedAt: 'invalid' }), soil(-1)], [soil(1), soil(-1)], [soil(-20), soil(-19)]]) assert.notEqual(quality(v => v, history).status, 'VALID_OBSERVED');
});
test('quality evidence expiry based on earlier recorded/received time, no timestamp rewrite or mutation', () => {
  const v = soil(), h = [soil(-2, 29), soil(-1, 29.5)], before = JSON.stringify({ v, h });
  const r = assessSoilQuality(v, h, policy(), iso(now + 100)); assert.equal(r.validUntil, iso(now + 45000)); assert.equal(JSON.stringify({ v, h }), before);
  assert.equal(assessSoilQuality(v, h, policy(), iso(now + 45001)).status, 'INVALID');
});
test('missing sampling interval breaks a consecutive valid streak', () => {
  const r = quality(v => v, [soil(-6, 29), soil(-5, 29.5)]); assert.equal(r.status, 'NOT_VERIFIED'); assert.equal(r.consecutiveValidSamples, 1);
});
test('unapproved proposal and invalid policy/calibration fail closed', () => {
  assert.equal(quality(v => v, undefined, soilQualityProposal).status, 'NOT_VERIFIED');
  for (const changes of [{ ttlMs: 60000 }, { consecutiveSamples: 0 }, { maxNoiseStdDev: NaN }, { calibration: { ...policy().calibration, dryAdc: 0 } }]) assert.equal(quality(v => v, undefined, { ...policy(), ...changes }).status, 'INVALID');
});
const clock = () => ({ health: 'HEALTHY', checkedAt: iso(now - 1000), ttlMs: 60000, clockJumpDetected: false, offsetMs: 10, lastSyncError: 0, leapIndicator: 0,
  source: 'time.windows.com,0x8', stratum: 5, lastSuccessfulSync: iso(now - 60000) });
const gates = () => Object.fromEntries(requiredLiveGates.map(key => [key, { status: 'PASS', evidenceId: 'synthetic-evidence-' + key, checkedAt: iso(now - 1000), expiresAt: iso(now + 30000) }]));
test('all synthetic gates PASS still cannot enable production VERIFIED_LIVE or engine', () => {
  const r = assessLiveReadiness(gates(), clock(), iso(now)); assert.equal(r.observationConditionsComplete, true);
  for (const key of ['verifiedLiveReady', 'engineCalled', 'commandCreated', 'automationActive']) assert.equal(r[key], false);
});
for (const key of requiredLiveGates) test('readiness missing ' + key, () => {
  const v = gates(); delete v[key]; const r = assessLiveReadiness(v, clock(), iso(now));
  assert.equal(r.observationConditionsComplete, false); assert.equal(r.matrix.find(g => g.gate === key).status, 'NOT_IMPLEMENTED'); assert.equal(r.verifiedLiveReady, false);
});
for (const change of [{ health: 'UNHEALTHY' }, { health: 'UNKNOWN' }, { checkedAt: iso(now - 60001) }, { clockJumpDetected: true }, { offsetMs: 501 }, { lastSyncError: 1 }, { leapIndicator: 3 }, { source: 'other' }, { stratum: 0 }, { lastSuccessfulSync: iso(now - 3600001) }]) test('readiness clock guard ' + JSON.stringify(change), () => {
  assert.equal(assessLiveReadiness(gates(), { ...clock(), ...change }, iso(now)).observationConditionsComplete, false);
});
test('missing/stale/future readiness evidence cannot be PASS', () => {
  for (const change of [{ evidenceId: null }, { expiresAt: iso(now) }, { checkedAt: iso(now + 1) }, { checkedAt: 'invalid' }]) {
    const v = gates(); v.persistentBudget = { ...v.persistentBudget, ...change }; assert.equal(assessLiveReadiness(v, clock(), iso(now)).matrix.find(g => g.gate === 'persistentBudget').status, 'NOT_VERIFIED');
  }
});
test('closed import graph, no production modules import these policies; zero publish/command/DB paths', () => {
  function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []); }
  for (const file of files(path.resolve(__dirname, '../src'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.includes(path.join('services', 'live-readiness'))) {
      assert.doesNotMatch(source, /\b(?:fetch|setInterval|setTimeout|eval)\s*\(|\bprocess\.|Date\.now\(/);
      assert.doesNotMatch(source, /from ['"].*(?:database|gateway|mqtt|device-command|evaluator|env)[/'"]/);
    } else assert.doesNotMatch(source, /(?:from|require\s*\()\s*['"][^'"]*live-readiness/);
  }
});
