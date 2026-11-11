#include "../SmartAgricultureESP32/PumpProtocol.h"
#include <iostream>
#include <stdexcept>
#include <string>
#include <functional>
using namespace agriculture;
static bool gpio=false;
static unsigned highs=0;
static bool allowLow=false;
static bool pin(bool high) { gpio=high; if(high) ++highs; return true; }
static const int64_t BASE=1791990000000LL; // 2026-10-14T15:00:00Z
static const char* AT="2026-10-14T15:00:00.500Z";
static const char* DEVICE="ESP32-GF-A-01";
static const char* ACTUATOR="PUMP_01";
static std::string payload(bool on=true,const std::string& id="550e8400-e29b-41d4-a716-446655440000") {
  return std::string("{\"schemaVersion\":1,\"commandId\":\"")+id+"\",\"deviceCode\":\"ESP32-GF-A-01\",\"actuatorCode\":\"PUMP_01\",\"type\":\"PUMP_SET\",\"state\":\""+(on?"ON":"OFF")+"\","+(on?"\"maxRunSeconds\":1,":"")+"\"issuedAt\":\"2026-10-14T15:00:00.000Z\",\"expiresAt\":\"2026-10-14T15:00:10.000Z\"}";
}
static Command command(bool on=true,unsigned number=0) {
  char id[37]; snprintf(id,sizeof(id),"550e8400-e29b-41d4-a716-%012u",number);
  std::string json=payload(on,id); Command cmd{}; if(!decodeCommand(json.c_str(),json.size(),DEVICE,ACTUATOR,cmd)) throw std::runtime_error("fixture parse failed"); return cmd;
}
static Context context(uint32_t mono=100) { return {mono,BASE+500,BASE-1000,true,true,true}; }
static void check(bool ok,const char* message="assertion failed") { if(!ok) throw std::runtime_error(message); }
static bool decode(const std::string& text) { Command cmd{}; return decodeCommand(text.c_str(),text.size(),DEVICE,ACTUATOR,cmd); }
static std::string replace(std::string s,const std::string& from,const std::string& to) { s.replace(s.find(from),from.size(),to); return s; }
int main(int argc,char**) {
  if(argc>1) {
    Command cmd=command(); char ack[512],rejected[512],off[384],periodic[384],telemetry[512];
    PumpController real(pin,true); Decision applied=real.apply(cmd,context());
    PumpController dry(pin,false); Decision blocked=dry.apply(cmd,context());
    check(ackJson(ack,sizeof(ack),cmd,applied,DEVICE,ACTUATOR,AT));
    check(ackJson(rejected,sizeof(rejected),cmd,blocked,DEVICE,ACTUATOR,AT));
    check(stateJson(off,sizeof(off),DEVICE,ACTUATOR,"MAX_RUNTIME",AT));
    check(stateJson(periodic,sizeof(periodic),DEVICE,ACTUATOR,"PERIODIC",AT));
    check(telemetryJson(telemetry,sizeof(telemetry),DEVICE,AT,31.5f,69.4f,0.0f,100.0f));
    std::cout<<"{\"command\":"<<payload(true,cmd.id)<<",\"ack\":"<<ack<<",\"rejected\":"<<rejected<<",\"state\":"<<off<<",\"periodic\":"<<periodic<<",\"telemetry\":"<<telemetry<<"}\n"; return 0;
  }
  unsigned passed=0,failed=0;
  auto run=[&](const char* name,const std::function<void()>& test) { gpio=false; highs=0; try { test(); ++passed; std::cout<<"PASS "<<name<<"\n"; } catch(const std::exception& error) { ++failed; std::cerr<<"FAIL "<<name<<": "<<error.what()<<"\n"; } };
  run("01 boot GPIO LOW",[]{ gpio=true; PumpController p(pin,true); check(!gpio&&!p.isOn()); });
  run("02 WiFi disconnected rejects ON",[]{ PumpController p(pin,true); auto ctx=context();ctx.wifi=false;check(!p.apply(command(),ctx).applied&&!gpio); });
  run("03 MQTT disconnected rejects ON",[]{ PumpController p(pin,true); auto ctx=context();ctx.mqtt=false;check(!p.apply(command(),ctx).applied&&!gpio); });
  run("04 four readings including zero and soil calibration",[]{char out[512];check(telemetryJson(out,sizeof(out),DEVICE,AT,31.5f,69.4f,0,100));check(std::string(out).find("LIGHT_01\",\"value\":0.00")!=std::string::npos);check(soilPercent(3500,3500,1507)==0);check(soilPercent(1507,3500,1507)==100);check(soilPercent(0,3500,1507)==100);});
  run("05 valid ON applies HIGH once",[]{PumpController p(pin,true);check(p.apply(command(),context()).applied&&gpio&&highs==1);});
  run("06 valid OFF applies LOW",[]{PumpController p(pin,true);p.apply(command(),context());auto off=command(false,1);off.issuedAt++;check(p.apply(off,context()).applied&&!gpio);});
  run("07 expiry and exact deadline rejected",[]{PumpController p(pin,true);auto ctx=context();ctx.utc=BASE+10000;check(!p.apply(command(),ctx).applied&&!gpio);});
  run("08 invalid JSON and truncated body",[]{check(!decode("{"));check(!decode(payload()+"garbage"));check(!decode(replace(payload(),"\"state\":\"ON\"","\"state\":true")));});
  run("09 wrong device",[]{check(!decode(replace(payload(),DEVICE,"OTHER_DEVICE")));});
  run("10 wrong actuator",[]{check(!decode(replace(payload(),ACTUATOR,"PUMP_02")));});
  run("11 wrong schemaVersion",[]{check(!decode(replace(payload(),"schemaVersion\":1","schemaVersion\":2")));});
  run("12 duplicate command never repeats HIGH",[]{PumpController p(pin,true);auto cmd=command();p.apply(cmd,context());check(p.apply(cmd,context(500)).applied&&highs==1);});
  run("13 duplicate ON never extends deadline",[]{PumpController p(pin,true);auto cmd=command();p.apply(cmd,context(100));p.apply(cmd,context(900));check(p.tick(1100,true,true)!=nullptr&&!gpio);check(!p.apply(cmd,context(1200)).applied&&!gpio);});
  run("14 WiFi loss while ON cuts GPIO",[]{PumpController p(pin,true);p.apply(command(),context());check(std::string(p.tick(200,false,true))=="WIFI_LOST"&&!gpio);});
  run("15 MQTT loss while ON cuts GPIO",[]{PumpController p(pin,true);p.apply(command(),context());check(std::string(p.tick(200,true,false))=="MQTT_LOST"&&!gpio);});
  run("16 timeout cuts GPIO, including millis wrap",[]{PumpController p(pin,true);p.apply(command(),context(0xfffffff0u));check(p.tick(0xfffffff0u+999u,true,true)==nullptr);check(std::string(p.tick(0xfffffff0u+1000u,true,true))=="MAX_RUNTIME"&&!gpio);});
  run("17 reconnect/reboot session barrier rejects old ON",[]{PumpController p(pin,true);auto ctx=context();ctx.sessionFloor=BASE+1;check(!p.apply(command(),ctx).applied&&!gpio);});
  run("18 ACK/state serializers and bounded output",[]{PumpController p(pin,true);auto cmd=command();auto result=p.apply(cmd,context());char out[512];check(ackJson(out,sizeof(out),cmd,result,DEVICE,ACTUATOR,AT));check(std::string(out).find("\"result\":\"APPLIED\"")!=std::string::npos);char tiny[8];check(!ackJson(tiny,sizeof(tiny),cmd,result,DEVICE,ACTUATOR,AT));check(stateJson(out,sizeof(out),DEVICE,ACTUATOR,"MAX_RUNTIME",AT));});
  run("19 disabled physical control can never HIGH; OFF still works",[]{PumpController p(pin,false);auto result=p.apply(command(),context());check(!result.applied&&std::string(result.reason)=="PUMP_COMMANDS_DISABLED"&&highs==0);check(p.apply(command(false,1),context()).applied&&highs==0&&!gpio);});
  run("20 telemetry generation does not change pump deadline",[]{PumpController p(pin,true);p.apply(command(),context(100));char out[512];check(telemetryJson(out,sizeof(out),DEVICE,AT,30,60,0,100));check(p.isOn());check(p.tick(1100,true,true)!=nullptr&&!gpio);});
  run("21 retained command never applies",[]{PumpController p(pin,true);check(!p.apply(command(),context(),true).applied&&highs==0);});
  run("22 unknown/duplicate keys, escape and numeric coercion rejected",[]{check(!decode(replace(payload(),"schemaVersion\":1","schemaVersion\":1,\"schemaVersion\":1")));check(!decode(replace(payload(),"schemaVersion\":1","schemaVersion\":1,\"extra\":1")));check(!decode(replace(payload(),"maxRunSeconds\":1","maxRunSeconds\":1.0")));check(!decode(replace(payload(),"maxRunSeconds\":1","maxRunSeconds\":\"1\"")));check(!decode(replace(payload(),"maxRunSeconds\":1","maxRunSeconds\":01")));check(!decode(replace(payload(),"PUMP_SET","PUMP_\\u0053ET")));});
  run("23 unsynced clock rejects, no later automatic retry of rejected UUID",[]{PumpController p(pin,true);auto ctx=context();ctx.clockReady=false;check(!p.apply(command(),ctx).applied);check(!p.apply(command(),context()).applied&&highs==0);});
  run("24 OFF high-water rejects older/equal ON",[]{PumpController p(pin,true);auto off=command(false,1);off.issuedAt=BASE+500;p.apply(off,context());auto on=command();check(!p.apply(on,context()).applied);on=command(true,2);on.issuedAt=off.issuedAt;check(!p.apply(on,context()).applied&&highs==0);});
  run("25 5-second hard cap and NaN telemetry rejection",[]{PumpController p(pin,true);auto cmd=command();cmd.seconds=6;check(!p.apply(cmd,context()).applied&&highs==0);char out[512];check(!telemetryJson(out,sizeof(out),DEVICE,AT,NAN,60,0,100));check(!telemetryJson(out,sizeof(out),DEVICE,AT,30,60,-1,100));});
  run("26 duplicate UUID with modified body rejects",[]{PumpController p(pin,true);auto cmd=command();p.apply(cmd,context());cmd.seconds=5;check(!p.apply(cmd,context()).applied&&highs==1);});
  run("27 invalid dates and oversized commands rejected",[]{int64_t at;check(!parseUtc("2026-02-29T00:00:00.000Z",at));check(!parseUtc("2026-10-14T25:00:00.000Z",at));check(parseUtc("2026-10-14T15:00:00.000Z",at)&&at==BASE);check(!decode(payload()+std::string(1024,' ')));});
  run("28 cached ACK keeps original measurement time",[]{PumpController p(pin,true);auto cmd=command();auto first=p.apply(cmd,context());auto ctx=context(600);ctx.utc+=500;auto again=p.apply(cmd,ctx);check(again.recordedAt==first.recordedAt&&highs==1);});
  run("29 full live UUID cache fails closed on ON",[]{PumpController p(pin,true);for(unsigned i=1;i<=64;++i){auto cmd=command(false,i);p.apply(cmd,context());}auto next=command(true,100);next.issuedAt+=100;auto result=p.apply(next,context());check(!result.applied&&std::string(result.reason)=="COMMAND_CACHE_FULL"&&highs==0);});
  run("30 OFF safely LOW even if clock is unavailable",[]{PumpController p(pin,true);p.apply(command(),context());auto ctx=context();ctx.clockReady=false;check(!p.apply(command(false,1),ctx).applied&&!gpio);});
  run("31 GPIO write/readback failure never produces APPLIED",[]{PumpController p([](bool){return false;},true);auto on=p.apply(command(),context());check(!on.applied&&!on.reportOff);auto off=p.apply(command(false,1),context());check(!off.applied&&!off.reportOff);});
  run("32 OFF with clock failure blocks an older ON after clock recovery",[]{PumpController p(pin,true);auto off=command(false,1);off.issuedAt=BASE+400;auto ctx=context();ctx.clockReady=false;check(!p.apply(off,ctx).applied&&!gpio);auto result=p.apply(command(),context());check(!result.applied&&highs==0);});
  run("33 expired OFF still blocks older ON",[]{PumpController p(pin,true);auto off=command(false,1);off.issuedAt=BASE+200;off.expiresAt=BASE+300;check(!p.apply(off,context()).applied);check(!p.apply(command(),context()).applied&&highs==0);});
  run("34 unconfirmed LOW faults block ON until LOW is confirmed",[]{allowLow=false;PumpController p([](bool high){gpio=high;if(high)++highs;return high||allowLow;},true);check(!p.confirmedOff());check(!p.apply(command(),context()).applied&&highs==0);allowLow=true;check(p.forceOff()&&p.confirmedOff());auto next=command(true,1);next.issuedAt++;check(p.apply(next,context()).applied&&highs==1);});
  run("35 exact 5-second maximum cuts OFF even after duplicate ON",[]{PumpController p(pin,true);auto cmd=command();cmd.seconds=5;check(p.apply(cmd,context(100)).applied);check(p.apply(cmd,context(4000)).applied&&highs==1);check(p.tick(5099,true,true)==nullptr&&gpio);check(std::string(p.tick(5100,true,true))=="MAX_RUNTIME"&&!gpio);});
  run("36 disconnected OFF preserves ordering after link recovery",[]{PumpController p(pin,true);auto off=command(false,1);off.issuedAt=BASE+400;auto ctx=context();ctx.mqtt=false;check(!p.apply(off,ctx).applied&&!gpio);check(!p.apply(command(),context()).applied&&highs==0);});
  std::cout<<passed<<" passed, "<<failed<<" failed\n"; return failed?1:0;
}
