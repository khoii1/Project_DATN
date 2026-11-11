// Explicit R2.3A permission: fixture-only ABNORMAL disposition via a revalidated held handle.
// Never accepts initdb/postgres/backend/broker binaries; never terminates a Job Object.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;
public static class R23ADisposition {
 const string Operator="S-1-5-21-1432835263-483988321-3159128977-1001";
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")]static extern bool GetProcessTimes(IntPtr h,out long c,out long e,out long k,out long u);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool QueryFullProcessImageNameW(IntPtr h,uint flags,StringBuilder b,ref uint count);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool GetTokenInformation(IntPtr token,int cls,IntPtr data,uint length,out uint returned);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr process,uint ms);
 [DllImport("kernel32.dll")]static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 public static string Owner(IntPtr process){IntPtr token;if(!OpenProcessToken(process,8,out token))throw new Exception("OWNER_TOKEN_UNKNOWN");try{uint size;GetTokenInformation(token,1,IntPtr.Zero,0,out size);if(size==0)throw new Exception("OWNER_SIZE_UNKNOWN");IntPtr b=Marshal.AllocHGlobal((int)size);try{if(!GetTokenInformation(token,1,b,size,out size))throw new Exception("OWNER_UNKNOWN");return new SecurityIdentifier(Marshal.ReadIntPtr(b)).Value;}finally{Marshal.FreeHGlobal(b);}}finally{R22Native.CloseHandle(token);}}
 public static bool Suspended(uint pid){var p=Process.GetProcessById((int)pid);if(p.Threads.Count==0)return false;foreach(ProcessThread t in p.Threads)if(t.ThreadState!=ThreadState.Wait||t.WaitReason!=ThreadWaitReason.Suspended)return false;return true;}
 public static uint TerminateOwnedFixture(uint pid,string startFileTime,string expectedImage,string expectedHash){
  string image=Path.GetFullPath(expectedImage);string basePath=@"C:\DATN\Project_datn\build\phase13-5d1g-";
  if(!image.StartsWith(basePath+@"r23\r23-",StringComparison.OrdinalIgnoreCase)&&!image.StartsWith(basePath+@"r23a\r23a-",StringComparison.OrdinalIgnoreCase))throw new Exception("FIXTURE_SCOPE_REFUSED");
  if(Path.GetFileName(image)!="fixture.exe")throw new Exception("FIXTURE_NAME_REFUSED");
  IntPtr h=OpenProcess(0x00101001,false,pid);if(h==IntPtr.Zero)throw new Exception("FIXTURE_HANDLE_UNAVAILABLE");
  try{
   long c,e,k,u;var b=new StringBuilder(32768);uint n=32768;
   if(!GetProcessTimes(h,out c,out e,out k,out u)||c.ToString()!=startFileTime||!QueryFullProcessImageNameW(h,0,b,ref n)||!String.Equals(b.ToString(),image,StringComparison.OrdinalIgnoreCase)||Owner(h)!=Operator||R23Native.Hash(image)!=expectedHash||WaitForSingleObject(h,0)!=258)throw new Exception("FIXTURE_IDENTITY_REFUSED");
   // Caller must provide disposition evidence; this deliberately returns an abnormal native exit.
   if(!TerminateProcess(h,238))throw new Exception("FIXTURE_TERMINATION_FAILED");
   if(WaitForSingleObject(h,5000)!=0)throw new Exception("FIXTURE_EXIT_UNKNOWN");uint code;if(!GetExitCodeProcess(h,out code))throw new Exception("FIXTURE_EXIT_CODE_UNKNOWN");return code;
  }finally{R22Native.CloseHandle(h);}
 }
}
