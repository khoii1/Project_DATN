'use strict';
// Separate controlled resume entrypoint. The original root-must-not-exist path is not called.
if(require.main===module) {
 require('./phase13-5d1g-isolated-run.cjs').runApprovedResume().catch(error=>{
  console.error(JSON.stringify({status:'STOP',reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'CONTROLLED_RESUME_FAILED_REDACTED',productionConnected:false}));
  process.exitCode=1;
 });
}
