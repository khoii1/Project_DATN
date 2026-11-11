// Source-level regression only: all OS/filesystem/native operations below are injected mocks.
// Never invokes the real preflight, PostgreSQL, PowerShell, Prisma, or a network client.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'mvp-dev-direct.cjs'),'utf8');
const pins={
 'pg_ctl.exe':'FC644446B0236E623E3E6FE2699446259EFB8E61BD9ABA838D6394A2BE6987B8',
 'pg_controldata.exe':'6896F8A705AFB5CBAAD843017D6D8AED5F5D76E32B3179E66750AAA5F193CC40',
 'psql.exe':'462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A',
 'postgres.exe':'94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746'
};
function fixture(overrides={}){
 const imports=[],calls=[],sid='S-1-5-21-1432835263-483988321-3159128977-1001';
 const facts={operator:sid,owner:sid,protected:true,rootSids:[sid],dataSids:[sid],ports:0,...overrides.facts};
 const control={status:0,stderr:'',signal:null,stdout:'Database system identifier: 7698826681383327460\nDatabase cluster state: shut down\n',...overrides.control};
 const acl={status:0,stderr:'',signal:null,stdout:JSON.stringify(facts),...overrides.acl};
 const fakeFs={existsSync:()=>false,readFileSync:f=>path.basename(f)==='PG_VERSION'?'17':Buffer.from(path.basename(f))};
 const fakeCrypto={createHash:()=>({update:b=>({digest:()=>pins[b.toString()]})})};
 const deny=()=>{throw Error('REAL_NATIVE_EXECUTION_FORBIDDEN');};
 const child={spawn:deny,fork:deny,spawnSync:(exe,args)=>{calls.push({exe,args});return path.basename(exe)==='pg_controldata.exe'?control:acl;}};
 const modules={'node:fs':fakeFs,'node:path':path,'node:crypto':fakeCrypto,'node:child_process':child,'node:assert/strict':assert,'./mvp-native-exit.cjs':{observeNativeExit:deny}};
 const mod={exports:{}};
 vm.runInNewContext(source,{require:name=>{imports.push(name);assert.ok(Object.hasOwn(modules,name),'UNEXPECTED_PREFLIGHT_DEPENDENCY');return modules[name];},module:mod,__dirname:__dirname,process:{env:{},argv:[]},Buffer,Date,console:{log:deny,error:deny},setTimeout:deny},{timeout:1000});
 return{preflight:mod.exports.preflight,imports,calls};
}
test('require has no native process, Prisma/addon/runtime import or startup side effect',()=>{const f=fixture();assert.equal(f.calls.length,0);assert.deepEqual(f.imports,['node:fs','node:path','node:crypto','node:child_process','node:assert/strict','./mvp-native-exit.cjs']);});
test('mock-only successful checks require both child status zero before returning facts',()=>{const f=fixture(),r=f.preflight();assert.equal(r.systemId,'7698826681383327460');assert.equal(r.state,'shut down');assert.equal(f.calls.length,2);assert.equal(path.basename(f.calls[0].exe),'pg_controldata.exe');assert.equal(f.calls[1].exe,'powershell.exe');});
for(const [name,override]of Object.entries({
 controlAccessViolation:{control:{status:-1073741819}},
 controlUnknown:{control:{status:null}},
 controlStderr:{control:{stderr:'SYNTHETIC_NATIVE_ERROR'}},
 controlSignal:{control:{signal:'SYNTHETIC_SIGNAL'}},
 powershellAccessViolation:{acl:{status:-1073741819}},
 powershellUnknown:{acl:{status:null}},
 powershellStderr:{acl:{stderr:'SYNTHETIC_NATIVE_ERROR'}},
 wrongSystem:{control:{stdout:'Database system identifier: 7472695863566132416\nDatabase cluster state: shut down\n'}},
 runningCluster:{control:{stdout:'Database system identifier: 7698826681383327460\nDatabase cluster state: in production\n'}},
 wrongOwner:{facts:{owner:'other'}},
 broadACL:{facts:{rootSids:['Everyone']}},
 portBusy:{facts:{ports:1}},
 malformedJson:{acl:{stdout:'SYNTHETIC_BAD_JSON'}}
}))test('mock safety gate rejects '+name+' even if other output looks valid',()=>{const f=fixture(override);assert.throws(()=>f.preflight());});
