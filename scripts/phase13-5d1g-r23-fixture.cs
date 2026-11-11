// No passwords, database code or external resources. Only tests R23 native supervision.
using System;
public static class R23Fixture{public static int Main(string[] args){if(args.Length!=1)return 91;System.Threading.Thread.Sleep(300);return args[0]=="success"?0:7;}}
