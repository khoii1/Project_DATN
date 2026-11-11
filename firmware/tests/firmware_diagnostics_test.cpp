#include "../SmartAgricultureESP32/FirmwareDiagnostics.h"
#include <iostream>
#include <stdexcept>
#include <functional>
#include <string>
using namespace agriculture;
static bool simulatedGpio=false;
static bool writeSimulatedGpio(bool high) {simulatedGpio=high;return true;}
static void check(bool result) { if(!result) throw std::runtime_error("assertion failed"); }
static DiagnosticSample sample() {
  DiagnosticSample s;s.temp=30.5f;s.humidity=70.2f;s.lux=250;s.rawAdc=2200;s.minAdc=2195;s.maxAdc=2205;s.adcValid=true;s.soil=soilPercent(s.rawAdc,3500,1507);s.lightInitialized=true;s.lightDataReady=true;s.sequence=1;s.recordedAt=1791990000500LL;s.health=assessSensors(s,3500,1507);s.valid=s.health.valid();return s;
}
static std::string report(DiagnosticSample s,const char* telemetry="PENDING (not sent yet)",bool ntp=true,int relay=0) {
  char buffer[1800];DiagnosticStatus status{true,true,true,ntp,false,relay,telemetry,"2026-10-14T15:00:00.500Z"};check(formatSensorMonitor(buffer,sizeof(buffer),s,status));return buffer;
}
int main(int argc,char**) {
  if(argc>1){std::cout<<report(sample());return 0;}
  unsigned passed=0,failed=0;
  auto run=[&](const char* name,const std::function<void()>& test) {try{test();++passed;std::cout<<"PASS "<<name<<"\n";}catch(const std::exception& e){++failed;std::cerr<<"FAIL "<<name<<": "<<e.what()<<"\n";}};
  run("01 valid sensors show all values, raw ADC and disabled OFF",[]{auto text=report(sample());check(text.find("30.50 C")!=std::string::npos);check(text.find("70.20 %")!=std::string::npos);check(text.find("250.00 lux")!=std::string::npos);check(text.find("SOIL_RAW_ADC  : 2200")!=std::string::npos);check(text.find("65.23 %")!=std::string::npos);check(text.find("PUMP_COMMANDS : DISABLED")!=std::string::npos);check(text.find("RELAY         : OFF")!=std::string::npos);check(text.find("SENT (")==std::string::npos);});
  run("02 DHT NaN has specific error, no fake zero",[]{auto s=sample();s.temp=NAN;s.health=assessSensors(s,3500,1507);check(s.health.temp==SensorIssue::DHT_NONFINITE);check(!s.health.valid());check(report(s).find("DHT_NAN")!=std::string::npos);char body[512];check(!telemetryJson(body,sizeof(body),"ESP32-GF-A-01","2026-10-14T15:00:00.500Z",s.temp,s.humidity,s.lux,s.soil));});
  run("03 DHT infinity/humidity range invalid",[]{auto s=sample();s.temp=INFINITY;s.humidity=101;s.health=assessSensors(s,3500,1507);check(s.health.temp==SensorIssue::DHT_NONFINITE&&s.health.humidity==SensorIssue::OUT_OF_RANGE);});
  run("04 BH1750 initialization failure differs from not-ready",[]{auto s=sample();s.lightInitialized=false;s.lightDataReady=false;s.lux=NAN;check(assessSensors(s,3500,1507).light==SensorIssue::LIGHT_INIT_FAILED);s.lightInitialized=true;check(assessSensors(s,3500,1507).light==SensorIssue::LIGHT_NOT_READY);});
  run("05 BH1750 negative/nonfinite read failure differs from valid zero",[]{auto s=sample();s.lux=-2;check(assessSensors(s,3500,1507).light==SensorIssue::LIGHT_READ_FAILED);s.lux=NAN;check(assessSensors(s,3500,1507).light==SensorIssue::LIGHT_READ_FAILED);s.lux=0;s.health=assessSensors(s,3500,1507);check(s.health.valid());check(report(s).find("0.00 lux")!=std::string::npos);});
  run("06 bad individual ADC read cannot be hidden by averaging",[]{auto s=sample();s.adcValid=false;s.maxAdc=5000;s.health=assessSensors(s,3500,1507);check(s.health.soil==SensorIssue::ADC_INVALID);check(report(s).find("ADC_OUT_OF_12BIT_RANGE")!=std::string::npos);});
  run("07 ADC rails are warnings, not fabricated sensor faults",[]{auto s=sample();s.rawAdc=0;s.minAdc=0;s.soil=100;s.health=assessSensors(s,3500,1507);check(s.health.valid()&&s.health.adcAtRail);check(report(s).find("WARNING: ADC_AT_RAIL")!=std::string::npos);});
  run("08 bad calibration has separate diagnosis",[]{auto s=sample();check(assessSensors(s,1507,3500).soil==SensorIssue::CALIBRATION_INVALID);});
  run("09 NTP failure does not turn valid sensors into sensor errors",[]{auto s=sample();s.recordedAt=0;check(s.health.valid());auto text=report(s,"SKIPPED_NTP_AT_MEASUREMENT",false);check(text.find("TIME_AT_SAMPLE: NOT_SYNCED")!=std::string::npos);check(text.find("ERROR:")==std::string::npos);});
  run("10 failed publish never marks sent and retry is bounded",[]{TelemetryDelivery t;check(t.due(1,100));t.begin(1,100);t.finish(1,false);check(!t.sent(1)&&t.failed(1));check(!t.due(1,5099));check(t.due(1,5100));t.begin(1,5100);t.finish(1,true);check(t.sent(1)&&!t.failed(1)&&!t.due(1,20000));});
  run("11 a new sample replaces failed older sample without backlog",[]{TelemetryDelivery t;t.begin(1,100);t.finish(1,false);check(t.due(2,101));t.begin(2,101);t.finish(2,true);check(t.sent(2)&&!t.sent(1));});
  run("12 retry delay and lease survive millis wrap",[]{TelemetryDelivery t;t.begin(1,0xfffffff0u);t.finish(1,false);check(!t.due(1,0xfffffff0u+4999u));check(t.due(1,0xfffffff0u+5000u));check(networkLeaseHealthy(0xfffffff0u+250u,0xfffffff0u,true));check(!networkLeaseHealthy(0xfffffff0u+251u,0xfffffff0u,true));});
  run("13 stale/future data is not made new by retry",[]{check(sampleFresh(30500,500));check(!sampleFresh(30501,500));check(!sampleFresh(499,500));check(!sampleFresh(1000,0));});
  run("14 slow broker/loop fails closed at 251ms, not at 250ms",[]{check(networkLeaseHealthy(250,0,true));check(!networkLeaseHealthy(251,0,true));check(!networkLeaseHealthy(10,0,false));});
  run("15 OFF-state publish gate blocks ON but permits OFF",[]{check(!commandTransportReady(true,false,true,true));check(commandTransportReady(true,false,true,false));check(!commandTransportReady(true,true,false,true));check(!commandTransportReady(false,false,false,true));});
  run("16 report formatting bounded and never claims unknown GPIO OFF",[]{auto s=sample();char tiny[8];DiagnosticStatus status{true,true,true,true,false,2,"FAILED","UTC"};check(!formatSensorMonitor(tiny,sizeof(tiny),s,status));check(!formatSensorMonitor(tiny,0,s,status));auto text=report(s,"FAILED (NOT_SENT)",true,2);check(text.find("LOW_NOT_CONFIRMED")!=std::string::npos);check(text.find("TELEMETRY     : FAILED")!=std::string::npos);});
  run("17 WiFi/MQTT outage simulation cuts ON, reconnect does not replay",[]{
    for(unsigned outage=0;outage<2;++outage) {
      PumpController pump(writeSimulatedGpio,true);
      Command cmd;memcpy(cmd.id,"550e8400-e29b-41d4-a716-446655440000",37);cmd.on=true;cmd.seconds=5;cmd.issuedAt=1791990000000LL;cmd.expiresAt=cmd.issuedAt+10000;
      Context ctx{100,cmd.issuedAt+500,cmd.issuedAt-1000,true,true,true};
      check(pump.apply(cmd,ctx).applied&&simulatedGpio);
      const bool wifi=outage!=0,link=networkLeaseHealthy(351,100,outage!=1);
      check(pump.tick(351,wifi,link)!=nullptr&&!simulatedGpio);
      ctx.sessionFloor=cmd.issuedAt+1000;ctx.mono=500;
      check(!pump.apply(cmd,ctx).applied&&!simulatedGpio);
    }
  });
  run("18 simulated 200ms PUBACK stays within lease; 251ms stalls cut GPIO",[]{
    PumpController pump(writeSimulatedGpio,true);Command cmd;memcpy(cmd.id,"550e8400-e29b-41d4-a716-446655440000",37);cmd.on=true;cmd.seconds=5;cmd.issuedAt=1791990000000LL;cmd.expiresAt=cmd.issuedAt+10000;
    Context ctx{100,cmd.issuedAt+500,cmd.issuedAt-1000,true,true,true};check(pump.apply(cmd,ctx).applied);
    check(pump.tick(300,true,networkLeaseHealthy(300,100,true))==nullptr&&simulatedGpio);
    check(pump.tick(551,true,networkLeaseHealthy(551,300,true))!=nullptr&&!simulatedGpio);
  });
  std::cout<<passed<<" diagnostics passed, "<<failed<<" failed\n";return failed?1:0;
}
