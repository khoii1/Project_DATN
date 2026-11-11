// Live GET/SELECT verification only. Normal auth POST, never a control request.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname,'../package.json'));
req('dotenv').config({ path: path.resolve(__dirname,'../.env'), quiet: true });
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const seed=fs.readFileSync(path.resolve(__dirname,'../prisma/seed.ts'),'utf8');
  const credentials=seed.match(/email:\s*"(owner@smartagri\.local)",\s*password:\s*"([^"]+)"/);
  if(!credentials)throw Error('EXISTING_AUTH_UNAVAILABLE');
  const base='http://127.0.0.1:5000/api';
  const previous=path.resolve(__dirname,'../../report/phase13_4a/live-evidence.json');
  if(fs.existsSync(previous))fs.copyFileSync(previous,path.join(path.dirname(previous),'previous-'+Date.now()+'.json'));
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:credentials[1],password:credentials[2]})});
  const auth=await login.json();if(!login.ok)throw Error('AUTH_FAILED');
  const headers={Authorization:'Bearer '+auth.data.accessToken};
  const device=await prisma.device.findUnique({where:{deviceCode:'ESP32-GF-A-01'},select:{id:true}});if(!device)throw Error('DEVICE_MISSING');
  const target=base+'/live-evidence?deviceId='+encodeURIComponent(device.id),snapshots=[];
  assert.equal((await fetch(target)).status,401);
  assert.equal((await fetch(target+'&trusted=true',{headers})).status,400);
  assert.equal((await fetch(target+'&verified=true',{headers})).status,400);
  for(let i=0;i<3;i++){
    const response=await fetch(target,{headers});assert.equal(response.status,200);const payload=await response.json(),data=payload.data;
    assert.equal(data.runtime.commandsEnabled,false);assert.equal(data.runtime.automationEnabled,false);assert.equal(data.runtime.pumpTestMode,true);
    assert.equal(data.verifiedLiveReady,false);assert.equal(data.decision,null);assert.equal(data.engineCalled,false);
    const db=await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const reading=data.reading?.reading?await tx.sensorReading.findUnique({where:{id:data.reading.reading.id},select:{id:true,value:true,recordedAt:true,receivedAt:true,source:true,sensor:{select:{sensorCode:true}}}}):null;
      const device=await tx.device.findUnique({where:{deviceCode:'ESP32-GF-A-01'},select:{connectionStatus:true,lastSeenAt:true,actuators:{where:{actuatorCode:'PUMP_01'},select:{currentState:true,lastStateChangedAt:true}}}});
      const batch=data.reading?await tx.sensorReading.findMany({where:{recordedAt:new Date(data.reading.recordedAt),source:'MQTT',sensor:{device:{deviceCode:'ESP32-GF-A-01'}}},select:{id:true,value:true,source:true,recordedAt:true,receivedAt:true,sensor:{select:{sensorCode:true}}}}):[];
      if(data.reading){assert.equal(batch.length,4);assert.deepEqual(batch.map(r=>r.sensor.sensorCode).sort(),['HUM_01','LIGHT_01','SOIL_01','TEMP_01']);}
      return{reading,device,batch,pending:await tx.deviceCommand.count({where:{status:'PENDING'}})};
    });
    if(data.reading?.reading){assert.equal(db.reading.id,data.reading.reading.id);assert.equal(db.reading.value,data.reading.value);assert.equal(db.reading.recordedAt.toISOString(),data.reading.recordedAt);assert.equal(db.reading.receivedAt.toISOString(),data.reading.reading.dbReceivedAt);}
    assert.equal(db.pending,0);snapshots.push({at:new Date().toISOString(),data,database:db});
    console.log(JSON.stringify({sample:i+1,clock:data.clock.health,source:data.source,hasReading:!!data.reading,hasOff:!!data.off,online:db.device.connectionStatus,pending:db.pending}));
    if(i<2)await new Promise(r=>setTimeout(r,15000));
  }
  const dir=path.resolve(__dirname,'../../report/phase13_4a');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'live-evidence.json'),JSON.stringify({snapshots,unauthenticated:401,trustInjectionRejected:400,commandsPublished:0,productionManuallyMutated:false},null,2));
  console.log(JSON.stringify({complete:true,distinctReadings:new Set(snapshots.map(s=>s.data.reading?.reading?.id).filter(Boolean)).size,clock:snapshots.map(s=>s.data.clock.health)}));
}
main().catch(e=>{console.error(JSON.stringify({status:'VERIFICATION_STOP',type:e.name,code:e.code}));process.exitCode=1;}).finally(()=>prisma.$disconnect());
