import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { devCssPlugins } from './mvp-dev-css.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.env.VITE_API_BASE_URL !== 'http://127.0.0.1:55001/api' || !process.env.MVP_EMPTY_ENV_DIR) throw Error('DEV_FRONTEND_TARGET_REFUSED');
const { createServer } = await import(pathToFileURL(path.join(root, 'frontend/node_modules/vite/dist/node/index.js')));
const { default: react } = await import(pathToFileURL(path.join(root, 'frontend/node_modules/@vitejs/plugin-react/dist/index.js')));
const server = await createServer({
  configFile: false, root: path.join(root, 'frontend'), envDir: process.env.MVP_EMPTY_ENV_DIR,
  css: { postcss: { plugins: await devCssPlugins(root) } },
  plugins: [react()], server: { host: '127.0.0.1', port: 55173, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://127.0.0.1:55001/api') },
});
await server.listen();
console.log('MVP_FRONTEND_READY 127.0.0.1:55173 API=127.0.0.1:55001');
let stopping = false;
process.on('message', async message => {
  if (message === 'STOP' && !stopping) { stopping = true; await server.close(); process.exit(0); }
});
