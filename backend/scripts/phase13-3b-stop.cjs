// Stop ONLY the approved native cluster, retain every data/log/credential file.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const ctx = require('./phase13-3b-test-context.cjs');
async function main() {
  const c = new PrismaClient({ datasourceUrl: ctx.testUrl('admin', 'public', 'postgres') });
  let identity;
  try { identity = await ctx.verify(c, 'phase13_test_admin', 'postgres', 'public', c); }
  finally { await c.$disconnect(); }
  const result = spawnSync('C:\\Program Files\\PostgreSQL\\17\\bin\\pg_ctl.exe', ['-D', path.join(ctx.root, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
  if (result.status !== 0) throw Error('TEST_CLUSTER_STOP_FAILED');
  const listening = await new Promise(resolve => { const s = net.connect({ host: '127.0.0.1', port: 55433 }); s.once('connect', () => { s.destroy(); resolve(true); }); s.once('error', () => resolve(false)); });
  if (listening) throw Error('TEST_PORT_STILL_LISTENING');
  const evidence = { stoppedAt: new Date().toISOString(), identity, testClusterStopped: true, testPortListening: false, dataRetained: fs.existsSync(path.join(ctx.root, 'data/PG_VERSION')), productionServiceTouched: false };
  fs.writeFileSync(path.join(ctx.root, 'shutdown-evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}
main().catch(e => { console.error(JSON.stringify({status:'STOP_FAILED',code:e.code,type:e.name}));process.exitCode=1;});
