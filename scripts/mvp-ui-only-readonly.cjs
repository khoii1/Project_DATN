// Every ORM read, including array/callback transactions, executes on a transaction
// connection whose READ ONLY setting is established before the first data query.
const READ=new Set(['findUnique','findUniqueOrThrow','findFirst','findFirstOrThrow','findMany','count','aggregate','groupBy']);
const {SCOPE}=require('./mvp-ui-only-historical.cjs');
async function readTransaction(raw,fn,options={}){
 return raw.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5000ms'");
  const [id]=await tx.$queryRawUnsafe("SELECT current_database() AS db,current_user AS role,inet_server_port() AS port,current_schema() AS schema,current_setting('transaction_read_only') AS readonly,pg_backend_pid() AS pid,pg_postmaster_start_time() AS started");
  if(id?.db!=='smart_agriculture_mvp_dev'||id.role!=='sa_mvp_dev_app'||id.port!==55433||id.schema!=='public'||id.readonly!=='on'||!Number.isInteger(id.pid))throw Error('UI_ONLY_TRANSACTION_IDENTITY_REFUSED');
  if(options.expectedStart&&Math.abs(Date.parse(id.started)/1000-options.expectedStart)>=3)throw Error('UI_ONLY_SERVER_START_REFUSED');
  options.onVerified?.({pid:id.pid,readonly:id.readonly,db:id.db,role:id.role,port:id.port,schema:id.schema});
  return fn(tx);
 },{maxWait:2000,timeout:8000,isolationLevel:'RepeatableRead'});
}
function readonlyPrisma(raw,options={}){
 const pending=new WeakMap();
 const deny=()=>{throw Error('UI_ONLY_DATABASE_OPERATION_REFUSED');};
 const run=fn=>readTransaction(raw,fn,options);
 function lazy(operation,tx){
  const execute=()=>tx?Promise.resolve().then(()=>operation(tx)):run(operation);
  const value={then:(yes,no)=>execute().then(yes,no),catch:no=>execute().catch(no),finally:fn=>execute().finally(fn)};
  pending.set(value,operation);return Object.freeze(value);
 }
 function client(tx){return new Proxy(Object.create(null),{get(_o,key){
  if(key==='then')return undefined;
  if(key==='$transaction')return input=>{
   const operation=inner=>{if(typeof input==='function')return input(client(inner));if(!Array.isArray(input)||input.some(x=>!pending.has(x)))return deny();return Promise.all(input.map(x=>pending.get(x)(inner)));};
   return tx?Promise.resolve().then(()=>operation(tx)):run(operation);
  };
  if(key==='$queryRaw')return (strings,...values)=>{
   // The sole raw call exposed to app routes is the fixed health SELECT1.
   if(!Array.isArray(strings)||strings.length!==1||strings[0].trim()!=='SELECT 1'||values.length)return deny();
   return lazy(inner=>inner.$queryRaw`SELECT 1`,tx);
  };
  if(typeof key!=='string'||key.startsWith('$')||!Object.hasOwn(raw,key))return deny();
  return new Proxy(Object.create(null),{get(_m,method){if(!READ.has(method))return deny;return(args={})=>{
   const scoped=SCOPE[key]?{...args,where:{AND:[args.where||{},{id:{in:SCOPE[key]}}]}}:args;
   // Prisma unique reads need the original unique selector at top level.
   if(SCOPE[key]&&String(method).startsWith('findUnique'))scoped.where={...args.where,AND:[args.where?.AND||{},{id:{in:SCOPE[key]}}]};
   return lazy(inner=>inner[key][method](scoped),tx);
  };}});
 }});}
 return client(null);
}
function memoryAudit(){let count=0;return{recordActivity:async()=>{count++;},snapshot:()=>({policy:'DEV_MEMORY_ONLY_NO_AUDIT_PERSISTENCE',events:count})};}
const COVERAGE_PATHS=['single','concurrent','batch','callback','nested','repository'];
function assertCoverage(evidence){
 if(evidence?.version!==1||evidence.complete!==true||!Array.isArray(evidence.paths)||evidence.paths.length!==COVERAGE_PATHS.length)throw Error('READONLY_COVERAGE_BLOCKED');
 for(const [i,name]of COVERAGE_PATHS.entries()){
  const p=evidence.paths[i];if(p.name!==name||p.transactions<(name==='concurrent'?2:1)||!Array.isArray(p.connections)||p.connections.length!==p.transactions)throw Error('READONLY_COVERAGE_BLOCKED');
  for(const id of p.connections)if(id.db!=='smart_agriculture_mvp_dev'||id.role!=='sa_mvp_dev_app'||id.port!==55433||id.schema!=='public'||id.readonly!=='on'||!Number.isInteger(id.pid))throw Error('READONLY_COVERAGE_BLOCKED');
 }
 return true;
}
function createCoverageGate(raw,options={}){
 let current='application',used=false;const rows=[];
 const prisma=readonlyPrisma(raw,{...options,onVerified:id=>{options.onVerified?.(id);rows.push({path:current,...id});}});
 return{prisma,async verify(repositoryRead){
  if(used||typeof repositoryRead!=='function')throw Error('READONLY_COVERAGE_BLOCKED');used=true;
  const paths=[];
  const run=async(name,fn)=>{current=name;const start=rows.length;await fn();const connections=rows.slice(start).map(({path,...id})=>id);paths.push({name,transactions:connections.length,connections});};
  try{
   await run('single',()=>prisma.sensorReading.count());
   await run('concurrent',()=>Promise.all([prisma.sensorReading.count(),prisma.device.count()]));
   await run('batch',()=>prisma.$transaction([prisma.sensorReading.count(),prisma.device.count()]));
   await run('callback',()=>prisma.$transaction(tx=>tx.sensorReading.count()));
   // Nested proxy transaction reuses the same already-verified SQL transaction;
   // it does not create a new Prisma client, pool, savepoint or raw escape.
   await run('nested',()=>prisma.$transaction(tx=>tx.$transaction(inner=>inner.sensorReading.count())));
   await run('repository',()=>repositoryRead(prisma));
   const evidence={version:1,complete:true,paths};assertCoverage(evidence);return evidence;
  }finally{current='application';}
 }};
}
async function buckets(prisma,sensorId,from,to,seconds){
 const rows=await prisma.sensorReading.findMany({where:{sensorId,recordedAt:{gte:from,lte:to}}});
 if(!Number.isInteger(seconds)||seconds<=0)throw Error('UI_ONLY_CHART_BUCKET_REFUSED');
 const groups=new Map();for(const row of rows){const epoch=Math.floor(new Date(row.recordedAt).getTime()/1000/seconds)*seconds;const a=groups.get(epoch)||[];a.push(row.value);groups.set(epoch,a);}
 return [...groups].sort((a,b)=>a[0]-b[0]).map(([epoch,a])=>({epoch:BigInt(epoch),value:a.reduce((s,v)=>s+v,0)/a.length,min:Math.min(...a),max:Math.max(...a),count:BigInt(a.length)}));
}
module.exports={readonlyPrisma,memoryAudit,buckets,readTransaction,createCoverageGate,assertCoverage,COVERAGE_PATHS};
