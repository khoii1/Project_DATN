// R2.3 only. Exact fixed initdb command; no password transport, termination or retry APIs.
using System;
using System.IO;
using System.Text;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
public sealed class R23Started { public R22Process process; public IntPtr job; public string jobName,error; }
public static class R23Native {
 public const string Root=@"C:\DATN\test-instances\phase13-5d1g";
 public const string Binary=@"C:\Program Files\PostgreSQL\17\bin\initdb.exe";
 public const string BinaryHash="94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC";
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct Startup{public uint cb;public string reserved,desktop,title;public uint x,y,xSize,ySize,xChars,yChars,fill,flags;public ushort show,reserved2;public IntPtr reservedPtr,stdIn,stdOut,stdErr;}
 [StructLayout(LayoutKind.Sequential)]struct Info{public IntPtr process,thread;public uint pid,tid;}
 [StructLayout(LayoutKind.Sequential)]struct Accounting{public long user,kernel,periodUser,periodKernel;public uint faults,total,active,terminated;}
 [StructLayout(LayoutKind.Sequential)]struct Limits{public long processTime,jobTime;public uint flags;public UIntPtr min,max;public uint active;public UIntPtr affinity;public uint priority,scheduling;}
 [StructLayout(LayoutKind.Sequential)]struct IO{public ulong a,b,c,d,e,f;}
 [StructLayout(LayoutKind.Sequential)]struct Extended{public Limits basic;public IO io;public UIntPtr processMemory,jobMemory,peakProcess,peakJob;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessW(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref Startup s,out Info info);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateJobObjectW(IntPtr attrs,string name);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr OpenJobObjectW(uint access,bool inherit,string name);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll")]static extern bool QueryInformationJobObject(IntPtr job,int cls,IntPtr buffer,uint size,IntPtr returned);
 [DllImport("kernel32.dll")]static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")]static extern bool ShowWindow(IntPtr window,int how);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr window);
 public static string Hash(string file){using(var h=SHA256.Create())using(var f=File.OpenRead(file))return BitConverter.ToString(h.ComputeHash(f)).Replace("-","");}
 public static bool ConsoleReady(bool visible){
  if(!Environment.UserInteractive||System.Diagnostics.Process.GetCurrentProcess().SessionId==0)return false;
  R22Native.FreeConsole();if(!R22Native.AllocConsole())return false;
  ShowWindow(GetConsoleWindow(),visible?5:0);
  Console.SetIn(new StreamReader(Console.OpenStandardInput()));Console.SetOut(new StreamWriter(Console.OpenStandardOutput()){AutoFlush=true});
  Console.SetError(new StreamWriter(Console.OpenStandardError()){AutoFlush=true});
  return IsWindowVisible(GetConsoleWindow())==visible;
 }
 public static bool Visible(){return IsWindowVisible(GetConsoleWindow());}
 public static bool OperatorReady(){
  Console.WriteLine("R2.3: ONE initdb attempt only. No PostgreSQL server will start.");
  Console.WriteLine("Keep this console OPEN. No transcript, screen recording or input capture.");
  Console.WriteLine("Prepare a NEW TEST password, never a production password. Do not send it to chat.");
  Console.WriteLine("Press R when this window is visible, recording is OFF and you are ready to type twice.");
  Console.WriteLine("Press Q to cancel BEFORE initdb. Readiness deadline: 120 seconds.");
  var clock=System.Diagnostics.Stopwatch.StartNew();while(clock.ElapsedMilliseconds<120000){
   if(Console.KeyAvailable){var k=Console.ReadKey(true);if(k.Key==ConsoleKey.R)return true;if(k.Key==ConsoleKey.Q)return false;}System.Threading.Thread.Sleep(40);
  }return false;
 }
 public static uint JobActive(IntPtr job){int size=Marshal.SizeOf(typeof(Accounting));IntPtr b=Marshal.AllocHGlobal(size);try{if(!QueryInformationJobObject(job,1,b,(uint)size,IntPtr.Zero))throw new Exception("JOB_ACCOUNTING_UNKNOWN");return ((Accounting)Marshal.PtrToStructure(b,typeof(Accounting))).active;}finally{Marshal.FreeHGlobal(b);}}
 public static uint JobFlags(IntPtr job){int size=Marshal.SizeOf(typeof(Extended));IntPtr b=Marshal.AllocHGlobal(size);try{if(!QueryInformationJobObject(job,9,b,(uint)size,IntPtr.Zero))throw new Exception("JOB_LIMITS_UNKNOWN");return ((Extended)Marshal.PtrToStructure(b,typeof(Extended))).basic.flags;}finally{Marshal.FreeHGlobal(b);}}
 public static IntPtr OpenJob(string name){if(!name.StartsWith("Local\\SmartAgriR23-",StringComparison.Ordinal))throw new Exception("JOB_NAME_REFUSED");IntPtr h=OpenJobObjectW(4,false,name);if(h==IntPtr.Zero||JobFlags(h)!=0)throw new Exception("JOB_QUERY_REFUSED");return h;}
 static R23Started Launch(string exe,string arguments,string cwd,string runId){
  if(!System.Text.RegularExpressions.Regex.IsMatch(runId,"^r23-[a-z0-9-]{1,60}$"))throw new Exception("RUN_ID_REFUSED");
  string name="Local\\SmartAgriR23-"+runId;IntPtr job=CreateJobObjectW(IntPtr.Zero,name);int jobError=Marshal.GetLastWin32Error();
  if(job==IntPtr.Zero||jobError==183)throw new Exception("JOB_EXISTS_OR_CREATE_FAILED");
  if(JobFlags(job)!=0)throw new Exception("NONZERO_JOB_LIMITS_REFUSED");
  // Explicit child-only environment block. No PG*, DATABASE_URL or password variables inherited.
  string env="SystemRoot=C:\\Windows\0TEMP=C:\\Windows\\Temp\0TMP=C:\\Windows\\Temp\0WINDIR=C:\\Windows\0\0";
  IntPtr block=Marshal.StringToHGlobalUni(env);var s=new Startup();s.cb=(uint)Marshal.SizeOf(s);Info info;
  try{
   if(!CreateProcessW(exe,new StringBuilder("\""+exe+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,false,4u|0x400u,block,cwd,ref s,out info))throw new Exception("CREATE_PROCESS_FAILED_"+Marshal.GetLastWin32Error());
  }finally{Marshal.FreeHGlobal(block);}
  // Return held handles even if identity/job assignment fails: no orphan hidden by an exception.
  var result=new R23Started{job=job,jobName=name,process=new R22Process{pid=info.pid,handle=info.process,thread=info.thread},error=null};
  try{var observed=R22Native.Observe(info.pid);result.process.startFileTime=observed.startFileTime;result.process.image=observed.image;R22Native.CloseHandle(observed.handle);
   if(!AssignProcessToJobObject(job,info.process))result.error="JOB_ASSIGN_FAILED_"+Marshal.GetLastWin32Error();
   else if(JobActive(job)!=1||JobFlags(job)!=0)result.error="JOB_INITIAL_STATE_UNKNOWN";
  }catch{result.error="CREATED_PROCESS_IDENTITY_UNKNOWN";}return result;
 }
 public static R23Started LaunchInitdb(string runId){
  if(Directory.Exists(Root+"\\data")||File.Exists(Root+"\\data"))throw new Exception("PGDATA_EXISTS");
  if(!File.Exists(Root+"\\initdb-attempt-r23-"+runId+".json"))throw new Exception("MARKER_REQUIRED");
  if(Hash(Binary)!=BinaryHash)throw new Exception("INITDB_HASH_DRIFT");
  return Launch(Binary,"-D \""+Root+"\\data\" -U d1g_dba --pwprompt --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --locale=C --no-clean",Root,runId);
 }
 public static R23Started LaunchFixture(string run,string runId,bool exit7){
  string full=Path.GetFullPath(run);if(!full.StartsWith(@"C:\DATN\Project_datn\build\phase13-5d1g-r23\r23-",StringComparison.OrdinalIgnoreCase))throw new Exception("FIXTURE_ROOT_REFUSED");
  return Launch(Path.Combine(full,"fixture.exe"),exit7?"exit7":"success",full,runId);
 }
}
