const test=require('node:test'),assert=require('node:assert/strict');
const {specification}=require('./mvp-dev-direct-psql.cjs');
const {scram,url,migrations}=require('./mvp-dev-direct.cjs');
test('native auth uses one fixed TEST target and -W, no password parameter',()=>{
 const spec=specification({SystemRoot:'C:/Windows'});assert.ok(spec.args.includes('-W'));assert.ok(spec.args.includes('--port=55433'));assert.ok(spec.args.includes('--dbname=postgres'));assert.ok(spec.args.includes('--username=phase13_test_admin'));assert.equal(spec.passwordInEnvironment,false);assert.equal(spec.passwordSource,'NATIVE_CONIN_PROMPT');
});
for(const key of ['PGPASSWORD','PGPASSFILE','PGSERVICE','DATABASE_URL','OSTYPE'])test('reject inherited auth/fallback option '+key,()=>assert.throws(()=>specification({[key]:'SYNTHETIC_ONLY'}),/FORBIDDEN_AUTH_ENV/));
test('new DEV roles have distinct endpoint and generated SCRAM verifier',()=>{assert.equal(new URL(url('sa_mvp_dev_app','synthetic-only')).port,'55433');assert.notEqual(scram('synthetic-only'),scram('synthetic-only'));assert.throws(()=>url('postgres','x'));});
test('direct candidate keeps exact11 migration baseline, no proposal',()=>assert.equal(migrations().length,11));
