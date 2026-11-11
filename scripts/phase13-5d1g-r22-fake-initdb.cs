// Synthetic external executable. Never reads fixture cancellation/start/cleanup requests.
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
public static class R22FakeInitdb {
 const string Canary="SYNTHETIC_R22_CONSOLE_INPUT_NOT_A_PASSWORD";
 static string run,nonce,scenario;static bool echoOff=true,restored=true;static int prompts=0;
 delegate bool Handler(uint type);static Handler handler=delegate(uint type){if(type==0){if(scenario=="timeout")return true;Terminal("OPERATOR_CANCELLED",130,false);Environment.Exit(130);return true;}return false;};
 [StructLayout(LayoutKind.Explicit,Size=20)]struct Key{[FieldOffset(0)]public ushort type;[FieldOffset(4)]public int down;[FieldOffset(8)]public ushort repeat;[FieldOffset(10)]public ushort vk;[FieldOffset(14)]public ushort c;}
 [StructLayout(LayoutKind.Sequential)]struct Coord{public short x,y;public Coord(short a,short b){x=a;y=b;}}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr p,uint d,uint f,IntPtr t);
 [DllImport("kernel32.dll")]static extern bool GetConsoleMode(IntPtr h,out uint m);
 [DllImport("kernel32.dll")]static extern bool SetConsoleMode(IntPtr h,uint m);
 [DllImport("kernel32.dll")]static extern bool SetConsoleCtrlHandler(Handler h,bool add);
 [DllImport("kernel32.dll")]static extern bool FreeConsole();
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool ReadConsoleW(IntPtr h,char[] b,uint n,out uint got,IntPtr control);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool WriteConsoleW(IntPtr h,string text,uint n,out uint got,IntPtr reserved);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool WriteConsoleInputW(IntPtr h,Key[] k,uint n,out uint got);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool ReadConsoleOutputCharacterW(IntPtr h,StringBuilder b,uint n,Coord c,out uint got);
 static void Terminal(string outcome,int exit,bool screenNoEcho){
  string path=Path.Combine(run,"fixture-terminal.json");var json=new JavaScriptSerializer();byte[] bytes=Encoding.UTF8.GetBytes(json.Serialize(new{nonce=nonce,outcome=outcome,intendedExitCode=exit,prompts=prompts,echoDisabled=echoOff,screenNoEcho=screenNoEcho,modeRestored=restored}));
  using(var f=new FileStream(path+".pending",FileMode.CreateNew,FileAccess.Write,FileShare.Read)){f.Write(bytes,0,bytes.Length);f.Flush(true);}File.Move(path+".pending",path);
 }
 static void Inject(IntPtr input,string value){foreach(char c in value){uint got;if(!WriteConsoleInputW(input,new[]{new Key{type=1,down=1,repeat=1,vk=(ushort)(c=='\r'?13:0),c=c}},1,out got))return;}}
 public static int Main(string[] args){
  if(args.Length!=3)return 91;scenario=args[0];run=Path.GetFullPath(args[1]);nonce=args[2];
  if(!run.StartsWith(@"C:\DATN\Project_datn\build\phase13-5d1g-r22-offline\",StringComparison.OrdinalIgnoreCase))return 92;
  if(scenario=="early-exit"){Terminal("EARLY_EXIT",0,true);return 0;}
  SetConsoleCtrlHandler(handler,true);
  var timer=new Thread(delegate(){Thread.Sleep(2300);try{Terminal("ABNORMAL_TEST_CLEANUP",23,false);}catch{}Environment.Exit(23);});timer.IsBackground=true;timer.Start();
  if(scenario=="console-loss"){FreeConsole();Terminal("CONSOLE_LOST",23,false);return 23;}
  IntPtr input=CreateFile("CONIN$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero),output=CreateFile("CONOUT$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
  string first=null;
  for(int phase=1;phase<=2;phase++){
   uint old;if(!GetConsoleMode(input,out old)){Terminal("NO_CONSOLE",23,false);return 23;}
   if(!SetConsoleMode(input,3)){Terminal("NO_CONSOLE",23,false);return 23;}restored=false;uint mode;echoOff=echoOff&&GetConsoleMode(input,out mode)&&(mode&4)==0;prompts++;
   string prompt=phase==1?"SYNTHETIC EXTERNAL PASSWORD: ":"SYNTHETIC EXTERNAL CONFIRM: ";uint written;WriteConsoleW(output,prompt,(uint)prompt.Length,out written,IntPtr.Zero);
   if(scenario=="success"||scenario=="mismatch"||scenario=="missing"||scenario=="exit7"){
    int current=phase;var driver=new Thread(delegate(){Thread.Sleep(80);Inject(input,scenario=="missing"?"\r":(scenario=="mismatch"&&current==2?"SYNTHETIC_OTHER":Canary)+"\r");});driver.IsBackground=true;driver.Start();
   }
   char[] buffer=new char[256];uint count;bool ok=ReadConsoleW(input,buffer,256,out count,IntPtr.Zero);restored=SetConsoleMode(input,old);
   if(!ok){Terminal("INPUT_FAILED",23,false);return 23;}string value=new string(buffer,0,(int)count).TrimEnd('\r','\n');Array.Clear(buffer,0,buffer.Length);
   if(value.Length==0){Terminal("MISSING_INPUT",23,false);return 23;}
   if(phase==1)first=value;else if(first!=value){Terminal("CONFIRMATION_MISMATCH",1,false);return 1;}
  }
  var screen=new StringBuilder(10000);uint chars;bool noEcho=ReadConsoleOutputCharacterW(output,screen,9999,new Coord(0,0),out chars)&&!screen.ToString().Contains(Canary);
  int code=scenario=="exit7"?7:0;Terminal(code==0?"CONFIRMED":"NATIVE_NONZERO",code,noEcho);return code;
 }
}
