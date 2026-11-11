#include <WiFi.h>
#include <ArduinoMqttClient.h>
#include <DHT.h>
#include <BH1750.h>
#include <Wire.h>
#include <time.h>
#include <sys/time.h>
#include <esp_sntp.h>
#include <driver/gpio.h>
#include <atomic>
#include "PumpProtocol.h"
#include "FirmwareDiagnostics.h"
#include "OffStateSchedule.h"
#include "SntpRecovery.h"
#if !defined(SMART_AGRI_EXAMPLE_CONFIG) && __has_include("config.local.h")
#include "config.local.h"
static constexpr bool LOCAL_CONFIG_PRESENT = true;
#else
#include "config.example.h"
static constexpr bool LOCAL_CONFIG_PRESENT = false;
#endif

using namespace agriculture;
static constexpr char SMART_AGRI_FIRMWARE_VERSION[]="13.4F.1";
static const char* const NTP_HOSTS[]={"pool.ntp.org","time.google.com"};
WiFiClient network;
MqttClient mqtt(network);
DHT dht(DHT_PIN, DHT22);
BH1750 light;
PumpController* pump = nullptr;
portMUX_TYPE pumpMux = portMUX_INITIALIZER_UNLOCKED;
portMUX_TYPE sensorMux = portMUX_INITIALIZER_UNLOCKED;
std::atomic<bool> mqttReady(false), resetTransport(false), ntpWifiReconnect(false);
std::atomic<uint32_t> lastNetworkProgress(0);
portMUX_TYPE clockMux = portMUX_INITIALIZER_UNLOCKED;
SntpClockStore ntpClock;
std::atomic<const char*> safetyNotice(nullptr);
std::atomic<const char*> pendingOffReason("BOOT");
char telemetryTopic[192], statusTopic[192], commandTopic[192], ackTopic[192], stateTopic[192];
static const char ONLINE[] = "{\"schemaVersion\":1,\"deviceCode\":\"ESP32-GF-A-01\",\"status\":\"ONLINE\"}";
static const char OFFLINE[] = "{\"schemaVersion\":1,\"deviceCode\":\"ESP32-GF-A-01\",\"status\":\"OFFLINE\"}";
struct Sample:DiagnosticSample { uint32_t clockGeneration=0; };
TelemetryDelivery telemetryDelivery;
OffStateSchedule offStateSchedule;
uint32_t lastPublishDuration=0;
const char* lastPublishFailure=nullptr;
bool stateSyncInProgress=false;
Sample sensorSample;
struct AckMessage { char body[512]; };
AckMessage ackQueue[8];
unsigned ackHead=0, ackCount=0;
uint32_t sessionStarted=0;
int64_t sessionFloor=0;
bool lightReady=false, tasksReady=false, topicsReady=false;
bool firstConnection=true;

// Only controller calls this; no network/sensor/Serial operations in its critical section.
bool writeRelay(bool on) {
  if(on && !ENABLE_PUMP_COMMANDS) return false; // Second independent physical-enable guard.
  esp_err_t result=gpio_set_level(static_cast<gpio_num_t>(RELAY_PIN),on?1:0);
  if(result==ESP_OK && gpio_get_level(static_cast<gpio_num_t>(RELAY_PIN))==(on?1:0)) return true;
  gpio_set_level(static_cast<gpio_num_t>(RELAY_PIN),0); return false;
}
int64_t utcNow() { timeval tv={}; if(gettimeofday(&tv,nullptr)!=0) return 0; return static_cast<int64_t>(tv.tv_sec)*1000+tv.tv_usec/1000; }
ClockReadState loadClockState() {
  portENTER_CRITICAL(&clockMux);
  ClockReadState read=ntpClock.load();
  portEXIT_CRITICAL(&clockMux);
  return read;
}
bool commitClockState(const ClockReadState& read) {
  portENTER_CRITICAL(&clockMux);
  const bool committed=ntpClock.commit(read);
  portEXIT_CRITICAL(&clockMux);
  return committed;
}
bool readClockTime(uint32_t& mono,int64_t& utc) {
  // gettimeofday may take a newlib mutex. NEVER call with clockMux held.
  utc=utcNow(); mono=millis();
  return utc>=1704067200000LL;
}
ClockSnapshot clockSnapshot(int64_t* measuredUtc=nullptr) {
  return consistentClockSnapshot(loadClockState,readClockTime,commitClockState,measuredUtc);
}
bool reliableClock() { return clockSnapshot().reliable; }
bool formatUtc(int64_t at,char* out,size_t size) {
  if(at<1704067200000LL) return false;
  time_t sec=static_cast<time_t>(at/1000); tm utc; if(!gmtime_r(&sec,&utc)) return false;
  int n=snprintf(out,size,"%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",utc.tm_year+1900,utc.tm_mon+1,utc.tm_mday,utc.tm_hour,utc.tm_min,utc.tm_sec,static_cast<int>(at%1000));
  return n>0 && static_cast<size_t>(n)<size;
}
void timeSynced(timeval* tv) {
  if(!tv) return;
  const uint32_t mono=millis();
  const int64_t utc=static_cast<int64_t>(tv->tv_sec)*1000+tv->tv_usec/1000;
  portENTER_CRITICAL(&clockMux);
  ntpClock.onCallback(mono,utc);
  portEXIT_CRITICAL(&clockMux); // No Serial/network/GPIO in lwIP callback.
}
bool pumpIsOn() { portENTER_CRITICAL(&pumpMux); bool on=pump->isOn(); portEXIT_CRITICAL(&pumpMux); return on; }
bool pumpConfirmedOff() { portENTER_CRITICAL(&pumpMux); bool off=pump->confirmedOff(); portEXIT_CRITICAL(&pumpMux); return off; }
void localOff(const char* reason) { portENTER_CRITICAL(&pumpMux); pump->forceOff(); portEXIT_CRITICAL(&pumpMux); pendingOffReason.store(reason); }

void safetyTask(void*) {
  for(;;) {
    const uint32_t now=millis();
    bool wifi=WiFi.status()==WL_CONNECTED;
    // EndMessage/SUBACK/connect may block. Independent task never waits for them.
    bool link=networkLeaseHealthy(now,lastNetworkProgress.load(),mqttReady.load());
    bool clockReady=reliableClock();
    portENTER_CRITICAL(&pumpMux);
    const char* reason=pump->tick(now,wifi,link);
    if(!pump->isOn() && !pump->confirmedOff()) pump->forceOff(); // Retry only LOW, never HIGH.
    if(pump->isOn() && !clockReady) { pump->forceOff(); reason="MQTT_LOST"; }
    if(reason && strcmp(reason,"MAX_RUNTIME")!=0) { mqttReady.store(false); resetTransport.store(true); }
    portEXIT_CRITICAL(&pumpMux);
    if(reason) { pendingOffReason.store(reason); safetyNotice.store(!clockReady?"CLOCK_UNSYNCED_FAILSAFE":reason); }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}
void sensorTask(void*) {
  uint32_t sequence=0;
  TickType_t previous=xTaskGetTickCount();
  for(;;) {
    vTaskDelayUntil(&previous,pdMS_TO_TICKS(TELEMETRY_INTERVAL_MS));
    Sample next; next.sequence=++sequence;
    const ClockSnapshot measured=clockSnapshot(&next.recordedAt);
    next.clockGeneration=measured.generation; // Measurement time/session, never publish time.
    next.temp=dht.readTemperature(); next.humidity=dht.readHumidity();
    if(!lightReady) lightReady=light.begin(BH1750::CONTINUOUS_HIGH_RES_MODE,0x23,&Wire); // One recovery attempt per cycle.
    next.lightInitialized=lightReady;
    next.lightDataReady=lightReady && light.measurementReady();
    next.lux=next.lightDataReady?light.readLightLevel():NAN;
    unsigned adc=0; next.minAdc=4095; next.maxAdc=0; next.adcValid=true;
    for(unsigned i=0;i<8;++i) {
      int reading=analogRead(SOIL_PIN);
      if(reading<0||reading>4095) next.adcValid=false;
      if(reading<next.minAdc) next.minAdc=reading;
      if(reading>next.maxAdc) next.maxAdc=reading;
      if(reading>=0&&reading<=4095) adc+=static_cast<unsigned>(reading);
    }
    next.rawAdc=next.adcValid?static_cast<int>(adc/8):-1;
    next.soil=soilPercent(next.rawAdc,SOIL_DRY_ADC,SOIL_WET_ADC);
    next.health=assessSensors(next,SOIL_DRY_ADC,SOIL_WET_ADC);
    next.valid=next.health.valid() && next.recordedAt!=0;
    portENTER_CRITICAL(&sensorMux); sensorSample=next; portEXIT_CRITICAL(&sensorMux);
  }
}

bool publishJson(const char* topic,const char* payload) {
  const uint32_t started=millis(); lastPublishFailure=nullptr; lastPublishDuration=0;
  if(WiFi.status()!=WL_CONNECTED || !mqtt.connected()) lastPublishFailure="DISCONNECTED";
  else {
    lastNetworkProgress.store(started);
    const size_t size=strlen(payload);
    if(!mqtt.beginMessage(topic,static_cast<unsigned long>(size),false,1)) lastPublishFailure="BEGIN_MESSAGE_FAILED";
    else if(mqtt.write(reinterpret_cast<const uint8_t*>(payload),size)!=size) lastPublishFailure="SHORT_WRITE";
    else if(mqtt.endMessage()!=1) lastPublishFailure="PUBACK_TIMEOUT_OR_FAILED";
  }
  lastPublishDuration=static_cast<uint32_t>(millis()-started);
  if(lastPublishFailure) {
    mqttReady.store(false); localOff(WiFi.status()==WL_CONNECTED?"MQTT_LOST":"WIFI_LOST"); resetTransport.store(true);
    Serial.printf("MQTT: publish FAILED (%s, %lu ms); fail-safe OFF requested\n",lastPublishFailure,static_cast<unsigned long>(lastPublishDuration));
    return false;
  }
  lastNetworkProgress.store(millis()); // Completion, not just start, is observed progress.
  if(lastPublishDuration>=200u) Serial.printf("MQTT: SLOW PUBACK %lu ms; 250 ms safety lease remains enforced\n",static_cast<unsigned long>(lastPublishDuration));
  return true; // Broker PUBACK only, not proof of backend storage, GPIO or water flow.
}
void sendOffState() {
  if(!reliableClock() || !pumpConfirmedOff()) return;
  const char* reason=pendingOffReason.exchange(nullptr);
  if(!reason) {
    if(!offStateSchedule.due(millis())) return;
    reason="PERIODIC";
  }
  char at[32],body[384];
  stateSyncInProgress=true;
  if(!formatUtc(utcNow(),at,sizeof(at)) || !stateJson(body,sizeof(body),DEVICE_CODE,ACTUATOR_CODE,reason,at) || !publishJson(stateTopic,body)) pendingOffReason.store(reason);
  else offStateSchedule.published(millis()); // Fresh UTC each publish, never replay a cached OFF.
  stateSyncInProgress=false;
}

void onCommand(int size) {
  const bool retained=mqtt.messageRetain()!=0;
  const bool topicMatches=mqtt.messageTopic()==commandTopic;
  if(size<=0 || static_cast<size_t>(size)>MAX_COMMAND_BYTES || !topicMatches || retained || mqtt.messageQoS()!=1) {
    Serial.println("COMMAND: wrong topic/QoS, retained or oversize; closing transport safely");
    localOff("MQTT_LOST"); mqttReady.store(false); resetTransport.store(true); network.stop(); return;
  }
  char payload[MAX_COMMAND_BYTES+1]; unsigned count=0; uint32_t start=millis();
  // Callback is never allowed to wait indefinitely for a fragmented packet.
  while(count<static_cast<unsigned>(size) && static_cast<uint32_t>(millis()-start)<100u) {
    int value=mqtt.read(); if(value>=0) payload[count++]=static_cast<char>(value); else vTaskDelay(pdMS_TO_TICKS(1));
  }
  if(count!=static_cast<unsigned>(size)) { localOff("MQTT_LOST"); mqttReady.store(false); resetTransport.store(true); network.stop(); return; }
  payload[count]='\0';
  Command command;
  if(!decodeCommand(payload,count,DEVICE_CODE,ACTUATOR_CODE,command)) { Serial.println("COMMAND: invalid strict v1 payload; no action/ACK"); return; }
  if(ackCount>=8) { localOff("MQTT_LOST"); resetTransport.store(true); Serial.println("COMMAND: ACK queue full; fail-safe OFF"); return; }
  const bool clock=reliableClock(); const int64_t now=utcNow();
  if(clock && sessionFloor==0) sessionFloor=now-static_cast<uint32_t>(millis()-sessionStarted);
  Context context{millis(),now,sessionFloor,clock,WiFi.status()==WL_CONNECTED,mqttReady.load() && !resetTransport.load()};
  portENTER_CRITICAL(&pumpMux);
  context.mqtt=commandTransportReady(mqttReady.load(),resetTransport.load(),stateSyncInProgress,command.on); // OFF sync cannot race a fresh ON.
  Decision decision=pump->apply(command,context);
  portEXIT_CRITICAL(&pumpMux);
  if(command.on && stateSyncInProgress) Serial.println("COMMAND: ON rejected while synchronizing OFF state");
  Serial.printf("COMMAND: %s %s %s\n",command.on?"ON":"OFF",decision.applied?"GPIO_APPLIED":"REJECTED",decision.reason?decision.reason:"");
  // Never publish inside MQTT callback: endMessage() calls poll() and can re-enter callbacks.
  char at[32];
  if(clock && formatUtc(decision.recordedAt,at,sizeof(at)) && ackJson(ackQueue[(ackHead+ackCount)%8].body,512,command,decision,DEVICE_CODE,ACTUATOR_CODE,at)) ++ackCount;
  else Serial.println("ACK: UTC unavailable, not inventing recordedAt; backend will time out");
  if(decision.reportOff) pendingOffReason.store("COMMAND");
}

int relayDiagnosticState() {
  portENTER_CRITICAL(&pumpMux);
  const int level=gpio_get_level(static_cast<gpio_num_t>(RELAY_PIN));
  const int state=pump->isOn()?(level==1?1:2):(pump->confirmedOff()&&level==0?0:2);
  portEXIT_CRITICAL(&pumpMux); return state;
}
const char* telemetryDiagnosticState(const Sample& sample) {
  if(telemetryDelivery.sent(sample.sequence)) return "SENT (BROKER_PUBACK; backend DB not verified)";
  if(!sample.health.valid()) return "SKIPPED_SENSOR_ERROR (all 4 readings required)";
  if(!sample.recordedAt) return "SKIPPED_NTP_AT_MEASUREMENT (timestamp not invented)";
  if(!reliableClock()) return "WAITING_NTP";
  if(!clockSampleEligible(sample.recordedAt,sample.clockGeneration,clockSnapshot())) return "SKIPPED_PRE_SYNC_GENERATION (wait new measurement)";
  if(!sampleFresh(utcNow(),sample.recordedAt)) return "SKIPPED_STALE_OR_FUTURE_MEASUREMENT";
  if(telemetryDelivery.failed(sample.sequence)) return "FAILED (PUBACK_UNCONFIRMED; delivery unknown, retry >=5s)";
  if(!LOCAL_CONFIG_PRESENT) return "NOT_SENT (CONFIG_MISSING)";
  if(WiFi.status()!=WL_CONNECTED) return "NOT_SENT (WIFI_DISCONNECTED)";
  if(!mqttReady.load()) return "NOT_SENT (MQTT_NOT_READY)";
  return "PENDING (not sent yet)";
}
void pollDiagnostics() {
  static int previousWifi=-1,previousMqtt=-1,previousNtp=-1,previousRelay=-1;
  static uint32_t printedSequence=0,printedSyncCount=0;
  const int wifiStatus=static_cast<int>(WiFi.status());
  const bool wifi=wifiStatus==WL_CONNECTED, link=mqttReady.load(), clock=reliableClock();
  const int relay=relayDiagnosticState();
  if(previousWifi!=wifiStatus) { Serial.printf("WiFi: %s (status=%d)\n",!LOCAL_CONFIG_PRESENT?"NOT_CONFIGURED":wifi?"CONNECTED":"DISCONNECTED",wifiStatus); previousWifi=wifiStatus; }
  if(previousMqtt!=static_cast<int>(link)) { Serial.printf("MQTT: %s\n",!LOCAL_CONFIG_PRESENT?"NOT_CONFIGURED":link?"CONNECTED (command QoS1 subscription ready)":"DISCONNECTED/NOT_READY"); previousMqtt=link; }
  const uint32_t count=clockSnapshot().callbacks;
  if(previousNtp!=static_cast<int>(clock)||printedSyncCount!=count) { char at[32]; const bool formatted=clock&&formatUtc(utcNow(),at,sizeof(at)); Serial.printf("NTP: %s%s%s\n",clock?"SYNCED":"NOT_SYNCED_OR_EXPIRED",formatted?" | UTC=":"",formatted?at:""); previousNtp=clock;printedSyncCount=count; }
  if(previousRelay!=relay) { Serial.printf("RELAY: %s (GPIO only, not motor/water feedback)\n",relay==1?"ON":relay==0?"OFF":"UNKNOWN/LOW_NOT_CONFIRMED"); previousRelay=relay; }
  const char* reason=safetyNotice.exchange(nullptr);
  if(reason) Serial.printf("FAILSAFE: %s | RELAY=%s | lease=250ms, max ON <=5s\n",reason,relay==0?"OFF":"CHECK_GPIO_AT_DEVICE");
  Sample sample; portENTER_CRITICAL(&sensorMux);sample=sensorSample;portEXIT_CRITICAL(&sensorMux);
  if(!sample.sequence || sample.sequence==printedSequence) return;
  printedSequence=sample.sequence;
  char at[32],report[1800];
  if(!formatUtc(sample.recordedAt,at,sizeof(at))) snprintf(at,sizeof(at),"UNAVAILABLE_AT_MEASUREMENT");
  DiagnosticStatus status{LOCAL_CONFIG_PRESENT,wifi,link,clock,ENABLE_PUMP_COMMANDS,relay,telemetryDiagnosticState(sample),at};
  if(formatSensorMonitor(report,sizeof(report),sample,status)) Serial.print(report);
  else Serial.println("DIAGNOSTICS: bounded report buffer too small; no truncated success claim");
}

bool makeTopics() {
  const char* suffix[]={"telemetry","status","commands/PUMP_01","command-acks/PUMP_01","actuator/state"};
  char* target[]={telemetryTopic,statusTopic,commandTopic,ackTopic,stateTopic};
  if(strcmp(DEVICE_CODE,"ESP32-GF-A-01")!=0 || strcmp(ACTUATOR_CODE,"PUMP_01")!=0) return false; // Bound to this reviewed hardware/contract.
  for(unsigned i=0;i<5;++i) { int n=snprintf(target[i],192,"%s/devices/%s/%s",TOPIC_PREFIX,DEVICE_CODE,suffix[i]); if(n<=0||n>=192) return false; }
  return true;
}
// Dedicated low-priority worker: DNS/SNTP diagnostics never block sensor/Arduino MQTT loop or safetyTask.
void sntpRecoveryTask(void*) {
  SntpRetry retry;
  uint32_t logged=0,seenCallbacks=0; bool pendingReconnect=false;
  for(;;) {
    const uint32_t mono=millis(); const ClockSnapshot state=clockSnapshot();
    const bool wifi=WiFi.status()==WL_CONNECTED;
    const bool running=esp_sntp_enabled();
    const bool reconnectEvent=ntpWifiReconnect.exchange(false);
    pendingReconnect=pendingReconnect||reconnectEvent;
    if(state.callbacks!=seenCallbacks) {
      seenCallbacks=state.callbacks; pendingReconnect=false;
      const char* empty=nullptr; pendingOffReason.compare_exchange_strong(empty,"PERIODIC"); // Never overwrite MAX_RUNTIME/COMMAND/loss.
    }
    if(retry.due(mono,wifi,running,pumpIsOn(),state,pendingReconnect)) {
      pendingReconnect=false;
      esp_sntp_set_sync_interval(SNTP_REFRESH_MS);
      bool restarted=esp_sntp_restart();
      if(!restarted) esp_sntp_init(); // Same preconfigured hosts; no guessed UTC or manual clock set.
      Serial.printf("SNTP: recovery request restart=%s running=%s attempt=%u wait_ms=%lu reason=%s\n",restarted?"true":"false",esp_sntp_enabled()?"true":"false",retry.attempts(),static_cast<unsigned long>(retry.waitMs(millis())),clockReasonText(state.reason));
      // DNS result is diagnostic only: success does not prove UDP123 reply or sync callback.
      for(unsigned i=0;i<2;++i) {
        IPAddress address; const bool resolved=Network.hostByName(NTP_HOSTS[i],address)==1;
        Serial.printf("SNTP DNS: host=%s result=%s (not proof of NTP response)\n",NTP_HOSTS[i],resolved?"RESOLVED":"FAILED");
      }
    }
    if(static_cast<uint32_t>(mono-logged)>=30000u) {
      logged=mono;
      Serial.printf("SNTP: running=%s interval_ms=%lu millis=%lu callback_count=%lu last_callback_age_ms=%lu clock=%s reason=%s retry_wait_ms=%lu wifi=%s\n",running?"true":"false",static_cast<unsigned long>(esp_sntp_get_sync_interval()),static_cast<unsigned long>(mono),static_cast<unsigned long>(state.callbacks),static_cast<unsigned long>(state.age),state.reliable?"RELIABLE":"BLOCKED",clockReasonText(state.reason),static_cast<unsigned long>(retry.waitMs(mono)),wifi?"CONNECTED":"DISCONNECTED");
    }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
void setup() {
  // First hardware action. Software cannot prevent all boot/reset electrical glitches.
  gpio_set_level(static_cast<gpio_num_t>(RELAY_PIN),0);
  gpio_set_direction(static_cast<gpio_num_t>(RELAY_PIN),GPIO_MODE_INPUT_OUTPUT);
  gpio_set_level(static_cast<gpio_num_t>(RELAY_PIN),0);
  Serial.begin(115200);
  static PumpController controller(writeRelay,ENABLE_PUMP_COMMANDS,MAX_PUMP_SECONDS); pump=&controller;
  Serial.printf("BOOT: GPIO26 LOW requested; physical pump commands %s\n",ENABLE_PUMP_COMMANDS?"ENABLED":"DISABLED");
  Serial.printf("DEVICE: Smart Agriculture ESP32 DevKit V1 | %s | firmware %s\n",DEVICE_CODE,SMART_AGRI_FIRMWARE_VERSION);
  Serial.printf("PINS: DHT22=%u, BH1750 SDA=%u SCL=%u, LM393 AO=%u, relay=%u (HIGH ON / LOW OFF)\n",DHT_PIN,I2C_SDA_PIN,I2C_SCL_PIN,SOIL_PIN,RELAY_PIN);
  Serial.printf("SOIL: dry=%d wet=%d, ADC=12bit; sample interval=%u ms\n",SOIL_DRY_ADC,SOIL_WET_ADC,TELEMETRY_INTERVAL_MS);
  Serial.printf("RELAY: %s (GPIO only; not relay/motor/flow feedback)\n",pumpConfirmedOff()?"OFF":"UNKNOWN/LOW_NOT_CONFIRMED");
  Serial.printf("WiFi: %s | MQTT: DISCONNECTED | NTP: WAITING_FOR_SYNC\n",LOCAL_CONFIG_PRESENT?"STARTING":"NOT_CONFIGURED");
  topicsReady=makeTopics();
  Wire.begin(I2C_SDA_PIN,I2C_SCL_PIN); Wire.setTimeOut(50);
  lightReady=light.begin(BH1750::CONTINUOUS_HIGH_RES_MODE,0x23,&Wire);
  Serial.printf("BH1750: %s; DHT22: initialized, first measurement pending\n",lightReady?"INITIALIZED":"INIT_FAILED (will retry once per sensor cycle)");
  dht.begin(); analogReadResolution(12); analogSetPinAttenuation(SOIL_PIN,ADC_11db);
  BaseType_t safety=xTaskCreatePinnedToCore(safetyTask,"pump-safety",4096,nullptr,4,nullptr,0);
  BaseType_t sensors=xTaskCreatePinnedToCore(sensorTask,"sensor-reader",4096,nullptr,1,nullptr,1);
  tasksReady=safety==pdPASS && sensors==pdPASS && pumpConfirmedOff();
  if(!tasksReady || !topicsReady) {
    localOff("BOOT");
    Serial.printf("FATAL: safetyTask=%s sensorTask=%s topics=%s GPIO_LOW=%s; HIGH inhibited, check device locally\n",safety==pdPASS?"READY":"FAILED",sensors==pdPASS?"READY":"FAILED",topicsReady?"READY":"INVALID",pumpConfirmedOff()?"CONFIRMED":"UNCONFIRMED");
    return;
  }
  network.setConnectionTimeout(1000);
  mqtt.setId(MQTT_CLIENT_ID); mqtt.setUsernamePassword(MQTT_USERNAME,MQTT_PASSWORD);
  mqtt.setCleanSession(true); mqtt.setKeepAliveInterval(5000); mqtt.setConnectionTimeout(1000);
  mqtt.onMessage(onCommand);
  mqtt.beginWill(statusTopic,false,1); mqtt.print(OFFLINE); mqtt.endWill();
  esp_sntp_set_time_sync_notification_cb(timeSynced);
  // Set BEFORE configTime/sntp_init so the first refresh timer uses the reviewed interval.
  esp_sntp_set_sync_interval(SNTP_REFRESH_MS);
  configTime(0,0,NTP_HOSTS[0],NTP_HOSTS[1]);
  Serial.printf("SNTP INIT: hosts=%s,%s interval_ms=%lu expiry_ms=%lu running=%s\n",NTP_HOSTS[0],NTP_HOSTS[1],static_cast<unsigned long>(esp_sntp_get_sync_interval()),static_cast<unsigned long>(CLOCK_EXPIRY_MS),esp_sntp_enabled()?"true":"false");
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true);
  WiFi.onEvent([](WiFiEvent_t) { mqttReady.store(false); localOff("WIFI_LOST"); resetTransport.store(true); },ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  WiFi.onEvent([](WiFiEvent_t) { ntpWifiReconnect.store(true); },ARDUINO_EVENT_WIFI_STA_GOT_IP);
  const BaseType_t timeTask=xTaskCreatePinnedToCore(sntpRecoveryTask,"sntp-recovery",6144,nullptr,1,nullptr,0);
  if(timeTask!=pdPASS) Serial.println("SNTP: recovery worker FAILED; normal lwIP refresh remains, clock guard unchanged");
  if(LOCAL_CONFIG_PRESENT) WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  else Serial.println("CONFIG: create config.local.h; example build does not connect to any network");
}
void loop() {
  static uint32_t lastWifiAttempt=0,lastMqttAttempt=0,lastStatus=0;
  pollDiagnostics();
  if(!tasksReady || !topicsReady || !LOCAL_CONFIG_PRESENT) { if(pump) localOff("BOOT"); vTaskDelay(pdMS_TO_TICKS(50)); return; }
  if(resetTransport.exchange(false)) { mqttReady.store(false); localOff(WiFi.status()==WL_CONNECTED?"MQTT_LOST":"WIFI_LOST"); network.stop(); ackCount=0; ackHead=0; }
  if(WiFi.status()!=WL_CONNECTED) {
    mqttReady.store(false); localOff("WIFI_LOST");
    if(static_cast<uint32_t>(millis()-lastWifiAttempt)>=10000u) { lastWifiAttempt=millis(); WiFi.reconnect(); }
    vTaskDelay(pdMS_TO_TICKS(5)); return;
  }
  if(!mqtt.connected()) {
    mqttReady.store(false); localOff("MQTT_LOST");
    if(static_cast<uint32_t>(millis()-lastMqttAttempt)>=5000u) {
      lastMqttAttempt=millis(); ackCount=0; ackHead=0; // Never replay any old ACK or ON after reconnect.
      if(mqtt.connect(MQTT_HOST,MQTT_PORT)) {
        sessionStarted=millis(); sessionFloor=reliableClock()?utcNow():0;
        localOff(firstConnection?"BOOT":"MQTT_LOST");
        sendOffState();
        bool birth=publishJson(statusTopic,ONLINE);
        bool subscribed=birth && mqtt.subscribe(commandTopic,1)==1 && mqtt.subscribeQoS()==1;
        if(subscribed && !resetTransport.load()) { firstConnection=false; lastNetworkProgress.store(millis()); mqttReady.store(true); lastStatus=millis(); Serial.println("MQTT: authenticated, command subscription QoS1 restored; pump stays OFF"); }
        else { localOff("MQTT_LOST"); resetTransport.store(true); }
      } else Serial.printf("MQTT: connect failed (code %d), retry scheduled with pump OFF\n",mqtt.connectError());
    }
    vTaskDelay(pdMS_TO_TICKS(5)); return;
  }
  lastNetworkProgress.store(millis()); mqtt.poll();
  if(!mqtt.connected()) { mqttReady.store(false); localOff("MQTT_LOST"); resetTransport.store(true); return; }
  if(resetTransport.load()) return;
  // ACK priority over status/telemetry; callbacks may append but cannot overwrite this local copy.
  if(ackCount) { AckMessage message=ackQueue[ackHead]; ackHead=(ackHead+1)%8; --ackCount; publishJson(ackTopic,message.body); }
  if(resetTransport.load()) return;
  sendOffState();
  // Probe broker round-trip while ON, not just TCP socket state (silent network partitions).
  const uint32_t statusInterval=pumpIsOn()?200u:STATUS_INTERVAL_MS;
  if(static_cast<uint32_t>(millis()-lastStatus)>=statusInterval) { lastStatus=millis(); publishJson(statusTopic,ONLINE); }
  if(resetTransport.load()) return;
  Sample sample; portENTER_CRITICAL(&sensorMux); sample=sensorSample; portEXIT_CRITICAL(&sensorMux);
  if(sample.sequence && sample.valid && clockSampleEligible(sample.recordedAt,sample.clockGeneration,clockSnapshot()) && sampleFresh(utcNow(),sample.recordedAt) && telemetryDelivery.due(sample.sequence,millis())) {
    char at[32],body[512];
    telemetryDelivery.begin(sample.sequence,millis());
    if(formatUtc(sample.recordedAt,at,sizeof(at)) && telemetryJson(body,sizeof(body),DEVICE_CODE,at,sample.temp,sample.humidity,sample.lux,sample.soil)) {
      const bool puback=publishJson(telemetryTopic,body);
      telemetryDelivery.finish(sample.sequence,puback);
      Serial.printf("TELEMETRY #%lu: %s | recordedAt=%s | publish=%lu ms%s%s\n",static_cast<unsigned long>(sample.sequence),puback?"SENT (BROKER_PUBACK; backend DB not verified)":"FAILED (PUBACK_UNCONFIRMED; delivery unknown, retry >=5s; same timestamp)",at,static_cast<unsigned long>(lastPublishDuration),lastPublishFailure?" | ":"",lastPublishFailure?lastPublishFailure:"");
    } else { telemetryDelivery.finish(sample.sequence,false); Serial.printf("TELEMETRY #%lu: SKIPPED_PAYLOAD_FORMAT_FAILED; retry bounded >=5s\n",static_cast<unsigned long>(sample.sequence)); }
  }
  vTaskDelay(pdMS_TO_TICKS(5));
}
