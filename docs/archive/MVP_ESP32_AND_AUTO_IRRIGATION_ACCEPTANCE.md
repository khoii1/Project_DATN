# Real ESP32 E2E & Automatic Irrigation — Technical Acceptance

**Ngày:**29/10/2026, UTC+7. **Software baseline:**MVP_DEV_SOFTWARE_ACCEPTED, không chạy lại acceptance software đã đạt.  
**Phạm vi:** read-only MQTT/Serial evidence, DEV ingestion và tests không tác động bơm. Không production, migration, flash, Wi-Fi/credential change hoặc ON/OFF.  
**Run đã kết thúc:** C:/DATN/test-instances/phase13-3b/mvp-iot-1793272544965-b56ccf.

> **Kết quả phiên thực thi:** BLOCKED tại MQTT_READ_PREFLIGHT. Bắt đầu 2026-10-29T11:41:35.066Z (18:41:35 UTC+7), SUBACK lúc 11:41:36.074Z; dừng lúc 11:42:01.199Z với `DEADLINE_FRESH_PHYSICAL_TELEMETRY`. Credentials được operator nhập tại máy; không lưu lại hoặc tự retry. TEST PostgreSQL, backend DEV và frontend chưa khởi động; không đăng ký thiết bị hoặc ghi readings. MQTT observer đã đóng.

Evidence: `C:/DATN/test-instances/phase13-3b/mvp-iot-1793272544965-b56ccf/summary.json`, `execution.attempt.json`, `mqtt-observations.json`. File observations là mảng rỗng **sau bộ lọc**, không phải bằng chứng không có raw MQTT packet: observer hiện không ghi counters cho packet bị bỏ qua. Chưa phân biệt được ACL delivery, sai publisher/topic/payload hoặc bộ lọc observer. Không kết luận firmware lỗi hay backend ingestion lỗi từ timeout này.

## A. Hardware/firmware identity

Operator đã xác nhận ESP32 chỉ cấp USB, nguồn bơm ngắt và Serial Monitor đang mở. Agent không mở COM, không nhấn EN/reset và không flash. Windows nhận Silicon Labs CP210x USB-to-UART **COM3/OK**; USB bridge không tự chứng minh chip revision/hash firmware đang chạy.

Source firmware khai báo **13.4F.1**. Source ino SHA256: **ba6a4f5ad30bd655ae442411376e701e6d9928aba98adf82c9e6ea1a37c6aa50**. Artifact hotfix lịch sử vẫn có SHA256 **D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A**; không đọc lại flash để chứng minh binary này đang chạy hiện tại.

Whitelist cấu hình cục bộ: MQTT172.20.10.2:1883,deviceESP32-GF-A-01,actuatorPUMP_01,ENABLE_PUMP_COMMANDS=true. DHT22GPIO4,BH1750SDA21/SCL22,LM393AO34,relayGPIO26 theo source/macros. Không xuất config.local.h hoặc credentials. Firmware hard cap5s; giới hạn bench backend1s, Commands/Automation giữfalse, mọi MQTT application publish bị chặn ở transport bench.

Serial operator cung cấp — **LIVE_HARDWARE_VERIFIED qua quan sát operator**, không phải dữ liệu DB đã xác minh:

| Thuộc tính | Giá trị |
|---|---|
| Frame | SENSOR MONITOR #800 |
| recordedAt |2026-10-29T10:57:50.224Z |
| TEMP_01 |33.50°C |
| HUM_01 |61.20% |
| LIGHT_01 |2.50lux |
| SOIL_RAW_ADC |4095, min=max4095, ADC_AT_RAIL |
| SOIL_01 |0.00% sau clamp |
| Wi-Fi/MQTT/NTP |CONNECTED/CONNECTED/SYNCED |
| PUMP_COMMANDS / relay |ENABLED / OFF(GPIO only) |
| Telemetry |SENT/BROKER_PUBACK,129ms; không chứng minh DB |
| SNTP |running=true,interval1800000ms,callbacks5,lastCallbackAge1096149ms,clockRELIABLE,reasonOK |

**SOIL quality BLOCKED:** raw4095 là ADC rail, không được dùng phần trăm0 để kết luận đất khô hoặc kích hoạt tưới. Có thể là tín hiệu/đấu dây/saturation/calibration; chưa đủ kết luận cảm biến hỏng. Source dùng dry3500/wet1507 và clamp0..100, đây là hiệu chuẩn tương đối lịch sử, không phải độ ẩm thể tích chuẩn. Không thay calibration để ép PASS.

Source: [firmware ino](firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino), [protocol/controller](firmware/SmartAgricultureESP32/PumpProtocol.h), [SNTP recovery](firmware/SmartAgricultureESP32/SntpRecovery.h), [soil quality policy](backend/src/services/live-readiness/soil-quality.ts).

## B. Fresh sensor readings

Serial mới do operator cung cấp: frame **#976**, recordedAt **2026-10-29T11:41:50.356Z**, nằm trong cửa sổ observer. TEMP_01=33.60°C, HUM_01=64.30%, LIGHT_01=2.50 lux, SOIL_01=0.00%; raw ADC min=max=4095, `ADC_AT_RAIL`. WiFi/MQTT CONNECTED, NTP SYNCED, PUMP_COMMANDS ENABLED, relay OFF(GPIO). PUBACK 126ms là bằng chứng operator quan sát broker acknowledgement, chưa phải ingestion/DB/API.

SNTP callback_count tăng từ5 ở #800 lên7 ở #976; last_callback_age_ms=208839, interval_ms=1800000, clock=RELIABLE/reason=OK. Đây là bằng chứng callback tiếp tục xảy ra qua hai snapshot operator; chưa chứng minh chính xác lịch30phút hay recovery sau outage. Không mở COM hoặc reset board.

**Chưa nghiệm thu3batches/12rows tại snapshot này.** Serial mới chỉ chứng minh một frame và PUBACK. Không dùng41readingsSIMULATOR trong DEV hoặc telemetry lịch sử thay bằng chứng hardware.

Mục tiêu sau credential/preflight: nhận đúng bốn sensor, sourceMQTT, timestamps mới; so payload non-retained/nonduplicate với DB IDs/value/recordedAt/receivedAt, không chèn payload giả.

## C. MQTT session & QoS

**CONNECT/SUBACK: PASS; message delivery/validation: NOT_VERIFIED.** Session clean, clientID riêng, reconnectPeriod=0, ba subscription được grant QoS1. Không nhận được bản tin qua bộ lọc để nghiệm thu QoS/retained/duplicate thực tế. SUBACK không chứng minh quyền đọc thực tế hay delivery của mọi topic. Không sửa broker/ACL hoặc tự dùng account khác.

Snapshot sau phiên thấy broker LAN PID20532 bind0.0.0.0/::1883 và client172.20.10.3 kết nối; broker riêng PID4572 bind127.0.0.1/::1:1883. Observer đã dùng địa chỉ LAN172.20.10.2, không loopback. Không đồng nhất TCP client với identity ESP32 đã xác thực. Executable/config/ACL thực của broker chưa được đọc xác minh trong phiên này.

Read-only metadata: PC Wi-Fi **172.20.10.2** khớp source MQTT_HOST. LAN1883 listen0.0.0.0/::PID20532, broker loopbackPID4572 tồn tại riêng. Có TCP established từ172.20.10.3 tớiLANbroker; TCP không tự chứng minh identity ESP32 hoặc backend subscribe. Không đọc passwordfile, production.env, sửa ACL hoặc restart broker.

Chuẩn bị subscriber chỉ đọc đúng ba topic:

```text
smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry
smart-agriculture/v1/devices/ESP32-GF-A-01/status
smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
```

Client IDs bench riêng, không dùng ESP32 clientID. QoS1 subscription, không retained replay làm freshness. Credential operator nhập local, truyền anonymous pipe trong memory; không lưu plaintext hoặc đưa vào CLI/log/report. Đã kết nối thử đúng một phiên rồi đóng sau timeout; không tự retry.

Transport bench từ chối **mọi publish**, gồm cả OFF, và chỉ cho các subscription trên. Backend wildcard được thu hẹp về ESP32 đã xác minh, không thay wire schema hoặc production source. [Transport](scripts/mvp-iot-transport.cjs), [entrypoint](scripts/mvp-iot-backend.cjs), [runner](scripts/mvp-iot-session.cjs), [local handoff](scripts/mvp-iot-launch.ps1).

## D. PostgreSQL/API/UI correlation

Target duy nhất được phép nếu preflight đạt: existing TESTPGDATA C:/DATN/test-instances/phase13-3b/data,systemID7698826681383327460,DBsmart_agriculture_mvp_dev:55433,backend55001,frontend55173. Không5432/5000, khôngprovisioning/migration/reset.

Đăng ký identity ESP32 thật trong farm/zone DEV riêng chỉ sau operator ownership/Serial và freshMQTT corroboration; không copy production rows, không giả ESP32 cho simulation. Sensor source hardware phảiMQTT. Runtime guardfalse cho Commands/Automation,testModetrue/cap1 và publish-block độc lập. Chưa có đăng ký hoặc startup mới tại snapshot này.

DB/API/UI live **NOT_VERIFIED**. Không suy Serial PUBACK → PostgreSQL hoặc MQTT source → verified publisher. Dashboard sẽ chọn farm/zone real riêng để không lẫn fixturesSIMULATOR.

## E. Presence and periodic OFF

Serial relayOFF chỉ là GPIO, không feedback motor/nước. **3freshPERIODIC_OFF và runtimeONLINE/DB/API/UI còn NOT_VERIFIED**.

Yêu cầu observer: OFF sau session start, non-retained/nonduplicate, timestamp mới, đúngPUMP_01; không lấyOFF cũ/MOCK hoặc publishOFF giả. Không gửiON để tạoOFF, không gây outage/reset để thửOFFLINE khi chưa có điều phối riêng.

## F. Automatic decision tests

Kiến trúc có ba phần tách biệt:

1. **AUTOMATION_IMPLEMENTED_BUT_DISABLED:** legacy AutomationRule evaluator có thresholds/hysteresis/watermark/cooldown/manual override và command gates. Không có one-shot arming bench được nghiệm thu; không tự bật flags.
2. **SHADOW_ONLY:** pure decideIrrigation/advanceShadowCycle không gửi MQTT/DeviceCommand. Fixture trust flags là synthetic, không nâng dữ liệu live lênVERIFIED_LIVE.
3. Trust/quality/persistence readiness chưa nối dispatcher physical an toàn; assessLiveReadiness luônverifiedLiveReady=false/engineCalled=false cho điều khiển hiện tại. SoilQualityProposal chưaapproved/calibrated; legacy evaluator không tự có rawADC quality proof từ telemetryv1.

Kết quả phần mềm đã thực thi riêng, không cộng thành một tổng test mới:

| Suite | Actual | Phạm vi |
|---|---|---|
| shadow-irrigation + mqtt-pump + device-presence |159/159PASS |Closed graph/offline network guard; mocks, không DB/MQTT thật |
| live-readiness |98/98PASS |Publisher/soil/session/clock gates fail-closed; không nâng trust |
| Selected decision scenarios |17/17PASS |Fixture synthetic; JSON reasoncodes/timestamp ởoffline-decision-cases.json; chồng một phần159tests |
| Pump controller C++ host |36/36PASS |GPIO function giả trong chương trình host, khôngCOM/flash/hardware |
| Bench read-only transport |2/2PASS |Cấm mọi publish, thu hẹp subscription, không network |

Các scenario có reasoncodes thực:dry→WOULD_ON/SOIL_BELOW_THRESHOLD;wet→WOULD_SKIP/SOIL_MOISTURE_SUFFICIENT;hysteresis→HYSTERESIS_IDLE;stale→STALE_READING;invalid/missing→SNAPSHOT_INVALID;offline→DEVICE_NOT_ONLINE;unknownactuator→PUMP_STATE_UNKNOWN;cooldown→COOLDOWN_ACTIVE;duplicate→DUPLICATE_READING;lostcycle/restart→CYCLE_STATE_UNTRUSTED;clock/expiry→CLOCK_UNKNOWN/CLOCK_SNAPSHOT_STALE;emergencyStop→EMERGENCY_STOP;retained/untrustedpublisher/runtime>1s bị chặn.

Test fixtureMQTT trust không phải hardware evidence. TestON trên C++host chỉ gọi hàm pin giả, không gửiON thật. Không thay số đo soil thật để lấy quyết định dryPASS. File JSON chọn17case ghi rõSHADOW_ONLY_SYNTHETIC_INPUT.

## G. Physical pump acceptance

**AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED.** Chưa có riêng operator approval cho chu trình physical trong phiên này; đồng thời không đạt safety gate do ADCrail/soilquality và thiếu one-shot arming/live-trust contract được nghiệm thu.

Không cấp adapter, không MQTTON/OFF, không tăng thời lượng, không ACTIVE. Không dùng manualpump hoặcSHADOW làm physicalautomaticPASS. Không có video/quan sát motor/nước mới; PHYSICAL_FLOW_NOT_VERIFIED.

## H. Fault handling and watchdog

Source và tests offline kiểm tra:bootLOW,OFFpriority,retained/expiry/duplicate/session/reboot guards,monotonicruntime,milliswrap,250msnetworklease,clockfail,GPIOwrite/readbackfault,cachefullfailclosed,ACKtimeout không thành công.36hostcasesPASS nhưng không thay phép đo thời gian GPIO hoặc thử outage vật lý.

Không tạo outage, reset board, restart broker hoặc phát command fault trên phần cứng. SNTP log operator cócallbacks5/currentRELIABLE; chưa đo riêng nhiều mốc callback đúngchu kỳ30phút hoặc outage recovery thực trong phiên.

Windows Time read-only snapshot:Leap0,Stratum5,source time.windows.com0x8,LastSyncError0,StateSync,PhaseOffset−27.336ms. Khôngresync/sửaWindowsTime; một snapshot không phải nghiệm thu ổn định dài hạn hoặc clock-health command authorization.

## I. Safety/cleanup

Sau phiên: MQTT observer đã connect, subscribe rồi đóng bình thường; DEV không start do MQTT preflight chưa đạt. Commands/Automation trong bench source mặc địnhfalse, publish-block độc lập; không có runtime DEV để tuyên bố flags runtime đã được xác minh. Adapter nguồn bơm giữ ngắt theo operator. Không tác động production/broker/ESP32.

Cửa sổ credential/launcher đã kết thúc. `monitorClose=CLOSED`, `clusterDisposition=NOT_STARTED`; snapshot sau phiên không có listener55433/55001/55173. Không tạo DeviceCommand hoặc thao tác DB nên không có command mới từ phiên này. Không truy vấn production để tuyên bố PENDING production=0; PENDING runtime DEV cũng chưa được đọc trong phiên này. Broker/Serial Monitor của operator giữ nguyên, evidence không ghi đè, không retry/fallback production.

## J. Remaining blockers

1. MQTT credential đã nhập, CONNECT/SUBACK thành công nhưng chưa có telemetry hợp lệ trong25giây. Cần đối chiếu quyền **read** của tài khoản trên đúng ba topic ở LAN broker (tài khoản thiết bị có quyền publish chưa chắc có read), đồng thời bổ sung counters/redacted rejection reasons cho observer trước phiên tiếp theo để phân biệt ACL/no-delivery với payload bị bỏ qua. Chưa có bằng chứng để khẳng định ACL là nguyên nhân. Không lấy secrets từ productionconfig hoặc tự sửa account/ACL.
2. Chưa đủ3batch/12readings và3freshOFF/DB/API/UI hiện tại; phải có evidence mới để nâng E2E.
3. SoilADCrail4095: cần operator kiểm tra tín hiệu/wiring theo sơ đồ hiện có và đánh giá rawADC/calibration; không tự đổi hệ số.
4. Physicalautomatic cần one-shot arming/cancel, trustedlivequality/session/time, no-retry/expiry/duration/OFF contract và xác nhận operator riêng; chưaready.
5. Running firmwarehash/boardrevision và publisherprincipal chưa độc lập xác minh, không nângVERIFIED_LIVE từ source/binary lịch sử.

## K. Final verdict — kết thúc phiên, không tự retry

- **ESP32_LIVE_E2E_PARTIAL**: Serial/Wi-Fi/MQTT/NTP operator evidence; DB/API/UI mới chưa nghiệm thu.
- **AUTO_IRRIGATION_DECISION_PARTIAL**: SHADOW_ONLY software casesPASS; realsoil quality/readinessBLOCKED.
- **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**.
- **PROJECT_NOT_READY_FOR_DEFENSE**; softwareDEVacceptance trước đó được giữ.

Không mở rộngphầncứng hoặc chuyểnphase chỉ vì các tests mô phỏngPASS. Không Word/PDF/slide.

## MQTT READ DIAGNOSTICS — phiên mới được phê duyệt 29/10/2026

### A–B. Firmware publish và subscriber

Source `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino:259` dựng topic từ TOPIC_PREFIX/deviceCode; header cấu hình hiện tại đã đối chiếu trong memory, chỉ xuất MATCH=true cho host172.20.10.2, deviceESP32-GF-A-01 và prefixsmart-agriculture/v1. Không xuất nội dung header/secrets.

Publish/subscribe cùng đúng ba topic: `smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry`, `/status`, `/actuator/state`. `publishJson()` tại ino:147 dùng beginMessage(...,false,1): retain=false, QoS1. `PumpProtocol.h:129–133` serialize schemaVersion số1, deviceCode, recordedAt ISO UTC, readings gồm sensorCode/value; state dùng actuatorCode/state/reason/recordedAt. Observer cũ mong đợi cùng cấu trúc; chưa chứng minh mismatch wire/source.

Parser mới `scripts/mvp-mqtt-read-diagnostics.cjs` đếm raw ngay đầu callback trước mọi filter, chỉ log metadata whitelist và reason code cố định. UTF8 fatal/JSON/strict keys/4sensorCodes duy nhất/device/schema/QoS1/time/retained/duplicate được phân loại độc lập. Date.parse so epoch milliseconds, chấp nhận timezone offset tương đương UTC; sample phải mới sau session start, age≤30s, future≤2s. Không thay timestamp guard firmware/backend. Counter SCHEMA_VALID mô tả shape trước các freshness gates; không đồng nghĩa ACCEPTED.

### C–E. Session và counters

Run mới: `C:/DATN/test-instances/phase13-3b/mvp-mqtt-read-1793274621728-6d6f63`. `plan.json` pin hash approval/source/launcher; attempt và outcome create-new. Session mới tối đa90giây, clean=true, clientID riêng, reconnectPeriod=0; publish-block reuse được kiểm thử, không app publish kể cả OFF. Không import hoặc start DEV/backend/Prisma/COM. Metadata không chứa nguyên payload, unknown topic/device/string/error không được phản chiếu; observations accepted chỉ có sensorCode/value/unit và metadata đã kiểm tra.

**OFFLINE_PASS:** 18/18 tests thực thi exit0 với `node --require ./scripts/acceptance-offline-guard.cjs --test scripts/mvp-mqtt-read-diagnostics.test.cjs scripts/mvp-iot-transport.test.cjs` (16 diagnostic +2 transport). Có valid/zero, malformed JSON/UTF8, wrongtopic/device/schema, retained, packetdup/logicaldup, stale/future/seconds, UTC+7 tương đươngUTC, PERIODIC_OFF, no-message-vs-filtered verdict, oversize, no secret reflection. Node syntax và PowerShell AST PASS. Đây là synthetic, chưa chứng minh live delivery.

### F–G. Serial và live observations

**Phiên đã thực hiện đúng một lần:** bắt đầu2026-10-29T11:52:25.016Z (18:52:25 UTC+7), CONNACK returnCode0/sessionPresentfalse lúc11:52:25.348Z. Ba SUBACK grantQoS1 cho đúng ba topic. Kết thúc11:53:55.354Z, elapsed90338ms gồm connect/cleanup; observation timer90giây, không retry. `stopReason=OBSERVATION_90_SECOND_LIMIT`, `close=CLOSED`.

| Counter | Thực tế |
|---|---:|
| MQTT_CONNECTIONS |1|
| SUBACK_GRANTED |3|
| MQTT_MESSAGES_RECEIVED_RAW |0|
| TELEMETRY_TOPIC_MATCH / STATUS_TOPIC_MATCH / ACTUATOR_STATE_TOPIC_MATCH |0 / 0 / 0|
| TOPIC_MISMATCH |0|
| PAYLOAD_DECODE_SUCCESS / PAYLOAD_DECODE_FAILED |0 / 0|
| SCHEMA_VALID / SCHEMA_INVALID / DEVICE_ID_MISMATCH |0 / 0 / 0|
| TIMESTAMP_INVALID_OR_STALE |0|
| RETAINED_REJECTED / DUPLICATE_REJECTED / OTHER_REJECTED |0 / 0 / 0|
| TELEMETRY_ACCEPTED / PERIODIC_OFF_ACCEPTED |0 / 0|

`metadata.json=[]`, `accepted-whitelist.json=[]`. Vì raw counter được tăng trước mọi filter, **không có bản tin application được chuyển tới callback trong phiên này**; không phải payload bị JSON/schema/time/duplicate filter loại trong phiên mới. Không có rejection reason vì không có message để validate. Chưa xác minh actual broker config/read ACL/publisherprincipal nên chưa kết luận ACL lỗi hoặc publisher đang dùng topic khác.

Operator Serial #1020: recordedAt2026-10-29T11:52:50.356Z nằm trong chính cửa sổ observer; TEMP33.70°C,HUM64.60%,LIGHT2.50lux,SOIL0.00%,rawADC4095. WiFi/MQTT/NTP CONNECTED/CONNECTED/SYNCED, PUMP_COMMANDS ENABLED, GPIO relayOFF, brokerPUBACK76ms. Đây là corroboration publish tại broker theo Serial, không thay bằng chứng delivery tới subscriber/DB/API. Không có3batch/12reading MQTT để đối chiếu; freshnessNOT_VERIFIED.

Sau phiên, LAN PID20532 vẫn listen0.0.0.0/::1883, có connection172.20.10.3:58449. LoopbackbrokerPID4572 tồn tại riêng tại127.0.0.1/::1:1883; observer dùngLAN172.20.10.2. Read-only Win32_Process củaPID20532 trả ExecutablePath/CommandLine không khả dụng dưới quyền hiện tại; **actual config/log path/ACL NOT_VERIFIED**. Không suy log hoặc ACL mẫu trong repository là cấu hình đang chạy.

### H–J. Soil, safety và verdict

`SOIL_QUALITY_BLOCKED_ADC_AT_RAIL` giữ nguyên theo Serial4095; 0% chưa đủ tin cậy cho tưới. Operator kiểm tra AO/GPIO34, nguồn/mass/calibration riêng khi điện an toàn; agent không đổi calibration/firmware. Không start DEV hoặc truy cập production; không sửa broker/ACL/passwordfile/Wi-Fi; không ON/OFF/automation/pump power. Chưa đọc broker log thực nên quyền delivery chưa được chứng minh độc lập bằng ACL.

**Kết luận phiên mới: `MQTT_READ_DIAGNOSTICS_PARTIAL` / `MQTT_DELIVERY_NOT_OBSERVED`.** Diagnostic offline và connect/suback có bằng chứng, nhưng chưa unblock MQTTread. Giữ `ESP32_LIVE_E2E_PARTIAL`, `AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED`; không nâng PROJECT_READY_FOR_DEFENSE.

Cleanup: observerNodePID1996 và launcherPID14016 đã kết thúc; không còn observer established connection, chỉ TimeWait sau đóng. Không listener55433/55001/55173; không startDEV/backend/database/frontend, không truy vấn production/PENDING, không tạo DeviceCommand. Không tác động broker/COM/ESP32, không publish bất cứ application message nào. Adapter ngắt nguồn theo operator xác nhận đầu phiên; agent không điều khiển nguồn vật lý.

Files mới của diagnostic: `scripts/mvp-mqtt-read-diagnostics.cjs`, `.test.cjs`, `scripts/mvp-mqtt-read-session.cjs`, `scripts/mvp-mqtt-read-launch.ps1`. SHA256 đã pin trongplan.json; parser28442316913ca63f337bb374268ca238d7729919f167e53b228943b9bcfb0a08; sessionb3560285458c132ddfd75c2d66073a22d18f09bf4b188a8f55460175368f2b8c; launcher431ad986e5be62518cabbf3e7c8d57f4c5943fcff19c619da3ab656290a7ba15. Không sửa runtime sản phẩm hoặc firmware. Rollback phần diagnostic: không chạy launcher mới nữa; source mới không được nối production startup, dữ liệu/evidence cũ giữ nguyên.

Bước tối thiểu tiếp theo: dùng quyền Administrator tại máy để xác định config của **LAN PID hiện hành** và đọc metadata log/ACL cho tài khoản operator đã nhập, không xuất username/password/hash. Đối chiếu quyền **read** đúng ba topic; quyền publish của thiết bị và SUBACK không đủ chứng minh delivery. Nếu thiếu quyền, chuẩn bị diff tối thiểu để người dùng duyệt, không tự áp dụng/restart hoặc đổi account. Nếu quyền đúng, đối chiếu broker publish/delivery log với Serialtimestamp trong cửa sổ trên trước khi duyệt phiên observer tiếp theo. Chỉ khi MQTTread có3batch mới mới chuẩn bị phiên DB/API/UI riêng. **STOP; không tự chạy lại session hoặc chuyển sang physical test.**

## MOSQUITTO_LAN_BROKER_READ_ACL_AUDIT

### A. LAN broker process identity

Read-only snapshot **2026-10-29T14:09:31.6989630Z (21:09:31 UTC+7)**:

| Instance | Current PID | Process name | Listener |
|---|---:|---|---|
| LAN |6636|mosquitto.exe|0.0.0.0:1883 và [::]:1883|
| Loopback riêng |4572|mosquitto.exe|127.0.0.1:1883 và [::1]:1883|

**PID LAN đã thay đổi:** không còn dùng PID20532 lịch sử làm identity hiện hành. Chưa biết nguyên nhân/thao tác đã làm process thay đổi. Win32_Process trả CreationDate cho LAN là epoch milliseconds1793282374864; loopback1792127620396. Không tự suy ai đã restart hoặc log của instance nào còn tồn tại.

Terminal agent có `Administrator=false`; cả hai process trả ExecutablePath=null, CommandLine không khả dụng. Truy vấn CIM không ném native Access denied exception, nhưng thiếu metadata bắt buộc để qua identity gate. **Audit gate: ACCESS_DENIED / REQUIRED_PROCESS_METADATA_UNAVAILABLE. STOP tại Phase A.** Không tự nâng quyền hoặc mở terminal elevated.

### B. Actual config provenance

**NOT_VERIFIED.** Không xác định được config path của đúng LAN process hiện hành, do đó không đọc file mẫu hoặc config lịch sử thay thế. Không có source path/hash/modified time hoặc log reload evidence hiện hành để khẳng định effective config trong bộ nhớ. Windows Service membership/startup metadata chưa audit tiếp sau gate dừng. File trên đĩa, nếu đọc được ở bước sau, vẫn phải so thời điểm sửa/start/reload.

### C. Authentication mechanism

**NOT_VERIFIED** cho PID6636: chưa biết static password_file/acl_file, include_dir, per_listener_settings, plugin/global_plugin/Dynamic Security hoặc listener scope thực. Không đọc passwordfile/hash/token/private key/Dynamic Security JSON. CONNACK thành công của phiên lịch sử không chứng minh policy của instance mới.

### D. Subscriber read permissions

Username của lần observer trước chỉ nhập tại máy và không lưu; agent không giữ credential để tự audit account. Cần operator đối chiếu account cũ cục bộ khi có config/ACL thực; không hỏi password hoặc username qua chat.

| Topic suffix (prefix smart-agriculture/v1/devices/ESP32-GF-A-01/) | Verdict |
|---|---|
|telemetry|READ_PERMISSION_UNDETERMINED|
|status|READ_PERMISSION_UNDETERMINED|
|actuator/state|READ_PERMISSION_UNDETERMINED|

Không dùng SUBACK hoặc RAW=0 để suy read allowed/denied. Nếu static ACL phải xét user/pattern/wildcards/deny/listener; nếu plugin phải xét policy plugin, không chỉ acl_file. Chưa có bằng chứng để phát hành diff ACL cụ thể.

### E–F. Publisher và delivery/deny correlation

Evidence cũ được giữ: observer **11:52:25–11:53:55Z / 18:52:25–18:53:55 UTC+7**, CONNACK0,3SUBACKQoS1,RAW0; Serial#1020 lúc11:52:50.356Z báo PUBACK76ms. Đó là observation thuộc broker PID20532 thời điểm trước, không gán cho PID6636 hiện tại. Chưa đọc broker log vì chưa xác định config/log provenance sau identity gate. Broker receive/accept/forward/ACLdeny/publisherprincipal/clientID **NOT_VERIFIED**; PUBACK theo Serial không thay bằng chứng forward.

### G. Root cause verdict

**MQTT_DELIVERY_ROOT_CAUSE_UNDETERMINED.**

- Observed: phiên observer trước RAW0 dù CONNECT/SUBACK thành công; hiện LAN PID thay đổi, access metadata không đủ.
- Confidence: có bằng chứng chắc chắn counter trước filter là0 ở phiên cũ và PID hiện tại khác; chưa có bằng chứng chắc chắn nguyên nhân delivery.
- Không xác nhận MQTT_READ_ACL_DENIED_VERIFIED, SUBSCRIBE_ALLOWED_DELIVERY_DENIED, wrongtopic, message-rejected hoặc listener/broker mismatch từ các snapshot này.

### H. Minimal remediation proposal

**Chưa có diff thay đổi broker** vì chưa có actual config/account ACL evidence. Bước tối thiểu là đọc identity/config provenance bằng terminal Administrator operator tự mở. Sau đó mới audit quyền read đúng3topic và log đúng window/process. Không sửa publish/control hoặc mở wildcard# để thử.

Nếu chứng minh thiếu read: Before=rule thực được audit; After=chỉ thêm read đúng3topic cho observer đã xác minh; không đổi account/password/control; cần đánh giá cách broker reload ACL và tác động trước khi xin phép áp dụng riêng. Rollback phải dựa trên file thực/backup riêng được phép ở phiên thay đổi; hiện không tạo backup hoặc restart/reload. Đây là phương án có điều kiện, không phải diff đã được xác nhận cần thiết.

### I. Safety evidence

Phiên audit này chỉ đọc listener và process metadata rồi cập nhật báo cáo. Không mở MQTT subscriber, không CONNECT/PUBLISH/ON/OFF mới; không đọc DB/backend, không startDEV, không restart broker/service, không sửa config/ACL/passwordfile, không gọi mosquitto_passwd, không flash/reset/đổi mạng. Không bật Commands/Automation/ACTIVE hoặc cấp nguồn bơm. Runtime production flags/PENDING không được truy vấn trong audit, không tuyên bố đã xác minh chúng. Nguồn bơm tiếp tục phải giữ ngắt theo điều kiện operator đã xác nhận; không có quan sát điện vật lý mới từ agent.

### J. Operator read-only handoff và next approval

Phê duyệt read-only hiện tại đã bao gồm operator dùng terminal Administrator; **không cần phê duyệt lại nội dung đó**, nhưng agent không tự nâng quyền. Operator có thể mở PowerShell Administrator rồi chạy block dưới đây để xuất metadata Phase A, không in raw CommandLine hoặc credential. Block tự tìm PID hiện hành, không hardcode6636. Chưa đọc config/ACL hoặc log trong block này.

```powershell
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'ADMIN_TERMINAL_REQUIRED' }
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 1883 -ErrorAction Stop)
foreach ($group in ($listeners | Group-Object OwningProcess)) {
    $brokerProcessId = [int]$group.Name
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$brokerProcessId" -ErrorAction Stop
    if (-not $p.ExecutablePath -or -not $p.CommandLine) { throw 'ACCESS_DENIED_STOP' }
    $match = [regex]::Match($p.CommandLine, '(?:^|\s)-c\s+(?:"([^"]+)"|(\S+))')
    $configPath = $null
    if ($match.Success) {
        if ($match.Groups[1].Success) { $configPath = $match.Groups[1].Value }
        else { $configPath = $match.Groups[2].Value }
    }
    $services = @(Get-CimInstance Win32_Service -Filter "ProcessId=$brokerProcessId" -ErrorAction Stop |
        Select-Object Name, State, StartMode)
    [pscustomobject]@{
        PID = $brokerProcessId
        ListenerAddresses = @($group.Group.LocalAddress)
        ExecutablePath = $p.ExecutablePath
        CreationTimeUTC = $p.CreationDate.ToUniversalTime().ToString('o')
        ConfigArgumentPath = $configPath
        Services = $services
    } | ConvertTo-Json -Depth 4
}
```

Nếu ConfigArgumentPath=null, **không tự đoán mosquitto.conf**; cần startup/service evidence để xác định default/no-config. Nếu path tương đối, cần xác minh working-directory/startup provenance trước khi resolve. Operator chỉ chia sẻ output metadata block trên, không dán config/ACL/passwordfile đầy đủ hoặc secrets.

**STOP:** chờ metadata từ terminal operator. Mọi thay đổi broker/ACL/reload và mọi phiên MQTT mới đều ngoài audit này và cần phạm vi phê duyệt riêng. Giữ `ESP32_LIVE_E2E_PARTIAL`, `AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED`, `SOIL_QUALITY_BLOCKED_ADC_AT_RAIL`.

### ACL patch preparation — 29/10/2026

Theo phê duyệt PREPARE ONLY, đã recheck LAN PID6636 và hash hai file trên đĩa: config084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F; ACL4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766. Cả hai khớp pin người dùng. Tuy nhiên executable/config argument của process vẫn không đọc được, username subscriber chưa được nhập/đối chiếu cục bộ. Đã STOP theo gate, không đoán user block, không tạo candidate/diff/staging hoặc expected candidate hash.

**MQTT_ACL_PATCH_PREPARATION_BLOCKED.** Chi tiết A–H trong [MQTT_ACL_PATCH_PROPOSAL.md](MQTT_ACL_PATCH_PROPOSAL.md). Không thay broker/ACL/password, không reload/restart/subscriber mới; giữ ESP32_LIVE_E2E_PARTIAL, AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED và soil ADCrail blocker. PREPARE approval đã có; cần hoàn tất identity/account bằng local operator trước khi chuẩn bị diff, và phê duyệt riêng trước mọi apply.

**Resume sau local username handoff:** process/start/hash đã khớp operator attestation được phép dùng; username nhập cục bộ khớp một user block. Helper dừng với `SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED` trước candidate. Reason gộp account không được xác nhận dedicated/identity thiết bị/quyền write-control liên quan; chưa phân biệt nhánh, không khẳng định account đang điều khiển bơm. Staging private chỉ có assessment redacted, không lưu username/handoff, không có candidate hoặc diff; ACL/config hash cuối vẫn khớp. Cần quyết định dùng observer riêng trước khi tiếp tục; không tự tạo account hay mở rộng quyền. Final **MQTT_ACL_PATCH_PREPARATION_BLOCKED**, chi tiết mục J của proposal. Không apply/reload/restart/subscriber/ON/OFF hoặc thay runtime.

### Dedicated observer preparation — 30/10/2026

Người dùng chọn `sa_mqtt_observer`, PREPAREONLY. Đã xác minh PID6636/start/hash vẫn khớp. StaticACL lines10/11/13 dùng globalpatternWRITE với%u, nên account mới thừa hưởng WRITEtelemetry/status/ACK trong namespace riêng; line12 còn cấp READcommands namespace riêng. **Chỉ thêm3READ không tạo observerread-only.** Có0userblock mới trongACL;2existingblocks đều có writewitness, không tìm thấy blockread-only phù hợp. Password-file membership NOT_VERIFIED: dừng tại globalWRITE gate, không đọc hashpassword.

**MQTT_OBSERVER_ACCOUNT_PREPARATION_BLOCKED**; không tạo candidate/account. Đề xuất review4DENY chỉ namespaceobserver +3READ, không sửa pattern/userESP32, cần duyệt thiết kế trước. Offline15/15PASS (4tests mới+11ACL regression), không liveMQTT. Binaryhelp-only báo2.1.2; không startlistener/reloadbroker. [MQTT_OBSERVER_ACCOUNT_PROPOSAL.md](MQTT_OBSERVER_ACCOUNT_PROPOSAL.md) chứa permissionmatrix, source lines, auth/apply/rollback plan và giới hạn. Giữ ESP32_LIVE_E2E_PARTIAL, AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED, SOIL_QUALITY_BLOCKED_ADC_AT_RAIL. STOP.

**Approved4DENY+3READ candidate — kết quả mới30/10/2026:** **MQTT_OBSERVER_ACCOUNT_PREPARED_NOT_APPLIED**. PID/start/config/ACLhash khớp; usernameprefix scanner xác minh accountmới chưa có trong passwordfile/ACL, không đọc nội dung hash ra log. Candidateprivate `C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\mqtt-observer-candidate-20261030-003548-58ebd4\acl.candidate`, SHA256 **8B779E9BFAFADF6B1A65331373DFE62C60EBB08B89847CB819E5383EAB94FEFC**. Exact8lines thêm,0sửa/xóa; byte/EOL/encoding/EOFgốc giữ nguyên. Whole-language staticproof: đúng3READ,0WRITE,4globalallowlanguages bịDENY hoàn toàn,2usercũ/anonymous không đổi. Offline25/25PASS. Native --test-config exit0 nhưng invalidACLcontrol cũng0: chỉ configsyntaxPASS, nativeACLsyntaxNOT_VERIFIED. Không account/password/apply/reload/restart/subscriber hoặc physicalaction. Chi tiết hiện hành mụcJ của [MQTT_OBSERVER_ACCOUNT_PROPOSAL.md](MQTT_OBSERVER_ACCOUNT_PROPOSAL.md). Chờ APPLYapproval riêng, không nângMQTT_READ_FIXED/E2E hoặc soilquality.
