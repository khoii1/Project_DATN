#include "../SmartAgricultureESP32/SntpRecovery.h"
#include "../SmartAgricultureESP32/PumpProtocol.h"
#include "../SmartAgricultureESP32/FirmwareDiagnostics.h"
#include <iostream>
#include <stdexcept>
using namespace agriculture;
static const int64_t UTC=1792551600000LL;
static unsigned passed=0;
static bool simulatedPin=false;
static bool pin(bool on) { simulatedPin=on; return true; }
static void check(bool good) { if(!good) throw std::runtime_error("SNTP assertion failed"); }
template<class Test> void run(const char* name,Test test) { simulatedPin=false;test();check(!simulatedPin);++passed;std::cout<<"PASS "<<name<<"\n"; }
int main() {
  run("startup has no invented UTC",[]{SntpClock c;auto s=c.snapshot(0,0);check(!s.reliable&&s.callbacks==0&&s.reason==ClockReason::NO_CALLBACK);});
  run("only successful callback arms clock",[]{SntpClock c;c.onCallback(100,UTC);auto s=c.snapshot(100,UTC);check(s.reliable&&s.callbacks==1&&s.generation==1);});
  run("one hour still valid, proactive recovery is due",[]{SntpClock c;c.onCallback(0,UTC);SntpRetry r;r.due(0,true,true,false,c.snapshot(0,UTC));auto s=c.snapshot(3600000,UTC+3600000);check(s.reliable&&s.age==3600000);check(r.due(3600000,true,true,false,s));});
  run("explicit interval before validity deadline",[]{check(SNTP_REFRESH_MS==1800000&&SNTP_REFRESH_MS<CLOCK_EXPIRY_MS&&CLOCK_EXPIRY_MS==7200000);});
  run("two hour boundary expires, never becomes synced without callback",[]{SntpClock c;c.onCallback(0,UTC);check(c.snapshot(7199999,UTC+7199999).reliable);check(!c.snapshot(7200000,UTC+7200000).reliable);check(!c.snapshot(7200100,UTC+7200100).reliable);});
  run("expiry remains latched through age wrap",[]{SntpClock c;c.onCallback(0,UTC);c.snapshot(7200000,UTC+7200000);check(!c.snapshot(1,UTC+4294967297LL).reliable);});
  run("late callback recovers without clearing last success speculatively",[]{SntpClock c;c.onCallback(0,UTC);c.snapshot(7200000,UTC+7200000);c.onCallback(7200100,UTC+7200100);auto s=c.snapshot(7200100,UTC+7200100);check(s.reliable&&s.age==0&&s.callbacks==2);});
  run("duplicate callback is safe, invalidates older sample generation",[]{SntpClock c;c.onCallback(100,UTC);auto a=c.snapshot(100,UTC);c.onCallback(100,UTC);auto b=c.snapshot(100,UTC);check(b.reliable&&b.generation==a.generation+1);check(!clockSampleEligible(UTC,a.generation,b));});
  run("sample measured unsynced stays unpublishable after recovery",[]{SntpClock c;auto old=c.snapshot(0,0);c.onCallback(100,UTC);auto now=c.snapshot(100,UTC);check(!clockSampleEligible(0,old.generation,now));check(clockSampleEligible(UTC,now.generation,now));});
  run("old valid sample cannot cross recovered generation",[]{SntpClock c;c.onCallback(0,UTC);auto a=c.snapshot(0,UTC);c.snapshot(7200000,UTC+7200000);c.onCallback(7201000,UTC+7201000);auto b=c.snapshot(7201000,UTC+7201000);check(!clockSampleEligible(UTC,a.generation,b));});
  run("rollover unsigned millis remains valid",[]{SntpClock c;uint32_t start=0xfffffff0u;c.onCallback(start,UTC);check(c.snapshot(start+1000u,UTC+1000).reliable);check(!c.snapshot(start+CLOCK_EXPIRY_MS,UTC+CLOCK_EXPIRY_MS).reliable);});
  run("rollback/jump blocks until another real callback",[]{for(int delta: {-1,3001}) {SntpClock c;c.onCallback(0,UTC);auto s=c.snapshot(1,UTC+delta);check(!s.reliable&&s.reason==ClockReason::CLOCK_JUMP);c.onCallback(2,UTC+100);check(c.snapshot(2,UTC+100).reliable);}});
  run("invalid callback UTC never authorizes timestamp",[]{SntpClock c;c.onCallback(100,1);check(!c.snapshot(100,1).reliable);});
  run("startup/server unreachable retry has backoff not tight loop",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;check(!r.due(0,true,true,false,s));check(!r.due(29999,true,true,false,s));check(r.due(30000,true,true,false,s));check(!r.due(30001,true,true,false,s));check(!r.due(89999,true,true,false,s));check(r.due(90000,true,true,false,s));});
  run("six request batch enters 30 minute cooldown",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;r.due(0,true,true,false,s);uint32_t n=30000;for(int i=0;i<6;++i){check(r.due(n,true,true,false,s));n+=r.waitMs(n);}check(r.waitMs(n-1800000)==1800000);check(!r.due(n-1,true,true,false,s));check(r.due(n,true,true,false,s));});
  run("DNS failure/server timeout do not call sync callback or mutate clock",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;r.due(0,true,true,false,s);for(uint32_t n: {30000u,90000u,210000u})check(r.due(n,true,true,false,s));check(!c.snapshot(210000,0).reliable&&c.snapshot(210000,0).callbacks==0);});
  run("WiFi offline skips retry then reconnect schedules one paced request",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;r.due(0,false,true,false,s);check(!r.due(30000,false,true,false,s));check(r.due(30000,true,true,false,s,true));check(!r.due(30001,true,true,false,s,true));});
  run("healthy MQTT reconnect alone does not restart SNTP",[]{SntpClock c;c.onCallback(0,UTC);SntpRetry r;r.due(0,true,true,false,c.snapshot(0,UTC));auto s=c.snapshot(30000,UTC+30000);check(!r.due(30000,true,true,false,s,false));});
  run("stopped SNTP may be reinitialized without false sync",[]{SntpClock c;c.onCallback(0,UTC);SntpRetry r;r.due(0,true,true,false,c.snapshot(0,UTC));check(r.due(30000,true,false,false,c.snapshot(30000,UTC+30000)));check(c.snapshot(30000,UTC+30000).callbacks==1);});
  run("worker skips restart while pump is ON",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;r.due(0,true,true,false,s);check(!r.due(30000,true,true,true,s));});
  run("retry scheduling survives millis rollover",[]{SntpClock c;auto s=c.snapshot(0,0);SntpRetry r;uint32_t start=0xfffffff0u;r.due(start,true,true,false,s);check(!r.due(start+29999u,true,true,false,s));check(r.due(start+30000u,true,true,false,s));});
  run("successful callback resets backoff, no immediate restart",[]{SntpClock c;SntpRetry r;auto s=c.snapshot(0,0);r.due(0,true,true,false,s);r.due(30000,true,true,false,s);c.onCallback(31000,UTC);check(!r.due(31000,true,true,false,c.snapshot(31000,UTC)));check(r.waitMs(31000)==30000);});
  run("fake relay OFF in all clock recovery transitions",[]{PumpController pump(pin,false);SntpClock c;for(uint32_t t: {0u,3600000u,7200000u,7200100u}) {auto s=c.snapshot(t,UTC+t);if(!s.reliable)pump.forceOff();check(pump.confirmedOff()&&!pump.isOn());}c.onCallback(7200200,UTC+7200200);check(c.snapshot(7200200,UTC+7200200).reliable&&pump.confirmedOff());});
  run("MAX_RUNTIME/OFF priority keep original protocol safety",[]{PumpController pump(pin,false);check(pump.confirmedOff());check(!commandTransportReady(true,false,true,true));check(commandTransportReady(true,false,true,false));check(!sampleFresh(UTC+30001,UTC));});
  std::cout<<passed<<"/"<<passed<<" SNTP recovery tests passed (fake clock/GPIO only)\n";
}
