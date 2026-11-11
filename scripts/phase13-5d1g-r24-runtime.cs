using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Diagnostics;using System.Threading;using System.Web.Script.Serialization;
public sealed class BC{
 public string run,scenario,nonce,fixtureHash,supervisorHash,manifestHash,rootHash;public bool real;public Dictionary<string,object> manifest;
 public BC(string dir,string expectedHash){run=Path.GetFullPath(dir);if(!run.StartsWith(BN.Base+"r24-",StringComparison.OrdinalIgnoreCase)||!System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(run),"^r24-[a-z0-9-]+$"))throw new Exception("RUN_SCOPE");
  foreach(string p in new[]{run,Path.GetDirectoryName(run),Path.GetDirectoryName(Path.GetDirectoryName(run))})if((File.GetAttributes(p)&FileAttributes.ReparsePoint)!=0)throw new Exception("REPARSE");
  string file=Path.Combine(run,"manifest.json");manifestHash=BN.Hash(file);if(expectedHash!=null&&manifestHash!=expectedHash)throw new Exception("MANIFEST_HASH");manifest=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(file));
  real=(string)manifest["mode"]=="REAL_INITDB_LOCKED";
  if(((string)manifest["mode"]!="OFFLINE_ONLY"&&!real)||(bool)manifest["realExecutionEnabled"]||manifest["historicalApprovalToken"]!=null)throw new Exception("REAL_EXECUTION_DENIED");
  scenario=(string)manifest["scenario"];nonce=(string)manifest["nonce"];fixtureHash=(string)manifest["fixtureHash"];supervisorHash=(string)manifest["supervisorHash"];
  if(real&&(scenario!="REAL_INITDB"||!R24Gate.PlanFieldsMatch((Dictionary<string,object>)manifest["plan"])))throw new Exception("REAL_PLAN_DRIFT");
  var sources=(Dictionary<string,object>)manifest["sources"];var required=new[]{"phase13-5d1g-r22-native.cs","phase13-5d1g-r24-native.cs","phase13-5d1g-r24-runtime.cs","phase13-5d1g-r24-fixture.cs","phase13-5d1g-r24-gate.cs","phase13-5d1g-r24-policy.cjs","phase13-5d1g-r24-executor.cjs","phase13-5d1g-r24-executor.test.cjs"};
  if(sources.Count!=required.Length||required.Any(n=>!sources.ContainsKey(n)))throw new Exception("SOURCE_SET_DRIFT");
  foreach(var s in sources){if(BN.Hash(Path.Combine(@"C:\DATN\Project_datn\scripts",s.Key))!=(string)s.Value)throw new Exception("SOURCE_HASH");}
  using(var hash=System.Security.Cryptography.SHA256.Create()){string bundle=BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(sources)))).Replace("-","");if(bundle!=(string)manifest["bundleHash"])throw new Exception("BUNDLE_HASH_DRIFT");}
  if(BN.Hash(Path.Combine(run,"fixture.exe"))!=fixtureHash||BN.Hash(Path.Combine(run,"supervisor.exe"))!=supervisorHash||BN.Hash(Path.Combine(run,"foreign.exe"))!=fixtureHash)throw new Exception("BINARY_HASH");
  rootHash=real?R24Gate.InitdbHash:fixtureHash;
 }
 public void Save(string name,object value){string file=Path.Combine(run,name);byte[] b=System.Text.Encoding.UTF8.GetBytes(new JavaScriptSerializer{MaxJsonLength=1000000}.Serialize(value));using(var f=new FileStream(file+".pending",FileMode.CreateNew,FileAccess.Write,FileShare.Read)){f.Write(b,0,b.Length);f.Flush(true);}File.Move(file+".pending",file);}
 public Dictionary<string,object> Read(string name){return new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(run,name)));}
 public static uint Pid(Dictionary<string,object> d,string key){return Convert.ToUInt32(d[key]);}
}
public sealed class BT{
 public Dictionary<uint,BP> all=new Dictionary<uint,BP>();public bool accepted=true;public string reason=null;public uint root;public BC c;public IntPtr job;
 public BT(BC context,IntPtr j,uint rootPid){c=context;job=j;root=rootPid;}
 public void Sample(){
  if(BN.Flags(job)!=0)throw new Exception("JOB_LIMITS_DRIFT");
  uint[] ids=BN.JobIds(job);foreach(uint pid in ids)if(!all.ContainsKey(pid))all.Add(pid,BN.Observe(pid,job));
  if(all.Count>64)throw new Exception("DESCENDANT_LIFETIME_BOUND");
  foreach(BP p in all.Values.OrderBy(p=>p.native.startFileTime)){
   string parentRole=null;if(p.native.pid==root){p.depth=0;}else{BP parent;if(!all.TryGetValue(p.parent,out parent)||parent.depth<0||p.native.startFileTime<parent.native.startFileTime){accepted=false;reason="PARENT_IDENTITY_UNKNOWN";continue;}p.depth=parent.depth+1;parentRole=parent.role;}
   p.role=null;foreach(Dictionary<string,object> rule in (System.Collections.IEnumerable)c.manifest["rules"]){if(Convert.ToInt32(rule["depth"])==p.depth&&Object.Equals(rule["parentRole"],parentRole)&&String.Equals((string)rule["path"],p.native.image,StringComparison.OrdinalIgnoreCase)&&(string)rule["hash"]==p.hash&&(!(bool)rule["restricted"]||p.restricted)){p.role=(string)rule["role"];break;}}
   if(p.role==null||p.depth>3||!p.inJob||p.owner!="S-1-5-21-1432835263-483988321-3159128977-1001"){accepted=false;reason="DESCENDANT_POLICY_REFUSED";}
  }
 }
 public object[] Rows(){return all.Values.Select(p=>(object)BN.Row(p)).ToArray();}
 public void DisposeAll(string label){
  if(c.real)throw new Exception("REAL_DISPOSITION_NOT_AUTHORIZED");
  // Query actual Job members, never infer descendants from names or marker-only PID data.
  foreach(uint pid in BN.JobIds(job))if(!all.ContainsKey(pid))all.Add(pid,BN.Observe(pid,job));
  var results=new List<object>();foreach(BP p in all.Values.OrderByDescending(p=>p.native.startFileTime))if(!R22Native.Exited(p.native,0)){
   if(p.hash!=c.fixtureHash)throw new Exception("DISPOSITION_HASH_REFUSED");
   c.Save(label+"-"+p.native.pid+"-attempt.json",new{classification="ABNORMAL_FIXTURE_DISPOSITION",identity=BN.Row(p),graceful=false});
   BN.DisposeFixture(p.native,c.run,c.fixtureHash);results.Add(new{pid=p.native.pid,startFileTime=p.native.startFileTime.ToString(),exitCode=R22Native.ExitCode(p.native),exitAt=R22Native.ExitAt(p.native),graceful=false});
  }if(results.Count>0)c.Save(label+".json",new{classification="ABNORMAL_FIXTURE_DISPOSITION",results=results.ToArray(),graceful=false});
 }
 public void Close(){foreach(BP p in all.Values)BN.Close(p.native);}
}
public static class BMain{
 static string OwnRun(){return Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);}
 public static int Main(string[] args){
  if(args.Length==0){Console.WriteLine("{\"mode\":\"PLAN_ONLY\",\"realExecutionEnabled\":false}");return 0;}
  if(args.Length==2&&args[0]=="read-only-preflight"){var p=new BC(OwnRun(),args[1]);p.Save("read-only-preflight.json",R24Gate.Preflight(p));return 0;}
  if(args.Length==2&&args[0]=="offline-gates"){var p=new BC(OwnRun(),args[1]);var data=p.Read("offline-gate-cases.json");var checks=new Dictionary<string,object>();foreach(var pair in (Dictionary<string,object>)data["plans"])checks.Add("plan-"+pair.Key,R24Gate.PlanFieldsMatch((Dictionary<string,object>)pair.Value));foreach(var pair in (Dictionary<string,object>)data["claims"])checks.Add("claim-"+pair.Key,R24Gate.ClaimFieldsMatch(p,(Dictionary<string,object>)pair.Value));foreach(var pair in (Dictionary<string,object>)data["snapshots"])checks.Add("snapshot-"+pair.Key,R24Gate.SnapshotFieldsMatch((Dictionary<string,object>)pair.Value));try{R24Gate.RequireRelease(p);checks.Add("releaseLocked",false);}catch{checks.Add("releaseLocked",true);}p.Save("offline-gate-results.json",new{checks=checks,releaseIssued=false,rootCreated=false,crypto=R24Gate.OfflineCryptoTest()});return 0;}
  if(args.Length==3&&args[0]=="issue-release"){var proposal=new BC(OwnRun(),args[1]);R24Gate.IssueRelease(proposal,args[2]);return 0;}
  if(args.Length!=2||!new[]{"host","observer"}.Contains(args[0]))return 93;
  var c=new BC(OwnRun(),args[1]);if(c.real){try{R24Gate.RequireRelease(c);}catch(Exception e){c.Save("locked-"+DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()+".json",new{status="LOCKED",reason=e.Message,rootCreated=false});return 3;}}
  return args[0]=="host"?Host(c,args[1]):Observer(c);
 }
 static object NativeExit(R22Process p){return new{pid=p.pid,startFileTime=p.startFileTime.ToString(),exitCode=R22Native.ExitCode(p),exitAt=R22Native.ExitAt(p),nativeHandleObserved=true};}
 static void ConsoleCheck(uint host,uint root,BT track,bool pre){
  uint[] members=BN.Members();if(!members.Contains(host)||members.Length==0)throw new Exception("HOST_CONSOLE_MISSING");
  foreach(uint pid in members)if(pid!=host&&(pre||!track.all.ContainsKey(pid)||!track.all[pid].inJob||!track.accepted))throw new Exception("UNEXPECTED_CONSOLE_MEMBER");
  if(pre&&members.Length!=1)throw new Exception("PRE_RESUME_CONSOLE_REFUSED");
 }
 static int Host(BC c,string manifestHash){
  BS start=null;R22Process observer=null,sidecar=null;BT track=null;bool resumed=false,handoff=false;uint host=(uint)Process.GetCurrentProcess().Id;
  var hostIdentity=BN.Observe(host,IntPtr.Zero);c.Save("host-started.json",BN.Row(hostIdentity));BN.Close(hostIdentity.native);
  if(!c.real)c.Save("attempt.json",new{mode="OFFLINE_ONLY",maxAttempts=1,retry=false,nonce=c.nonce});
  try{
   BN.ConsoleOwned(c.real||c.scenario=="visible-console");ConsoleCheck(host,0,null,true);
   if(c.real){if(!R24Gate.OperatorReady(c))throw new Exception("OPERATOR_NOT_READY");c.Save("operator-ready.json",new{actualOperatorReady=true,visible=BN.Visible(),recordingOffAttested=true});c.Save("fresh-preflight.json",R24Gate.Preflight(c));R24Gate.Marker(c);}
   if(c.real)c.Save("attempt.json",new{mode="APPROVED_REAL_INITDB",maxAttempts=1,retry=false,nonce=c.nonce});
   if(c.scenario=="visible-console")Console.WriteLine("R24 OFFLINE VISIBLE-CONSOLE SIMULATION -- NO PASSWORD INPUT");
   c.Save("console-state.json",new{visible=BN.Visible(),firstShowVisible=BN.FirstShowVisible,explicitShowVisible=BN.ExplicitShowVisible,interactive=Environment.UserInteractive,operatorReadySource=c.real?"LOCAL_OPERATOR_KEY":"SIMULATED_OFFLINE_ONLY",members=BN.Members()});
   start=BN.Root(c);if(start.error!=null)throw new Exception("ROOT_JOB_ASSIGN_UNKNOWN");
   track=new BT(c,start.job,start.p.pid);track.Sample();BP root=track.all[start.p.pid];if(!track.accepted||root.hash!=c.rootHash||root.parent!=host)throw new Exception("ROOT_NATIVE_IDENTITY");
   var self=BN.Observe(host,IntPtr.Zero);c.Save("identity.json",new{pid=start.p.pid,startFileTime=start.p.startFileTime.ToString(),image=start.p.image,hash=root.hash,jobName=start.jobName,hostPid=host,hostStart=self.native.startFileTime.ToString(),nonce=c.nonce});BN.Close(self.native);
   c.Save("created-suspended.json",new{members=BN.Members(),rows=track.Rows(),flags=BN.Flags(start.job),suspended=Suspended(start.p.pid)});
   if(c.scenario=="early-exit"){R22Native.Resume(start.p);resumed=true;R22Native.Exited(start.p,1000);}
   observer=BN.Spawn(c.run,"supervisor.exe","observer "+manifestHash,0x08000000u);
   var observerIdentity=BN.Observe(observer.pid,IntPtr.Zero);if(observerIdentity.hash!=c.supervisorHash||observerIdentity.owner!="S-1-5-21-1432835263-483988321-3159128977-1001")throw new Exception("OBSERVER_EXECUTABLE_IDENTITY");c.Save("observer-created.json",BN.Row(observerIdentity));BN.Close(observerIdentity.native);
   var wait=Stopwatch.StartNew();while(!File.Exists(Path.Combine(c.run,"observer-ready.json"))){if(wait.ElapsedMilliseconds>5000||R22Native.Exited(observer,0))throw new Exception("OBSERVER_NOT_READY");Thread.Sleep(10);}
   var ready=c.Read("observer-ready.json");if(BC.Pid(ready,"pid")!=start.p.pid||(string)ready["startFileTime"]!=start.p.startFileTime.ToString()||(string)ready["nonce"]!=c.nonce||BC.Pid(ready,"observerPid")!=observer.pid||(string)ready["observerStart"]!=observer.startFileTime.ToString())throw new Exception("OBSERVER_IDENTITY_REFUSED");
   if(c.scenario=="early-exit")throw new Exception("EARLY_NATIVE_EXIT");
   if(c.scenario=="outside-job"||c.scenario=="unexpected-console"){
    sidecar=BN.Spawn(c.run,c.scenario=="outside-job"?"fixture.exe":"foreign.exe","leaf",0);var sw=Stopwatch.StartNew();while(!BN.Members().Contains(sidecar.pid)&&sw.ElapsedMilliseconds<1000)Thread.Sleep(5);
    var info=BN.Observe(sidecar.pid,start.job);c.Save("outside-member.json",BN.Row(info));BN.Close(info.native);
   }
   if(c.scenario=="observer-loss")Thread.Sleep(250);
   c.Save("pre-resume.json",new{hostPid=host,childPid=start.p.pid,members=BN.Members(),rows=track.Rows(),suspended=Suspended(start.p.pid),observerReady=true});
   if(!Suspended(start.p.pid)||R22Native.Exited(observer,0))throw new Exception("PRE_RESUME_NATIVE_OR_OBSERVER_REFUSED");
   uint requestPid=c.scenario=="wrong-pid"?start.p.pid+1:start.p.pid;string requestTime=c.scenario=="wrong-time"?"1":start.p.startFileTime.ToString();string requestHash=c.scenario=="wrong-hash"?new string('0',64):c.rootHash;
   c.Save("requested-identity.json",new{requestedPid=requestPid,requestedStart=requestTime,requestedHash=requestHash,actual=BN.Row(root)});
   if(requestPid!=root.native.pid||requestTime!=root.native.startFileTime.ToString()||requestHash!=root.hash)throw new Exception("NATIVE_IDENTITY_REFUSED");
   track.Sample();if(!track.accepted||BN.Active(start.job)!=1||BN.Flags(start.job)!=0)throw new Exception("PRE_RESUME_JOB_POLICY_REFUSED");
   ConsoleCheck(host,start.p.pid,track,true);
   if(c.scenario=="pre-failure")throw new Exception("PRE_RESUME_GATE_FAILURE");
   if(c.scenario=="host-loss"){handoff=true;c.Save("outcome.json",new{status="UNKNOWN_NATIVE_OUTCOME",reason="HOST_LOSS_SIMULATION",resumed=false,sideEffectsPossible=false,retry=false});return 0;}
   R22Native.Resume(start.p);resumed=true;var attach=Stopwatch.StartNew();bool seen=false;var clock=Stopwatch.StartNew();
   while(!R22Native.Exited(start.p,10)||BN.Active(start.job)>0){
    track.Sample();if(!track.accepted)throw new Exception(track.reason);ConsoleCheck(host,start.p.pid,track,false);
    if(!seen&&BN.Members().Contains(start.p.pid)){seen=true;c.Save("attached.json",new{intervalMs=attach.ElapsedMilliseconds,members=BN.Members(),rows=track.Rows(),preSideEffectSafety=false});}
    if(seen&&!R22Native.Exited(start.p,0)&&!BN.Members().Contains(start.p.pid))throw new Exception("ROOT_CONSOLE_MEMBERSHIP_LOST");
    if(!seen&&attach.ElapsedMilliseconds>(c.real?2000:700))throw new Exception("MISSING_CHILD_CONSOLE");
    if(c.scenario=="post-failure"&&seen&&File.Exists(Path.Combine(c.run,"synthetic-side-effect.json")))throw new Exception("POST_RESUME_GATE_FAILURE");
    if(c.scenario=="unknown"&&clock.ElapsedMilliseconds>200)throw new Exception("UNKNOWN_NATIVE_OUTCOME");
    if(R22Native.Exited(observer,0))throw new Exception("OBSERVER_LOSS");
    if(clock.ElapsedMilliseconds>(c.real?120000:8000))throw new Exception("MONITOR_TIMEOUT_UNKNOWN");
   }
   if(!seen)throw new Exception("NO_CONSOLE_ATTACHMENT_EVIDENCE");
   track.Sample();c.Save("policy-final.json",new{accepted=track.accepted,rows=track.Rows(),jobActive=BN.Active(start.job),flags=BN.Flags(start.job)});
   var terminalWait=Stopwatch.StartNew();while(!File.Exists(Path.Combine(c.run,"observer-native.json"))){if(terminalWait.ElapsedMilliseconds>2000)throw new Exception("INDEPENDENT_TERMINAL_UNKNOWN");Thread.Sleep(10);}
   var terminal=c.Read("observer-native.json");var observedRoot=(Dictionary<string,object>)terminal["root"];
   if(!(bool)terminal["independentHandle"]||!(bool)terminal["accepted"]||(bool)terminal["hostLost"]||BC.Pid(observedRoot,"pid")!=start.p.pid||(string)observedRoot["startFileTime"]!=start.p.startFileTime.ToString()||Convert.ToUInt32(observedRoot["exitCode"])!=R22Native.ExitCode(start.p)||(string)observedRoot["exitAt"]!=R22Native.ExitAt(start.p)||Convert.ToUInt32(terminal["jobActive"])!=0)throw new Exception("INDEPENDENT_TERMINAL_CONFLICT");
   c.Save("outcome.json",new{status=R22Native.ExitCode(start.p)==0?(c.real?"INITDB_NATIVE_EXIT0_FILES_NOT_YET_VERIFIED":"OFFLINE_SYNTHETIC_PASS"):"BLOCKED",reason=R22Native.ExitCode(start.p)==0?"CONFIRMED":"NATIVE_NONZERO",resumed=true,sideEffectsPossible=true,retry=false});
  }catch(Exception e){
   c.Save("failure-state.json",new{reason=e.Message,resumed=resumed,sideEffectsPossible=resumed,rows=track==null?new object[0]:track.Rows(),members=BN.Members(),jobActive=start==null?0:BN.Active(start.job)});
   if(!c.real&&track!=null)track.DisposeAll("host-disposition");if(!c.real&&sidecar!=null&&!R22Native.Exited(sidecar,0)){BN.DisposeFixture(sidecar,c.run,c.fixtureHash);c.Save("sidecar-disposition.json",new{classification="ABNORMAL_FIXTURE_DISPOSITION",native=NativeExit(sidecar),graceful=false});}
   c.Save("outcome.json",new{status=start==null?"BLOCKED_BEFORE_ROOT":c.real||e.Message.Contains("UNKNOWN")?"UNKNOWN_NATIVE_OUTCOME":"BLOCKED",reason=e.Message,rootCreated=start!=null,resumed=resumed,sideEffectsPossible=resumed,retry=false});
  }finally{
   if(start!=null&&!handoff&&R22Native.Exited(start.p,0))c.Save("host-native.json",new{root=NativeExit(start.p),rows=track==null?new object[0]:track.Rows(),jobActive=BN.Active(start.job),flags=BN.Flags(start.job)});
   if(track!=null)track.Close();if(start!=null){BN.Close(start.p);R22Native.CloseHandle(start.job);}BN.Close(sidecar);BN.Close(observer);
  }return 0;
 }
 static bool Suspended(uint pid){var p=Process.GetProcessById((int)pid);return p.Threads.Count>0&&p.Threads.Cast<ProcessThread>().All(t=>t.ThreadState==System.Diagnostics.ThreadState.Wait&&t.WaitReason==ThreadWaitReason.Suspended);}
 static int Observer(BC c){
  IntPtr job=IntPtr.Zero;BT track=null;R22Process parent=null;try{
   var id=c.Read("identity.json");job=BN.OpenJob((string)id["jobName"]);track=new BT(c,job,BC.Pid(id,"pid"));track.Sample();BP root=track.all[BC.Pid(id,"pid")];if(root.native.startFileTime.ToString()!=(string)id["startFileTime"]||!track.accepted)throw new Exception("OBSERVER_ROOT_IDENTITY");
   parent=R22Native.Observe(BC.Pid(id,"hostPid"));if(parent.startFileTime.ToString()!=(string)id["hostStart"]||parent.image!=Path.Combine(c.run,"supervisor.exe")||BN.Hash(parent.image)!=c.supervisorHash)throw new Exception("HOST_IDENTITY");
   var self=R22Native.Observe((uint)Process.GetCurrentProcess().Id);c.Save("observer-ready.json",new{pid=root.native.pid,startFileTime=root.native.startFileTime.ToString(),nonce=c.nonce,observerPid=self.pid,observerStart=self.startFileTime.ToString(),independentHandle=true});BN.Close(self);
   if(c.scenario=="observer-loss"){Thread.Sleep(100);c.Save("observer-exit.json",new{intentional=true});return 7;}
   var clock=Stopwatch.StartNew();bool hostLost=false;
   while(!R22Native.Exited(root.native,30)||BN.Active(job)>0){
    track.Sample();if(R22Native.Exited(parent,0)){hostLost=true;if(!c.real)track.DisposeAll("observer-disposition");}
    if(clock.ElapsedMilliseconds>(c.real?130000:12000))throw new Exception("OBSERVER_TIMEOUT_UNKNOWN");
   }
   c.Save("observer-native.json",new{root=NativeExit(root.native),nonce=c.nonce,independentHandle=true,jobActive=BN.Active(job),flags=BN.Flags(job),rows=track.Rows(),accepted=track.accepted,hostLost=hostLost});return 0;
  }catch(Exception e){c.Save("observer-error.json",new{reason=e.Message,status="UNKNOWN_NATIVE_OUTCOME"});return 2;}
  finally{if(track!=null)track.Close();BN.Close(parent);if(job!=IntPtr.Zero)R22Native.CloseHandle(job);}
 }
}
