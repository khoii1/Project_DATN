#pragma once
#include <stdint.h>

namespace agriculture {
static constexpr uint32_t CLOCK_EXPIRY_MS=7200000u; // Keep reviewed two-hour guard.
static constexpr uint32_t SNTP_REFRESH_MS=1800000u; // Explicit 30min < two-hour validity (core default is 3h).
static constexpr uint32_t SNTP_RECOVER_AGE_MS=3600000u;
enum class ClockReason { NO_CALLBACK, OK, EXPIRED, UTC_INVALID, CLOCK_JUMP, SNAPSHOT_RACE };
inline const char* clockReasonText(ClockReason reason) {
  switch(reason) {
    case ClockReason::NO_CALLBACK:return "NO_CALLBACK";
    case ClockReason::OK:return "OK";
    case ClockReason::EXPIRED:return "SYNC_AGE_EXPIRED";
    case ClockReason::UTC_INVALID:return "UTC_INVALID";
    case ClockReason::CLOCK_JUMP:return "CLOCK_JUMP_WAIT_CALLBACK";
    case ClockReason::SNAPSHOT_RACE:return "SNAPSHOT_RACE";
  }
  return "UNKNOWN";
}
struct ClockSnapshot { bool reliable; ClockReason reason; uint32_t age,generation,callbacks; };
/** Pure state only. Evaluate on a private copy; no time APIs, I/O or GPIO. */
class SntpClock {
  bool synced_=false,blocked_=false,observed_=false;
  uint32_t lastSync_=0,generation_=0,callbacks_=0,previousMono_=0;
  int64_t previousUtc_=0;
  ClockReason reason_=ClockReason::NO_CALLBACK;
public:
  void onCallback(uint32_t now,int64_t utc) {
    ++callbacks_; ++generation_; lastSync_=now;
    synced_=utc>=1704067200000LL; blocked_=false; observed_=true;
    previousMono_=now; previousUtc_=utc;
    reason_=synced_?ClockReason::OK:ClockReason::UTC_INVALID;
  }
  ClockSnapshot snapshot(uint32_t now,int64_t utc) {
    uint32_t age=static_cast<uint32_t>(now-lastSync_);
    if(synced_ && !blocked_) {
      if(age>=CLOCK_EXPIRY_MS) { blocked_=true; reason_=ClockReason::EXPIRED; }
      else if(utc<1704067200000LL) { blocked_=true; reason_=ClockReason::UTC_INVALID; }
      else if(observed_) {
        const int64_t drift=(utc-previousUtc_)-static_cast<uint32_t>(now-previousMono_);
        if(utc<previousUtc_ || drift>2000 || drift< -2000) { blocked_=true; reason_=ClockReason::CLOCK_JUMP; }
      }
    }
    previousMono_=now; previousUtc_=utc; observed_=true;
    return {synced_&&!blocked_,reason_,age,generation_,callbacks_};
  }
};

struct ClockReadState { SntpClock clock; uint64_t revision; };
/** External clockMux protects ONLY these copy/update operations. No nested locks.
 * Revision includes readers, not just callbacks: a delayed reader must not undo
 * another reader's jump/expiry latch or a successful callback.
 */
class SntpClockStore {
  SntpClock clock_;
  uint64_t revision_=0;
public:
  ClockReadState load() const { return {clock_,revision_}; }
  void onCallback(uint32_t mono,int64_t utc) { clock_.onCallback(mono,utc); ++revision_; }
  bool commit(const ClockReadState& read) {
    if(read.revision!=revision_) return false;
    clock_=read.clock; ++revision_; return true;
  }
};
static constexpr unsigned CLOCK_SNAPSHOT_ATTEMPTS=3;
/** load/commit briefly serialize the store; readTime MUST execute without lock.
 * No speculative state is shared until revision-checked commit. Bounded retry
 * fails closed without altering the callback's or another reader's state.
 */
template<class Load,class ReadTime,class Commit>
ClockSnapshot consistentClockSnapshot(Load load,ReadTime readTime,Commit commit,int64_t* measuredUtc=nullptr) {
  if(measuredUtc) *measuredUtc=0;
  ClockSnapshot result={false,ClockReason::SNAPSHOT_RACE,0,0,0};
  for(unsigned attempt=0;attempt<CLOCK_SNAPSHOT_ATTEMPTS;++attempt) {
    ClockReadState read=load();
    uint32_t mono=0; int64_t utc=0;
    if(!readTime(mono,utc)) {
      result=read.clock.snapshot(mono,0); // Private copy only; never publish failed UTC.
      result.reliable=false; result.reason=ClockReason::UTC_INVALID;
      // Preserve the invalid-time latch, but NEVER overwrite a newer callback.
      commit(read);
      return result;
    }
    result=read.clock.snapshot(mono,utc); // Pure arithmetic outside clockMux.
    if(commit(read)) {
      if(measuredUtc && result.reliable) *measuredUtc=utc;
      return result;
    }
  }
  result.reliable=false; result.reason=ClockReason::SNAPSHOT_RACE;
  return result;
}

/** Worker-owned pacing. Automatic lwIP retries remain active; no tight-loop restart. */
class SntpRetry {
  uint32_t lastAttempt_=0,delay_=30000u,lastCallbacks_=0;
  unsigned attempts_=0;
  bool begun_=false;
public:
  bool due(uint32_t now,bool wifi,bool running,bool pumpOn,const ClockSnapshot& clock,bool reconnected=false) {
    if(!begun_) { begun_=true; lastAttempt_=now; lastCallbacks_=clock.callbacks; return false; }
    if(clock.callbacks!=lastCallbacks_) { lastCallbacks_=clock.callbacks; attempts_=0;delay_=30000u;lastAttempt_=now; }
    if(!wifi || pumpOn) return false;
    if(clock.reliable && clock.age<SNTP_RECOVER_AGE_MS && running && !reconnected) return false;
    if(static_cast<uint32_t>(now-lastAttempt_)<delay_) return false;
    lastAttempt_=now;
    if(++attempts_>=6) { attempts_=0; delay_=1800000u; } // Cooldown after bounded batch of six.
    else delay_=delay_<900000u/2?delay_*2:900000u;
    return true;
  }
  uint32_t waitMs(uint32_t now) const { uint32_t age=static_cast<uint32_t>(now-lastAttempt_);return age>=delay_?0:delay_-age; }
  unsigned attempts() const { return attempts_; }
};
inline bool clockSampleEligible(int64_t recordedAt,uint32_t sampleGeneration,const ClockSnapshot& current) {
  return current.reliable && recordedAt>=1704067200000LL && sampleGeneration==current.generation;
}
}
