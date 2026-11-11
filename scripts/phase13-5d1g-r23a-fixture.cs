using System;using System.Runtime.InteropServices;using System.Threading;
// No input, passwords, database code or console injection. Processes last long enough to observe attach.
public static class R23AFixture{
 [DllImport("kernel32.dll")]static extern bool FreeConsole();
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")]static extern bool GetProcessTimes(IntPtr h,out long c,out long e,out long k,out long u);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
 public static int Census(string[] args){
  if(args.Length<2)return 92;int remaining=0;var rows=new System.Text.StringBuilder();
  for(int i=1;i<args.Length;i++){
   string[] fields=args[i].Split(':');uint pid;long expected;if(fields.Length!=2||!UInt32.TryParse(fields[0],out pid)||pid==0||!Int64.TryParse(fields[1],out expected)||expected<=0)return 93;
   IntPtr h=OpenProcess(0x00101000,false,pid);string status;long c=0,e,k,u;
   if(h==IntPtr.Zero){if(Marshal.GetLastWin32Error()!=87)return 94;status="ABSENT";}
   else{try{if(!GetProcessTimes(h,out c,out e,out k,out u))return 95;uint wait=WaitForSingleObject(h,0);if(wait!=0&&wait!=258)return 96;status=c!=expected?"DIFFERENT_IDENTITY":wait==0?"EXITED":"MATCHING_ACTIVE";if(status=="MATCHING_ACTIVE")remaining++;}finally{CloseHandle(h);}}
   if(i>1)rows.Append(',');rows.Append("{\"pid\":"+pid+",\"expectedStart\":\""+expected+"\",\"actualStart\":\""+c+"\",\"status\":\""+status+"\"}");
  }
  Console.WriteLine("{\"checked\":"+(args.Length-1)+",\"matchingRemaining\":"+remaining+",\"identities\":["+rows+"]}");return 0;
 }
 public static int Main(string[] args){if(args.Length>0&&args[0]=="census")return Census(args);if(args.Length!=1)return 91;if(args[0]=="missing-member")FreeConsole();Thread.Sleep(args[0]=="guest"?15000:900);return args[0]=="exit7"?7:0;}
}
