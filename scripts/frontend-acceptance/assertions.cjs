'use strict';
const verdict=(observed,ok)=>!observed?'NOT_VERIFIED':ok?'PASS':'FAIL';
function number(text){if(typeof text!=='string')return null;const m=text.match(/-?\d[\d.,]*/);if(!m)return null;const v=Number(m[0].includes(',')?m[0].replaceAll('.','').replace(',','.'):m[0]);return Number.isFinite(v)?v:null;}
function presentationDOM(){
 const main=document.querySelector('main')||document.body,text=main.innerText;
 const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
 const controls=[...main.querySelectorAll('button,input,select,textarea,a')].filter(visible);
 const name=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||[...(e.labels||[])].map(l=>l.innerText).join(' ')||e.innerText||'').trim();
 let clipped=0,occluded=0,checked=0;
 for(const e of controls){const r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth)continue;checked++;
  const at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(at&&at!==e&&!e.contains(at)&&!at.contains(e))occluded++;
  // Native input scrolling and intentionally scrollable tables are not label clipping.
  if(['BUTTON','A'].includes(e.tagName)&&e.scrollWidth>e.clientWidth+2&&!e.closest('.overflow-x-auto'))clipped++;
 }
 const stats={};for(const card of main.querySelectorAll('article')){const ps=card.querySelectorAll('p');if(ps.length>=2){const label=ps[0].innerText.trim().toLocaleLowerCase('vi');if(['mới nhất','thấp nhất','trung bình','cao nhất','số phép đo'].includes(label))stats[label]=ps[1].innerText.trim();}}
 const chart=main.querySelector('[role="img"][aria-label^="Biểu đồ lịch sử"]');
 const summaries={};for(const e of main.querySelectorAll('article,.surface-card')){const label=e.querySelector('p')?.innerText?.trim();const value=e.querySelector('p.text-3xl,p.text-2xl')?.innerText?.trim();if(label&&value&&['Trang trại','Khu vực','Thiết bị','Cảm biến','Readings','Lệnh tưới','Rule tự động'].includes(label))summaries[label]=value;}
 const active=document.activeElement,style=active?getComputedStyle(active):null;
 return {clipping:{checked,clipped,occluded},labels:{checked:controls.length,missing:controls.filter(e=>!name(e)).length},
  focus:{interactive:!!active&&/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(active.tagName),visible:!!active&&visible(active),indicator:!!style&&(style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0||style.boxShadow!=='none')},
  stats,chartLabel:chart?.getAttribute('aria-label')||null,summaries,
  headings:[...main.querySelectorAll('h1,h2')].map(e=>e.innerText),text,
  settingsReadonly:/Thông tin chỉ đọc/.test(text)&&!main.querySelector('input:not([type="hidden"]),textarea,button[type="submit"]'),
  missingNotice:/Chưa có dữ liệu|Không có dữ liệu|Chưa cung cấp|—/.test(text),historical:/lịch sử|last-known/i.test(text),notLive:/không LIVE/i.test(text),
  states:{empty:/Không có dữ liệu|Chưa có|Chưa phân công/.test(text),loading:!!main.querySelector('[aria-busy="true"],.animate-pulse'),error:!!main.querySelector('[role="alert"]:not(#ui-only-historical-warning)')},
  forbidden:/403/.test(text)&&/không có quyền truy cập/i.test(text),notFound:/404/.test(text)&&/Không tìm thấy trang/.test(text)};
}
function routeFacts(route,path,m,expected={}){
 const r={clipping:verdict(m.clipping?.checked>0,m.clipping.clipped===0),occlusion:verdict(m.clipping?.checked>0,m.clipping.occluded===0),accessibleLabels:verdict(m.labels?.checked>0,m.labels.missing===0),focusVisible:verdict(!!m.focus?.interactive,m.focus.visible&&m.focus.indicator),missingPresentation:m.missingNotice?'PASS':'NOT_APPLICABLE',historical:m.historical&&m.notLive?'PASS':'NOT_VERIFIED',dialog:'NOT_APPLICABLE'};
 if(['device','farm','zone'].includes(route.key)){
  const record=expected[route.key];
  r.identity=verdict(!!record&&typeof record.id==='string',!!record&&path.split('?')[0].endsWith('/'+record.id));
  const label=record?.deviceCode||record?.name;
  r.detailContent=verdict(!!label,!!label&&m.text.includes(label)&&m.headings.length>0);
 }
 if(route.key==='settings')r.settingsReadonly=m.settingsReadonly?'PASS':'FAIL';
 if(route.key==='reports'){const keys=Object.keys(expected.reportCounts||{});r.reportSummaries=verdict(keys.length>0&&keys.every(k=>typeof m.summaries?.[k]==='string'),keys.length>0&&keys.every(k=>number(m.summaries[k])===expected.reportCounts[k]));}
 if(route.key==='forbidden'||route.key==='users')r.permission=m.forbidden?'PASS':'FAIL';
 if(route.key==='notfound')r.notFound=m.notFound?'PASS':'FAIL';
 return r;
}
function chartFacts(rows,m,unit,tooltip){
 const values=rows.filter(r=>r.length===5).map(r=>number(r[1]));
 if(!values.length||values.some(v=>v===null))return {statistics:'NOT_VERIFIED',aggregation:'NOT_VERIFIED',tooltip:'NOT_VERIFIED'};
 const expected={latest:values[0],minimum:Math.min(...values),maximum:Math.max(...values),average:values.reduce((n,v)=>n+v,0)/values.length,count:values.length};
 const pairs=[['mới nhất','latest'],['thấp nhất','minimum'],['trung bình','average'],['cao nhất','maximum'],['số phép đo','count']];
 const statsObserved=pairs.every(([k])=>typeof m.stats?.[k]==='string');
 const statistics=verdict(statsObserved,statsObserved&&pairs.every(([k,v])=>number(m.stats[k])!==null&&Math.abs(number(m.stats[k])-expected[v])<0.011));
 const buckets=m.chartLabel?.match(/(\d+) bucket/),singleBucket=buckets&&Number(buckets[1])===1;
 let tooltipResult='NOT_VERIFIED';
 if(tooltip&&singleBucket){const named=k=>number(tooltip.split('\n').find(line=>line.startsWith(k))||'');tooltipResult=verdict(true,tooltip.includes(unit)&&named('Trung bình:')!==null&&Math.abs(named('Trung bình:')-expected.average)<0.011&&named('Số mẫu:')===values.length&&named('Thấp nhất:')===expected.minimum&&named('Cao nhất:')===expected.maximum);}
 return {statistics,aggregation:verdict(!!singleBucket&&!!tooltip,singleBucket&&tooltipResult==='PASS'),tooltip:tooltipResult,count:expected.count};
}
async function safeDialog(page,step){
 // Never open Create/Delete/ON dialogs. Only inspect an already-present dialog
 // with an explicit cancel button, then dismiss it using Escape.
 const dialogs=page.getByRole('dialog').or(page.getByRole('alertdialog'));
 if(!await step(()=>dialogs.count()))return 'NOT_APPLICABLE';
 const dialog=dialogs.first(),cancel=dialog.getByRole('button',{name:/^(Hủy|Đóng|Cancel)$/});
 if(!await step(()=>cancel.count()))return 'NOT_VERIFIED';
 await step(()=>cancel.first().focus());await step(()=>page.keyboard.press('Shift+Tab'));
 const trapped=await step(()=>dialog.evaluate(el=>el.contains(document.activeElement)));
 await step(()=>page.keyboard.press('Tab'));const trappedForward=await step(()=>dialog.evaluate(el=>el.contains(document.activeElement)));
 await step(()=>page.keyboard.press('Escape'));const dismissed=await step(()=>dialog.count())===0;
 return trapped&&trappedForward&&dismissed?'PASS':'FAIL';
}
module.exports={number,verdict,presentationDOM,routeFacts,chartFacts,safeDialog};
