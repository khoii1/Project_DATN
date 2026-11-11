'use strict';
// Trusted bootstrap, not an execution-plan field. Final bytes require separate
// review before activation; the outer operator verifies this file's public pin.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
module.exports=Object.freeze({documentFile:path.resolve(__dirname,'../../docs/FINAL_FRONTEND_THIRD_BLOCKER_PINS.json'),documentSha256:'1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55',bootstrapAnchor:Object.freeze({path:'scripts/frontend-acceptance/lineage-anchor.cjs',sha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')})});
