using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
public class MvpNativeExitFixture {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SI {
  public int size;public string reserved,desktop,title;public int x,y,xsize,ysize,xchars,ychars,fill,flags;public short show,cb;public IntPtr extra,input,output,error;
 }
 [StructLayout(LayoutKind.Sequential)] struct PI {public IntPtr process,thread;public uint pid,tid;}
 [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int n);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetHandleInformation(IntPtr h,uint mask,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SI si,out PI pi);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 public static int Main(string[] args){
  if(args.Length==1&&args[0]=="--hold"){Thread.Sleep(1200);Console.WriteLine("SYNTHETIC_CHILD_DONE");return 0;}
  if(args.Length!=0)return 4;
  var si=new SI();si.size=Marshal.SizeOf(typeof(SI));si.flags=0x100;
  si.input=GetStdHandle(-10);si.output=GetStdHandle(-11);si.error=GetStdHandle(-12);
  SetHandleInformation(si.output,1,1);SetHandleInformation(si.error,1,1);
  string self=System.Reflection.Assembly.GetExecutingAssembly().Location;
  PI pi;if(!CreateProcess(self,new StringBuilder("\""+self+"\" --hold"),IntPtr.Zero,IntPtr.Zero,true,0x08000000,IntPtr.Zero,null,ref si,out pi))return 5;
  CloseHandle(pi.thread);CloseHandle(pi.process);
  Console.WriteLine("SYNTHETIC_PARENT_OK");return 0;
 }
}
