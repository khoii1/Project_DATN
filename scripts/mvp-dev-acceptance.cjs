const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),API='http://127.0.0.1:55001/api';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function edgeExecutable(){
 for(const executable of ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'])if(fs.existsSync(executable))return executable;
 throw Error('INSTALLED_EDGE_NOT_FOUND_NO_AUTOMATIC_DOWNLOAD');
}
async function ready(url,processRow){assert.ok(url.startsWith('http://127.0.0.1:55001/')||url==='http://127.0.0.1:55173');const end=Date.now()+25000;while(Date.now()<end){if(processRow.exit)throw Error('DEV_PROCESS_EXITED_'+processRow.label);try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.ok)return;}catch{}await pause(250);}throw Error('DEV_READY_DEADLINE');}
async function health(){const data=await(await fetch(API+'/health')).json();assert.equal(data.data.database,'connected');assert.equal(data.data.mqtt,'disabled');return data.data;}
async function seed(db,password){
 const [id]=await db.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port');assert.equal(id.db,'smart_agriculture_mvp_dev');assert.equal(id.role,'sa_mvp_dev_app');assert.equal(id.port,55433);assert.equal(await db.user.count(),0);
 const bcrypt=require(path.join(ROOT,'backend/node_modules/bcryptjs'));const passwordHash=await bcrypt.hash(password,12);
 const users=[['admin','ADMIN'],['owner-a','FARM_OWNER'],['owner-b','FARM_OWNER'],['staff','STAFF'],['staff2','STAFF'],['inactive','STAFF']];
 for(const [key,role]of users)await db.user.create({data:{id:'mvp-'+key,fullName:'MVP SIMULATOR '+key,email:key+'@mvp.invalid',passwordHash,role,status:key==='inactive'?'INACTIVE':'ACTIVE'}});
 for(const key of ['a','b']){
  await db.farm.create({data:{id:'mvp-farm-'+key,ownerId:'mvp-owner-'+key,name:'MVP SIMULATOR FARM '+key.toUpperCase(),status:'ACTIVE',description:'Synthetic demo only — no production rows'}});
  await db.zone.create({data:{id:'mvp-zone-'+key,farmId:'mvp-farm-'+key,name:'MVP SIMULATOR ZONE '+key.toUpperCase(),status:'ACTIVE'}});
  await db.device.create({data:{id:'mvp-device-'+key,zoneId:'mvp-zone-'+key,deviceCode:'MVP-SIM-'+key.toUpperCase()+'-01',name:'MVP SIMULATOR DEVICE '+key.toUpperCase(),type:'CONTROLLER',status:'ACTIVE',connectionStatus:'ONLINE',lastSeenAt:new Date(),description:'SIMULATOR presence, not an ESP32 receipt'}});
 }
 await db.farmStaffAssignment.create({data:{farmId:'mvp-farm-a',staffId:'mvp-staff',canControlIrrigation:false}});
 await db.crop.create({data:{id:'mvp-crop',zoneId:'mvp-zone-a',name:'MVP SIMULATOR TOMATO',status:'GROWING'}});
 const sensors=[['temp','TEMP_01','TEMP'],['hum','HUM_01','AIR_HUMIDITY'],['light','LIGHT_01','LIGHT'],['soil','SOIL_01','SOIL_MOISTURE']];
 for(const [key,code,type]of sensors)await db.sensor.create({data:{id:'mvp-sensor-'+key,deviceId:'mvp-device-a',sensorCode:code,name:'MVP SIMULATOR '+code,type,status:'ACTIVE'}});
 await db.sensor.create({data:{id:'mvp-sensor-other',deviceId:'mvp-device-b',sensorCode:'SOIL_01',name:'MVP OTHER FARM SOIL',type:'SOIL_MOISTURE',status:'ACTIVE'}});
 await db.sensor.create({data:{id:'mvp-sensor-empty',deviceId:'mvp-device-b',sensorCode:'TEMP_EMPTY',name:'MVP SIMULATOR NO DATA',type:'TEMP',status:'ACTIVE'}});
 const now=Date.now();for(let j=0;j<8;j++)await db.sensorReading.createMany({data:sensors.map(([key],i)=>({sensorId:'mvp-sensor-'+key,source:'SIMULATOR',value:[26+j/10,60+j,0,40+j][i],recordedAt:new Date(now-(8-j)*60000)}))});
 await db.sensorReading.create({data:{sensorId:'mvp-sensor-other',value:50,source:'SIMULATOR',recordedAt:new Date(now)}});
 await db.actuator.create({data:{id:'mvp-pump',deviceId:'mvp-device-a',actuatorCode:'MVP_PUMP_01',name:'MVP SIMULATOR PUMP — COMMANDS DISABLED',type:'PUMP',status:'ACTIVE',currentState:'UNKNOWN'}});
 await db.alertRule.create({data:{id:'mvp-alert-rule',sensorId:'mvp-sensor-soil',name:'MVP SIMULATOR soil below20',operator:'LT',threshold:20,recoveryThreshold:30,severity:'WARNING',enabled:true,createdById:'mvp-owner-a'}});
 await db.automationRule.create({data:{id:'mvp-auto-disabled',sensorId:'mvp-sensor-soil',actuatorId:'mvp-pump',name:'MVP SIMULATOR AUTO DISABLED',startThreshold:20,stopThreshold:30,enabled:false,createdById:'mvp-owner-a'}});
 await db.activityLog.create({data:{userId:'mvp-admin',farmId:'mvp-farm-a',action:'CREATE_FARM',entityType:'MVP_FIXTURE',entityId:'mvp-farm-a',description:'Synthetic MVP fixtures, no physical telemetry or irrigation'}});
 return {users:users.map(([key])=>({id:'mvp-'+key,email:key+'@mvp.invalid'})),farm:'mvp-farm-a',zone:'mvp-zone-a',device:'mvp-device-a',sensor:'mvp-sensor-soil',actuator:'mvp-pump',source:'SIMULATOR',initialReadings:33};
}
async function run({client:db,credentials,fixtures,run,clean}){
 const checks=[],failures=[],responses=[],tokens={};let seq=0;
 const scrub=v=>JSON.parse(JSON.stringify(v, (key,value)=>/password|hash|token|secret|credential/i.test(key)?'[REDACTED]':value));
 async function check(name,work){try{await work();checks.push({name,result:'PASS'});}catch(error){const row={name,result:'FAIL',code:clean(error.message).slice(0,400)};checks.push(row);failures.push(row);}}
 async function api(method,route,actor='owner-a',body){assert.ok(route.startsWith('/')&&!route.includes('://'));assert.ok(!route.match(/\/actuators\/[^/]+\/commands/),'NO_COMMAND_ENDPOINT_TESTS');const r=await fetch(API+route,{method,headers:{...(tokens[actor]?{Authorization:'Bearer '+tokens[actor]}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(6000)});const contentType=r.headers.get('content-type')||'';const data=contentType.includes('json')?await r.json():await r.text();responses.push({sequence:++seq,method,path:route,status:r.status,data:typeof data==='string'?data.slice(0,20000):scrub(data)});return{status:r.status,data,headers:r.headers};}
 await check('anonymous401',async()=>assert.equal((await api('GET','/farms','anonymous')).status,401));
 await check('invalid credentials401',async()=>assert.equal((await api('POST','/auth/login','anonymous',{email:'absent@mvp.invalid',password:'invalid-synthetic-only'})).status,401));
 await check('inactive user403',async()=>assert.equal((await api('POST','/auth/login','anonymous',{email:'inactive@mvp.invalid',password:credentials.userPassword})).status,403));
 for(const actor of ['admin','owner-a','owner-b','staff'])await check('login '+actor,async()=>{const r=await api('POST','/auth/login','anonymous',{email:actor+'@mvp.invalid',password:credentials.userPassword});assert.equal(r.status,200);assert.equal(typeof r.data.data.accessToken,'string');tokens[actor]=r.data.data.accessToken;});
 if(!tokens.admin||!tokens['owner-a']||!tokens.staff)throw Error('DEV_AUTH_REQUIRED_NO_BYPASS');
 await check('admin users allowed',async()=>assert.equal((await api('GET','/users','admin')).status,200));
 await check('staff users403',async()=>assert.equal((await api('GET','/users','staff')).status,403));
 await check('owner users403',async()=>assert.equal((await api('GET','/users')).status,403));
 await check('staff assigned farm readable',async()=>assert.equal((await api('GET','/farms/mvp-farm-a','staff')).status,200));
 await check('cross farm404',async()=>assert.equal((await api('GET','/farms/mvp-farm-b')).status,404));
 await check('staff manage403',async()=>assert.equal((await api('POST','/farms','staff',{name:'MVP denied farm'})).status,403));
 await check('farm validation400',async()=>assert.equal((await api('POST','/farms','owner-a',{name:''})).status,400));
 const created={};
 await check('farm create',async()=>{const r=await api('POST','/farms','owner-a',{name:'MVP CRUD FARM',description:'Synthetic acceptance'});assert.equal(r.status,201);created.farm=r.data.data.farm.id;});
 if(created.farm){
  await check('farm update/read',async()=>{assert.equal((await api('PATCH','/farms/'+created.farm,'owner-a',{name:'MVP CRUD FARM UPDATED'})).status,200);assert.equal((await api('GET','/farms/'+created.farm)).data.data.farm.name,'MVP CRUD FARM UPDATED');});
  await check('zone create',async()=>{const r=await api('POST','/zones','owner-a',{farmId:created.farm,name:'MVP CRUD ZONE'});assert.equal(r.status,201);created.zone=r.data.data.zone.id;});
  await check('staff assignment/create read remove',async()=>{assert.equal((await api('POST',`/farms/${created.farm}/staff`,'owner-a',{staffId:'mvp-staff2'})).status,201);assert.equal((await api('GET',`/farms/${created.farm}/staff`)).status,200);assert.equal((await api('DELETE',`/farms/${created.farm}/staff/mvp-staff2`)).status,200);});
 }
 if(created.zone){
  await check('zone update',async()=>assert.equal((await api('PATCH','/zones/'+created.zone,'owner-a',{name:'MVP ZONE UPDATED'})).status,200));
  await check('crop create update',async()=>{const r=await api('POST','/crops','owner-a',{zoneId:created.zone,name:'MVP CRUD CROP',status:'PLANNED'});assert.equal(r.status,201);created.crop=r.data.data.crop.id;assert.equal((await api('PATCH','/crops/'+created.crop,'owner-a',{status:'GROWING'})).status,200);});
  await check('device create update',async()=>{const r=await api('POST','/devices','owner-a',{zoneId:created.zone,deviceCode:'MVP-CRUD-01',name:'MVP CRUD DEVICE',type:'CONTROLLER'});assert.equal(r.status,201);created.device=r.data.data.device.id;assert.equal((await api('PATCH','/devices/'+created.device,'owner-a',{name:'MVP DEVICE UPDATED'})).status,200);});
 }
 if(created.device){
  await check('sensor create update',async()=>{const r=await api('POST','/sensors','owner-a',{deviceId:created.device,sensorCode:'TEMP_CRUD',name:'MVP CRUD TEMP',type:'TEMP'});assert.equal(r.status,201);created.sensor=r.data.data.sensor.id;assert.equal((await api('PATCH','/sensors/'+created.sensor,'owner-a',{name:'MVP SENSOR UPDATED'})).status,200);});
 }
 await check('cross farm device/sensor404',async()=>{assert.equal((await api('GET','/devices/mvp-device-b')).status,404);assert.equal((await api('GET','/sensors/mvp-sensor-other')).status,404);});
 await check('no-data differs from numeric zero',async()=>{const r=await api('GET','/devices/mvp-device-b/latest-readings','owner-b');assert.equal(r.status,200);assert.equal(r.data.data.items.find(x=>x.sensorCode==='TEMP_EMPTY').latestReading,null);});
 await check('pagination/filter',async()=>{const r=await api('GET','/devices?limit=1&page=1');assert.equal(r.status,200);assert.equal(r.data.data.items.length,1);assert.equal(r.data.data.pagination.limit,1);const p=await api('GET','/devices?farmId=mvp-farm-a');assert.ok(p.data.data.items.every(x=>x.zone.farmId==='mvp-farm-a'));});
 const from=new Date(Date.now()-86400000).toISOString(),to=new Date(Date.now()+60000).toISOString();const range=new URLSearchParams({from,to}).toString();
 await check('history source/range',async()=>{const r=await api('GET','/sensors/mvp-sensor-soil/readings?'+range);assert.equal(r.status,200);assert.ok(r.data.data.items.length>0);assert.ok(r.data.data.items.every(x=>x.source==='SIMULATOR'&&x.recordedAt>=from&&x.recordedAt<=to));});
 await check('chart points actual DB',async()=>{const r=await api('GET','/sensors/mvp-sensor-soil/chart?resolution=raw&'+range);assert.equal(r.status,200);assert.ok(r.data.data.points.length>=8);});
 await check('statistics actual DB',async()=>{const r=await api('GET','/sensors/mvp-sensor-soil/statistics?'+range);assert.equal(r.status,200);assert.ok(r.data.data.count>=8);});
 await check('empty history',async()=>{const r=await api('GET','/sensors/mvp-sensor-soil/readings?'+new URLSearchParams({from:'2020-01-01T00:00:00Z',to:'2020-01-02T00:00:00Z'}));assert.equal(r.status,200);assert.equal(r.data.data.items.length,0);});
 await check('invalid range400',async()=>assert.equal((await api('GET','/sensors/mvp-sensor-soil/chart?'+new URLSearchParams({from:to,to:from}))).status,400));
 await check('four types/zero/latest',async()=>{const r=await api('GET','/devices/mvp-device-a/latest-readings');assert.equal(r.status,200);assert.equal(r.data.data.items.length,4);assert.equal(r.data.data.items.find(x=>x.type==='LIGHT').latestReading.value,0);});
 await check('CSV DEV export',async()=>{const r=await api('GET','/reports/export?type=sensor-readings&'+range);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/attachment/);assert.ok(typeof r.data==='string'&&r.data.length>30);});
 await check('CSV cross farm404',async()=>assert.equal((await api('GET','/reports/export?type=sensor-readings&farmId=mvp-farm-b&'+range)).status,404));
 // The real ingestion service is called ONLY with this DEV datasource and SIMULATOR input.
 const {telemetryIngestionService:ingest}=require(path.join(ROOT,'backend/src/services/telemetry-ingestion.service.ts'));
 const sample=(value,at)=>ingest.ingest({deviceCode:'MVP-SIM-A-01',source:'SIMULATOR',recordedAt:new Date(at),readings:[{sensorCode:'SOIL_01',value}],evaluateAutomation:false});
 let alertId;const base=Date.now()-6000;
 await check('threshold creates OPEN',async()=>{await sample(10,base);const row=await db.alert.findFirst({where:{alertRuleId:'mvp-alert-rule',status:'OPEN'}});assert.ok(row);alertId=row.id;});
 if(alertId){
  await check('ACKNOWLEDGED via API',async()=>{assert.equal((await api('POST',`/alerts/${alertId}/acknowledge`,'staff')).status,200);assert.equal((await db.alert.findUnique({where:{id:alertId}})).status,'ACKNOWLEDGED');});
  await check('hysteresis hold',async()=>{await sample(25,base+1000);assert.equal((await db.alert.findUnique({where:{id:alertId}})).status,'ACKNOWLEDGED');});
  await check('duplicate idempotency',async()=>{const before=await db.sensorReading.count();const result=await sample(25,base+1000);assert.equal(result.created,0);assert.equal(await db.sensorReading.count(),before);});
  await check('out of order cannot resolve',async()=>{await sample(40,base-1000);assert.equal((await db.alert.findUnique({where:{id:alertId}})).status,'ACKNOWLEDGED');});
  await check('recovery RESOLVED',async()=>{await sample(35,base+2000);assert.equal((await db.alert.findUnique({where:{id:alertId}})).status,'RESOLVED');});
  await check('alert cross farm404',async()=>assert.equal((await api('GET','/alerts/'+alertId,'owner-b')).status,404));
 }
 await check('commands and automation disabled',async()=>{const r=await api('GET','/actuators');assert.equal(r.status,200);assert.ok(r.data.data.items.every(x=>x.gatewayMode==='DISABLED'&&x.controlEnabled===false));assert.equal(await db.deviceCommand.count(),0);assert.equal(await db.automationRule.count({where:{enabled:true}}),0);});
 await check('activity logs DEV writes',async()=>{const r=await api('GET','/activity-logs');assert.equal(r.status,200);assert.ok(await db.activityLog.count()>10);});
 const browser=await browserChecks({db,credentials,run,ingest});checks.push(...browser.checks);failures.push(...browser.checks.filter(x=>x.result==='FAIL'));
 await check('logout',async()=>assert.equal((await api('POST','/auth/logout','staff')).status,200));
 fs.writeFileSync(path.join(run,'api-responses.redacted.json'),JSON.stringify(responses,null,2),{flag:'wx'});
 const dataProof={identity:await db.$queryRawUnsafe('SELECT current_database() AS db,current_user AS role,inet_server_port() AS port'),readings:await db.sensorReading.groupBy({by:['source'],_count:true}),pending:await db.deviceCommand.count({where:{status:'PENDING'}}),commands:await db.deviceCommand.count(),alerts:await db.alert.groupBy({by:['status'],_count:true}),users:await db.user.count(),farmCount:await db.farm.count(),source:'SIMULATOR'};
 fs.writeFileSync(path.join(run,'db-evidence.redacted.json'),JSON.stringify(dataProof,null,2),{flag:'wx'});
 return{checks,failures,browser:browser.metadata,pass:checks.filter(x=>x.result==='PASS').length,fail:failures.length,notVerified:checks.filter(x=>x.result==='NOT_VERIFIED').length};
}
async function browserChecks({db,credentials,run,ingest}){
 const {chromium}=require('playwright-core'),checks=[],errors=[],blocked=[],requests=[];let browser;
 const step=async(name,work)=>{try{await work();checks.push({name,result:'PASS',kind:'REAL_DEV_BROWSER'});}catch(e){checks.push({name,result:'FAIL',code:e.message.slice(0,350)});}};
 try{
  browser=await chromium.launch({executablePath:edgeExecutable(),headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1050},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh',serviceWorkers:'block'});
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(!['http://127.0.0.1:55001','http://127.0.0.1:55173'].includes(u.origin)||/\/actuators\/[^/]+\/commands/.test(u.pathname)){blocked.push(u.origin+u.pathname);return route.abort();}return route.continue();});
  await ctx.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='DEVELOPMENT — SYNTHETIC SIMULATOR DATA — MQTT/PUMP DISABLED';b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#78350f;color:white;text-align:center;padding:6px;font:bold 12px sans-serif;pointer-events:none';document.body.appendChild(b);}));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(API))requests.push({path:new URL(r.url()).pathname,status:r.status()});});
  await step('browser OWNER login actual DEV API',async()=>{await page.goto('http://127.0.0.1:55173/login');await page.getByLabel('Email',{exact:true}).fill('owner-a@mvp.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill(credentials.userPassword);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Tổng quan',exact:false}).first().waitFor({timeout:10000}).catch(()=>{});});
  await step('browser dashboard4sensor/dev data',async()=>{await page.waitForFunction(()=>document.body.innerText.includes('Môi trường')||document.body.innerText.includes('Nhiệt độ'),null,{timeout:12000});const end=Date.now()+12000;while(!requests.some(x=>x.path.includes('/latest-readings')&&x.status===200)&&Date.now()<end)await pause(100);await page.screenshot({path:path.join(run,'browser-dashboard.png'),fullPage:true});assert.ok(requests.some(x=>x.path.includes('/latest-readings')&&x.status===200));});
  await step('browser device polling without F5',async()=>{await page.goto('http://127.0.0.1:55173/devices/mvp-device-a');await page.getByText('TEMP_01',{exact:false}).first().waitFor();const prior=requests.length;const at=new Date();await ingest.ingest({deviceCode:'MVP-SIM-A-01',source:'SIMULATOR',recordedAt:at,readings:[{sensorCode:'TEMP_01',value:42.25},{sensorCode:'HUM_01',value:65.5},{sensorCode:'LIGHT_01',value:0},{sensorCode:'SOIL_01',value:35}],evaluateAutomation:false});await page.waitForFunction(()=>/42[.,]25/.test(document.body.innerText),null,{timeout:16000});assert.ok(requests.length>prior);await page.screenshot({path:path.join(run,'browser-device-updated.png'),fullPage:true});});
  await step('browser UTC+7 timestamp',async()=>{const row=await db.sensorReading.findFirst({where:{sensorId:'mvp-sensor-temp'},orderBy:{recordedAt:'desc'}});const expected=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(row.recordedAt);assert.ok((await page.locator('main').innerText()).includes(expected));});
  await step('browser history and chart actual DEV API',async()=>{await page.goto('http://127.0.0.1:55173/sensors/history?sensorId=mvp-sensor-soil&range=7d');await page.getByRole('heading',{name:'Lịch sử dữ liệu cảm biến',exact:true}).waitFor();await page.locator('.recharts-surface').first().waitFor({timeout:15000});await page.screenshot({path:path.join(run,'browser-history.png'),fullPage:true});assert.ok(requests.some(x=>x.path.includes('/chart')&&x.status===200));});
  await step('browser sensors and zero data',async()=>{await page.goto('http://127.0.0.1:55173/sensors');await page.getByText('LIGHT_01',{exact:false}).first().waitFor();await page.screenshot({path:path.join(run,'browser-sensors.png'),fullPage:true});});
  await step('browser alerts actual DEV API',async()=>{await page.goto('http://127.0.0.1:55173/alerts');await page.getByRole('heading',{name:'Cảnh báo',exact:true}).waitFor();assert.ok(requests.some(x=>x.path==='/api/alerts'&&x.status===200));await page.screenshot({path:path.join(run,'browser-alerts.png'),fullPage:true});});
  await step('browser manual commands remain disabled',async()=>{await page.goto('http://127.0.0.1:55173/irrigation');await page.getByText('MVP_PUMP_01',{exact:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Bật thử 1 giây',exact:true}).count(),0);await page.screenshot({path:path.join(run,'browser-irrigation-disabled.png'),fullPage:true});});
  await step('browser SHADOW real DEV read-only preview',async()=>{await page.getByRole('button',{name:'Mô phỏng tưới tự động',exact:true}).click();await page.getByTestId('shadow-reason').waitFor();assert.match(await page.locator('main').innerText(),/CHẾ ĐỘ SHADOW/);await page.screenshot({path:path.join(run,'browser-shadow.png'),fullPage:true});assert.equal(await db.deviceCommand.count(),0);});
  // Native browser tab visibility is recorded, never faked with an overridden getter.
  await page.goto('http://127.0.0.1:55173/devices/mvp-device-a');const tab=await ctx.newPage();await tab.goto('http://127.0.0.1:55173/login');await tab.bringToFront();await pause(250);
  const state=await page.evaluate(()=>document.visibilityState);if(state!=='hidden')checks.push({name:'browser native tab visibility',result:'NOT_VERIFIED',reason:'HEADLESS_PAGE_REMAINS_VISIBLE; offline lifecycle tests cover logic'});
  else{const before=requests.filter(x=>x.path.includes('/latest-readings')).length;await pause(11000);const after=requests.filter(x=>x.path.includes('/latest-readings')).length;checks.push({name:'browser native tab visibility stops polling',result:after===before?'PASS':'FAIL'});}
  await tab.close();await page.bringToFront();assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);
 }catch(e){checks.push({name:'browser lifecycle',result:'FAIL',code:e.message.slice(0,300)});}finally{if(browser)await browser.close();}
 const metadata={kind:'REAL_BROWSER_REAL_DEV_API_SYNTHETIC_DB',checks,errors,blocked,requestCount:requests.length,mockApi:false};fs.writeFileSync(path.join(run,'browser-evidence.json'),JSON.stringify({...metadata,requests},null,2),{flag:'wx'});return{checks,metadata};
}
module.exports={seed,ready,health,run,edgeExecutable};
