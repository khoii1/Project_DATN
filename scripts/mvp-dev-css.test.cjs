const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
test('reproduce cwd-dependent Tailwind failure, then compile actual CSS with explicit DEV config offline',async()=>{
 const root=path.resolve(__dirname,'..'),previous=process.cwd(),privateCwd=fs.mkdtempSync(path.join(os.tmpdir(),'smartagri-css-offline-'));
 const postcss=require(path.join(root,'frontend/node_modules/postcss')),tailwind=require(path.join(root,'frontend/node_modules/tailwindcss'));
 const source=fs.readFileSync(path.join(root,'frontend/src/index.css'),'utf8');
 try{
  process.chdir(privateCwd);
  await assert.rejects(()=>postcss([tailwind()]).process(source,{from:path.join(root,'frontend/src/index.css')}),/ring-brand-500.*does not exist/);
  const {devCssPlugins}=await import(pathToFileURL(path.join(root,'scripts/mvp-dev-css.mjs')));
  const result=await postcss(await devCssPlugins(root)).process(source,{from:path.join(root,'frontend/src/index.css'),map:false});
  assert.match(result.css,/\.surface-card/);assert.match(result.css,/--tw-ring-color/);assert.match(result.css,/\.bg-brand-600/);assert.doesNotMatch(result.css,/@tailwind|@apply/);
 }finally{
  process.chdir(previous);
  // Only an empty temporary test directory, never the TEST or evidence directories.
  fs.rmdirSync(privateCwd);
 }
});
