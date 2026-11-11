// Preparation only: separate approval/startup supervisor required to execute.
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {devCssPlugins} from './mvp-dev-css.mjs';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.MVP_UI_ONLY_APPROVED!=='true'||process.env.VITE_API_BASE_URL!=='http://127.0.0.1:55001/api'||!process.env.MVP_EMPTY_ENV_DIR)throw Error('NEW_UI_ONLY_APPROVAL_REQUIRED');
const {createServer}=await import(pathToFileURL(path.join(root,'frontend/node_modules/vite/dist/node/index.js')));
const {default:react}=await import(pathToFileURL(path.join(root,'frontend/node_modules/@vitejs/plugin-react/dist/index.js')));
const {presentationPlugin}=require('./mvp-ui-only-presentation.cjs');
const server=await createServer({configFile:false,root:path.join(root,'frontend'),envDir:process.env.MVP_EMPTY_ENV_DIR,css:{postcss:{plugins:await devCssPlugins(root)}},plugins:[presentationPlugin(),react()],server:{host:'127.0.0.1',port:55173,strictPort:true},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:55001/api')}});
await server.listen();let stopping=false;process.on('message',async m=>{if(m==='STOP'&&!stopping){stopping=true;await server.close();if(process.connected)process.disconnect();process.exitCode=0;}});
