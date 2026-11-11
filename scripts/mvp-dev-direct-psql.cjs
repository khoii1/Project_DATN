// TEST-only native psql. Password is read by psql's own CONIN$ prompt, never Node.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
function specification(environment){
 assert.ok(!Object.keys(environment).some(k=>/^PGPASSWORD$|^PGPASSFILE$|^PGSERVICE|^DATABASE_URL$|^OSTYPE$/i.test(k)),'FORBIDDEN_AUTH_ENV');
 return {args:['-X','-W','-q','-t','-A','--host=127.0.0.1','--port=55433','--username=phase13_test_admin','--dbname=postgres','--set=ON_ERROR_STOP=1','--file=-'],passwordSource:'NATIVE_CONIN_PROMPT',passwordInArgv:false,passwordInEnvironment:false};
}
class DirectTestPsql {
 constructor({executable,run,environment,onExit}){
  const spec=specification(environment);
  this.run=run;this.output='';this.stderr='';this.exit=null;this.pending=null;this.serial=Promise.resolve();this.number=0;
  this.child=spawn(executable,spec.args,{
   cwd:run,env:environment,windowsHide:false,stdio:['pipe','pipe','pipe'],
  });
  this.child.stdin.on('error',()=>{});
  this.child.stdout.on('data',x=>{this.output+=x.toString('utf8');if(this.output.length>524288)this.fail('DIRECT_SQL_OUTPUT_LIMIT');else this.drain();});
  this.child.stderr.on('data',x=>{if(this.stderr.length<65536)this.stderr+=x.toString('utf8');else this.fail('DIRECT_SQL_ERROR_OUTPUT_LIMIT');});
  this.child.on('error',()=>this.fail('DIRECT_PSQL_START_FAILED'));
  this.child.on('exit',(code,signal)=>{this.exit={code,signal};onExit({pid:this.child.pid,...this.exit});this.fail('DIRECT_PSQL_NATIVE_EXIT_'+code);});
 }
 fail(code){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error(code));this.pending=null;}}
 drain(){if(!this.pending)return;const p=this.pending,start=this.output.indexOf(p.begin+'\r\n')>=0?this.output.indexOf(p.begin+'\r\n')+p.begin.length+2:this.output.indexOf(p.begin+'\n')>=0?this.output.indexOf(p.begin+'\n')+p.begin.length+1:-1;if(start<0)return;const end=this.output.indexOf(p.end,start);if(end<0)return;const value=this.output.slice(start,end).trim();this.output=this.output.slice(end+p.end.length).replace(/^\r?\n/,'');clearTimeout(p.timer);this.pending=null;p.resolve(value);}
 query(sql,deadline=30000){
  const work=()=>new Promise((resolve,reject)=>{if(this.exit)return reject(Error('DIRECT_PSQL_ALREADY_EXITED'));
   const n=++this.number,begin='__MVP_BEGIN_'+n+'__',end='__MVP_END_'+n+'__';
   const timer=setTimeout(()=>this.fail('DIRECT_PSQL_DEADLINE_UNKNOWN_NO_KILL'),deadline);
   this.pending={begin,end,resolve,reject,timer};
   this.child.stdin.write(`\\set ECHO none\n\\echo ${begin}\n${sql}\n\\echo ${end}\n`,'utf8');this.drain();
  });
  const next=this.serial.then(work);this.serial=next.catch(()=>{});return next;
 }
 async finish(){
  if(this.exit)return this.exit;
  this.child.stdin.end('ROLLBACK;\n\\quit\n');
  const end=Date.now()+8000;while(!this.exit&&Date.now()<end)await new Promise(r=>setTimeout(r,50));
  return this.exit;
 }
}
module.exports={DirectTestPsql,specification};
