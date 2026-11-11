// Hydrate the REAL history page offline. Services are explicit synthetic fixtures, not live DEV evidence.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),front=path.join(root,'frontend');
test('real history page resets page2 on sensor type/farm/zone changes and shows LIGHT zero rows',async()=>{
 const esbuild=require(path.join(front,'node_modules/esbuild'));
 const mock=`
 const device={zoneId:'zone',zone:{farmId:'farm'}};
 const sensor=(id)=>({id,name:'OFFLINE '+id,sensorCode:id==='soil'?'SOIL_01':'LIGHT_01',type:id==='soil'?'SOIL_MOISTURE':'LIGHT',device,unit:id==='soil'?'%':'lux'});
 export const farmService={list:async()=>({items:[{id:'farm',name:'OFFLINE FARM'},{id:'farm2',name:'OFFLINE FARM TWO'}]})};
 export const zoneService={list:async()=>({items:[{id:'zone',name:'OFFLINE ZONE',farmId:'farm'}]})};
 export const getApiErrorMessage=()=> 'OFFLINE ERROR';
 export const sensorService={get:async id=>sensor(id),list:async q=>({items:[sensor(q.type==='LIGHT'?'light':'soil')]}),
 statistics:async id=>({unit:id==='soil'?'%':'lux',count:id==='soil'?12:8,minimum:id==='soil'?10:0,maximum:id==='soil'?47:0,average:id==='soil'?38:0,latest:{value:id==='soil'?35:0}}),
 chart:async id=>({sensor:sensor(id),resolution:'raw',points:[{timestamp:'2026-10-29T09:14:34Z',value:id==='soil'?35:0,count:1,min:0,max:35}]}),
 readings:async(id,q)=>{(window.__offlineHistoryRequests??=[]).push({id,page:q.page,limit:q.limit});const total=id==='soil'?12:8;return {sensor:sensor(id),items:Array.from({length:total},(_,i)=>({id:id+i,value:id==='soil'?35:0,source:'SIMULATOR',recordedAt:'2026-10-29T09:14:34Z',receivedAt:'2026-10-29T09:14:35Z'})).slice((q.page-1)*q.limit,q.page*q.limit),pagination:{page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)}}}};`;
 const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{SensorHistoryPage}from${JSON.stringify(path.join(front,'src/pages/sensors/SensorHistoryPage.tsx'))};createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:['/sensors/history?sensorId=soil&range=7d']},React.createElement(SensorHistoryPage)));`,resolveDir:front,sourcefile:'offline-history-entry.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},logLevel:'silent',plugins:[{name:'OFFLINE_SERVICE_FIXTURES',setup(b){b.onResolve({filter:/\/services\/(sensor\.service|farm\.service|zone\.service|api)$/},a=>({path:a.path,namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:mock,loader:'js'}));}}]});
 const {chromium}=require('playwright-core'),browser=await chromium.launch({executablePath:require('./mvp-dev-acceptance.cjs').edgeExecutable(),headless:true});let network=0;
 try{const c=await browser.newContext({timezoneId:'Asia/Ho_Chi_Minh'}),p=await c.newPage();await p.route('**/*',r=>{network++;return r.abort();});await p.setContent('<div id="root"></div>');await p.addScriptTag({content:bundle.outputFiles[0].text});
  await p.getByRole('cell',{name:'Mô phỏng',exact:true}).first().waitFor();await p.getByLabel('Số dòng mỗi trang',{exact:true}).selectOption('10');await p.getByRole('button',{name:'Trang sau',exact:true}).click();await p.getByText('Trang 2 / 2',{exact:true}).waitFor();
  await p.getByLabel('Loại cảm biến lịch sử',{exact:true}).selectOption('LIGHT');await p.getByRole('cell',{name:'0',exact:true}).first().waitFor();await p.getByText('Trang 1 / 1',{exact:true}).waitFor();assert.equal(await p.getByRole('cell',{name:'0',exact:true}).count(),8);
  await p.getByLabel('Loại cảm biến lịch sử',{exact:true}).selectOption('SOIL_MOISTURE');await p.getByRole('cell',{name:'Mô phỏng',exact:true}).first().waitFor();await p.getByRole('button',{name:'Trang sau',exact:true}).click();await p.getByText('Trang 2 / 2',{exact:true}).waitFor();await p.getByLabel('Khu vực lịch sử',{exact:true}).selectOption('');await p.getByLabel('Khu vực lịch sử',{exact:true}).selectOption('zone');await p.getByText('Trang 1 / 2',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Trang sau',exact:true}).click();await p.getByText('Trang 2 / 2',{exact:true}).waitFor();await p.getByLabel('Trang trại lịch sử',{exact:true}).selectOption('farm2');await p.getByLabel('Khu vực lịch sử',{exact:true}).selectOption('zone');await p.getByText('Trang 1 / 2',{exact:true}).waitFor();assert.equal(network,0);
 }finally{await browser.close();}
});
