// Pure backup target contracts. No process, filesystem, credentials or DB imports.
const PROD_SYSTEM='7472695863566132416',TEST_SYSTEM='7698826681383327460';
const SOURCE='smart_agriculture_rehearsal_0704174deb58_main';
function testIdentity(i,database){
  if(i.host!=='127.0.0.1/32'||i.port!==55433||i.system_id!==TEST_SYSTEM||i.db!==database||i.role!=='phase13_test_admin'||i.pgdata.replaceAll('\\','/').toLowerCase()!=='c:/datn/test-instances/phase13-3b/data')throw Error('ISOLATED_IDENTITY_MISMATCH');
}
function restoreTarget(database,source=SOURCE){
  if(!/^smart_agriculture_restore_13_5c_\d{14}_[a-f0-9]{6}$/.test(database)||database===source||database==='smart_agriculture')throw Error('FRESH_RESTORE_DATABASE_REQUIRED');
}
function dumpArgs(file){return ['-h','127.0.0.1','-p','55433','-U','phase13_test_admin','-w','-Fc','--lock-wait-timeout=3s','-d',SOURCE,'-f',file];}
function restoreArgs(database,file){restoreTarget(database);return ['-h','127.0.0.1','-p','55433','-U','phase13_test_admin','-w','--exit-on-error','--single-transaction','-d',database,file];}
module.exports={PROD_SYSTEM,TEST_SYSTEM,SOURCE,testIdentity,restoreTarget,dumpArgs,restoreArgs};
