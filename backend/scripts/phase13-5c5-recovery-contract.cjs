// PLAN + pure guards only. No DB client, child process, credentials, initdb or restore execution.
const path=require('node:path');
const PRODUCTION_SYSTEM='7472695863566132416', SYNTHETIC_TEST_SYSTEM='7698826681383327460';
const ROOT='C:/Users/Acer Swift3/AppData/Local/SmartAgriculturePostgresRecovery/phase13-5c-recovery-01';
const BACKUP_ROOT='C:/Users/Acer Swift3/AppData/Local/SmartAgriculturePostgresBackups/production/20261022-220757-53a520a7936841a38d76b3af68c700f0';
const PLAN=Object.freeze({version:1,mode:'PLAN_ONLY',host:'127.0.0.1',port:55434,root:ROOT,pgdata:ROOT+'/data',logs:ROOT+'/logs-private',evidence:ROOT+'/evidence-private',admin:'sa_recovery_dba',owner:'postgres',database:'smart_agriculture_recovery_13_5c_01',optionalReferenceDatabase:'smart_agriculture_recovery_reference_13_5c_01',operatorSid:'S-1-5-21-1432835263-483988321-3159128977-1001',allowedSids:['S-1-5-21-1432835263-483988321-3159128977-1001','S-1-5-18'],cloudBackupScope:'NOT_VERIFIED',requiresNewStorageApproval:true,requiresNewClusterApproval:true,requiresProductionDataRestoreApproval:true,clusterCreated:false,productionDataRestored:false,dump:BACKUP_ROOT+'/smart_agriculture.dump',sha256:'04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640'});
const canonical=p=>path.win32.normalize(String(p)).toLowerCase();
function fail(code){throw Error(code);}
function assertIdentity(actual,registeredSystem,{referenceApproved=false}={}){
 if(!/^\d{10,20}$/.test(String(registeredSystem)) || [PRODUCTION_SYSTEM,SYNTHETIC_TEST_SYSTEM].includes(String(registeredSystem)))fail('INDEPENDENT_REGISTERED_SYSTEM_REQUIRED');
 if(actual.systemId!==registeredSystem || actual.host!==PLAN.host || actual.port!==PLAN.port || canonical(actual.pgdata)!==canonical(PLAN.pgdata) || actual.schema!=='public' || actual.user!==PLAN.admin || !Number.isInteger(actual.versionNum) || actual.versionNum<170000 || actual.versionNum>=180000 || actual.inRecovery!==false)fail('RECOVERY_IDENTITY_MISMATCH');
 const allowed=[PLAN.database,...(referenceApproved?[PLAN.optionalReferenceDatabase]:[])];
 if(!allowed.includes(actual.database))fail('RECOVERY_DATABASE_NOT_APPROVED');
}
function assertEmptyTarget(actual,registeredSystem,options){
 assertIdentity(actual,registeredSystem,options);
 for(const key of ['userRelations','userRoutines','userTypes','nonDefaultExtensions'])if(actual[key]!==0)fail('EMPTY_RECOVERY_TARGET_REQUIRED');
 if(!Array.isArray(actual.userSchemas)||actual.userSchemas.length!==1||actual.userSchemas[0]!=='public')fail('EMPTY_RECOVERY_SCHEMAS_REQUIRED');
}
function restoreArgs(actual,registeredSystem,archive,{restoreApproved=false,referenceApproved=false,archiveSha256}={}){
 if(!restoreApproved)fail('SEPARATE_PRODUCTION_DATA_RESTORE_APPROVAL_REQUIRED');
 assertEmptyTarget(actual,registeredSystem,{referenceApproved});
 if(canonical(archive)!==canonical(PLAN.dump)||archiveSha256!==PLAN.sha256)fail('APPROVED_ARCHIVE_IDENTITY_REQUIRED');
 return ['-h',PLAN.host,'-p',String(PLAN.port),'-U',PLAN.admin,'-w','-d',actual.database,'--exit-on-error','--single-transaction',archive];
}
const IDENTITY_SQL=`SELECT current_database() AS database,current_schema() AS schema,current_user AS user,
 host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('server_version_num')::int AS version_num,
 current_setting('data_directory') AS pgdata,(SELECT system_identifier::text FROM pg_control_system()) AS system_id,
 pg_is_in_recovery() AS in_recovery;`;
module.exports={PLAN,PRODUCTION_SYSTEM,SYNTHETIC_TEST_SYSTEM,assertIdentity,assertEmptyTarget,restoreArgs,IDENTITY_SQL};
if(require.main===module)console.log(JSON.stringify(PLAN,null,2));
