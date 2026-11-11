#pragma once
#include "PumpProtocol.h"
#include <stdarg.h>

namespace agriculture {
static constexpr uint32_t NETWORK_LEASE_MS=250;
static constexpr uint32_t TELEMETRY_RETRY_MS=5000;
static constexpr int64_t MAX_SAMPLE_AGE_MS=30000;
inline bool networkLeaseHealthy(uint32_t now,uint32_t progress,bool ready) { return ready && static_cast<uint32_t>(now-progress)<=NETWORK_LEASE_MS; }
inline bool commandTransportReady(bool ready,bool reset,bool syncingOff,bool on) { return ready && !reset && !(on && syncingOff); }
enum class SensorIssue { OK, DHT_NONFINITE, OUT_OF_RANGE, LIGHT_INIT_FAILED, LIGHT_NOT_READY, LIGHT_READ_FAILED, ADC_INVALID, CALIBRATION_INVALID };
inline const char* sensorIssueText(SensorIssue issue) {
  switch(issue) {
    case SensorIssue::OK: return "OK";
    case SensorIssue::DHT_NONFINITE: return "DHT_NAN (read/checksum/timeout/signal/power possible; not confirmed)";
    case SensorIssue::OUT_OF_RANGE: return "OUT_OF_PHYSICAL_RANGE";
    case SensorIssue::LIGHT_INIT_FAILED: return "BH1750_INIT_FAILED (I2C/address/power possible; not confirmed)";
    case SensorIssue::LIGHT_NOT_READY: return "BH1750_MEASUREMENT_NOT_READY";
    case SensorIssue::LIGHT_READ_FAILED: return "BH1750_READ_FAILED (nonfinite/negative driver result)";
    case SensorIssue::ADC_INVALID: return "ADC_OUT_OF_12BIT_RANGE";
    case SensorIssue::CALIBRATION_INVALID: return "SOIL_CALIBRATION_INVALID";
  }
  return "UNKNOWN";
}
struct SensorHealth {
  SensorIssue temp=SensorIssue::OK,humidity=SensorIssue::OK,light=SensorIssue::OK,soil=SensorIssue::OK;
  bool adcAtRail=false;
  bool valid() const { return temp==SensorIssue::OK && humidity==SensorIssue::OK && light==SensorIssue::OK && soil==SensorIssue::OK; }
};
struct DiagnosticSample {
  float temp=NAN,humidity=NAN,lux=NAN,soil=NAN;
  int rawAdc=-1,minAdc=-1,maxAdc=-1;
  bool adcValid=false,lightInitialized=false,lightDataReady=false;
  int64_t recordedAt=0;
  uint32_t sequence=0;
  SensorHealth health;
  bool valid=false;
};
inline SensorIssue dhtIssue(float value,float minimum,float maximum) { return !isfinite(value)?SensorIssue::DHT_NONFINITE:(value<minimum||value>maximum)?SensorIssue::OUT_OF_RANGE:SensorIssue::OK; }
inline SensorHealth assessSensors(const DiagnosticSample& sample,int dry,int wet) {
  SensorHealth health;
  health.temp=dhtIssue(sample.temp,-40,80); health.humidity=dhtIssue(sample.humidity,0,100);
  health.light=!sample.lightInitialized?SensorIssue::LIGHT_INIT_FAILED:!sample.lightDataReady?SensorIssue::LIGHT_NOT_READY:!isfinite(sample.lux)||sample.lux<0?SensorIssue::LIGHT_READ_FAILED:sample.lux>65535?SensorIssue::OUT_OF_RANGE:SensorIssue::OK;
  health.soil=dry<=wet?SensorIssue::CALIBRATION_INVALID:!sample.adcValid||sample.rawAdc<0||sample.rawAdc>4095||!isfinite(sample.soil)?SensorIssue::ADC_INVALID:sample.soil<0||sample.soil>100?SensorIssue::OUT_OF_RANGE:SensorIssue::OK;
  health.adcAtRail=health.soil==SensorIssue::OK && (sample.minAdc==0||sample.maxAdc==4095);
  return health;
}
inline bool sampleFresh(int64_t now,int64_t recordedAt) { return recordedAt>0 && now>=recordedAt && now-recordedAt<=MAX_SAMPLE_AGE_MS; }
// A failed publish is an attempt, never a successful delivery. Only the latest sample is retried.
class TelemetryDelivery {
public:
  bool sent(uint32_t sequence) const { return hasSent_&&sentSequence_==sequence; }
  bool failed(uint32_t sequence) const { return hasAttempt_&&attemptSequence_==sequence&&failed_; }
  bool due(uint32_t sequence,uint32_t now) const { return !sent(sequence)&&(!hasAttempt_||attemptSequence_!=sequence||static_cast<uint32_t>(now-attemptAt_)>=TELEMETRY_RETRY_MS); }
  void begin(uint32_t sequence,uint32_t now) { hasAttempt_=true; attemptSequence_=sequence; attemptAt_=now; failed_=false; }
  void finish(uint32_t sequence,bool puback) { if(puback) {hasSent_=true;sentSequence_=sequence;} if(hasAttempt_&&attemptSequence_==sequence) failed_=!puback; }
private:
  bool hasSent_=false,hasAttempt_=false,failed_=false;
  uint32_t sentSequence_=0,attemptSequence_=0,attemptAt_=0;
};
struct DiagnosticStatus { bool configured,wifi,mqtt,ntp,pumpCommands; int relay; const char* telemetry; const char* utc; };
inline bool appendDiagnostic(char* out,size_t size,size_t& used,const char* format,...) {
  if(used>=size) return false;
  va_list arguments; va_start(arguments,format); int n=vsnprintf(out+used,size-used,format,arguments); va_end(arguments);
  if(n<0||static_cast<size_t>(n)>=size-used) {out[size-1]='\0';return false;} used+=static_cast<size_t>(n);return true;
}
inline bool formatSensorMonitor(char* out,size_t size,const DiagnosticSample& sample,const DiagnosticStatus& status) {
  if(!size) return false;
  size_t used=0;
  if(!appendDiagnostic(out,size,used,"\n========== SENSOR MONITOR #%lu ==========\n",static_cast<unsigned long>(sample.sequence))) return false;
  const char* names[]={"TEMP_01","HUM_01","LIGHT_01","SOIL_01"}; const char* units[]={"C","%","lux","%"};
  const float values[]={sample.temp,sample.humidity,sample.lux,sample.soil};
  const SensorIssue issues[]={sample.health.temp,sample.health.humidity,sample.health.light,sample.health.soil};
  for(unsigned i=0;i<4;++i) {
    if(i==3 && !appendDiagnostic(out,size,used,"SOIL_RAW_ADC  : %d (min=%d max=%d)%s\n",sample.rawAdc,sample.minAdc,sample.maxAdc,sample.health.adcAtRail?" WARNING: ADC_AT_RAIL; check signal/calibration, not proof of sensor failure":"")) return false;
    if(issues[i]==SensorIssue::OK) { if(!appendDiagnostic(out,size,used,"%-13s : %.2f %s\n",names[i],values[i],units[i])) return false; }
    else if(!appendDiagnostic(out,size,used,"%-13s : ERROR: %s\n",names[i],sensorIssueText(issues[i]))) return false;
  }
  return appendDiagnostic(out,size,used,"RECORDED_AT   : %s\nTIME_AT_SAMPLE: %s\n========================================\nWiFi          : %s\nMQTT          : %s\nNTP           : %s\nPUMP_COMMANDS : %s\nRELAY         : %s (GPIO only, not motor/water feedback)\nTELEMETRY     : %s\n",status.utc,sample.recordedAt>0?"SYNCED":"NOT_SYNCED; sample cannot be published",!status.configured?"NOT_CONFIGURED":status.wifi?"CONNECTED":"DISCONNECTED",!status.configured?"NOT_CONFIGURED":status.mqtt?"CONNECTED":"DISCONNECTED",status.ntp?"SYNCED":"NOT_SYNCED_OR_EXPIRED",status.pumpCommands?"ENABLED":"DISABLED",status.relay==1?"ON":status.relay==0?"OFF":"UNKNOWN/LOW_NOT_CONFIRMED",status.telemetry);
}
}
