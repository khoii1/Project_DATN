# Offline console child ONLY. Never invokes PostgreSQL, accepts a password argument or writes a password file.
[CmdletBinding()]
param([ValidateSet('PLAN_ONLY','SYNTHETIC')][string]$Mode='PLAN_ONLY',
 [ValidateSet('success','mismatch','missing','timeout','cancel','disconnect','exit7','echo-risk','no-console')][string]$Scenario='success')
$ErrorActionPreference='Stop'
if($Mode -eq 'PLAN_ONLY'){[Console]::Out.WriteLine('{"mode":"PLAN_ONLY","secondInitdbAuthorized":false}');exit 0}
$resultWriter=[Console]::Out
try {
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
public class R2ConsoleResult {
 public string outcome="UNKNOWN";
 public bool consoleAvailable=false, echoDisabled=false, modeRestored=false, confirmationMatched=false, echoDetected=false, ctrlCObserved=false;
 public bool productionAuthorized=false;
 public int promptCount=0, consoleMembers=0;
}
public static class R2SyntheticConsole {
 // PUBLIC SYNTHETIC CANARY, NOT A REAL PASSWORD. Used only inside this offline fixture.
 private const string Canary="SYNTHETIC_INPUT_CANARY_R2_NO_CREDENTIAL";
 private static volatile bool cancelled=false, deadline=false, driverFailed=false;
 private delegate bool Handler(uint type);
 private static Handler handler=delegate(uint type){if(type==0){cancelled=true;return true;}return false;};
 [StructLayout(LayoutKind.Explicit,Size=20)] private struct Input {
  [FieldOffset(0)]public ushort EventType;[FieldOffset(4)]public int KeyDown;
  [FieldOffset(8)]public ushort Repeat;[FieldOffset(10)]public ushort VirtualKey;
  [FieldOffset(14)]public ushort Character;[FieldOffset(16)]public uint Control;
 }
 [StructLayout(LayoutKind.Sequential)]private struct Coord{public short X,Y;public Coord(short x,short y){X=x;Y=y;}}
 [DllImport("kernel32.dll")]private static extern bool FreeConsole();
 [DllImport("kernel32.dll")]private static extern bool AllocConsole();
 [DllImport("kernel32.dll")]private static extern IntPtr GetConsoleWindow();
 [DllImport("user32.dll")]private static extern bool ShowWindow(IntPtr h,int command);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]private static extern IntPtr CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll")]private static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")]private static extern bool GetConsoleMode(IntPtr h,out uint mode);
 [DllImport("kernel32.dll")]private static extern bool SetConsoleMode(IntPtr h,uint mode);
 [DllImport("kernel32.dll")]private static extern uint GetConsoleProcessList(uint[] list,uint count);
 [DllImport("kernel32.dll")]private static extern bool SetConsoleCtrlHandler(Handler callback,bool add);
 [DllImport("kernel32.dll")]private static extern bool GenerateConsoleCtrlEvent(uint type,uint group);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]private static extern bool WriteConsoleInputW(IntPtr h,Input[] input,uint count,out uint written);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]private static extern bool ReadConsoleW(IntPtr h,[Out] char[] buffer,uint count,out uint read,IntPtr control);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]private static extern bool WriteConsoleW(IntPtr h,string text,uint count,out uint written,IntPtr reserved);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]private static extern bool ReadConsoleOutputCharacterW(IntPtr h,StringBuilder text,uint count,Coord start,out uint read);
 private static bool Valid(IntPtr h){return h!=IntPtr.Zero && h!=new IntPtr(-1);}
 private static void Inject(IntPtr input,string text){
  foreach(char c in text){var record=new Input{EventType=1,KeyDown=1,Repeat=1,VirtualKey=(ushort)(c=='\r'?13:0),Character=c};uint count;
   if(!WriteConsoleInputW(input,new[]{record},1,out count)||count!=1)throw new Exception("FIXTURE_INPUT_FAILED");}
 }
 private static string ReadHidden(IntPtr input,IntPtr output,string scenario,int phase,R2ConsoleResult result){
  uint oldMode;if(!GetConsoleMode(input,out oldMode))throw new Exception("NO_CONSOLE");
  uint wanted=scenario=="echo-risk"?7u:3u;
  if(!SetConsoleMode(input,wanted))throw new Exception("CONSOLE_MODE_FAILED");
  uint actual;if(!GetConsoleMode(input,out actual))throw new Exception("CONSOLE_MODE_FAILED");
  result.echoDisabled=(actual&4)==0;
  result.promptCount++;uint written;string prompt=phase==1?"SYNTHETIC PASSWORD: ":"SYNTHETIC CONFIRM: ";
  if(!WriteConsoleW(output,prompt,(uint)prompt.Length,out written,IntPtr.Zero))throw new Exception("CONSOLE_DISCONNECTED");
  var driver=new Thread(delegate(){try{
   Thread.Sleep(80);
   if(scenario=="disconnect"){FreeConsole();return;}
   if(scenario=="timeout"){Thread.Sleep(120);deadline=true;Inject(input,"\r");return;}
   if(scenario=="cancel"){
    if(!GenerateConsoleCtrlEvent(0,0))throw new Exception("CANCEL_SIGNAL_FAILED");Thread.Sleep(50);Inject(input,"\r");return;
   }
   if(scenario=="missing"){Inject(input,"\r");return;}
   Inject(input,(scenario=="mismatch" && phase==2?"SYNTHETIC_DIFFERENT":Canary)+"\r");
  }catch{driverFailed=true;}});
  driver.IsBackground=true;driver.Start();var buffer=new char[256];uint received=0;bool readOk=false;
  try{readOk=ReadConsoleW(input,buffer,(uint)buffer.Length,out received,IntPtr.Zero);}
  finally{
   driver.Join(1000);
   result.modeRestored=SetConsoleMode(input,oldMode);
  }
  if(scenario=="disconnect")throw new Exception("CONSOLE_DISCONNECTED");
  if(!result.modeRestored)throw new Exception("CONSOLE_MODE_RESTORE_FAILED");
  if(deadline)throw new Exception("PROMPT_TIMEOUT");
  if(cancelled){result.ctrlCObserved=true;throw new Exception("OPERATOR_CANCELLED");}
  if(driverFailed||!readOk)throw new Exception("CONSOLE_IO_FAILED");
  string value=new string(buffer,0,(int)received).TrimEnd('\r','\n');Array.Clear(buffer,0,buffer.Length);
  var screen=new StringBuilder(10000);uint got;
  if(!ReadConsoleOutputCharacterW(output,screen,9999,new Coord(0,0),out got))throw new Exception("ECHO_CHECK_UNAVAILABLE");
  result.echoDetected=screen.ToString().Contains(Canary);
  if(!result.echoDisabled || result.echoDetected)throw new Exception("ECHO_UNSAFE");
  if(value.Length==0)throw new Exception("MISSING_INPUT");
  return value;
 }
 public static R2ConsoleResult Run(string scenario){
  var result=new R2ConsoleResult();IntPtr input=IntPtr.Zero,output=IntPtr.Zero;string first=null,second=null;
  try{
   FreeConsole(); // Detach only this dedicated synthetic child, never the user's console.
   if(scenario!="no-console"){
    if(!AllocConsole())throw new Exception("NO_CONSOLE");ShowWindow(GetConsoleWindow(),0);
   }
   input=CreateFile("CONIN$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
   output=CreateFile("CONOUT$",0xC0000000,3,IntPtr.Zero,3,0,IntPtr.Zero);
   uint mode;if(!Valid(input)||!Valid(output)||!GetConsoleMode(input,out mode))throw new Exception("NO_CONSOLE");
   result.consoleAvailable=true;
   uint[] members=new uint[4];result.consoleMembers=(int)GetConsoleProcessList(members,4);
   if(result.consoleMembers!=1 || members[0]!=(uint)System.Diagnostics.Process.GetCurrentProcess().Id)throw new Exception("CONSOLE_IDENTITY_UNKNOWN");
   if(!SetConsoleCtrlHandler(handler,true))throw new Exception("CONSOLE_HANDLER_FAILED");
   first=ReadHidden(input,output,scenario,1,result);second=ReadHidden(input,output,scenario,2,result);
   result.confirmationMatched=first==second;
   if(!result.confirmationMatched)throw new Exception("CONFIRMATION_MISMATCH");
   result.outcome=scenario=="exit7"?"NATIVE_NONZERO":"SYNTHETIC_CONFIRMED";
  }catch(Exception error){
   switch(error.Message){
    case "NO_CONSOLE":case "CONSOLE_DISCONNECTED":case "PROMPT_TIMEOUT":case "OPERATOR_CANCELLED":case "MISSING_INPUT":case "CONFIRMATION_MISMATCH":case "ECHO_UNSAFE":result.outcome=error.Message;break;
    default:result.outcome="UNKNOWN_CONSOLE_OUTCOME";break;
   }
  }finally{
   first=null;second=null; // Managed/CRT memory zeroization is NOT guaranteed by this fixture.
   if(Valid(input))CloseHandle(input);if(Valid(output))CloseHandle(output);FreeConsole();
  }
  return result;
 }
}
'@
$result=[R2SyntheticConsole]::Run($Scenario)
$resultWriter.WriteLine(($result|ConvertTo-Json -Compress))
if($result.outcome -eq 'SYNTHETIC_CONFIRMED'){exit 0}
if($result.outcome -eq 'NATIVE_NONZERO'){exit 7}
exit 23
} catch {
 $resultWriter.WriteLine('{"outcome":"UNKNOWN_CONSOLE_OUTCOME","productionAuthorized":false}')
 exit 24
}
