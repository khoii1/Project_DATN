// Actual pure frontend components rendered offline; NOT a live DEV acceptance.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),frontend=path.join(root,'frontend');
const ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react')),{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const {chromium}=require('playwright-core');
function load(file,dependencies={}){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(frontend,'src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,Intl,Date,require:name=>{if(Object.hasOwn(dependencies,name))return dependencies[name];if(['react/jsx-runtime','lucide-react'].includes(name))return require(path.join(frontend,'node_modules',name));throw Error('OFFLINE_COMPONENT_DEPENDENCY_REFUSED');}});return exports;}
test('real SensorValueCard suffix reproduces exact-text miss; stable code-scoped selector distinguishes null from numeric0',async()=>{
 const sensor=load('types/sensor.ts'),alert=load('types/alert.ts');const {SensorValueCard}=load('components/sensors/SensorValueCard.tsx',{'../../types/sensor':sensor,'../../types/alert':alert});
 const browser=await chromium.launch({executablePath:require('./mvp-dev-acceptance.cjs').edgeExecutable(),headless:true});let networkRequests=0;
 try{const page=await browser.newPage();await page.route('**/*',route=>{networkRequests++;return route.abort();});
  for(const name of ['MVP SIMULATOR NO DATA','Renamed acceptance sensor']){
   const html=renderToStaticMarkup(React.createElement(SensorValueCard,{type:'TEMP',name:name+' · TEMP_EMPTY',value:null,recordedAt:null}));await page.setContent(html);
   assert.equal(await page.getByText(name,{exact:true}).count(),0);
   await require('./mvp-ui-browser.cjs').assertNoDataCard(page,'TEMP_EMPTY');
  }
  await page.setContent(renderToStaticMarkup(React.createElement(SensorValueCard,{type:'LIGHT',name:'MVP SIMULATOR LIGHT_01 · LIGHT_01',value:0,recordedAt:'2026-10-29T09:14:34.607Z'})));
  assert.equal(await page.getByText('0 lux',{exact:true}).count(),1);assert.equal(await page.getByText('Chưa nhận dữ liệu',{exact:true}).count(),0);assert.equal(networkRequests,0);
 }finally{await browser.close();}
});
