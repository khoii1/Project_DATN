'use strict';
const VIEWPORTS=Object.freeze([{width:1440,height:1000},{width:1024,height:900},{width:768,height:1024},{width:390,height:844},{width:375,height:812}].map(Object.freeze));
const ROUTES=Object.freeze([
 ['login','/login','P0','Đăng nhập hệ thống'],['dashboard','/dashboard','P0','Tổng quan nông nghiệp'],['sensors','/sensors','P0','Dữ liệu cảm biến'],['history','/sensors/history','P0','Lịch sử dữ liệu cảm biến'],['device','/devices/:deviceId','P0','Thông tin thiết bị'],['irrigation','/irrigation','P0','tưới'],['reports','/reports','P0','Báo cáo'],['settings','/settings','P0','Cài đặt'],
 ['devices','/devices','P1','Thiết bị IoT'],['farms','/farms','P1','Trang trại'],['farm','/farms/:farmId','P1',null],['zones','/zones','P1','Khu vực'],['zone','/zones/:zoneId','P1',null],['crops','/crops','P1','Cây trồng'],['alerts','/alerts','P1','Cảnh báo'],['activity','/activity-logs','P1','Nhật ký hoạt động'],['users','/users','P1',null],['forbidden','/forbidden','P1','403'],['notfound','/__acceptance_missing_route__','P1','404']
].map(([key,path,priority,text])=>Object.freeze({key,path,priority,text})));
const SENSORS=Object.freeze([{code:'TEMP_01',unit:'°C'},{code:'HUM_01',unit:'%'},{code:'LIGHT_01',unit:'lux'},{code:'SOIL_01',unit:'%'}].map(Object.freeze));
const SHOTS=Object.freeze(['dashboard','TEMP_01','HUM_01','LIGHT_01','SOIL_01','device','irrigation','reports','settings','mobile']);
const CHECKLIST=Object.freeze(['render','route','layout','historical','banner','unitsTime','controls','keyboard','navigation','states','visualClipping']);
function matrix(){return ROUTES.flatMap(route=>VIEWPORTS.map(viewport=>({route:route.key,width:viewport.width,status:'NOT_VERIFIED',checks:Object.fromEntries(CHECKLIST.map(k=>[k,'NOT_VERIFIED']))})));}
function dynamicRoute(route,ids){return route.path.replace(/:(deviceId|farmId|zoneId)/g,(_,k)=>{if(!/^[A-Za-z0-9_-]+$/.test(ids[k]||''))throw Error('OBSERVED_RECORD_ID_REQUIRED');return ids[k];});}
module.exports={VIEWPORTS,ROUTES,SENSORS,SHOTS,CHECKLIST,matrix,dynamicRoute};
