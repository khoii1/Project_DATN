// Test-only closed loader: no production configuration, database or MQTT imports.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');
const root = path.resolve(__dirname, '../src');
const counts = { reads: 0, mqttPublished: 0, deviceCommandCreated: 0, dbWrites: 0, actuatorMutations: 0 };
const users = { owner: { id: 'owner', role: 'FARM_OWNER', status: 'ACTIVE' }, staff: { id: 'staff', role: 'STAFF', status: 'ACTIVE' }, outsider: { id: 'outsider', role: 'FARM_OWNER', status: 'ACTIVE' } };
const allowed = new Set(['routes/shadow-preview.route.ts', 'middlewares/auth.middleware.ts', 'middlewares/validate.middleware.ts', 'utils/app-error.ts',
  'services/shadow-preview/preview.service.ts', 'services/automatic-irrigation/decision-engine.ts', 'services/automatic-irrigation/shadow-schema.ts', 'services/pump-command-policy.ts']);
const cache = new Map();
function load(relative) {
  if (!allowed.has(relative)) throw Error('Unapproved dependency: ' + relative);
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, Date, console: { log() {}, warn() {}, error() {} }, require(specifier) {
    if (specifier === 'zod') return require('zod');
    if (specifier === 'express') return express;
    if (specifier === '@prisma/client') return { UserStatus: { ACTIVE: 'ACTIVE' } };
    if (specifier === '../utils/jwt') return { verifyAccessToken: token => { if (!users[token]) throw Error('invalid test token'); return { userId: token }; } };
    if (specifier === '../repositories/user.repository') return { userRepository: { findPublicById: async id => users[id] } };
    if (specifier === '../repositories/device.repository') return { deviceRepository: { findAccessibleById: async (id, actor) => {
      counts.reads++; return ['owner', 'staff'].includes(actor.id) && id === 'fixture-device' ? { deviceCode: 'ESP32-GF-A-01' } : null;
    } } };
    if (!specifier.startsWith('.')) throw Error('Unapproved import: ' + specifier);
    return load(path.relative(root, path.resolve(path.dirname(filename), specifier) + '.ts').replaceAll('\\', '/'));
  } }, { filename });
  cache.set(relative, exports); return exports;
}
const { previewShadow, previewQuerySchema } = load('services/shadow-preview/preview.service.ts');
function makeApp() {
  const app = express();
  app.use('/api/shadow-preview', load('routes/shadow-preview.route.ts').shadowPreviewRouter);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 401).json({ success: false, message: err.message }));
  return app;
}
module.exports = { previewShadow, previewQuerySchema, makeApp, counts, allowed, root };
