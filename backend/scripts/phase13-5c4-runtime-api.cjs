// Protected GET verification; one normal existing-account login, token stays in RAM.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
async function main(){
 const base='http://127.0.0.1:5000/api';
 const seed=fs.readFileSync(path.join(root,'backend/prisma/seed.ts'),'utf8');
 const credential=seed.match(/email:\s*"(owner@smartagri\.local)",\s*password:\s*"([^"]+)"/);
 if(!credential)throw Error('AUTH_METHOD_UNAVAILABLE');
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Connection':'close'},body:JSON.stringify({email:credential[1],password:credential[2]}),signal:AbortSignal.timeout(8000)});
 if(!login.ok)throw Error('AUTH_FAILED');const auth=await login.json();
 if(!auth.data?.accessToken)throw Error('AUTH_FAILED');
 const headers={Authorization:'Bearer '+auth.data.accessToken,'Connection':'close'};
 async function get(route){const r=await fetch(base+route,{headers,signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('API_FAILED');return (await r.json()).data;}
 const health=await get('/health'),live=await get('/live-evidence?deviceId=demo_device_esp32_a');
 const {actuator}=await get('/actuators/demo_actuator_pump_a');
 const result={checkedAt:new Date().toISOString(),health:{database:health.database,mqtt:health.mqtt},runtime:live.runtime,gatewayMode:actuator.gatewayMode,controlEnabled:actuator.controlEnabled,tokenPersisted:false};
 console.log(JSON.stringify(result));
}
main().catch(()=>{console.error('PROTECTED_RUNTIME_VERIFICATION_FAILED_NO_SECRET_DETAILS');process.exitCode=1;});
