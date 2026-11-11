const test=require('node:test'),assert=require('node:assert/strict');
const {scram,url,migrations}=require('./mvp-dev-runtime.cjs');
test('DEV URL never changes host/port/database and rejects arbitrary role',()=>{
 const u=new URL(url('sa_mvp_dev_app','synthetic-only-password'));
 assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/smart_agriculture_mvp_dev');assert.equal(u.username,'sa_mvp_dev_app');assert.throws(()=>url('postgres','synthetic'),/DEV_ROLE_REFUSED/);
});
test('new TEST password is represented as salted SCRAM verifier, not plaintext SQL',()=>{
 const a=scram('synthetic-only-password'),b=scram('synthetic-only-password');assert.match(a,/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);assert.notEqual(a,b);assert.ok(!a.includes('synthetic'));
});
test('only11 approved baseline SQL migrations are selected; not proposals',()=>{const m=migrations();assert.equal(m.length,11);assert.equal(m[10].name,'20261014090000_mqtt_pump_commands');assert.ok(m.every(x=>x.checksum.length===64));});
