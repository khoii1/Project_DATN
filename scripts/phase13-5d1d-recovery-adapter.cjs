'use strict';
// Candidate specification, not a production executor. Import does not read local state or start anything.
const contracts = require('./phase13-5d1d-contracts.cjs');
function prepare(options = {}) {
  if (options.mode && options.mode !== 'PLAN_ONLY') throw Error('PRODUCTION_STARTUP_NOT_AUTHORIZED');
  if (Object.keys(options).some(k => !['mode','plan','evidence','now'].includes(k))) throw Error('UNAPPROVED_ADAPTER_OPTION');
  const plan = contracts.buildPlan(options.plan);
  return { plan, assessment: contracts.validatePreStart(plan, options.evidence, options.now), productionAuthorized: false, launched: false };
}
function executeProduction() { throw Error('PRODUCTION_STARTUP_NOT_AUTHORIZED'); }
async function runSynthetic(options) {
  if (!options || options.testApproval !== 'PHASE13_5D1D_OFFLINE_ONLY') throw Error('OFFLINE_TEST_APPROVAL_REQUIRED');
  if (Object.keys(options).some(k => !['testApproval','plan','evidence','now','scenario','loseWrapperHeartbeat','wrongStopIdentity'].includes(k))) throw Error('UNAPPROVED_SYNTHETIC_OPTION');
  const candidate = prepare({ plan: options.plan, evidence: options.evidence, now: options.now });
  if (candidate.assessment.status !== 'MOCK_CONTRACT_PASS') return { status: 'BLOCKED', launched: false, productionAuthorized: false, assessment: candidate.assessment };
  // Lazy reuse of the unchanged, hash-pinned D.1C SYNTHETIC adapter only.
  // No candidate executable/arguments/environment are passed to this fixture runner.
  const launcher = require('./phase13-5d1c-launcher.cjs');
  const result = await launcher.launch({ mode: 'SYNTHETIC', approval: 'PHASE13_5D1C_OFFLINE_ONLY',
    runId: candidate.plan.runId, scenario: options.scenario || 'graceful', loseWrapperHeartbeat: options.loseWrapperHeartbeat === true,
    wrongStopIdentity: options.wrongStopIdentity === true });
  return { phase: '13.5D.1D', status: !result.failure && result.exit?.exitCode === 0 ? 'SYNTHETIC_PASS' : 'BLOCKED',
    productionAuthorized: false, launched: true, syntheticOnly: true, result };
}
module.exports = { prepare, executeProduction, runSynthetic, ...contracts };
if (require.main === module) {
  if (process.argv.length > 2) { console.error('PRODUCTION_STARTUP_NOT_AUTHORIZED'); process.exitCode = 2; }
  else console.log(JSON.stringify({ phase: '13.5D.1D', mode: 'PLAN_ONLY', productionAuthorized: false, launched: false }));
}
