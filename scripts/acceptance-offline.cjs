// Explicit allowlist: no API/SQL/browser/launcher suites, no .env, no startup.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const guard = path.join(__dirname, 'acceptance-offline-guard.cjs');
const groups = [
  ['guard', ['scripts/acceptance-offline-guard.test.cjs']],
  ['backend', [
    'acceptance-core',
    'device-presence', 'mqtt-pump', 'shadow-irrigation', 'shadow-preview',
    'irrigation-persistence', 'durable-irrigation', 'live-provenance', 'live-readiness', 'soil-metadata-proposal',
  ].map(n => `backend/scripts/${n}.test.cjs`)],
  ['frontend', ['irrigation', 'shadow-preview', 'live-observation'].map(n => `frontend/scripts/${n}.test.cjs`)],
];
function main(args) {
  if (args.length) throw new Error('No targets, live modes or override arguments accepted');
  const output = path.join(root, 'build', 'project-acceptance', 'offline-' + Date.now());
  fs.mkdirSync(output, { recursive: true });
  // Credentials and NODE_OPTIONS are not inherited. Values below are nonfunctional test sentinels.
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH', 'Path'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  Object.assign(env, { NODE_ENV: 'test', MQTT_COMMANDS_ENABLED: 'false', MQTT_AUTOMATION_COMMANDS_ENABLED: 'false', MQTT_PUMP_TEST_MODE: 'true' });
  const results = [];
  for (const [name, files] of [...groups, ['polling', ['frontend/scripts/polling.test.cjs']]]) {
    const args = ['--require', guard, ...(name === 'polling' ? [] : ['--test', '--test-concurrency=1']), ...files];
    const r = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    fs.writeFileSync(path.join(output, name + '.log'), r.stdout + '\n' + r.stderr, { flag: 'wx' });
    const extract = key => Number(r.stdout.match(new RegExp('^# ' + key + ' (\\d+)$', 'm'))?.[1] ?? 0);
    const pass = name === 'polling' ? Number(r.stdout.match(/(\d+)\/\d+ polling tests passed/)?.[1] ?? 0) : extract('pass');
    const result = { name, files, exitCode: r.status, signal: r.signal, error: r.error?.code ?? null, pass, fail: extract('fail'), skipped: extract('skipped') };
    results.push(result);
    console.log(JSON.stringify(result));
    if (r.status !== 0 || r.signal || r.error || !pass) break;
  }
  const success = results.length === groups.length + 1 && results.every(r => r.exitCode === 0 && !r.signal && !r.error && r.pass > 0 && !r.fail);
  const summary = { status: success ? 'PASS' : 'FAIL', kind: 'OFFLINE_ONLY', at: new Date().toISOString(), results, totalPass: results.reduce((sum, r) => sum + r.pass, 0), productionVerification: false };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ status: summary.status, totalPass: summary.totalPass, output }));
  if (!success) process.exitCode = 1;
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { groups };
