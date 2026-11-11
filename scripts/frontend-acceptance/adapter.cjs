'use strict';
// Offline-testable browser-only core. No CLI, browser import, spawn, DB or MQTT.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const P=require('./policy.cjs'),C=require('./contract.cjs');
const X=require('./assertions.cjs');
function png(buffer){assert.ok(Buffer.isBuffer(buffer)&&buffer.length>=33&&buffer.length<10485760,'PNG_INVALID');assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(buffer.subarray(12,16).toString(),'IHDR');assert.equal(buffer.subarray(-8,-4).toString(),'IEND');const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);assert.ok(width>0&&height>0);return {width,height,bytes:buffer.length};}
function observedIds(links,ids){for(const href of links){const u=P.url(href);if(!u||u.origin!==P.UI)continue;for(const [type,segment]of [['deviceId','devices'],['farmId','farms'],['zoneId','zones']]){const m=u.pathname.match(new RegExp(`^/${segment}/([A-Za-z0-9_-]+)$`));if(m&&!ids[type])ids[type]=m[1];}}}
// Only booleans/counts/shape are retained, never raw text or input values.
function inspectDOM(){
 const text=document.body.innerText,main=document.querySelector('main')||document.body;
 const shown=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
 const controls=[...main.querySelectorAll('button,input[role="switch"],button[role="switch"]')].filter(e=>/^(Bật|Tắt)(?:\s|$)/i.test(e.innerText.trim())||e.getAttribute('role')==='switch');
 const rows=[...main.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.innerText.trim()));
 const headings=[...main.querySelectorAll('h1,h2')].filter(shown).map(e=>e.innerText);
 return {headings,links:[...document.querySelectorAll('a[href]')].map(e=>e.href),rows,
  historical:/lịch sử|historical|last-known/i.test(text),notLive:/không LIVE|not.live/i.test(text),timezone:/UTC\+7/.test(text),soilWarning:/SOIL_01/.test(text)&&/chưa hiệu chuẩn|chưa xác minh|chưa được nghiệm thu/.test(text)&&/không dùng.*tưới tự động/.test(text),
  memoryAudit:/memory-only/.test(text),bucket:/bucket/.test(text),chart:!!main.querySelector('.recharts-wrapper svg'),missing:/—|Chưa có dữ liệu|Không có dữ liệu/.test(text),
  controls:{count:controls.length,allDisabled:controls.length>0&&controls.every(e=>e.disabled===true||e.getAttribute('aria-disabled')==='true')},
  liveClaim:/Trạng thái:\s*Trực tuyến/.test(text),bodyWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  overlay:!!document.querySelector('vite-error-overlay'),errorBoundary:/Không thể hiển thị trang/.test(text),
  states:{empty:/Không có dữ liệu|Chưa có|Không tìm thấy/.test(text),loading:!!main.querySelector('.animate-pulse,[aria-busy="true"]'),error:!!main.querySelector('[role="alert"]:not(#ui-only-historical-warning)')},
  bannerVisible:[...main.querySelectorAll('*')].filter(e=>e.children.length===0&&/DỮ LIỆU LỊCH SỬ ESP32/.test(e.textContent||'')).some(e=>{const r=e.getBoundingClientRect();return shown(e)&&r.left>=0&&r.right<=innerWidth;})};
}
function historyFacts(m,sensor){
 const rows=m.rows.filter(r=>r.length===5),numeric=rows.map(r=>Number(r[1].replace(',','.')));
 return {rowCount:rows.length,threeReadings:rows.length===3,units:rows.length===3&&rows.every(r=>r[2]===sensor.unit),sourceMQTT:rows.length===3&&rows.every(r=>r[3]==='MQTT'),timestamps:rows.length===3&&rows.every(r=>/19:11:(18|33|48)/.test(r[0])&&/19:11:(19|34|49)/.test(r[4])&&/2\/11\/(?:20)?26/.test(r[0])&&/2\/11\/(?:20)?26/.test(r[4])),numeric:numeric.length===3&&numeric.every(Number.isFinite),chart:m.chart,bucket:m.bucket,timezone:m.timezone,historical:m.historical,soilWarning:sensor.code!=='SOIL_01'||m.soilWarning};
}
async function boundedCleanup(fn,ms=30000){let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('NATIVE_CLEANUP_UNKNOWN')),ms);})]);}finally{clearTimeout(timer);}}
function cellStatus(row,route,session){
 if(Object.values(row.checks).includes('FAIL'))return 'FAIL';
 const required=['render','route','layout','visualClipping','accessibleLabels','occlusion'];if(['dashboard','sensors','history'].includes(route.key))required.push('dataReady');
 if(['device','farm','zone'].includes(route.key))required.push('identity','detailContent');
 if(['dashboard','device','reports','irrigation'].includes(route.key))required.push('historical','banner');
 if(['dashboard','irrigation'].includes(route.key)&&session.expectedRecords?.pump)required.push('controls');
 if(route.key==='settings')required.push('settingsReadonly');if(route.key==='reports')required.push('reportSummaries');
 if(['users','forbidden'].includes(route.key))required.push('permission');if(route.key==='notfound')required.push('notFound');
 return required.every(k=>['PASS','NOT_APPLICABLE'].includes(row.checks[k]))?'PASS':'PARTIAL';
}
async function enforce(context,events){
 assert.equal(typeof context.routeWebSocket,'function','WEBSOCKET_GUARD_REQUIRED');
 await context.routeWebSocket('**',ws=>ws.close());
 await context.route('**/*',async route=>{const req=route.request(),method=req.method(),u=req.url();let pre;
  if(method==='OPTIONS')pre=await req.headerValue('access-control-request-method');
  if(events.policyViolation)return route.abort('blockedbyclient');
  if(P.requestAllowed(method,u,pre))return route.continue();
  if(events.blocked.length<256)events.blocked.push(P.networkFact(method,u));events.policyViolation=true;events.requestDiagnostics??=[];const fact=P.requestDiagnostic(method,u,pre,events.context,P.requestDetails(req));if(events.requestDiagnostics.length<256)events.requestDiagnostics.push(fact);events.deniedByRule??={};events.deniedByRule[fact.denialRule]=Math.min(1000000,(events.deniedByRule[fact.denialRule]||0)+1);try{return await route.abort('blockedbyclient');}finally{events.onPolicyViolation?.();}
 });
  context.on('response',response=>{if(events.network.length>=512)return;const req=response.request(),fact=P.networkFact(req.method(),response.url(),response.status());if(fact.path!=='REDACTED_PATH')events.network.push(fact);});
 context.on('page',page=>{page.on('console',m=>{if(m.type()==='error'){const fact=P.consoleFact(m.text(),m.location?.().url,events.context);events.consoleDiagnostics??=[];if(events.consoleDiagnostics.length<256)events.consoleDiagnostics.push(fact);events.consoleByCategory??={};events.consoleByCategory[fact.category]=Math.min(1000000,(events.consoleByCategory[fact.category]||0)+1);if(fact.category==='EXPECTED_HMR')events.expectedHmrErrors=(events.expectedHmrErrors||0)+1;else events.consoleErrors++;}});page.on('pageerror',()=>events.pageErrors++);});
}
async function accept(session,d){
 P.validateSession(session,d.verifySession,d.now?.()??Date.now());
 assert.equal(typeof d.openBrowser,'function','OWNED_BROWSER_PROVIDER_REQUIRED');
 assert.equal(typeof d.verifyOwnership,'function','NATIVE_OWNERSHIP_REQUIRED');
 assert.equal(typeof d.closeAndObserve,'function','NATIVE_CLEANUP_REQUIRED');
 assert.equal(typeof d.abortOpenAndObserve,'function','NATIVE_LATE_LAUNCH_CLEANUP_REQUIRED');
 assert.equal(typeof d.screenshotSink,'function','PRIVATE_EVIDENCE_SINK_REQUIRED');
 assert.equal(typeof d.credential,'function','SECURE_CREDENTIAL_SOURCE_REQUIRED');
 const now=d.now||Date.now,mono=d.monotonic||(()=>performance.now()),started=mono();
 const evidence={mode:'HISTORICAL_NOT_LIVE',status:'PARTIAL',matrix:C.matrix(),history:{},screenshots:[],network:[],blocked:[],consoleErrors:0,pageErrors:0,rootRedirect:'NOT_VERIFIED',native:'NOT_VERIFIED',operatorAttestationCreated:false};
 const cancellation=new AbortController();Object.defineProperty(evidence,'onPolicyViolation',{value:()=>cancellation.abort(),enumerable:false});
 const ids={},sensors={},shotNames=new Set();let owned,page,closeCalled=false,stopped=false,launchCalls=0,secret;
 let context={route:'root',width:0,stepId:'INIT'},stepStarted=mono(),observation={};const mark=id=>{context.stepId=id;stepStarted=mono();evidence.context={...context};};
 const remaining=()=>Math.min(session.deadline-now(),600000-(mono()-started))-45000;
 const check=()=>{if(evidence.policyViolation){stopped=true;throw Object.assign(Error('SECURITY_STOP'),{code:'ACCEPTANCE_SECURITY_STOP'});}if(stopped||remaining()<=0){stopped=true;throw Object.assign(Error('ACCEPTANCE_DEADLINE'),{code:'ACCEPTANCE_DEADLINE'});}};
 const step=async(fn,limit=8000)=>{check();stepStarted=mono();let timer,onAbort;const ms=Math.min(limit,remaining());
  try{return await Promise.race([Promise.resolve().then(()=>{check();return fn(ms);}).then(value=>{check();return value;}),new Promise((_,reject)=>{onAbort=()=>reject(Object.assign(Error('SECURITY_STOP'),{code:'ACCEPTANCE_SECURITY_STOP'}));cancellation.signal.addEventListener('abort',onAbort,{once:true});if(cancellation.signal.aborted)onAbort();timer=setTimeout(()=>{const global=remaining()<=0;stopped=global||['OPEN','NAVIGATE','AUTH'].includes(context.stepId);reject(Object.assign(Error('BOUNDED_STEP_TIMEOUT'),{code:global?'ACCEPTANCE_DEADLINE':'ACCEPTANCE_STEP_TIMEOUT'}));},ms);})]);}
  finally{clearTimeout(timer);if(onAbort)cancellation.signal.removeEventListener('abort',onAbort);}
 };

 const capture=async name=>{mark('SCREENSHOT');if(!C.SHOTS.includes(name)||shotNames.has(name)||evidence.screenshots.length>=10)return;assert.notEqual(new URL(page.url()).pathname,'/login','NO_LOGIN_SCREENSHOT');check();const b=await step(ms=>page.screenshot({type:'png',timeout:ms})),info=png(b);await step(()=>d.screenshotSink(name+'.png',b));shotNames.add(name);evidence.screenshots.push({name:name+'.png',...info,sha256:crypto.createHash('sha256').update(b).digest('hex')});};
 const navigate=async path=>{mark('NAVIGATE');const u=P.url(P.UI+path);assert.ok(u&&u.origin===P.UI);await step(ms=>page.goto(u.href,{waitUntil:'domcontentloaded',timeout:ms}));};
 const inspect=()=>{mark('INSPECT');return step(()=>page.evaluate(inspectDOM));};
 const settle=async(key,knownSensor=false)=>{mark('DATA_READY');await step(ms=>page.waitForFunction(readyDOM,{key,knownSensor,expectPump:!!session.expectedRecords?.pump},{timeout:ms}));};
 const discover=async()=>{mark('SENSOR_LINKS');const links=await step(()=>page.evaluate(sensorLinksDOM));observation.sensorLinkCount=links.length;registerSensorLinks(links,sensors);};
 async function cell(route,viewport,path){
  const row=evidence.matrix.find(x=>x.route===route.key&&x.width===viewport.width);context={route:route.key,width:viewport.width,stepId:'INIT'};observation={};evidence.context={...context};
  try{
   await step(()=>page.setViewportSize(viewport));await navigate(path);
   if(route.key==='reports'){await step(()=>page.getByRole('combobox',{name:'Khoảng thời gian báo cáo'}).selectOption('30days'));await step(()=>page.getByRole('button',{name:'Áp dụng',exact:true}).click());}
   mark('HEADING');if(route.text&&!['forbidden','notfound'].includes(route.key))await step(ms=>page.getByRole('heading',{name:new RegExp(route.text,'i')}).first().waitFor({state:'visible',timeout:ms}));
   if(route.key!=='login')await settle(route.key);
   if(route.key==='sensors')await discover();
   const m=await inspect();observation={...observation,loading:m.states.loading,error:m.states.error,pumpCount:m.controls.count};row.checks.dataReady=m.states.loading||m.states.error?'FAIL':'PASS';assert.ok(!m.overlay&&!m.errorBoundary&&m.headings.length,'RENDER_ASSERTION');row.checks.render='PASS';
   const actual=new URL(page.url()).pathname;assert.equal(actual,route.key==='users'?'/forbidden':path.split('?')[0],'ROUTE_ASSERTION');row.checks.route='PASS';
   row.checks.layout=m.scrollWidth<=m.bodyWidth+1?'PASS':'FAIL';row.measurements={viewport,bodyWidth:m.bodyWidth,scrollWidth:m.scrollWidth};
   if(['dashboard','device','reports','irrigation'].includes(route.key)){row.checks.historical=m.historical&&m.notLive&&!m.liveClaim?'PASS':'FAIL';row.checks.banner=m.bannerVisible?'PASS':'NOT_VERIFIED';}
   if(['dashboard','device','irrigation'].includes(route.key)&&m.controls.count)row.checks.controls=m.controls.allDisabled?'PASS':'FAIL';
   if(m.states.empty||m.states.loading||m.states.error)row.stateObserved={...m.states}; // observation != acceptance of error behavior.
   mark('PRESENTATION');const presentation=await step(()=>page.evaluate(X.presentationDOM));
   const detailed=X.routeFacts(route,path,presentation,session.expectedRecords||{});Object.assign(row.checks,detailed);
   row.checks.visualClipping=detailed.clipping;row.checks.dialog=await X.safeDialog(page,step);
   row.stateChecks=Object.fromEntries(['empty','loading','error'].map(k=>[k,presentation.states[k]?'PASS':'NOT_VERIFIED']));
   mark('KEYBOARD');await step(()=>page.keyboard.press('Tab'));
   const focus=await step(()=>page.evaluate(()=>{const e=document.activeElement,r=e?.getBoundingClientRect(),s=e?getComputedStyle(e):null;return {interactive:!!e&&/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName),visible:!!r&&r.width>0&&r.height>0,focusVisible:!!e&&e.matches(':focus-visible'),indicator:!!s&&(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0||s.boxShadow!=='none')};}));
   await step(()=>page.keyboard.press('Shift+Tab'));await step(()=>page.keyboard.press('Escape'));
   row.keyboardEvidence={tabShiftTabFocusVisible:focus.interactive&&focus.visible?'PASS':'NOT_VERIFIED',escapePressed:true,escapeDismissal:row.checks.dialog==='NOT_APPLICABLE'?'NOT_APPLICABLE':row.checks.dialog};
   row.checks.focusVisible=focus.interactive&&focus.visible&&focus.focusVisible&&focus.indicator?'PASS':'NOT_VERIFIED';
   if(viewport.width>=1024&&!['login','notfound'].includes(route.key)){
    mark('DESKTOP_MENU');const collapse=page.getByTitle('Thu gọn sidebar',{exact:true});
    if(await step(()=>collapse.count())){const sidebar=page.locator('aside:has(nav[aria-label="Điều hướng chính"])');observation.elementCount=await step(()=>sidebar.count());assert.equal(observation.elementCount,1,'SIDEBAR_IDENTITY');const before=await step(()=>sidebar.boundingBox());observation.widthBefore=before?.width;assert.ok(before&&before.width>0);await step(()=>collapse.click());const expand=page.getByTitle('Mở rộng sidebar',{exact:true});await step(ms=>expand.waitFor({state:'visible',timeout:ms}));await step(ms=>page.waitForFunction(width=>document.querySelector('aside:has(nav[aria-label="Điều hướng chính"])').getBoundingClientRect().width<width-1,before.width,{timeout:ms}));await step(()=>expand.click());await step(ms=>collapse.waitFor({state:'visible',timeout:ms}));await step(ms=>page.waitForFunction(width=>document.querySelector('aside:has(nav[aria-label="Điều hướng chính"])').getBoundingClientRect().width>=width-1,before.width,{timeout:ms}));row.checks.navigation='PASS';}
   }
   if(viewport.width<1024&&!['login','notfound'].includes(route.key)){
    mark('MOBILE_MENU');const menu=page.getByRole('button',{name:'Mở menu',exact:true});
    if(await step(()=>menu.count())){await step(()=>menu.click());const nav=page.getByRole('navigation',{name:'Điều hướng chính'});await step(ms=>nav.waitFor({state:'visible',timeout:ms}));await step(()=>page.getByRole('button',{name:'Đóng thanh điều hướng',exact:true}).click());await step(ms=>page.waitForFunction(()=>{const e=document.querySelector('nav[aria-label="Điều hướng chính"]'),r=e?.getBoundingClientRect();return !e||r.right<=0||r.left>=innerWidth||getComputedStyle(e).visibility==='hidden';},null,{timeout:ms}));row.checks.navigation='PASS';}
   }
   observedIds(m.links,ids);
   row.status=cellStatus(row,route,session);
   // Only P0 desktop screenshots plus one mobile; no image of login input.
   if(viewport.width===1440&&C.SHOTS.includes(route.key))await capture(route.key);
   if(route.key==='dashboard'&&viewport.width===390)await capture('mobile');
  }catch(e){row.status=e.code==='ACCEPTANCE_DEADLINE'?'NOT_VERIFIED':'FAIL';row.error=P.errorFact(e);row.failure=P.failureDiagnostic(e,context,mono()-stepStarted,observation);if(stopped||evidence.policyViolation||typeof page?.isClosed!=='function'||page.isClosed()||P.url(page.url())?.origin!==P.UI)throw e;}
 }
 try{
  mark('OPEN');check();launchCalls++;owned=await step(()=>d.openBrowser({session,headless:true,chromiumSandbox:true,serviceWorkers:'block',privateProfile:true,environment:'VERIFIED_WINDOWS_KNOWN_FOLDERS_ALLOWLIST_8',maxLaunches:1,launchTimeout:18000}),18500);
  assert.equal(await step(()=>d.verifyOwnership(owned)),true,'OWNERSHIP_UNVERIFIED');
  await step(()=>enforce(owned.context,evidence));page=await step(()=>owned.context.newPage());
  for(const v of C.VIEWPORTS)await cell(C.ROUTES[0],v,'/login');
  mark('AUTH');secret=P.credential(await step(()=>d.credential(),15500));
  await step(()=>page.locator('#email').fill(secret.email));await step(()=>page.locator('#password').fill(secret.password));
  await step(()=>page.getByRole('checkbox').uncheck()); // no persistent-login request.
  await step(()=>page.getByRole('button',{name:'Đăng nhập',exact:true}).click());
  secret.password='';secret=null;
  await step(ms=>page.waitForURL(P.UI+'/dashboard',{timeout:ms}));
  context={route:'root',width:1440,stepId:'ROOT_REDIRECT'};await navigate('/');mark('ROOT_REDIRECT');try{await step(ms=>page.waitForURL(P.UI+'/dashboard',{timeout:ms}));evidence.rootRedirect='PASS';}catch(e){evidence.rootRedirect='FAIL';evidence.redirectFailure=P.failureDiagnostic(e,context,mono()-stepStarted);if(stopped||evidence.policyViolation)throw e;}
  for(const path of ['/devices','/farms','/zones']){await navigate(path);await settle(path.slice(1));check();observedIds((await inspect()).links,ids);}
  for(const route of C.ROUTES.slice(1)){
   let path;try{path=C.dynamicRoute(route,ids);}catch{continue;}
   // Historical data is Nov2; use 30d explicitly, never default "today".
   if(route.key==='history')path+='?range=30d';
   for(const v of C.VIEWPORTS)await cell(route,v,path);
   if(route.key==='sensors'){
    for(const sensor of C.SENSORS){if(!sensors[sensor.code]){evidence.history[sensor.code]={status:'NOT_VERIFIED',reason:'OBSERVED_SENSOR_LINK_MISSING'};continue;}
     try{context={route:'history',width:1440,stepId:'HISTORY_ROWS'};evidence.context={...context};await step(()=>page.setViewportSize(C.VIEWPORTS[0]));await navigate('/sensors/history?sensorId='+sensors[sensor.code]+'&range=30d');
     mark('HISTORY_ROWS');await settle('history',true);await step(ms=>page.locator('tbody tr').nth(2).waitFor({state:'visible',timeout:ms}));const m=await inspect(),facts=historyFacts(m,sensor);
     const presentation=await step(()=>page.evaluate(X.presentationDOM));let tooltip;
     const dot=page.locator('.recharts-line-dots .recharts-dot').first();
     if(await step(()=>dot.count())){await step(ms=>dot.hover({timeout:ms}));const tip=page.locator('.recharts-tooltip-wrapper').first();if(await step(()=>tip.count()))tooltip=await step(()=>tip.innerText());}
     const chartChecks=X.chartFacts(m.rows,presentation,sensor.unit,tooltip);
     const basePass=Object.entries(facts).every(([k,v])=>k==='rowCount'||v===true);
     evidence.history[sensor.code]={status:!basePass||Object.values(chartChecks).includes('FAIL')?'FAIL':Object.values(chartChecks).includes('NOT_VERIFIED')?'PARTIAL':'PASS',facts,chartChecks};await capture(sensor.code);
     }catch(e){evidence.history[sensor.code]={status:'FAIL',failure:P.failureDiagnostic(e,context,mono()-stepStarted,observation)};if(stopped||evidence.policyViolation||typeof page?.isClosed!=='function'||page.isClosed()||P.url(page.url())?.origin!==P.UI)throw e;}
    }
   }
  }
 }catch(e){evidence.failure={...P.errorFact(e),...P.failureDiagnostic(e,context,mono()-stepStarted,observation)};}
 finally{
  if(secret){secret.password='';secret=null;}
  stopped=true;cancellation.abort();
  if(launchCalls&&!closeCalled){closeCalled=true;try{const n=await boundedCleanup(()=>owned?d.closeAndObserve(owned,{deadlineMs:30000,verifiedOwnedOnly:true,reason:evidence.policyViolation?'POLICY_STOP':'SESSION_FINISHED'}):d.abortOpenAndObserve({deadlineMs:30000,verifiedOwnedOnly:true}));evidence.nativeReceipt={owned:n?.owned===true,handlesVerified:n?.handlesVerified===true,exitCode:Number.isInteger(n?.exitCode)?n.exitCode:null,osExitTimeStatus:n?.osExitTimeStatus==='VALID'?'VALID':'UNKNOWN',remaining:Number.isInteger(n?.remaining)?n.remaining:null,foreignTargeted:Number.isInteger(n?.foreignTargeted)?n.foreignTargeted:null};evidence.native=P.nativeComplete(evidence.nativeReceipt)?'PASS':'BLOCKED';}catch{evidence.native='BLOCKED';}}
  evidence.launchCalls=launchCalls;evidence.closeCalls=closeCalled?1:0;evidence.latestReadings=evidence.network.filter(x=>x.path.endsWith('/latest-readings'));evidence.optionsObserved=evidence.network.some(x=>x.method==='OPTIONS');
  evidence.networkChecks={latestReadings:evidence.latestReadings.some(x=>x.method==='GET'&&x.status===200)?'PASS':'NOT_VERIFIED',login:evidence.network.some(x=>x.path==='/api/auth/login'&&x.method==='POST'&&x.status===200)?'PASS':'NOT_VERIFIED',options:evidence.optionsObserved?'OBSERVED':'NOT_OBSERVED'};
  // No blanket acceptance: visual clipping/dialog/error-state checks remain
  // NOT_VERIFIED until actually exercised/reviewed. Never write operator intake.
  evidence.status=evidence.native==='BLOCKED'||evidence.policyViolation?'BLOCKED':evidence.pageErrors>0||evidence.matrix.some(x=>x.status==='FAIL')||Object.values(evidence.history).some(x=>x.status==='FAIL')?'FAIL':!evidence.failure&&evidence.consoleErrors===0&&evidence.rootRedirect==='PASS'&&evidence.matrix.every(x=>x.status==='PASS')&&C.SENSORS.every(s=>evidence.history[s.code]?.status==='PASS')&&evidence.native==='PASS'&&evidence.networkChecks.latestReadings==='PASS'&&evidence.networkChecks.login==='PASS'?'PASS':'PARTIAL';
 }
 return evidence;
}
module.exports={accept,enforce,png,historyFacts,observedIds,inspectDOM,boundedCleanup,cellStatus};

// Self-contained browser predicates; never persist raw DOM/link text.
function readyDOM({key,knownSensor=false,expectPump=false}){
 const main=document.querySelector('main')||document.body;
 if(!main.querySelector('h1,h2')||main.querySelector('.animate-pulse,[aria-busy="true"]'))return false;
 if(main.querySelector('[role="alert"]:not(#ui-only-historical-warning)'))return true;
 if(key==='sensors')return !!main.querySelector('tbody tr')||/Chưa có cảm biến/.test(main.innerText);
 if(key==='history'&&knownSensor)return main.querySelectorAll('tbody tr').length>=3;
 if(key==='dashboard'&&expectPump)return [...main.querySelectorAll('button')].some(e=>/^(Bật|Tắt)(?:\s|$)/i.test(e.innerText.trim()));
 return true;
}
function sensorLinksDOM(){return [...document.querySelectorAll('a[href][aria-label]')].map(e=>({href:e.href,label:e.getAttribute('aria-label')})).filter(e=>/^Xem lịch sử (TEMP_01|HUM_01|LIGHT_01|SOIL_01)$/.test(e.label||''));}
function registerSensorLinks(links,sensors){for(const item of links){const u=P.url(item.href);if(!u||u.origin!==P.UI||u.pathname!=='/sensors/history')continue;const id=u.searchParams.get('sensorId');if(!/^[A-Za-z0-9_-]+$/.test(id||''))continue;const m=item.label?.match(/^Xem lịch sử (TEMP_01|HUM_01|LIGHT_01|SOIL_01)$/);if(m&&!sensors[m[1]])sensors[m[1]]=id;}return sensors;}
module.exports={...module.exports,readyDOM,sensorLinksDOM,registerSensorLinks};
