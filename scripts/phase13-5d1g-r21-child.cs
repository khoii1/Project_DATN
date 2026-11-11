// OFFLINE SYNTHETIC EXECUTABLE ONLY. No database, network, real password or production executable.
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using System.Collections.Generic;
public static class R21Child {
 const string Canary="SYNTHETIC_INPUT_CANARY_R21_NOT_A_PASSWORD";
 static string dir,nonce,scenario;static int hostPid;static string hostTicks;
 static volatile bool cancel=false,done=false,readPending=false,detached=false;
 static bool modeRestored=true,echoDisabled=true,echoDetected=false,resourcesClosed=false,cancelCalled=false,cancelSucceeded=false;
 static string readerResult="UNKNOWN";static int phase=0,lastInjected=0,readError=0;static long pendingAt=0;
 static IntPtr input=IntPtr.Zero,output=IntPtr.Zero,readerHandle=IntPtr.Zero;
 static readonly JavaScriptSerializer json=new JavaScriptSerializer();
 delegate bool Handler(uint type);
 static Handler handler=delegate(uint type){if(type==0){if(scenario!="ignore-cancel")cancel=true;ctrlCSeen=true;return true;}return false;};
 static volatile bool ctrlCSeen=false;
 [StructLayout(LayoutKind.Explicit,Size=20)]struct Key{[FieldOffset(0)]public ushort type;[FieldOffset(4)]public int down;[FieldOffset(8)]public ushort repeat;[FieldOffset(10)]public ushort vk;[FieldOffset(14)]public ushort c;}
 [StructLayout(LayoutKind.Sequential)]struct Coord{public short x,y;public Coord(short a,short b){x=a;y=b;}}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr sec,uint create,uint f,IntPtr t);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")]static extern uint GetCurrentThreadId();
 [DllImport("kernel32.dll")]static extern IntPtr OpenThread(uint access,bool inherit,uint id);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool CancelSynchronousIo(IntPtr thread);
 [DllImport("kernel32.dll")]static extern bool SetConsoleCtrlHandler(Handler h,bool add);
 [DllImport("kernel32.dll")]static extern bool GetConsoleMode(IntPtr h,out uint m);
 [DllImport("kernel32.dll")]static extern bool SetConsoleMode(IntPtr h,uint m);
 [DllImport("kernel32.dll")]static extern uint GetConsoleProcessList(uint[] list,uint count);
 [DllImport("kernel32.dll")]static extern bool FreeConsole();
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool ReadConsoleW(IntPtr h,[Out]char[] b,uint n,out uint got,IntPtr control);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool WriteConsoleInputW(IntPtr h,Key[] k,uint n,out uint got);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool ReadConsoleOutputCharacterW(IntPtr h,StringBuilder b,uint n,Coord c,out uint got);
 static bool Valid(IntPtr h){return h!=IntPtr.Zero&&h!=new IntPtr(-1);}
 static string PathFor(string name){return Path.Combine(dir,name);}
 static void Publish(string name,object value){byte[] b=Encoding.UTF8.GetBytes(json.Serialize(value));string tmp=PathFor(name+".pending");using(var f=new FileStream(tmp,FileMode.CreateNew,FileAccess.Write,FileShare.Read)){f.Write(b,0,b.Length);f.Flush(true);}File.Move(tmp,PathFor(name));}
 static void Beat(){using(var f=new FileStream(PathFor("child-heartbeat.jsonl"),FileMode.Append,FileAccess.Write,FileShare.Read)){byte[] b=Encoding.UTF8.GetBytes(json.Serialize(new{pid=Process.GetCurrentProcess().Id,startTicks=Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(),nonce=nonce,phase=phase,pending=readPending,at=DateTimeOffset.UtcNow.ToString("o")})+"\n");f.Write(b,0,b.Length);f.Flush(true);}}
 static bool Request(string name){if(!File.Exists(PathFor(name)))return false;try{var r=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(PathFor(name)));return (string)r["nonce"]==nonce&&Convert.ToInt32(r["pid"])==Process.GetCurrentProcess().Id&&(string)r["startTicks"]==Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString();}catch{return false;}}
 static void Inject(string text){foreach(char c in text){uint got;if(!WriteConsoleInputW(input,new[]{new Key{type=1,down=1,repeat=1,vk=(ushort)(c=='\r'?13:0),c=c}},1,out got)||got!=1)throw new Exception("INJECT_FAILED");}}
 static void Reader(){
  readerHandle=OpenThread(1,false,GetCurrentThreadId());
  try{
   if(!Valid(readerHandle))throw new Exception("READER_HANDLE_FAILED");
   string first=null;
   for(int index=1;index<=2;index++){
    if(cancel)throw new Exception("CANCELLED");
    uint old;if(!GetConsoleMode(input,out old))throw new Exception("CONSOLE_LOST");
    if(!SetConsoleMode(input,3))throw new Exception("MODE_FAILED");uint actual;
    echoDisabled=echoDisabled&&GetConsoleMode(input,out actual)&&(actual&4)==0;
    char[] b=new char[256];uint got=0;bool ok=false;
    phase=index;pendingAt=Stopwatch.GetTimestamp();readPending=true;
    try{ok=ReadConsoleW(input,b,256,out got,IntPtr.Zero);readError=ok?0:Marshal.GetLastWin32Error();}
    finally{readPending=false;modeRestored=SetConsoleMode(input,old)&&modeRestored;}
    if(cancel)throw new Exception("CANCELLED");
    if(!ok)throw new Exception("CONSOLE_LOST");
    string value=new string(b,0,(int)got).TrimEnd('\r','\n');Array.Clear(b,0,b.Length);
    var screen=new StringBuilder(10000);uint count;
    if(!ReadConsoleOutputCharacterW(output,screen,9999,new Coord(0,0),out count))throw new Exception("SCREEN_UNAVAILABLE");
    echoDetected=echoDetected||screen.ToString().Contains(Canary);
    if(echoDetected||!echoDisabled)throw new Exception("ECHO_UNSAFE");
    if(value.Length==0)throw new Exception("MISSING_INPUT");
    if(index==1)first=value;else if(first!=value)throw new Exception("CONFIRMATION_MISMATCH");
   }
   readerResult="SYNTHETIC_CONFIRMED";
  }catch(Exception e){readerResult=e.Message=="CANCELLED"?"CANCELLED":e.Message=="MISSING_INPUT"?"MISSING_INPUT":e.Message=="CONFIRMATION_MISMATCH"?"CONFIRMATION_MISMATCH":"CONSOLE_LOST";}
  finally{done=true;}
 }
 public static int Main(string[] args){
  if(args.Length!=5)return 91;dir=Path.GetFullPath(args[0]);scenario=args[1];nonce=args[2];hostPid=int.Parse(args[3]);hostTicks=args[4];
  if(!dir.StartsWith(@"C:\DATN\Project_datn\build\phase13-5d1g-r21-offline\",StringComparison.OrdinalIgnoreCase))return 92;
  if(scenario=="guest"){Publish("guest.json",new{pid=Process.GetCurrentProcess().Id,startTicks=Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString()});Thread.Sleep(2200);return 0;}
  string outcome="UNKNOWN",reason="NONE";bool cleanup=false,loss=false,hostLost=false;Thread reader=null,detach=null;
  try{
   if(!SetConsoleCtrlHandler(handler,true))throw new Exception("HANDLER_FAILED");
   input=CreateFile("CONIN$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);output=CreateFile("CONOUT$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
   if(!Valid(input)||!Valid(output))throw new Exception("NO_CONSOLE");
   var self=Process.GetCurrentProcess();uint[] members=new uint[8];uint memberCount=GetConsoleProcessList(members,8);
   Publish("child-ready.json",new{pid=self.Id,startTicks=self.StartTime.ToUniversalTime().Ticks.ToString(),hostPid=hostPid,hostStartTicks=hostTicks,nonce=nonce,consoleMemberCount=memberCount,readyAt=DateTimeOffset.UtcNow.ToString("o")});
   var total=Stopwatch.StartNew();long lastBeat=-100;
   while(!Request("start.json")){if(total.ElapsedMilliseconds>6000)throw new Exception("START_GATE_TIMEOUT");if(total.ElapsedMilliseconds-lastBeat>=100){Beat();lastBeat=total.ElapsedMilliseconds;}Thread.Sleep(10);}
   if(scenario=="already-exited"){outcome="CHILD_ALREADY_EXITED";return Terminal(outcome,0,true,false,false,false,reason);}
   if(scenario=="exit7"){outcome="NATIVE_NONZERO";return Terminal(outcome,7,true,false,false,false,reason);}
   if(scenario=="loss-before"){loss=true;detached=FreeConsole();outcome=detached?"CONSOLE_LOST_RECOVERED":"CONSOLE_LOST_UNKNOWN";return Terminal(outcome,23,true,false,false,detached,reason);}
   reader=new Thread(Reader);reader.IsBackground=true;reader.Start();long cancellationAt=-1;
   while(!done){
    if(total.ElapsedMilliseconds-lastBeat>=100){Beat();lastBeat=total.ElapsedMilliseconds;}
    try{var host=Process.GetProcessById(hostPid);if(host.StartTime.ToUniversalTime().Ticks.ToString()!=hostTicks)hostLost=true;}catch{hostLost=true;}
    if(Request("cleanup.json")){cleanup=true;cancel=true;reason="ABNORMAL_TEST_CLEANUP";}
    if(hostLost){cancel=true;reason="SUPERVISOR_LOST";}
    if(scenario!="ignore-cancel"&&Request("cancel.json")){cancel=true;reason="SUPERVISOR_REQUEST";}
    if(ctrlCSeen&&scenario!="ignore-cancel"){cancel=true;if(reason=="NONE")reason="CTRL_C_EVENT";}
    double pendingMs=(Stopwatch.GetTimestamp()-pendingAt)*1000.0/Stopwatch.Frequency;
    if(scenario=="loss-during"&&readPending&&pendingMs>100&&!loss){
     loss=true;Publish("console-loss-observed.json",new{nonce=nonce,pid=self.Id,readPending=true});
     detach=new Thread(delegate(){detached=FreeConsole();});detach.IsBackground=true;detach.Start();
     cancel=true;reason="CONSOLE_LOST_DURING_READ";
    }
    if(!cancel&&readPending&&pendingMs>80&&phase!=lastInjected&&new[]{"success","mismatch","missing"}.ContainsValue(scenario)){
     Inject(scenario=="missing"?"\r":(scenario=="mismatch"&&phase==2?"SYNTHETIC_OTHER":Canary)+"\r");lastInjected=phase;
    }
    if(cancel&&readPending&&pendingMs>60&&!cancelCalled&&Valid(readerHandle)){
     cancelCalled=true;cancelSucceeded=CancelSynchronousIo(readerHandle);cancellationAt=total.ElapsedMilliseconds;
    }
    if(cancellationAt>=0&&total.ElapsedMilliseconds-cancellationAt>1400)break;
    if(total.ElapsedMilliseconds>8000){cleanup=true;reason="CHILD_SELF_DEADLINE";break;}
    Thread.Sleep(10);
   }
   bool joined=reader.Join(200);if(detach!=null)detach.Join(200);resourcesClosed=joined&&done;
   if(loss)outcome=resourcesClosed&&detached?"CONSOLE_LOST_RECOVERED":"CONSOLE_LOST_UNKNOWN";
   else if(cleanup)outcome="ABNORMAL_TEST_CLEANUP";
   else if(hostLost)outcome="SUPERVISOR_LOST_CANCELLED";
   else if(cancel&&resourcesClosed&&readerResult=="CANCELLED"&&modeRestored)outcome="CONTROLLED_CANCEL_SUCCESS";
   else outcome=resourcesClosed?readerResult:"GRACEFUL_STOP_TIMEOUT";
   return Terminal(outcome,outcome=="SYNTHETIC_CONFIRMED"||outcome=="CONTROLLED_CANCEL_SUCCESS"?0:23,resourcesClosed,cancelCalled,cancelSucceeded,detached,reason);
  }catch{return Terminal("UNKNOWN",23,false,cancelCalled,cancelSucceeded,detached,reason);}
  finally{if(Valid(readerHandle))CloseHandle(readerHandle);if(Valid(input))CloseHandle(input);if(Valid(output))CloseHandle(output);}
 }
 static int Terminal(string outcome,int exit,bool closed,bool called,bool succeeded,bool consoleDetached,string reason){
  bool released=closed;
  if(closed){
   if(Valid(readerHandle)){released=CloseHandle(readerHandle)&&released;readerHandle=IntPtr.Zero;}
   if(Valid(input)){released=CloseHandle(input)&&released;input=IntPtr.Zero;}
   if(Valid(output)){released=CloseHandle(output)&&released;output=IntPtr.Zero;}
  }
  Publish("child-terminal.json",new{pid=Process.GetCurrentProcess().Id,startTicks=Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(),nonce=nonce,outcome=outcome,intendedExitCode=exit,resourcesClosed=closed&&released,handlesReleased=released,modeRestored=modeRestored,echoDisabled=echoDisabled,echoDetected=echoDetected,cancelIoCalled=called,cancelIoSucceeded=succeeded,readError=readError,ctrlCObserved=ctrlCSeen,detached=consoleDetached,reason=reason});return exit;
 }
 static bool ContainsValue(this string[] values,string value){foreach(var item in values)if(item==value)return true;return false;}
}
