const {NOTICE}=require('./mvp-ui-only-historical.cjs');
// Only installed by the dedicated historical Vite entry, never production.
// Checked source anchors fail closed if a future component changes shape.
function replaceExact(source,from,to,count=1){
 if(source.split(from).length-1!==count)throw Error('UI_ONLY_PRESENTATION_ANCHOR_DRIFT');
 return source.replaceAll(from,to);
}
function presentationPlugin(){return{name:'ui-only-historical-presentation',apply:'serve',enforce:'pre',transform(source,id){
 const file=id.replaceAll('\\','/').split('?')[0];
 if(file.endsWith('/src/layouts/DashboardLayout.tsx')){
  // The main already follows the responsive sidebar margin. Body-prepend was
  // outside that layout and underneath the fixed sidebar. Keep text in flow.
  const notice=NOTICE+' SOIL_01 chưa hiệu chuẩn; 100% lịch sử không chứng minh chất lượng. Điều khiển bơm và Automation bị khóa trong phiên chỉ đọc.';
  return{code:replaceExact(source,'<Outlet />','<aside id="ui-only-historical-warning" role="alert" aria-label="Dữ liệu lịch sử, không LIVE" className="mb-6 w-full min-w-0 whitespace-normal break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{'+JSON.stringify(notice)+'}</aside><Outlet />'),map:null};
 }
 if(file.endsWith('/src/components/sensors/SensorValueCard.tsx'))return{code:'export { SensorValueCard } from "/src/dev/ui-only-sensor-card.tsx";',map:null};
 if(file.endsWith('/src/types/device.ts'))return{code:replaceExact(replaceExact(replaceExact(source,'ONLINE: "Trực tuyến"','ONLINE: "Đã lưu: Trực tuyến — không LIVE"'),'OFFLINE: "Ngoại tuyến"','OFFLINE: "Đã lưu: Ngoại tuyến — không LIVE"'),'UNKNOWN: "Chưa xác định"','UNKNOWN: "Đã lưu: Chưa xác định — không LIVE"'),map:null};
 let code=source;
 if(file.endsWith('/src/pages/devices/DeviceDetailPage.tsx')){
  code=replaceExact(code,'Thông tin kết nối','Kết nối đã ghi nhận — không LIVE');
  code=replaceExact(code,'Trạng thái kết nối được cung cấp bởi backend','MQTT đã tắt trong phiên chỉ đọc; không xác minh kết nối ESP32 hiện tại.');
  code=replaceExact(code,'Lần cuối nhận tín hiệu:','Lần nhận đã lưu (UTC+7):');
 }
 if(file.endsWith('/src/pages/reports/ReportsPage.tsx')){
  code=replaceExact(code,'Snapshot hiện tại','Bản ghi lịch sử — không phải trạng thái hiện tại');
  code=replaceExact(code,'snapshot hiện tại','bản ghi đã lưu, không xác minh trạng thái hiện tại');
  code=replaceExact(code,'tài nguyên hiện tại','tài nguyên đã lưu');
  code=replaceExact(code,' online · ',' online đã lưu · ');
  code=replaceExact(code,' offline/unknown',' offline/unknown đã lưu — không LIVE');
  code=code.replaceAll("new Intl.DateTimeFormat(undefined, { dateStyle:","new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle:");
 }
 if(file.endsWith('/src/pages/dashboard/DashboardPage.tsx')){
  code=replaceExact(code,' online · ',' online đã lưu · ');
  code=replaceExact(code,' offline`',' offline đã lưu — không LIVE`');
 }
 if(file.endsWith('/src/pages/sensors/SensorHistoryPage.tsx'))code=replaceExact(code,'Cập nhật lần cuối','Lần đọc dữ liệu lịch sử');
 if(['/src/pages/sensors/SensorHistoryPage.tsx','/src/components/sensors/SensorHistoryChart.tsx','/src/pages/devices/DeviceDetailPage.tsx'].some(x=>file.endsWith(x)))code=code.replace(/new Intl\.DateTimeFormat\("vi-VN", \{(?!\s*timeZone:)/g,'new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh",').replace(/\? \{ hour:/g,'? { timeZone: "Asia/Ho_Chi_Minh", hour:').replace(/: \{ day:/g,': { timeZone: "Asia/Ho_Chi_Minh", day:');
 if(code!==source)return{code,map:null};
 }};}
module.exports={presentationPlugin};
