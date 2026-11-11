# Phase 13.4C — MQTT identity, SOIL quality & readiness

Ngày: **21/10/2026, UTC+7**. Hoàn thành policy thuần/offline, kiểm tra broker và PostgreSQL/API read-only. Không triển khai các policy mới vào ingestion/evaluator/API production.

```text
PHASE13_4C_IMPLEMENTED (pure/offline foundation + read-only assessment)
PUBLISHER_ASSURANCE_LEVEL=OBSERVED (historical correlated evidence)
CURRENT_PACKET_PUBLISHER_ASSURANCE=NOT_VERIFIED (no fresh correlated receipt)
SOIL_QUALITY_POLICY_PASS (98 new offline tests as part of 408 total)
CURRENT_LIVE_SOIL_QUALITY=INVALID_STALE / metadata NOT_VERIFIED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

**Phát hiện runtime mới:** ESP32 còn ONLINE qua heartbeat nhưng telemetry/OFF không còn mới. Serial người dùng cung cấp xác nhận `NTP: NOT_SYNCED_OR_EXPIRED`, `RECORDED_AT: UNAVAILABLE_AT_MEASUREMENT`, `TELEMETRY: SKIPPED_NTP_AT_MEASUREMENT`. Không coi ONLINE là cảm biến/clock khỏe, không dùng OFF lịch sử. Chưa thay NTP/firmware hoặc yêu cầu reset để làm đẹp kết quả.

## 1. Phần mềm đã triển khai

| File | Chức năng |
| --- | --- |
| `backend/src/services/live-readiness/identity-policy.ts` | Phân tầng publisher policy; kiểm tra attestation và session/replay proposal |
| `backend/src/services/live-readiness/soil-quality.ts` | Pure SOIL quality assessment + diagnostic policy proposal |
| `backend/src/services/live-readiness/readiness-policy.ts` | Ma trận evidence TTL, missing production gates, hard-closed readiness |
| `backend/scripts/live-readiness.test.cjs` | 98 tests offline, closed loader không DB/MQTT/env/network/timer |
| `backend/scripts/phase13-4c-readonly-review.cjs` | Diagnostic auth hợp lệ, GET live evidence và SELECT READ ONLY; không gateway/server/evaluator imports |
| `backend/package.json` | Thêm `test:live-readiness` |
| Báo cáo này | Identity/session contract, incident, quality, production prerequisites |

Artifact `report/phase13_4c/readonly-review.json` chứa SQL identity, latest readings, incident readings, API envelope, historical quality assessments và readiness matrix, không token/credential. `report/phase13_4c/offline-tests.tap`: kết quả408tests.

Các module policy không có runtime import, không clock lookup/global mutable state, không DB/MQTT hay command capability. `ClockHealth` chỉ là type import bị xóa khi transpile. Test kiểm tra không module production nào import chúng. Không có endpoint cho client gửi `trusted=true`, không đưa kết quả offline trở lại database hoặc API. Không thay pure engine13.1, command service, evaluator, schema/migrations, frontend hay runtime flags.

## 2. MQTT principal và ACL thực tế

Broker LAN PID1340, executable `C:\Program Files\mosquitto\mosquitto.exe`, command line `-c C:\mosquitto\config\mosquitto.conf -v`. Listener0.0.0.0/::1883. Một service broker loopback PID4572 cũng tồn tại từ trước; không nhầm nó với LAN instance, không restart hoặc chạy thêm broker.

Config thực: `allow_anonymous false`, passwordfile `C:/mosquitto/config/passwords`, ACL `C:/mosquitto/config/acl`, persistence=true. Không có TLS/client certificate config ở listener này. Chỉ đọc tên account: `smartagri_backend`, `ESP32-GF-A-01`; không in password/hash/file config.local.h đầy đủ. Có tài khoản riêng không chứng minh secrets chưa bị copy hoặc không dùng chung trên board khác.

| Principal | Publish | Subscribe/read |
| --- | --- | --- |
| ESP32-GF-A-01 | Chính namespace telemetry/status/command-acks qua `%u`; exact actuator/state | Chính namespace commands qua `%u` |
| smartagri_backend | devices/+/commands/+; `%u` patterns chỉ vào namespace tên account backend | devices/+/telemetry,status,command-acks/+; exact ESP32-GF-A-01/actuator/state; pattern commands của account |

Pattern là global, `%u` là authenticated username, không phải ClientId. Không ghi nhận quyền backend publish vào telemetry namespace ESP32 từ các dòng ACL này. Diễn giải dựa trên [Mosquitto config chính thức](https://mosquitto.org/man/mosquitto-conf-5.html). Không chạy publish/deny tests lên broker thật trong phase này.

SHA256 file **config/ACL, không phải passwordfile**:

```text
mosquitto.conf 084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F
acl            4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766
```

Mtime config28/08, ACL16/10, broker process khởi động21/10; command line, log connection username và publish đúng topic là bằng chứng hỗ trợ cấu hình đang được dùng, **không phải attestation độc lập của in-memory policy**. Không có signed active-config hash, protected principal audit chain hoặc deny matrix mới. Credential isolation/revocation/rotation runbook thực thi và việc thu hồi kết nối đang mở chưa được nghiệm thu. Không thay password/ACL/reload để thử.

Theo [MQTT3.1.1 OASIS](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html), PUBLISH subscriber nhận không mang username/certificate của publisher; topic/ClientId/digest/PUBACK không phải chữ ký thiết bị. Plain MQTT còn thiếu bảo vệ transport; việc có account và anonymous=false không tự đạt publisher authentication từng packet.

## 3. Assurance policy đã kiểm thử

- **OBSERVED:** receipt/correlation đã được chứng minh bởi pipeline13.4A, không đồng nghĩa authenticated publisher. Hiện có bằng chứng lịch sử13.4A/B; snapshot hiện tại thiếu fresh receipt nên packet assurance NOT_VERIFIED.
- **BROKER_POLICY_ATTESTED:** pure evaluator chỉ cho mức này khi có reviewed attestation từ adapter tin cậy, principal/device binding, config/ACL hashes khớp active-policy proof, deny/binding test, credential isolation+revocation audit, protected transport+connection audit, checkedAt/expiresAt hữu hạn và TTL tối đa5phút. Đây là proposal về acceptance, **chưa có adapter thu thập/verify attestation hoặc approval thực tế**. Positive fixture chỉ chứng minh evaluator, không chứng minh broker hiện tại đạt mức đó.
- **DEVICE_IDENTITY_VERIFIED:** chưa có verifier/contract phê duyệt và bằng chứng mật mã phù hợp. Evaluator không bao giờ trả mức này; packetPublisherIdentity và deviceIdentity luôn NOT_VERIFIED, kể cả mock broker policyPASS.

Không đưa boolean `approved` hoặc `establishedByTrustedAdapter` từ MQTT/HTTP vào trust pipeline. Chúng chỉ là input contract của pure function; adapter tương lai phải kiểm tra proof thực tế, RBAC/attestation authority và anti-replay, không tin lời khai thiết bị. Policy hiện tại không phải cơ chế xác thực hoặc authorization cho ON.

## 4. Device/session contract — đề xuất, chưa đổi wire format

**Hiện tại:** observer generation/sessionStartedAt/sessionId do backend tạo, đổi khi backend/broker observer reset. Firmware có session floor/counter nội bộ nhưng không đưa boot identity/sequence/calibration vào v1 telemetry. MQTT Packet Identifier không dùng làm durable message sequence. Backend reconnect không chứng minh ESP32 đã boot lại.

Contract tương lai cần tách:

1. Backend observer: sessionId/generation/start, connection-ready; disconnect/reconnect/restart invalidates current evidence và chờ OFF/reading mới.
2. Device session: deviceCode, bootId ngẫu nhiên đủ mạnh, credential/key version, authenticated establishment/boot proof; không lấy backend generation hoặc timestamp thay bootId. Context có establishedAt/expiresAt/revoked, reject session bị thu hồi/hết hạn và sample trước establishment. Boot change/credential rotation phải có re-establishment được xác minh.
3. Global message sequence per boot dùng chung telemetry/status/state. Proposal pure dùng safe integer0..MAX_SAFE_INTEGER; wire encoding và overflow phải được duyệt, không wrap âm/thấp. Nếu uint64 dạng chuỗi được chọn thì phải đổi parser đồng bộ, không ép về JavaScript number mất chính xác.
4. Envelope proof phải gắn device+boot+sequence+topic+recordedAt+payload digest+key version vào chữ ký/canonical representation, hoặc trusted broker attestation channel chứng minh binding tương đương. BootId/counter tự khai báo không đủ. mTLS ở broker đơn thuần không tự thêm publisher identity vào packet subscriberMQTT3.
5. Anti-replay: reject retained/DUP, wrong observer/session, stale/future>2s, pre-session reading, invalid sequence, duplicate digest hoặc sequence<=high-water. Pure session evaluator giữ high-water cùng boot **xuyên observer reconnect**, không reset counter chỉ vì generation đổi. Clock/receipt không thay device proof.
6. Pure cursor truyền vào/ra bất biến; không tự lưu RAM/DB. Production cần durable high-water/session revocation/key registry, atomic update, bounded namespace và recovery từ persistent source. Sau process restart nếu mất cursor không thể tuyên bố replay-protected. Chưa triển khai adapter này.
7. Credential rotation/revocation: per-device credential/key riêng, không dùng backend key trên board, inventory/expiry/revoke có audit. Revocation phải vô hiệu session/proof đang mở và xác minh kết nối cũ đã bị loại; cần kế hoạch rollout/rollback riêng, không thực hiện trong phase này.

### Compatibility và rollback tương lai

V1 backend schema đang `.strict()`, nên không tự thêm field vào JSONv1. Đề xuất staged rollout: backend trước hỗ trợ **schemaVersion2 riêng** sau contract approval; v1 vẫn ingest/hiển thị OBSERVED nhưng không được promote. Deploy/verify identity adapter ở chế độ đọc, kiểm thử signature/session/clock/replay/rotation, sau đó firmware opt-in từng thiết bị với adapter bơm ngắt và flags khóa. Không dual-publish tạo readings/commands trùng; cần idempotency theo envelope mới.

Rollback: ngừng sử dụng v2 trust adapter, invalidate evidence/session và giữ UNKNOWN, firmware về bảnv1 đã backup nếu được duyệt; v1 ingestion tương thích tiếp tục hoạt động. Không restore OFF lịch sử hoặc nới timestamp guard để vượt precheck. MQTT schema/firmware/TLS/provisioning đều cần phê duyệt và test riêng, chưa thực hiện.

## 5. SOIL_01 quality policy

`assessSoilQuality` trả status theo thứ tự ưu tiên **INVALID > SUSPECT > NOT_VERIFIED > VALID_OBSERVED**, reasons không bị mất khi có nhiều lỗi. 0/100 giữ nguyên giá trị, không trở thành null; endpoint/clamp có thể SUSPECT. VALID_OBSERVED không chứng minh publisher, độ ẩm thể tích hoặc quyền tưới.

Kiểm tra identitydevice/sensor/sourceMQTT/readingId/observer, finite0..100, recordedAt/receivedAt hữu hạn/future2s/TTL45s, calibration version khớp approved registry, raw ADC integer0..4095, rail0/4095 INVALID, calibration mapping/percent lệch>0.5điểm SUSPECT, ADC ngoài dry/wet hoặc0/100 SUSPECT, disconnect=true INVALID, thiếu contact-health metadata NOT_VERIFIED. Raw ADC/calibrationVersion/contact health **không được suy ra** từ phần trăm hoặc fill default.

Window bounded32history entries + current, cùng sensor/observer/calibration, readingId/time không trùng và tăng đúng thứ tự; timestamp lỗi không được âm thầm bỏ qua để tạo streakVALID. Kiểm tra consecutive valid samples, sampling gaps, rate/spike/noise/stddev, stuck spread/span. TTL output dựa mốc sớm hơn recorded/received; không đổi timestamp đầu vào. Missing/bad metadata không bị nâng trust bằng streak số phần trăm hợp lệ.

Diagnostic proposal `13.4C-quality-proposal-v1` hiện **approvedForObservation=false**, calibrationapproved=false. dry3500/wet1507 lấy từ firmware thực, còn version `LM393-3500-1507-PROPOSAL` là **nhãn proposal, không phải version firmware đang phát**. Tham số synthetic:3samples liên tiếp, gap<=30s, window120s, stuck4samples/>=45s/spread<=0.02điểm, spike>20điểm, rate>5điểm/s, noise stddev>3điểm. Đây không phải thông số nông học đã được nghiệm thu; không bật trên production và không dùng thresholdfixture20/40.

Ba archived samples13.4B23.18/23.18/24.89: tại thời điểm quan sát đều **NOT_VERIFIED** do thiếu rawADC/calibration/contacthealth/policy approval/window; khi đánh giá hiện tại là **INVALID do stale**. Artifact ghi cả hai thời điểm, không sửa/xóa lịch sử. Serial mới rawADC3005/min2992/max3035 và SOIL24.84 là log người dùng, chưa được ký/correlation với readingId; không ghép nó vào reading DB cũ hay gán timestamp giả.

Trước physical calibration cần dataset nhiều điều kiện đất/cây/độ sâu/nguồn/tiếp xúc/độ mặn, rawADC/minmax/stuck/noise, thí nghiệm rail/rút probe và đo tham chiếu; approved calibration/quality version có phạm vi và hạn dùng. Không thực hiện hiệu chuẩn vật lý hoặc thay config trong phase này.

## 6. MQTT_LOST ngày21/10 lúc11:35 — bằng chứng đã tìm được

`build/phase13-3c/broker.err.log` dòng6954–6973, epoch1792557354 = **04:35:54Z =11:35:54UTC+7**:

```text
New connection 172.20.10.3:64048
old ESP32-GF-A-01-physical 172.20.10.3:64047 disconnected: session taken over
new ESP32-GF-A-01-physical (p4,c1,k5,u'ESP32-GF-A-01')
CONNACK success; actuator/state d0 q1 r0; status birth; command subscribe QoS1
```

Broker xác nhận **cùng ClientId được kết nối mới thay thế**, từ cùngIP nhưng sourceport khác. Chưa đủ chứng minh hai board/simulator; một ESP32 reconnect khi socket cũ chưa được broker phát hiện cũng có thể có biểu hiện này. Không có Serial thời điểm đó để phân biệt Wi-Fi/NTP/publish timeout/tác vụ network hay client khác. Không thấy ACLdeny tại window, broker/backend process vẫn giữ nguyên; không kết luận một cách đoán định rằng firewall hoặc password sai.

Firmware `.ino` loop dòng285–296 gọi localOff(MQTT_LOST) và sendOffState sau reconnect không phải firstConnection; publish failure cũng yêu cầu reset transport. OFF reasonMQTT_LOST có thể là nhãn fail-safe/reconnect, không chứng minh motor từng ON. Epochwindow cho thấy bản tinOFF mới ở04:35:54.376Z đã commit backend, không phải retained.

| SOIL recordedAt UTC | DB receivedAt UTC | % |
| --- | --- | ---: |
| 04:35:38.285 | 04:35:38.680 |23.18|
| 04:35:53.285 | 04:35:58.658 |24.89|
| 04:36:08.285 | 04:36:08.597 |23.13|
| 04:36:23.285 | 04:36:23.603 |23.43|

Archived API callback04:35:58.654Z; DB receipt sau callback4ms, recorded→callback5.369s. Broker nhận telemetry epoch1792557358 sau reconnect; timeline phù hợp sample được gửi trễ khi khôi phục. Không coi5.369s là phép đo riêng clock skew hoặc kết luận PUBACK timeout chính xác nếu không có Serial.

Backend observer giữ generation1/session `backend-observer:97ade4d7-a7d8-43d4-becf-cb78877a606d`, start04:10:04.992Z; device reconnect không làm backend client reconnect nên observer generation không đổi. Đây là khoảng trống device-session thực, không sửa hoặc giả lập bootId để che. Broker có offline Last Will và ONLINEbirth tại cùng giây, nhưng backend debug transition history không đủ để chứng minh từng DB status trung gian. Snapshot sau đóONLINE, PERIODICOFF tiếp tục; incident cũ kết luận **RECOVERED_TRANSIENT / ROOT_CAUSE_NOT_VERIFIED**, cơ chế reconnect/takeover đã có bằng chứng nhưng nguyên nhân khởi phát chưa đủ.

## 7. Lỗi runtime hiện tại: heartbeat mới nhưng NTP ESP32 hết hiệu lực

Snapshot read-only **05:17:00.645Z (12:17UTC+7)**:

- DeviceONLINE/lastSeen05:16:55.022Z, backendMQTT vẫn nhận status15s. Broker/backend không restart.
- Bốn MQTT readings cuối **05:00:38.285Z**, DBreceived05:00:38.715Z: TEMP33.2/HUM69.3/SOIL24.44/LIGHT0. Không còn fresh correlated reading trong live-evidence.
- DB lưu OFF tại05:00:39.402Z nhưng API actuator hiển thịUNKNOWN do thiếu OFF trong TTL. Live-evidence.off=null. **DBOFF cũ không được coi OFF mới**.
- Windows clockHEALTHY ngắn hạn, offset−36.6169ms, lastsyncước lượng05:13:08.607Z. Điều này không chứng minh NTP trên ESP32 khỏe; stability45–60phút vẫnNOT_VERIFIED.
- Serial mới của người dùng: monitor544, sensors đọc được, WiFi/MQTTCONNECTED, `NTP NOT_SYNCED_OR_EXPIRED`, timestampUNAVAILABLE và `SKIPPED_NTP_AT_MEASUREMENT`, firmwareENABLED, GPIOOFF. Đây là bằng chứng trực tiếp chặn telemetry ở clock guard, không phải broker không chuyển tiếp readings đã publish.

GET kiểm tra kết thúc **05:23:08.304Z (12:23UTC+7)** vẫn ONLINE/lastSeen05:22:55.074Z nhưng readings không đổi từ05:00:38.285Z; relayAPIUNKNOWN, controlEnabled=false, gatewayModeDISABLED. Không ghi nhận khôi phục telemetry trong phase này.

Source `.ino:61–65`: reliableClock trảfalse nếu không clockSynced hoặc elapsed>=7200000ms từ lần SNTPcallback cuối. sensorTask dùng timestamp0 khi không reliableClock; sendOffState cũng return sớm khi clock không đáng tin. Status heartbeat không có timestamp nên vẫn publish. **Cơ chế dừng telemetry/OFF do device NTP guard đã xác định**, nhưng chưa biết vì sao SNTP không tự refresh thành công; không khẳng định lỗi Windows hoặc bug firmware timer khi chưa có network/SNTP runtime logs.

Đề xuất task riêng: kiểm tra read-only Serial eventsSNTP/lastsync age và khả năng truy cập các NTP host firmware dùng từ mạng ESP32; đo tuổi sync, retry/backoff/DNS/UDP123. Nếu cần firmware recovery/instrumentation thì xin phê duyệt mã/compile/flash riêng, giữ timestamp guard và không publish sample đã đo khi unsynced bằng timestamp lúc gửi. Chưa yêu cầu nhấnEN/flash/đổiNTP/reset để vượt readiness. **Runtime live freshness hiện FAIL, không gọi recovered cho lỗi hiện tại chỉ vì incident11:35 đã phục hồi**.

## 8. VERIFIED_LIVE readiness matrix

| Gate | Trạng thái thực tế | Bằng chứng/giới hạn |
| --- | --- | --- |
| MQTT receipt/DB correlation | NOT_VERIFIED hiện tại | Lịch sửPASS13.4A/B; giờ cache thiếu receipt mới do NTPdevice |
| Publisher assurance | NOT_VERIFIED | Mức lịch sửOBSERVED, chưa broker attestation hoặc packet authentication |
| Device/session assurance | NOT_VERIFIED | Chỉ observer generation, không authenticated boot/counter |
| Clock Windows | PASS ngắn hạn | API clock read-only05:17, source0x8; không long-termPASS |
| Clock ESP32 | FAIL | Serial NOT_SYNCED_OR_EXPIRED |
| SOIL quality | NOT_VERIFIED / staleINVALID | Policy offlinePASS, live thiếu metadata và timestamp mới |
| Fresh OFF | NOT_VERIFIED | DBOFF cũ, APIUNKNOWN, OFFcache null |
| Production policy/rule version | NOT_IMPLEMENTED cho trusted snapshot | Có legacyAutomationRule không thay versioned policy adapter |
| Persistent cycle | NOT_IMPLEMENTED production | Sáu ledger tables chưa có |
| Persistent budget/reservation | NOT_IMPLEMENTED production | Test55433 không phải sourceproduction |
| Persistent safety/fault | NOT_IMPLEMENTED production | Không thay bằng RAM observer |
| Cross-restart durable idempotency | NOT_IMPLEMENTED production | LegacyPENDINGunique/firmwarecache không thay ledger |
| Farm/device RBAC | PASS trong scope hiện có | AuthGET scoped thành công, regressionauth/scopePASS; chưa penetrationtest đauser thực mới |
| Persistent emergency stop/manual override | NOT_IMPLEMENTED theo proposal | Ngắt nguồn độc lập là quy trình; flagsdisabled không thay durable latch |
| Restart recovery end-to-end trusted snapshot | NOT_VERIFIED | ObserverUNKNOWN/freshOFF có source/tests cũ, nhưng deviceNTP và durable state chưa đạt |

`assessLiveReadiness` yêu cầu statusPASS kèm evidenceId/checkedAt/expiresAt hợp lệ cho mỗi gate, clock fresh/khôngjump/offset<=500ms/source0x8/leap0/error0/stratum hợp lệ và lastsync<=1h. Missinggate→NOT_IMPLEMENTED, expiredPASS→NOT_VERIFIED. Kể cả all-PASS **synthetic** input, kết quảproduction `verifiedLiveReady=false`, reasonPRODUCTION_TRUST_ADAPTERS_NOT_DEPLOYED, engineCalled=false, commandCreated=false. `observationConditionsComplete` chỉ là diagnostic, không phải runtime enable switch.

## 9. Kiểm thử và các giới hạn nghiệm thu

```powershell
cd C:\DATN\Project_datn\backend
npm run test:live-readiness
node --test scripts/live-readiness.test.cjs scripts/live-provenance.test.cjs scripts/irrigation-persistence.test.cjs scripts/shadow-irrigation.test.cjs scripts/shadow-preview.test.cjs scripts/mqtt-pump.test.cjs scripts/device-presence.test.cjs
node node_modules/typescript/bin/tsc --noEmit
# Diagnostic SELECT/auth/GET, không control (chỉ khi muốn lấy snapshot mới):
node scripts/phase13-4c-readonly-review.cjs
```

Kết quả cuối: **98 mới +310 regression =408/408 PASS, 0FAIL,0SKIP**, TypeScriptPASS. Testclosedloader deny mọi runtime require, không process/env/network/DB/MQTT trong policy; static graph test xác nhận production không import module mới. Cases: observed/auth khác nhau, ACL/username thiếuattestation, TTL/hash/principal/control mismatch, reconnect không reset same-boot highwater, oldcallback/retained/dup/replay/rotation/revocation/session expiry, thiếucalibration/raw/contact,0/100/NaN/range/ADCrails/clamp, spike/rate/noise/stuck/gaps/stale, clockunhealthy/unknown/expiry/jump, từnggate thiếu và allsyntheticPASS vẫnkhóa. Không dùng fakegateway trên databaseproduction.

Không đổi UI nên **không chạy lại browser E2E/build/lint frontend trong phase này**, kết quả13.4B là lịch sử, không tuyên bố browser mớiPASS. PostgreSQLintegration38 là lịch sử, không mở55433/DDLđể tăngtestcount. Pure positive fixtures không là calibration/identity/persistenceproduction approval. Không kiểm thử outage vật lý, rotation thật hoặc signedtelemetry.

## 10. Production persistence deployment gate và Phase tiếp theo

Giữ nguyên proposal/checklist `docs/PHASE13_4B_PRODUCTION_PERSISTENCE_PROPOSAL.md`; SQLSELECT trong phase này xác minh **0/6 ledger tables trong public**. Không apply migration/clientgenerate. Testcluster55433 vẫn không listen. Trình tự đề xuất:

1. Xử lý deviceNTP read-only và xin phạm vi sửa riêng nếu cần; khôi phục fresh telemetry/OFF trước liveadapter nghiệm thu.
2. Chốt trust mức nào đủ cho liveSHADOW; reviewed principal audit/active-policy attestation/transport/credential lifecycle. DEVICE_IDENTITY_VERIFIED cần proof riêng, không chỉ username.
3. Chốt backward-compatible v2 session/calibration/quality metadata, provisioning/rotation/revocation/rollback và tests. Chỉ firmware rollout sau phê duyệt riêng; v1 vẫnOBSERVED.
4. Calibration/quality dataset và version được duyệt; synthetic thresholds không tự trở thành productionpolicy.
5. Productionpersistence phê duyệt riêng exactdatabase/schema/role/DDL/maintenancewindow, backup customformat+globals bảo vệsecrets, restore rehearsal trên instanceđượcduyệt, constraints/indexlock/transaction/roleleastprivilege/audit/hashreview và clientartifactcompatible. Không tự mở lại55433 hoặc dùngtestcredential.
6. Additivesixmodels mặc địnhDISABLED/FAULT_LOCKED/emergencyStop/UNKNOWN; atomicreserve+intent+audit với safetyrowlock/CAS/idempotency; UNCERTAIN giữquota, khôngretryON. Manualoverride/fault/rearm cần quyền+lýdo+audit, không tựclearrestart/midnight. Rollbackcode giữledger/audit, khôngdrop/reset.
7. Read-only scoped history/source adapters trước, không nối engine với side-effects. Sau evidence đủ và riêngapproval mới xem xét VERIFIED_LIVE SHADOW; ACTIVE/hardware vẫn ngoàiphạmvi.

## 11. Runtime safety và điểm dừng

APIruntimefalse/false/testtrue; PENDING0, tổngDeviceCommand43 (bao gồm lịch sử, không chỉ2ONvật lý cuối). DeviceCodeESP32-GF-A-01, relayAPIUNKNOWN do stale, không épDBOFF. BackendPID3572/brokerLAN1340/PG5432PID7848 giữnguyên, khôngrestart. Schemahash `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`; engine/evaluator/shadowpreviewroutehash giữbaseline13.4A/B. Không sửa auth/RBAC, sourceMQTTschema/topic, history hoặc sensorsproduction. Pipeline đang chạy vẫn ghi heartbeat bình thường; không tuyên bố toàn productionzero-write.

FirmwareENABLE_PUMP_COMMANDS=true giữnguyên theo approvaltrước, SerialGPIOOFF không chứng minh độngcơ/nước hoặc nguồn5V. Adapter giữngắt theo quy định, không có phépđo nguồn độc lập mới và không được yêu cầu cắmđiện.

**Dừng ở VERIFIED_LIVE_NOT_READY.** Softwarepolicy/offlinePASS; publisherdeviceauthentication, productionpersistence và livequality chưađượcnghiệmthu. Lỗi cầnưu tiên tiếp theo là **ESP32SNTP tựrefresh/expiry**, với kiểmtra/chỉnhsửa riêng đượcduyệt, không vôhiệu guard để có telemetry giả.
