'use strict';
// Synthetic data only. Not current production state or authorization.
const d=require('./phase13-5d1d-contracts.cjs'),v=require('./phase13-5d1e-validators.cjs');
const NOW='2026-10-26T01:00:00.000Z';
function fixtures() {
 const catalog={database:'smart_agriculture',principal:'offline_inspector',inRecovery:false,serverVersion:170002,address:'127.0.0.1',port:5432,systemId:d.SYSTEM_ID,
  pgdata:'C:/Program Files/PostgreSQL/17/data',serverStartedAt:'2026-10-25T01:00:00.000Z',readOnly:'on',databaseOwner:'postgres',schema:'public',schemaOwner:'pg_database_owner',
  relations:v.EXPECTED_RELATIONS.map(name=>({name,kind:'r',rls:false,forceRls:false})),columnFingerprint:'390c65cfe11f3b8695a6bc5ff21d94d4',constraintFingerprint:'2e5981464ef4017e1ad5a6854ba17cc2',commandColumns:[...v.REQUIRED_COLUMNS],conflicts:0};
 const baseline={database:catalog.database,principal:catalog.principal,inRecovery:false,address:catalog.address,port:5432,systemId:d.SYSTEM_ID,serverStartedAt:catalog.serverStartedAt,readOnly:'on',
  migrations:d.MIGRATIONS.map(([name,checksum])=>({name,checksum,finishedAt:catalog.serverStartedAt,rolledBackAt:null})),commands:{total:'58',pending:'0'},breakdown:[{status:'SUCCESS',count:'58'}],
  actuators:[{deviceCode:'ESP32-GF-A-01',actuatorCode:'PUMP_01',state:'UNKNOWN',stateAt:null}]};
 const frame={backendPid:101,snapshot:'100:101:',isolation:'repeatable read',readOnly:'on',protectedRelations:0};
 const process={before:{complete:true,processes:[],listeners:[]},after:{complete:true,processes:[],listeners:[]},attempts:[]};
 const bp={pid:303,startTicks:'639285000000000001',parentPid:302,executable:v.BROKER.executable,workingDirectory:'C:/mosquitto',entrypoint:'mosquitto'};
 const broker={endpoint:{host:v.BROKER.host,port:1883},backendEndpoint:'mqtt://172.20.10.2:1883',localAddresses:[v.BROKER.host],process:bp,processAfter:{...bp},
  listeners:[{address:'0.0.0.0',port:1883,pid:303,startTicks:bp.startTicks}],config:{path:v.BROKER.configPath,pathFromProcess:v.BROKER.configPath,approvedHash:'a'.repeat(64),observedHash:'a'.repeat(64),approvalReference:'mock-review',source:'MOCK_REVIEWED_FILE'}};
 return {postgres:[frame,catalog,JSON.parse(JSON.stringify(catalog)),baseline,JSON.parse(JSON.stringify(catalog)),{...frame,protectedRelations:6}],windows:{status:'OFFLINE_WINDOWS_FIXTURE_VALIDATED',process,broker}};
}
module.exports={NOW,fixtures};
