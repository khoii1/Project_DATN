// R24 fixed real/synthetic factories. Real factory requires a source/run-bound release; no kill-on-close limit.
using System;using System.IO;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;using System.Security.Principal;
public sealed class BP{public R22Process native;public uint parent;public string owner,hash,role;public int depth;public bool restricted,inJob;}
public sealed class BS{public R22Process p;public IntPtr job;public string jobName,error;}
public static class BN{
 public const string Base=@"C:\DATN\Project_datn\build\phase13-5d1g-r24\";
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct S{public uint cb;public string reserved,desktop,title;public uint x,y,xs,ys,xc,yc,fill,flags;public ushort show,r2;public IntPtr ptr,stdin,stdout,stderr;}
 [StructLayout(LayoutKind.Sequential)]struct PI{public IntPtr p,t;public uint pid,tid;}
 [StructLayout(LayoutKind.Sequential)]struct BI{public IntPtr reserved,peb,r20,r21,pid,parent;}
 [StructLayout(LayoutKind.Sequential)]struct AC{public long a,b,c,d;public uint faults,total,active,terminated;}
 [StructLayout(LayoutKind.Sequential)]struct L{public long p,j;public uint flags;public UIntPtr min,max;public uint active;public UIntPtr affinity;public uint priority,scheduling;}
 [StructLayout(LayoutKind.Sequential)]struct IO{public ulong a,b,c,d,e,f;}
 [StructLayout(LayoutKind.Sequential)]struct EX{public L basic;public IO io;public UIntPtr p,j,pp,pj;}
 [DllImport("ntdll.dll")]static extern int NtQueryInformationProcess(IntPtr h,int cls,ref BI info,int size,out int returned);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessW(string exe,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref S s,out PI pi);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateJobObjectW(IntPtr attrs,string name);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr OpenJobObjectW(uint access,bool inherit,string name);
 [DllImport("kernel32.dll")]static extern bool QueryInformationJobObject(IntPtr h,int cls,IntPtr b,uint n,IntPtr ret);
 [DllImport("kernel32.dll")]static extern bool AssignProcessToJobObject(IntPtr job,IntPtr p);
 [DllImport("kernel32.dll")]static extern bool IsProcessInJob(IntPtr p,IntPtr job,out bool inside);
 [DllImport("advapi32.dll")]static extern bool OpenProcessToken(IntPtr p,uint access,out IntPtr t);
 [DllImport("advapi32.dll")]static extern bool GetTokenInformation(IntPtr t,int cls,IntPtr b,uint n,out uint size);
 [DllImport("advapi32.dll")]static extern bool IsTokenRestricted(IntPtr t);
 [DllImport("kernel32.dll")]static extern bool TerminateProcess(IntPtr p,uint code);
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")]static extern bool GetProcessTimes(IntPtr h,out long c,out long e,out long k,out long u);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll")]static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")]static extern bool ShowWindow(IntPtr w,int how);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr w);
 public static string Hash(string f){using(var sha=System.Security.Cryptography.SHA256.Create())using(var s=File.OpenRead(f))return BitConverter.ToString(sha.ComputeHash(s)).Replace("-","");}
 public static bool Visible(){return IsWindowVisible(GetConsoleWindow());}
 public static bool FirstShowVisible,ExplicitShowVisible;
 public static void ConsoleOwned(bool visible){if(!Environment.UserInteractive||System.Diagnostics.Process.GetCurrentProcess().SessionId==0)throw new Exception("NONINTERACTIVE_SESSION");R22Native.FreeConsole();if(!R22Native.AllocConsole())throw new Exception("CONSOLE_UNAVAILABLE");
  // First ShowWindow can obey inherited STARTUPINFO/SW_HIDE; the second is an explicit owned-window request.
  ShowWindow(GetConsoleWindow(),visible?5:0);FirstShowVisible=Visible();ShowWindow(GetConsoleWindow(),visible?5:0);var wait=System.Diagnostics.Stopwatch.StartNew();while(Visible()!=visible&&wait.ElapsedMilliseconds<1000)System.Threading.Thread.Sleep(10);ExplicitShowVisible=Visible();
  Console.SetIn(new StreamReader(Console.OpenStandardInput()));Console.SetOut(new StreamWriter(Console.OpenStandardOutput()){AutoFlush=true});Console.SetError(new StreamWriter(Console.OpenStandardError()){AutoFlush=true});if(ExplicitShowVisible!=visible)throw new Exception("CONSOLE_VISIBILITY_UNKNOWN");}
 public static void ConsoleForFixture(){ConsoleOwned(false);}
 public static uint[] Members(){uint[] a=new uint[32];uint n=R22Native.GetConsoleProcessList(a,32);if(n>32)throw new Exception("CONSOLE_OVERFLOW");Array.Resize(ref a,(int)n);return a;}
 public static uint Flags(IntPtr job){int n=Marshal.SizeOf(typeof(EX));IntPtr b=Marshal.AllocHGlobal(n);try{if(!QueryInformationJobObject(job,9,b,(uint)n,IntPtr.Zero))throw new Exception("JOB_FLAGS_UNKNOWN");return ((EX)Marshal.PtrToStructure(b,typeof(EX))).basic.flags;}finally{Marshal.FreeHGlobal(b);}}
 public static uint Active(IntPtr job){int n=Marshal.SizeOf(typeof(AC));IntPtr b=Marshal.AllocHGlobal(n);try{if(!QueryInformationJobObject(job,1,b,(uint)n,IntPtr.Zero))throw new Exception("JOB_COUNT_UNKNOWN");return ((AC)Marshal.PtrToStructure(b,typeof(AC))).active;}finally{Marshal.FreeHGlobal(b);}}
 public static uint[] JobIds(IntPtr job){int n=8+32*IntPtr.Size;IntPtr b=Marshal.AllocHGlobal(n);try{if(!QueryInformationJobObject(job,3,b,(uint)n,IntPtr.Zero))throw new Exception("JOB_MEMBERS_UNKNOWN");int assigned=Marshal.ReadInt32(b,0),count=Marshal.ReadInt32(b,4);if(count<0||count>8)throw new Exception("JOB_MEMBER_BOUND");if(assigned!=count)throw new Exception("JOB_PARTIAL_SNAPSHOT_UNKNOWN");uint[] ids=new uint[count];for(int i=0;i<count;i++)ids[i]=checked((uint)Marshal.ReadIntPtr(b,8+i*IntPtr.Size).ToInt64());return ids;}finally{Marshal.FreeHGlobal(b);}}
 public static IntPtr OpenJob(string name){if(!name.StartsWith("Local\\SA-R24-",StringComparison.Ordinal))throw new Exception("JOB_NAME_REFUSED");IntPtr h=OpenJobObjectW(4,false,name);if(h==IntPtr.Zero||Flags(h)!=0)throw new Exception("JOB_OPEN_REFUSED");return h;}
 public static BP Observe(uint pid,IntPtr job){var p=R22Native.Observe(pid);try{BI bi=new BI();int n;if(NtQueryInformationProcess(p.handle,0,ref bi,Marshal.SizeOf(bi),out n)!=0)throw new Exception("NATIVE_PARENT_UNKNOWN");IntPtr token;if(!OpenProcessToken(p.handle,8,out token))throw new Exception("TOKEN_UNKNOWN");string owner;bool restricted;
  try{uint size;GetTokenInformation(token,1,IntPtr.Zero,0,out size);IntPtr b=Marshal.AllocHGlobal((int)size);try{if(!GetTokenInformation(token,1,b,size,out size))throw new Exception("OWNER_UNKNOWN");owner=new SecurityIdentifier(Marshal.ReadIntPtr(b)).Value;restricted=IsTokenRestricted(token);}finally{Marshal.FreeHGlobal(b);}}finally{R22Native.CloseHandle(token);}
  bool inside=false;if(job!=IntPtr.Zero&&!IsProcessInJob(p.handle,job,out inside))throw new Exception("JOB_MEMBERSHIP_UNKNOWN");return new BP{native=p,parent=checked((uint)bi.parent.ToInt64()),owner=owner,hash=Hash(p.image),restricted=restricted,inJob=inside,depth=-1};
 }catch{R22Native.CloseHandle(p.handle);throw;}}
 public static R22Process Spawn(string run,string name,string args,uint flags){string dir=Path.GetFullPath(run);if(!dir.StartsWith(Base+"r24-",StringComparison.OrdinalIgnoreCase)||!System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(dir),"^r24-[a-z0-9-]+$")||!Array.Exists(new[]{"fixture.exe","foreign.exe","supervisor.exe"},s=>s==name)||args.IndexOfAny(new[]{'\r','\n'})>=0)throw new Exception("SYNTHETIC_LAUNCH_SCOPE");string exe=Path.Combine(dir,name);S s1=new S();s1.cb=(uint)Marshal.SizeOf(s1);PI pi;
  string env="SystemRoot=C:\\Windows\0WINDIR=C:\\Windows\0\0";IntPtr block=Marshal.StringToHGlobalUni(env);try{if(!CreateProcessW(exe,new StringBuilder("\""+exe+"\" "+args),IntPtr.Zero,IntPtr.Zero,false,flags|0x400u,block,dir,ref s1,out pi))throw new Exception("CREATE_PROCESS_FAILED_"+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(block);}
  // Preserve returned handles even when later evidence is unavailable.
  var p=new R22Process{pid=pi.pid,handle=pi.p,thread=pi.t};try{var q=R22Native.Observe(pi.pid);p.startFileTime=q.startFileTime;p.image=q.image;R22Native.CloseHandle(q.handle);}catch{}return p;
 }
 public static BS Root(BC c){
  string run=c.run;if(c.real){R24Gate.RequireRelease(c);string marker=Path.Combine(R24Gate.Root,"initdb-attempt-r24-"+Path.GetFileName(run)+".json");if(!File.Exists(marker)||Directory.Exists(R24Gate.Data)||File.Exists(R24Gate.Data))throw new Exception("MARKER_REQUIRED_OR_PGDATA_EXISTS");R24Gate.CheckBinaries(c);}
  string name="Local\\SA-R24-"+Path.GetFileName(run);IntPtr j=CreateJobObjectW(IntPtr.Zero,name);if(j==IntPtr.Zero||Marshal.GetLastWin32Error()==183||Flags(j)!=0)throw new Exception("JOB_CREATE_REFUSED");
  var p=c.real?SpawnReal(c):Spawn(run,"fixture.exe","root",4);return new BS{p=p,job=j,jobName=name,error=AssignProcessToJobObject(j,p.handle)?null:"JOB_ASSIGN_FAILED"};
 }
 static R22Process SpawnReal(BC c){
  R24Gate.RequireRelease(c);S s=new S();s.cb=(uint)Marshal.SizeOf(s);PI pi;
  string env="ComSpec=C:\\Windows\\System32\\cmd.exe\0SystemRoot=C:\\Windows\0TEMP="+c.run+"\0TMP="+c.run+"\0WINDIR=C:\\Windows\0\0";IntPtr block=Marshal.StringToHGlobalUni(env);
  try{if(!CreateProcessW(R24Gate.Initdb,new StringBuilder("\""+R24Gate.Initdb+"\" "+R24Gate.Args()),IntPtr.Zero,IntPtr.Zero,false,4u|0x400u,block,R24Gate.Root,ref s,out pi))throw new Exception("REAL_CREATE_PROCESS_FAILED_"+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(block);}
  var p=new R22Process{pid=pi.pid,handle=pi.p,thread=pi.t};try{var q=R22Native.Observe(pi.pid);p.startFileTime=q.startFileTime;p.image=q.image;R22Native.CloseHandle(q.handle);}catch{}return p;
 }
 public static Dictionary<string,object> Row(BP p){return new Dictionary<string,object>{{"pid",p.native.pid},{"startFileTime",p.native.startFileTime.ToString()},{"image",p.native.image},{"hash",p.hash},{"parentPid",p.parent},{"owner",p.owner},{"restricted",p.restricted},{"inJob",p.inJob},{"depth",p.depth},{"role",p.role},{"exited",R22Native.Exited(p.native,0)}};}
 public static void DisposeFixture(R22Process p,string run,string expectedHash){if(R22Native.Exited(p,0))return;var actual=Observe(p.pid,IntPtr.Zero);try{if(actual.native.startFileTime!=p.startFileTime||actual.native.image!=p.image||Path.GetDirectoryName(p.image)!=run||!Array.Exists(new[]{"fixture.exe","foreign.exe"},s=>s==Path.GetFileName(p.image))||actual.hash!=expectedHash||actual.owner!="S-1-5-21-1432835263-483988321-3159128977-1001")throw new Exception("DISPOSITION_IDENTITY_REFUSED");
  // Revalidate via the same original, held creation handle; PID reuse cannot redirect termination.
  IntPtr h=OpenProcess(0x00101001,false,p.pid);if(h==IntPtr.Zero)throw new Exception("FIXTURE_TERMINATE_HANDLE_UNKNOWN");try{long c,e,k,u;if(!GetProcessTimes(h,out c,out e,out k,out u)||c!=p.startFileTime||!TerminateProcess(h,238)||!R22Native.Exited(p,5000))throw new Exception("FIXTURE_DISPOSITION_UNKNOWN");}finally{R22Native.CloseHandle(h);}
 }finally{R22Native.CloseHandle(actual.native.handle);}}
 public static void Close(R22Process p){if(p==null)return;if(p.thread!=IntPtr.Zero)R22Native.CloseHandle(p.thread);R22Native.CloseHandle(p.handle);}
 public static object[] Census(string[] pairs){var rows=new List<object>();foreach(string pair in pairs){string[] f=pair.Split(':');uint pid;long expected;if(f.Length!=2||!UInt32.TryParse(f[0],out pid)||pid==0||!Int64.TryParse(f[1],out expected)||expected<=0)throw new Exception("CENSUS_INPUT");IntPtr h=OpenProcess(0x00101000,false,pid);string status;long c=0,e,k,u;if(h==IntPtr.Zero){if(Marshal.GetLastWin32Error()!=87)throw new Exception("CENSUS_OPEN_UNKNOWN");status="ABSENT";}else try{if(!GetProcessTimes(h,out c,out e,out k,out u))throw new Exception("CENSUS_TIME_UNKNOWN");uint wait=WaitForSingleObject(h,0);if(wait!=0&&wait!=258)throw new Exception("CENSUS_WAIT_UNKNOWN");status=c!=expected?"DIFFERENT_IDENTITY":wait==0?"EXITED":"MATCHING_ACTIVE";}finally{R22Native.CloseHandle(h);}rows.Add(new{pid=pid,expected=expected.ToString(),actual=c.ToString(),status=status});}return rows.ToArray();}
}
