using System;using System.IO;using System.Threading;
public static class BFixture{
 public static int Main(string[] args){if(args.Length>1&&args[0]=="census"){Console.WriteLine(new System.Web.Script.Serialization.JavaScriptSerializer().Serialize(BN.Census(System.Linq.Enumerable.ToArray(System.Linq.Enumerable.Skip(args,1)))));return 0;}if(args.Length!=1||!Array.Exists(new[]{"root","reexec","backend","leaf"},s=>s==args[0]))return 91;
  string run=Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);BC c=new BC(run,null);string role=args[0];
  if(Environment.GetEnvironmentVariable("PGPASSWORD")!=null||Environment.GetEnvironmentVariable("DATABASE_URL")!=null)return 94;
  if(role=="root"&&c.scenario=="early-exit")return 0;
  if(role=="root")c.Save("synthetic-side-effect.json",new{fixtureOnly=true,pgdataCreated=false});
  if(role=="root"&&c.scenario=="missing-child")R22Native.FreeConsole();
  R22Process child=null;
  try{
   if(role=="root"&&(c.scenario=="restricted"||c.scenario=="descendant"||c.scenario=="wrong-descendant"))child=BN.Spawn(run,c.scenario=="wrong-descendant"?"foreign.exe":"fixture.exe","reexec",0);
   if(role=="reexec"&&c.scenario=="descendant")child=BN.Spawn(run,"fixture.exe","backend",0);
   if(child!=null){R22Native.Exited(child,4500);Thread.Sleep(150);}else Thread.Sleep(role=="leaf"?10000:1500);
   return role=="root"&&c.scenario=="nonzero"?7:0;
  }finally{BN.Close(child);}
 }
}
