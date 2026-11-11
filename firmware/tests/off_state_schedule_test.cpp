#include "../SmartAgricultureESP32/OffStateSchedule.h"
#include <iostream>
#include <stdexcept>
using namespace agriculture;
static void check(bool value) { if(!value) throw std::runtime_error("assertion failed"); }
int main() {
  OffStateSchedule schedule;
  check(schedule.due(0));
  schedule.published(100);
  check(!schedule.due(15099)); check(schedule.due(15100));
  // Failure does not advance the schedule; caller can retry only after connection recovery.
  check(schedule.due(15101)); schedule.published(15101); check(!schedule.due(15102));
  schedule.published(0xfffffff0u);
  check(!schedule.due(0xfffffff0u+14999u)); check(schedule.due(0xfffffff0u+15000u));
  std::cout << "PASS: initial, interval, failed publish, no flood, millis wrap (5 checks)\n";
}
