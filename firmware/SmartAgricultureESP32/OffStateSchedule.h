#pragma once
#include <stdint.h>

namespace agriculture {
// Reporting only: never reads/writes GPIO or manufactures an OFF decision.
class OffStateSchedule {
 public:
  static constexpr uint32_t INTERVAL_MS = 15000u;
  bool due(uint32_t now) const { return !sent_ || static_cast<uint32_t>(now-last_) >= INTERVAL_MS; }
  void published(uint32_t now) { last_=now; sent_=true; }
 private:
  uint32_t last_=0;
  bool sent_=false;
};
}
