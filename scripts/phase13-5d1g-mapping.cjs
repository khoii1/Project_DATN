'use strict';
const {createHash}=require('node:crypto');
const {SQL}=require('./phase13-5d1f-sql-revision.cjs');
const SOURCE_HASH='9C47BD805608012D74916033AB061495311C29AD9A588D3AAFAD36578A2F9774';
const sha=x=>createHash('sha256').update(x).digest('hex').toUpperCase();
const DATA='C:/DATN/test-instances/phase13-5d1g/data';
function mappedSql(systemId,database='smart_agriculture_d1g') {
 if(sha(SQL)!==SOURCE_HASH)throw Error('R1_SOURCE_HASH_MISMATCH');
 if(!/^\d{19}$/.test(systemId)||['7472695863566132416','7699532241714573532'].includes(systemId))throw Error('ISOLATED_SYSTEM_ID_REQUIRED');
 if(!/^smart_agriculture_d1g(?:_(?:before|held|drift|pending|missing|object|principal|oid))?$/.test(database))throw Error('DATABASE_NOT_ALLOWLISTED');
 const mappings=[
  ["'smart_agriculture'",`'${database}'`,3], ["'5432'","'55435'",3],
  ["'7472695863566132416'",`'${systemId}'`,3],
  ["'C:/Program Files/PostgreSQL/17/data'",`'${DATA}'`,3], ["'postgres'","'d1g_dba'",6]
 ];
 let sql=SQL;
 for(const [from,to,count]of mappings){if(sql.split(from).length-1!==count||SQL.includes(to))throw Error('IDENTITY_MAPPING_COUNT_OR_COLLISION');sql=sql.split(from).join(to);}
 let reverse=sql;for(const[from,to,count]of [...mappings].reverse()){if(reverse.split(to).length-1!==count)throw Error('REVERSE_COUNT_MISMATCH');reverse=reverse.split(to).join(from);}
 if(reverse!==SQL||sha(reverse)!==SOURCE_HASH)throw Error('MAPPING_NOT_BYTE_REVERSIBLE');
 return {sql,sourceSha256:SOURCE_HASH,mappedSha256:sha(sql),reverseSha256:sha(reverse),mappings:mappings.map(([from,to,count])=>({from,to,count})),database,systemId,data:DATA,port:55435};
}
module.exports={mappedSql,sha,SOURCE_HASH,DATA};
