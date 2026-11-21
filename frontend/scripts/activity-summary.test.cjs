// Offline presentation and scoped context tests; no API, DB, MQTT or device access.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}
const { activitySummary } = load('../src/utils/activity-summary.ts');
const log = { action: 'ISSUE_DEVICE_COMMAND', description: 'Quản trị viên yêu cầu TURN_OFF "PUMP_01"; PENDING; MQTT' };

test('OFF names the area without codes or delivery metadata', () => {
  assert.equal(activitySummary({ ...log, commandContext: { command: 'TURN_OFF', zoneName: 'Khu A' } }), 'Yêu cầu tắt bơm tại Khu A');
});
test('ON remains a request, not a claim of physical success', () => {
  assert.equal(activitySummary({ ...log, commandContext: { command: 'TURN_ON', zoneName: 'Khu B' } }), 'Yêu cầu bật bơm tại Khu B');
});
test('old API without location never invents a zone', () => assert.equal(activitySummary(log), 'Yêu cầu tắt bơm'));
test('deleted command with missing metadata has a neutral fallback', () => {
  assert.equal(activitySummary({ ...log, description: 'Unrecognized command details' }), 'Yêu cầu điều khiển bơm');
});
test('empty zone is omitted', () => {
  assert.equal(activitySummary({ ...log, commandContext: { command: 'TURN_OFF', zoneName: '  ' } }), 'Yêu cầu tắt bơm');
});
test('other actions omit the actor already shown in the subtitle', () => {
  assert.equal(activitySummary({ action: 'UPDATE_AUTOMATION_RULE', description: 'Quản trị viên cập nhật quy tắc tưới tự động "Khu A"', user: { fullName: 'Quản trị viên' } }), 'Cập nhật quy tắc tưới tự động "Khu A"');
});
test('unrelated descriptions are not parsed as pump commands', () => {
  assert.equal(activitySummary({ ...log, action: 'UPDATE_DEVICE', description: 'Ghi chú TURN_OFF' }), 'Ghi chú TURN_OFF');
});
test('presentation does not mutate stored description', () => {
  const original = JSON.stringify(log); activitySummary(log); assert.equal(JSON.stringify(log), original);
});

async function contexts(items, commands) {
  const calls = [];
  const prisma = {
    activityLog: { findMany: async () => items, count: async () => items.length },
    $transaction: values => Promise.all(values),
    deviceCommand: { findMany: async query => { calls.push(query); return commands; } },
  };
  const repo = load('../../backend/src/repositories/activity-log.repository.ts', {
    '@prisma/client': { ActivityAction: { ISSUE_DEVICE_COMMAND: 'ISSUE_DEVICE_COMMAND' } },
    '../config/database': { prisma },
  });
  const result = await repo.listActivityLogs({ id: 'owner', role: 'FARM_OWNER' }, { page: 1, limit: 20 }, ['farm-a']);
  return { result, calls };
}
const row = { ...log, entityId: 'command-a', entityType: 'DEVICE_COMMAND', farmId: 'farm-a' };
const command = { id: 'command-a', command: 'TURN_OFF', actuator: { device: { zone: { name: 'Khu A', farmId: 'farm-a' } } } };
test('context uses one batched read restricted to visible IDs and allowed farms', async () => {
  const { result, calls } = await contexts([row], [command]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.id.in.join(','), 'command-a');
  assert.equal(calls[0].where.actuator.device.zone.farmId.in.join(','), 'farm-a');
  assert.equal(result.items[0].commandContext.zoneName, 'Khu A');
  assert.equal(result.items[0].description, row.description);
});
test('farm mismatch refuses location context', async () => {
  const { result } = await contexts([{ ...row, farmId: 'different-farm' }], [command]);
  assert.equal(result.items[0].commandContext, null);
});
test('missing command has no invented location', async () => {
  const { result } = await contexts([row], []); assert.equal(result.items[0].commandContext, null);
});
test('non-command logs do not trigger a command lookup', async () => {
  const { result, calls } = await contexts([{ ...row, action: 'LOGIN_SUCCESS' }], []);
  assert.equal(calls.length, 0); assert.equal(result.items[0].commandContext, null);
});
