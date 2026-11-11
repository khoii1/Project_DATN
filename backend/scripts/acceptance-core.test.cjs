// MVP checks on real service/middleware source with in-memory repositories only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const allowed = new Set(['services/auth.service.ts', 'services/farm-access.service.ts', 'middlewares/auth.middleware.ts', 'middlewares/authorize.middleware.ts', 'utils/jwt.ts', 'utils/password.ts', 'utils/app-error.ts', 'utils/alert-condition.ts']);
function loader(mocks = {}) {
  const cache = new Map(), base = path.join(__dirname, '../src');
  function load(relative) {
    if (!allowed.has(relative)) throw Error('Unapproved production dependency: ' + relative);
    if (cache.has(relative)) return cache.get(relative);
    const filename = path.join(base, relative), exports = {};
    cache.set(relative, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (['@prisma/client', 'bcryptjs', 'jsonwebtoken'].includes(name)) return require(name);
        if (!name.startsWith('.')) throw Error('Unmocked dependency: ' + name);
        return load(path.relative(base, path.resolve(path.dirname(filename), name) + '.ts').replaceAll('\\', '/'));
      },
    }, { filename });
    return exports;
  }
  return load;
}
const fakeSecret = 'SYNTHETIC_ONLY_NOT_AN_APPLICATION_SECRET_2026';
function authFixture(user) {
  const audit = [], emails = [], updates = [];
  const load = loader({
    '../config/env': { env: { jwtSecret: fakeSecret, jwtExpiresIn: '1h' } },
    '../repositories/user.repository': {
      userRepository: {
        findByEmail: async email => { emails.push(email); return user; },
        findById: async id => (user && user.id === id ? user : null),
        findPublicById: async () => user ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone ?? null, role: user.role, status: user.status } : null,
        update: async (id, data) => {
          updates.push({ id, data });
          return { id: user.id, fullName: data.fullName ?? user.fullName, email: user.email, phone: data.phone !== undefined ? data.phone : (user.phone ?? null), role: user.role, status: user.status };
        },
      },
    },
    './activity-log.service': { recordActivity: async row => audit.push(row) },
  });
  return { load, audit, emails, updates };
}
test('login checks actual bcrypt, normalizes email, strips hash, signs JWT and audits', async () => {
  const password = 'synthetic-test-password';
  const hash = await require('bcryptjs').hash(password, 4);
  const f = authFixture({ id: 'owner', fullName: 'Test owner', email: 'owner@example.invalid', passwordHash: hash, role: 'FARM_OWNER', status: 'ACTIVE' });
  const result = await f.load('services/auth.service.ts').authService.login(' OWNER@example.invalid ', password);
  assert.equal(f.emails[0], 'owner@example.invalid');
  assert.equal('passwordHash' in result.user, false);
  const subject = f.load('utils/jwt.ts').verifyAccessToken(result.accessToken);
  assert.equal(subject.userId, 'owner'); assert.equal(subject.role, 'FARM_OWNER');
  assert.equal(f.audit.length, 1); assert.equal(f.audit[0].action, 'LOGIN_SUCCESS');
  await assert.rejects(f.load('services/auth.service.ts').authService.login('owner@example.invalid', 'wrong'), e => e.statusCode === 401);
  assert.equal(f.audit.length, 1);

  const updated = await f.load('services/auth.service.ts').authService.updateProfile('owner', { fullName: 'Updated Owner', phone: '0909123456' });
  assert.equal(updated.fullName, 'Updated Owner');
  assert.equal(updated.phone, '0909123456');
  assert.equal(f.audit.length, 2);
  assert.equal(f.audit[1].action, 'UPDATE_USER');

  await assert.rejects(
    f.load('services/auth.service.ts').authService.changePassword('owner', { currentPassword: 'wrong', newPassword: 'NewPassword123' }),
    e => e.statusCode === 400
  );
  await f.load('services/auth.service.ts').authService.changePassword('owner', { currentPassword: password, newPassword: 'NewPassword123' });
  assert.equal(f.updates.length, 2);
  assert.equal(await require('bcryptjs').compare('NewPassword123', f.updates[1].data.passwordHash), true);
  assert.equal(f.audit.length, 3);
});
test('missing/inactive users cannot login; inactive has valid password but403', async () => {
  const missing = authFixture(null);
  await assert.rejects(missing.load('services/auth.service.ts').authService.login('absent', 'wrong'), e => e.statusCode === 401);
  const hash = await require('bcryptjs').hash('synthetic', 4);
  const f = authFixture({ id: 'inactive', passwordHash: hash, status: 'INACTIVE' });
  await assert.rejects(f.load('services/auth.service.ts').authService.login('inactive', 'synthetic'), e => e.statusCode === 403);
  assert.equal(f.audit.length, 0);
});
test('JWT rejects expired, forged and incomplete tokens', () => {
  const f = authFixture(null), jwt = require('jsonwebtoken'), verify = f.load('utils/jwt.ts').verifyAccessToken;
  for (const token of [jwt.sign({ role: 'ADMIN' }, 'wrong'), jwt.sign({ role: 'ADMIN' }, fakeSecret), jwt.sign({ role: 'ADMIN' }, fakeSecret, { subject: 'admin', expiresIn: -1 }), 'not-a-token']) {
    assert.throws(() => verify(token), e => e.statusCode === 401);
  }
});
test('authentication re-reads current user status/role instead of trusting stale JWT role', async () => {
  const f = authFixture({ id: 'owner', status: 'ACTIVE', role: 'STAFF' }), jwt = f.load('utils/jwt.ts');
  const req = { headers: { authorization: 'Bearer ' + jwt.signAccessToken({ id: 'owner', role: 'ADMIN' }) } };
  let outcome;
  await f.load('middlewares/auth.middleware.ts').authenticate(req, {}, e => { outcome = e; });
  assert.equal(outcome, undefined); assert.equal(req.user.role, 'STAFF');
  for (const user of [null, { id: 'owner', status: 'INACTIVE', role: 'ADMIN' }]) {
    const closed = authFixture(user);
    await closed.load('middlewares/auth.middleware.ts').authenticate(req, {}, e => { outcome = e; });
    assert.equal(outcome.statusCode, 401);
  }
});
test('authorize rejects anonymous and wrong role', () => {
  const authorize = loader()('middlewares/authorize.middleware.ts').authorize('ADMIN');
  for (const [user, code] of [[undefined, 401], [{ role: 'STAFF' }, 403], [{ role: 'ADMIN' }, undefined]]) {
    let error; authorize({ user }, {}, e => { error = e; }); assert.equal(error?.statusCode, code);
  }
});
test('farm scope: owner/admin manage, assigned staff read, outsider404', async () => {
  const farm = { id: 'farm', ownerId: 'owner', staffAssignments: [{ staffId: 'staff' }] };
  const load = loader({ '../repositories/farm.repository': { farmRepository: { findAccessContext: async (id, actor) => id === farm.id ? { ...farm, staffAssignments: actor === 'staff' ? farm.staffAssignments : [] } : null } }, ...Object.fromEntries(['zone', 'crop', 'device', 'sensor'].map(n => ['../repositories/' + n + '.repository', {}])) });
  const service = load('services/farm-access.service.ts').farmAccessService;
  for (const actor of [{ id: 'owner', role: 'FARM_OWNER' }, { id: 'admin', role: 'ADMIN' }]) assert.equal((await service.assertFarmManageable('farm', actor)).id, 'farm');
  assert.equal((await service.assertFarmReadable('farm', { id: 'staff', role: 'STAFF' })).id, 'farm');
  for (const [id, role, method] of [['staff', 'STAFF', 'assertFarmManageable'], ['outsider', 'STAFF', 'assertFarmReadable'], ['other', 'FARM_OWNER', 'assertFarmManageable']]) {
    await assert.rejects(service[method]('farm', { id, role }), e => e.statusCode === 404);
  }
});
for (const [op, low, equal, high] of [['LT', true, false, false], ['LTE', true, true, false], ['GT', false, false, true], ['GTE', false, true, true]]) {
  test('alert boundary and recovery for ' + op, () => {
    const { violates, recovers } = loader()('utils/alert-condition.ts');
    assert.equal(violates(op, 0, 10), low); assert.equal(violates(op, 10, 10), equal); assert.equal(violates(op, 20, 10), high);
    assert.equal(recovers(op, 10, 10, null), !equal);
    assert.equal(recovers(op, op.startsWith('L') ? 12 : 8, 10, op.startsWith('L') ? 12 : 8), true);
  });
}
