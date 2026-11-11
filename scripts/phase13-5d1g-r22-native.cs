// OFFLINE external-executable supervision primitives. Launch is hard-pinned to fake-initdb.exe.
using System;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;
public sealed class R22Process {
 public uint pid; public long startFileTime; public string image;public IntPtr handle;public IntPtr thread;
}
public static class R22Native {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct Startup {
  public uint cb;public string reserved,desktop,title;public uint x,y,xSize,ySize,xChars,yChars,fill,flags;public ushort show,reserved2;public IntPtr reservedPtr,stdIn,stdOut,stdErr;
 }
 [StructLayout(LayoutKind.Sequential)]struct Info{public IntPtr process,thread;public uint pid,tid;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessW(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref Startup startup,out Info info);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetProcessTimes(IntPtr h,out long created,out long exited,out long kernel,out long user);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool QueryFullProcessImageNameW(IntPtr h,uint flags,StringBuilder image,ref uint length);
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")]static extern bool GetExitCodeProcess(IntPtr h,out uint code);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll")]static extern uint ResumeThread(IntPtr h);
 [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")]public static extern bool FreeConsole();
 [DllImport("kernel32.dll")]public static extern bool AllocConsole();
 [DllImport("kernel32.dll")]static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")]static extern bool ShowWindow(IntPtr h,int mode);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr h);
 [DllImport("kernel32.dll")]public static extern uint GetConsoleProcessList(uint[] members,uint count);
 [DllImport("kernel32.dll")]public static extern bool GenerateConsoleCtrlEvent(uint type,uint group);
 public delegate bool Handler(uint type);
 [DllImport("kernel32.dll")]static extern bool SetConsoleCtrlHandler(Handler handler,bool add);
 static Handler handler=delegate(uint type){return type==0;};
 public static bool CreatePrivateTestConsole(){FreeConsole();if(!AllocConsole())return false;ShowWindow(GetConsoleWindow(),0);return SetConsoleCtrlHandler(handler,true);}
 public static bool Visible(){return IsWindowVisible(GetConsoleWindow());}
 static R22Process Identity(IntPtr h,uint pid){
  long created,exited,kernel,user;if(!GetProcessTimes(h,out created,out exited,out kernel,out user))throw new Exception("PROCESS_TIME_UNKNOWN");
  var b=new StringBuilder(32768);uint count=32768;if(!QueryFullProcessImageNameW(h,0,b,ref count))throw new Exception("PROCESS_IMAGE_UNKNOWN");
  return new R22Process{pid=pid,startFileTime=created,image=b.ToString(),handle=h};
 }
 public static R22Process Observe(uint pid){IntPtr h=OpenProcess(0x00101000,false,pid);if(h==IntPtr.Zero)throw new Exception("PROCESS_OPEN_FAILED");try{return Identity(h,pid);}catch{CloseHandle(h);throw;}}
 public static R22Process LaunchFake(string run,string scenario,string nonce,bool suspended){
  string root=@"C:\DATN\Project_datn\build\phase13-5d1g-r22-offline\",dir=Path.GetFullPath(run);
  if(!dir.StartsWith(root,StringComparison.OrdinalIgnoreCase)||scenario.IndexOfAny(new[]{'"',' ','\r','\n'})>=0||nonce.Length!=32)throw new Exception("FAKE_SCOPE_REQUIRED");
  string exe=Path.Combine(dir,"fake-initdb.exe");var startup=new Startup();startup.cb=(uint)Marshal.SizeOf(startup);Info info;
  var command=new StringBuilder("\""+exe+"\" "+scenario+" \""+dir+"\" "+nonce);
  if(!CreateProcessW(exe,command,IntPtr.Zero,IntPtr.Zero,false,suspended?4u:0u,IntPtr.Zero,dir,ref startup,out info))throw new Exception("CREATE_PROCESS_FAILED");
  var p=Identity(info.process,info.pid);p.thread=info.thread;return p;
 }
 public static void Resume(R22Process p){if(ResumeThread(p.thread)==0xffffffff)throw new Exception("RESUME_FAILED");CloseHandle(p.thread);p.thread=IntPtr.Zero;}
 public static bool Exited(R22Process p,uint wait){return WaitForSingleObject(p.handle,wait)==0;}
 public static uint ExitCode(R22Process p){uint code;if(!Exited(p,0)||!GetExitCodeProcess(p.handle,out code))throw new Exception("NATIVE_EXIT_UNKNOWN");return code;}
 public static string ExitAt(R22Process p){long c,e,k,u;if(!Exited(p,0)||!GetProcessTimes(p.handle,out c,out e,out k,out u)||e==0)throw new Exception("EXIT_TIME_UNKNOWN");return DateTime.FromFileTimeUtc(e).ToString("o");}
}
