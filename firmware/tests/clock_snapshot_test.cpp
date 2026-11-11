#include "../SmartAgricultureESP32/SntpRecovery.h"
#include <atomic>
#include <functional>
#include <iostream>
#include <mutex>
#include <stdexcept>
#include <thread>
using namespace agriculture;
static const int64_t UTC=1792551600000LL;
static thread_local unsigned lockDepth=0;
static void check(bool ok) { if(!ok) throw std::runtime_error("clock snapshot assertion failed"); }
struct Harness {
  SntpClockStore store;
  std::mutex mutex;
  uint32_t mono=100;
  int64_t utc=UTC;
  bool readOk=true;
  unsigned reads=0;
  std::function<void()> duringRead;
  ClockReadState load() { std::lock_guard<std::mutex> guard(mutex); ++lockDepth; auto s=store.load(); --lockDepth; return s; }
  bool commit(const ClockReadState& s) { std::lock_guard<std::mutex> guard(mutex); ++lockDepth; bool ok=store.commit(s); --lockDepth; return ok; }
  void callback(uint32_t m,int64_t u) { std::lock_guard<std::mutex> guard(mutex); ++lockDepth; store.onCallback(m,u); --lockDepth; }
  ClockSnapshot read(int64_t* at=nullptr) {
    return consistentClockSnapshot([&]{return load();},[&](uint32_t& m,int64_t& u){
      check(lockDepth==0); ++reads; if(duringRead) duringRead(); m=mono;u=utc;return readOk;
    },[&](const ClockReadState& s){return commit(s);},at);
  }
};
static unsigned passed=0;
template<class Test> void run(const char* name,Test test) { test();++passed;std::cout<<"PASS "<<name<<"\n"; }
int main() {
  run("UTC read runs outside lock, fresh snapshot commits",[]{Harness h;h.callback(100,UTC);int64_t at=0;auto s=h.read(&at);check(s.reliable&&at==UTC&&s.generation==1);});
  run("callback while reading UTC forces retry, new generation wins",[]{Harness h;h.callback(100,UTC);h.duringRead=[&]{if(h.reads==1){h.callback(101,UTC+1);h.mono=101;h.utc=UTC+1;}};auto s=h.read();check(s.reliable&&s.generation==2&&h.reads==2);});
  run("generation changes on each read, bounded failure no timestamp",[]{Harness h;h.callback(100,UTC);h.duringRead=[&]{h.callback(100,UTC);};int64_t at=123;auto s=h.read(&at);check(!s.reliable&&s.reason==ClockReason::SNAPSHOT_RACE&&at==0&&h.reads==CLOCK_SNAPSHOT_ATTEMPTS);});
  run("old invalid reader cannot overwrite successful callback",[]{Harness h;h.callback(100,UTC);auto old=h.load();check(!old.clock.snapshot(101,0).reliable);h.callback(102,UTC+2);check(!h.commit(old));h.mono=102;h.utc=UTC+2;check(h.read().reliable);});
  run("old reliable reader cannot erase another reader jump latch",[]{Harness h;h.callback(100,UTC);auto old=h.load();check(old.clock.snapshot(100,UTC).reliable);h.utc=UTC+4000;check(!h.read().reliable);check(!h.commit(old));h.utc=UTC;check(!h.read().reliable);});
  run("failed time read latches invalid until callback, no timestamp",[]{Harness h;h.callback(100,UTC);h.readOk=false;int64_t at=9;auto s=h.read(&at);check(!s.reliable&&s.reason==ClockReason::UTC_INVALID&&at==0);h.readOk=true;check(!h.read().reliable);h.callback(100,UTC);check(h.read().reliable);});
  run("failed old time read cannot undo callback inside read",[]{Harness h;h.callback(100,UTC);h.readOk=false;h.duringRead=[&]{h.callback(101,UTC+1);};check(!h.read().reliable);h.duringRead=nullptr;h.readOk=true;h.mono=101;h.utc=UTC+1;auto s=h.read();check(s.reliable&&s.generation==2);});
  run("rollback and forward jump latch until callback",[]{for(int delta:{-1,3001}){Harness h;h.callback(100,UTC);h.mono=101;h.utc=UTC+delta;check(!h.read().reliable);h.utc=UTC+1;check(!h.read().reliable);h.callback(101,UTC+1);check(h.read().reliable);}});
  run("unsigned millis rollover and two hour expiry preserved",[]{Harness h;h.mono=0xfffffff0u;h.callback(h.mono,UTC);h.mono+=1000;h.utc+=1000;check(h.read().reliable);h.mono=0xfffffff0u+CLOCK_EXPIRY_MS;h.utc=UTC+CLOCK_EXPIRY_MS;check(!h.read().reliable);});
  run("samples cannot cross callback recovery generation",[]{Harness h;h.callback(100,UTC);auto before=h.read();h.callback(101,UTC+1);h.mono=101;h.utc=UTC+1;auto after=h.read();check(!clockSampleEligible(UTC,before.generation,after));check(!clockSampleEligible(0,after.generation,after));check(clockSampleEligible(UTC+1,after.generation,after));});
  run("reader commit conflict without callback also retries",[]{Harness h;h.callback(100,UTC);h.duringRead=[&]{if(h.reads==1){auto newer=h.load();newer.clock.snapshot(100,UTC);check(h.commit(newer));}};check(h.read().reliable&&h.reads==2);});
  run("1000 interleaved callbacks and readers preserve last success",[]{Harness h;h.callback(100,UTC);for(unsigned i=0;i<1000;++i){h.duringRead=[&]{if(h.reads%2==1)h.callback(100,UTC);};auto s=h.read();check(s.reliable);}h.duringRead=nullptr;check(h.read().generation==1001);});
  run("real host threads: 3 readers and 1000 callbacks serialized store",[]{
    Harness h;h.callback(100,UTC);std::atomic<bool> start(false),failed(false);std::atomic<unsigned> callbacks(0);
    // Concurrent path avoids Harness::read's diagnostic counter (single-thread only).
    auto concurrentReader=[&]{while(!start.load())std::this_thread::yield();try{for(unsigned i=0;i<1000;++i){auto s=consistentClockSnapshot([&]{return h.load();},[](uint32_t& m,int64_t& u){check(lockDepth==0);m=100;u=UTC;return true;},[&](const ClockReadState& v){return h.commit(v);});if(s.reliable)check(s.generation>=1);}}catch(...){failed=true;}};
    std::thread a(concurrentReader),b(concurrentReader),c(concurrentReader),writer([&]{while(!start.load())std::this_thread::yield();for(unsigned i=0;i<1000;++i){h.callback(100,UTC);++callbacks;}});
    start=true;a.join();b.join();c.join();writer.join();check(!failed&&callbacks==1000&&h.read().generation==1001&&h.read().reliable);
  });
  std::cout<<passed<<"/"<<passed<<" clock snapshot tests passed (host mutex/threads, not ESP32 RTOS/libc)\n";
}
