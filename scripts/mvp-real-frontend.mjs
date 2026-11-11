// Isolated DEV frontend; quality notice comes from operator Serial, not invented MQTT metadata.
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {devCssPlugins} from './mvp-dev-css.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.VITE_API_BASE_URL!=='http://127.0.0.1:55001/api'||!process.env.MVP_EMPTY_ENV_DIR||process.env.MVP_REAL_ESP32_BENCH!=='true')throw Error('REAL_FRONTEND_TARGET_REFUSED');
const {createServer}=await import(pathToFileURL(path.join(root,'frontend/node_modules/vite/dist/node/index.js')));
const {default:react}=await import(pathToFileURL(path.join(root,'frontend/node_modules/@vitejs/plugin-react/dist/index.js')));
const notice={name:'real-esp32-soil-quality-notice',transformIndexHtml:()=>[{tag:'aside',attrs:{id:'bench-soil-warning',role:'alert',style:'padding:12px;background:#fff3cd;color:#713f12;border-bottom:2px solid #d97706'},children:'ESP32-GF-A-01 / SOIL_01: SOIL QUALITY BLOCKED. Serial operator báo ADC_AT_RAIL 4095; 0% đã clamp không chứng minh đất khô. Chỉ giám sát, không dùng tưới tự động. Quality này không có trong MQTT schema v1.',injectTo:'body-prepend'}]};
const server=await createServer({configFile:false,root:path.join(root,'frontend'),envDir:process.env.MVP_EMPTY_ENV_DIR,css:{postcss:{plugins:await devCssPlugins(root)}},plugins:[react(),notice],server:{host:'127.0.0.1',port:55173,strictPort:true},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:55001/api')}});
await server.listen();console.log('REAL_FRONTEND_READY 127.0.0.1:55173');let stopping=false;process.on('message',async m=>{if(m==='STOP'&&!stopping){stopping=true;await server.close();process.exit(0);}});
