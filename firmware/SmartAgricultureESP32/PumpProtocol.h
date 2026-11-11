#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

namespace agriculture {
static const size_t MAX_COMMAND_BYTES = 1024;
struct Command { char id[37]{}; bool on=false; unsigned seconds=0; int64_t issuedAt=0; int64_t expiresAt=0; };
inline bool leap(int year) { return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0); }
inline int digits(const char* s, unsigned n) { int result = 0; for (unsigned i = 0; i < n; ++i) { if (s[i] < '0' || s[i] > '9') return -1; result = result * 10 + s[i] - '0'; } return result; }
// Exact UTC forms emitted by backend: yyyy-mm-ddThh:mm:ss.sssZ (also accept whole seconds).
inline bool parseUtc(const char* text, int64_t& result) {
  const size_t n = strlen(text);
  if ((n != 24 && n != 20) || text[4] != '-' || text[7] != '-' || text[10] != 'T' || text[13] != ':' || text[16] != ':' || text[n - 1] != 'Z' || (n == 24 && text[19] != '.')) return false;
  int y = digits(text,4), m = digits(text+5,2), d = digits(text+8,2), h = digits(text+11,2), min = digits(text+14,2), sec = digits(text+17,2), ms = n == 24 ? digits(text+20,3) : 0;
  const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
  if (y < 2024 || y > 2099 || m < 1 || m > 12 || d < 1 || d > days[m-1]+(m==2 && leap(y)) || h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59 || ms < 0) return false;
  int64_t count = 0; for (int i=1970;i<y;++i) count += leap(i)?366:365;
  for (int i=1;i<m;++i) count += days[i-1]+(i==2 && leap(y)); count += d-1;
  result = (((count*24+h)*60+min)*60+sec)*1000+ms; return true;
}
inline bool uuid(const char* text) {
  if (strlen(text) != 36) return false;
  for (unsigned i=0;i<36;++i) { if (i==8||i==13||i==18||i==23) { if(text[i]!='-') return false; } else if (!((text[i]>='0'&&text[i]<='9')||(text[i]>='a'&&text[i]<='f')||(text[i]>='A'&&text[i]<='F'))) return false; }
  return true;
}
// Bounded, strict flat JSON subset: no escaping/nesting/floats are needed in backend commands.
// Reject duplicate/unknown keys and non-canonical numeric tokens rather than permissive coercion.
class FlatJson {
public:
  struct Field { char key[24]; char value[80]; bool quoted; } fields[9];
  unsigned count = 0;
  bool parse(const char* data, size_t length) {
    count=0; p=data; end=data+length;
    if (length==0 || length>MAX_COMMAND_BYTES || !take('{')) return false;
    do {
      if (count>=9) return false;
      Field& field=fields[count]; if(!string(field.key,sizeof(field.key)) || !take(':')) return false;
      for(unsigned i=0;i<count;++i) if(strcmp(fields[i].key,field.key)==0) return false;
      whitespace(); field.quoted=p<end && *p=='"';
      if(field.quoted) { if(!string(field.value,sizeof(field.value))) return false; }
      else { size_t size=0; while(p<end && *p>='0' && *p<='9') { if(size+1>=sizeof(field.value)) return false; field.value[size++]=*p++; } field.value[size]='\0'; if(size==0 || (size>1 && field.value[0]=='0')) return false; }
      ++count; whitespace(); if(p<end && *p==',') { ++p; continue; } break;
    } while(true);
    return take('}') && (whitespace(),p==end);
  }
  const Field* get(const char* key) const { for(unsigned i=0;i<count;++i) if(strcmp(fields[i].key,key)==0) return &fields[i]; return nullptr; }
  const char* text(const char* key) const { const Field* f=get(key); return f && f->quoted ? f->value : ""; }
  bool number(const char* key, unsigned& out) const { const Field* f=get(key); if(!f||f->quoted||strlen(f->value)>5) return false; int n=digits(f->value,static_cast<unsigned>(strlen(f->value))); if(n<0) return false; out=static_cast<unsigned>(n); return true; }
private:
  const char *p=nullptr,*end=nullptr;
  void whitespace() { while(p<end && (*p==' '||*p=='\r'||*p=='\n'||*p=='\t')) ++p; }
  bool take(char c) { whitespace(); if(p==end||*p!=c) return false; ++p; return true; }
  bool string(char* out,size_t capacity) { if(!take('"')) return false; size_t n=0; while(p<end && *p!='"') { unsigned char c=static_cast<unsigned char>(*p++); if(c<32||c>126||c=='\\'||n+1>=capacity) return false; out[n++]=static_cast<char>(c); } out[n]='\0'; return p<end && *p++=='"'; }
};
inline bool decodeCommand(const char* payload,size_t size,const char* device,const char* actuator,Command& out) {
  FlatJson json; if(!json.parse(payload,size)) return false;
  const char* keys[]={"schemaVersion","commandId","deviceCode","actuatorCode","type","state","issuedAt","expiresAt","maxRunSeconds"};
  for(unsigned i=0;i<json.count;++i) { bool known=false; for(const char* key:keys) if(strcmp(key,json.fields[i].key)==0) known=true; if(!known) return false; }
  unsigned version; if(!json.number("schemaVersion",version)||version!=1 || !uuid(json.text("commandId")) || strcmp(json.text("deviceCode"),device)!=0 || strcmp(json.text("actuatorCode"),actuator)!=0 || strcmp(json.text("type"),"PUMP_SET")!=0) return false;
  if(strcmp(json.text("state"),"ON")==0) out.on=true; else if(strcmp(json.text("state"),"OFF")==0) out.on=false; else return false;
  if(!parseUtc(json.text("issuedAt"),out.issuedAt)||!parseUtc(json.text("expiresAt"),out.expiresAt)||out.expiresAt<=out.issuedAt||out.expiresAt-out.issuedAt>30000) return false;
  out.seconds=0; if(out.on) { if(!json.number("maxRunSeconds",out.seconds)||out.seconds==0||out.seconds>30) return false; } else if(json.get("maxRunSeconds")) return false;
  if(json.count!=(out.on?9u:8u)) return false;
  memcpy(out.id,json.text("commandId"),37); return true;
}
struct Context { uint32_t mono; int64_t utc; int64_t sessionFloor; bool clockReady; bool wifi; bool mqtt; };
struct Decision { bool applied; const char* reason; int64_t recordedAt; bool reportOff; };
class PumpController {
public:
  explicit PumpController(bool (*write)(bool), bool enabled, unsigned cap=5): write_(write),enabled_(enabled),cap_(cap) { fault_=!write_(false); }
  bool isOn() const { return on_; }
  bool confirmedOff() const { return !on_&&!fault_; }
  bool forceOff() { bool applied=write_(false); on_=false; fault_=!applied; return applied; }
  const char* tick(uint32_t now,bool wifi,bool mqtt) {
    if(!on_) return nullptr;
    if(!wifi) { forceOff(); return "WIFI_LOST"; }
    if(!mqtt) { forceOff(); return "MQTT_LOST"; }
    if(static_cast<uint32_t>(now-started_)>=runtime_) { forceOff(); return "MAX_RUNTIME"; }
    return nullptr;
  }
  Decision apply(const Command& cmd,const Context& ctx,bool retained=false) {
    if(retained) return reject("RETAINED_COMMAND",ctx);
    // A well-formed addressed OFF always drives LOW first, even if ACK must be REJECTED.
    if(!cmd.on) {
      const bool lowApplied=forceOff();
      // Even an expired/unsynced OFF must prevent an older ON from undoing the safety stop.
      if(cmd.issuedAt>highWater_) highWater_=cmd.issuedAt;
      if(!lowApplied) return remember(cmd,ctx,false,"GPIO_WRITE_FAILED");
    }
    if(!ctx.wifi||!ctx.mqtt) return remember(cmd,ctx,false,"DISCONNECTED");
    if(!ctx.clockReady) return remember(cmd,ctx,false,"CLOCK_UNSYNCED");
    if(ctx.utc>=cmd.expiresAt) return remember(cmd,ctx,false,"EXPIRED");
    if(cmd.issuedAt>ctx.utc+2000) return remember(cmd,ctx,false,"FUTURE_COMMAND");
    if(cmd.on && cmd.issuedAt<ctx.sessionFloor) return remember(cmd,ctx,false,"BEFORE_SESSION");
    if(cmd.on && fault_) return remember(cmd,ctx,false,"GPIO_STATE_UNCONFIRMED");
    for(Entry& entry:cache_) {
      if(entry.used && strcmp(entry.command.id,cmd.id)==0) {
        if(entry.command.on!=cmd.on||entry.command.issuedAt!=cmd.issuedAt||entry.command.expiresAt!=cmd.expiresAt||entry.command.seconds!=cmd.seconds) return reject("ID_REUSED",ctx);
        if(cmd.on && entry.applied && (!on_ || strcmp(activeId_,cmd.id)!=0)) return reject("ALREADY_COMPLETED",ctx);
        return {entry.applied,entry.reason,entry.recordedAt,confirmedOff()};
      }
    }
    if(cmd.on && cmd.issuedAt<=highWater_) return remember(cmd,ctx,false,"OUT_OF_ORDER");
    if(cmd.on && (!enabled_)) return remember(cmd,ctx,false,"PUMP_COMMANDS_DISABLED");
    if(cmd.on && (cap_<1||cap_>5||cmd.seconds>cap_)) return remember(cmd,ctx,false,"INVALID_MAX_RUNTIME");
    if(cmd.on && on_) return remember(cmd,ctx,false,"ALREADY_ON");
    Entry* slot=nullptr;
    for(Entry& entry:cache_) if(!entry.used || static_cast<uint32_t>(ctx.mono-entry.at)>=120000u) { slot=&entry; break; }
    if(!slot && cmd.on) return reject("COMMAND_CACHE_FULL",ctx);
    if(!slot) slot=&cache_[0]; // OFF remains available; high-water prevents an evicted old ON.
    if(cmd.issuedAt>highWater_) highWater_=cmd.issuedAt;
    if(cmd.on) { started_=ctx.mono; runtime_=cmd.seconds*1000u; memcpy(activeId_,cmd.id,37); if(!write_(true)) { forceOff(); return remember(cmd,ctx,false,"GPIO_WRITE_FAILED"); } fault_=false; on_=true; }
    return store(*slot,cmd,ctx,true,nullptr);
  }
private:
  struct Entry { bool used=false; Command command{}; uint32_t at=0; bool applied=false; const char* reason=nullptr; int64_t recordedAt=0; };
  Entry cache_[64]; bool (*write_)(bool); bool enabled_,on_=false,fault_=false; unsigned cap_; uint32_t started_=0,runtime_=0; int64_t highWater_=0; char activeId_[37]{};
  Decision reject(const char* reason,const Context& ctx) const { return {false,reason,ctx.utc,confirmedOff()}; }
  Decision store(Entry& slot,const Command& cmd,const Context& ctx,bool applied,const char* reason) { slot.used=true; slot.command=cmd; slot.at=ctx.mono; slot.applied=applied; slot.reason=reason; slot.recordedAt=ctx.utc; return {applied,reason,ctx.utc,confirmedOff()}; }
  Decision remember(const Command& cmd,const Context& ctx,bool applied,const char* reason) { for(Entry& entry:cache_) if(entry.used&&strcmp(entry.command.id,cmd.id)==0) return store(entry,cmd,ctx,applied,reason); for(Entry& entry:cache_) if(!entry.used||static_cast<uint32_t>(ctx.mono-entry.at)>=120000u) return store(entry,cmd,ctx,applied,reason); return reject(reason,ctx); }
};
inline float soilPercent(int adc,int dry,int wet) { if(dry<=wet||adc<0||adc>4095) return NAN; float result=100.0f*(dry-adc)/(dry-wet); return result<0?0:result>100?100:result; }
inline bool ackJson(char* out,size_t size,const Command& cmd,const Decision& decision,const char* device,const char* actuator,const char* utc) {
  int n=snprintf(out,size,"{\"schemaVersion\":1,\"commandId\":\"%s\",\"deviceCode\":\"%s\",\"actuatorCode\":\"%s\",\"type\":\"PUMP_SET\",\"state\":\"%s\",\"result\":\"%s\",\"recordedAt\":\"%s\"%s%s%s}",cmd.id,device,actuator,cmd.on?"ON":"OFF",decision.applied?"APPLIED":"REJECTED",utc,decision.reason?",\"reason\":\"":"",decision.reason?decision.reason:"",decision.reason?"\"":""); return n>0 && static_cast<size_t>(n)<size;
}
inline bool stateJson(char* out,size_t size,const char* device,const char* actuator,const char* reason,const char* utc) { int n=snprintf(out,size,"{\"schemaVersion\":1,\"deviceCode\":\"%s\",\"actuatorCode\":\"%s\",\"state\":\"OFF\",\"reason\":\"%s\",\"recordedAt\":\"%s\"}",device,actuator,reason,utc); return n>0 && static_cast<size_t>(n)<size; }
inline bool telemetryJson(char* out,size_t size,const char* device,const char* utc,float temp,float humidity,float lux,float soil) {
  if(!isfinite(temp)||!isfinite(humidity)||!isfinite(lux)||!isfinite(soil)||temp< -40||temp>80||humidity<0||humidity>100||lux<0||lux>65535||soil<0||soil>100) return false;
  int n=snprintf(out,size,"{\"schemaVersion\":1,\"deviceCode\":\"%s\",\"recordedAt\":\"%s\",\"readings\":[{\"sensorCode\":\"TEMP_01\",\"value\":%.2f},{\"sensorCode\":\"HUM_01\",\"value\":%.2f},{\"sensorCode\":\"LIGHT_01\",\"value\":%.2f},{\"sensorCode\":\"SOIL_01\",\"value\":%.2f}]}",device,utc,temp,humidity,lux,soil);
  return n>0 && static_cast<size_t>(n)<size;
}
}
