// Gate A: bundle actual React/CSS from a private cwd, without starting any server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { devCssPlugins } from './mvp-dev-css.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=path.resolve(process.argv[2]||'');
if(path.dirname(run)!=='C:\\DATN\\test-instances\\phase13-3b'||!/^mvp-ui-\d+-[a-f0-9]+$/.test(path.basename(run)))throw Error('OFFLINE_BUILD_TARGET_REFUSED');
process.chdir(run);
const load=f=>import(pathToFileURL(path.join(root,'frontend',f)).href);
const [{build},{default:react}]=await Promise.all([load('node_modules/vite/dist/node/index.js'),load('node_modules/@vitejs/plugin-react/dist/index.js')]);
await build({configFile:false,root:path.join(root,'frontend'),envDir:path.join(run,'empty-env'),plugins:[react()],css:{postcss:{plugins:await devCssPlugins(root)}},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:55001/api')},build:{outDir:path.join(run,'offline-dist'),emptyOutDir:false,reportCompressedSize:false},logLevel:'warn'});
const assets=fs.readdirSync(path.join(run,'offline-dist/assets'));
const css=assets.filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(run,'offline-dist/assets',f),'utf8')).join('');
if(!css.includes('.surface-card')||!css.includes('.bg-brand-600')||/@tailwind|@apply/.test(css))throw Error('ACTUAL_BUNDLE_CSS_ASSERTION_FAILED');
console.log(JSON.stringify({gate:'A',actualReactBundle:true,actualCss:true,assets:assets.length,productionEnvLoaded:false,serversStarted:0}));
