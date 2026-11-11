// R23A synthetic-only launcher. It has no real initdb launch method.
using System;using System.IO;using System.Text;using System.Runtime.InteropServices;
public static class R23ANative {
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AttachConsole(uint pid);
 public static bool JoinOwnedConsole(uint hostPid,string expectedStart){var p=R22Native.Observe(hostPid);try{if(p.startFileTime.ToString()!=expectedStart||R23ADisposition.Owner(p.handle)!="S-1-5-21-1432835263-483988321-3159128977-1001")return false;R22Native.FreeConsole();return AttachConsole(hostPid);}finally{R22Native.CloseHandle(p.handle);}}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct S{public uint cb;public string reserved,desktop,title;public uint x,y,xs,ys,xc,yc,fill,flags;public ushort show,res2;public IntPtr ptr,stdin,stdout,stderr;}
 [StructLayout(LayoutKind.Sequential)]struct P{public IntPtr process,thread;public uint pid,tid;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessW(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref S s,out P p);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateJobObjectW(IntPtr attrs,string name);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 public static R23Started Launch(string run,string role,bool suspended){
  string dir=Path.GetFullPath(run),name=Path.GetFileName(dir);
  if(!dir.StartsWith(@"C:\DATN\Project_datn\build\phase13-5d1g-r23a\r23a-",StringComparison.OrdinalIgnoreCase)||!System.Text.RegularExpressions.Regex.IsMatch(name,"^r23a-[a-z0-9-]+$")||!Array.Exists(new[]{"success","exit7","missing-member","guest"},v=>v==role))throw new Exception("SYNTHETIC_SCOPE_REFUSED");
  string exe=Path.Combine(dir,"fixture.exe"),jobName="Local\\SmartAgriR23-"+name+"-"+role;
  IntPtr job=CreateJobObjectW(IntPtr.Zero,jobName);if(job==IntPtr.Zero||Marshal.GetLastWin32Error()==183||R23Native.JobFlags(job)!=0)throw new Exception("NEW_FIXTURE_JOB_REFUSED");
  string env="SystemRoot=C:\\Windows\0WINDIR=C:\\Windows\0\0";IntPtr b=Marshal.StringToHGlobalUni(env);S s=new S();s.cb=(uint)Marshal.SizeOf(s);P p;
  try{if(!CreateProcessW(exe,new StringBuilder("\""+exe+"\" "+role),IntPtr.Zero,IntPtr.Zero,false,4u|0x400u,b,dir,ref s,out p))throw new Exception("FIXTURE_CREATE_FAILED");}finally{Marshal.FreeHGlobal(b);}
  var started=new R23Started{job=job,jobName=jobName,process=new R22Process{pid=p.pid,handle=p.process,thread=p.thread},error=null};
  try{var id=R22Native.Observe(p.pid);started.process.startFileTime=id.startFileTime;started.process.image=id.image;R22Native.CloseHandle(id.handle);
   if(!AssignProcessToJobObject(job,p.process)||R23Native.JobActive(job)!=1)started.error="JOB_ASSIGN_UNKNOWN";
  }catch{started.error="IDENTITY_UNKNOWN";}
  if(!suspended&&started.error==null)R22Native.Resume(started.process);return started;
 }
}
