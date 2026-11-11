# Phase 13.3C — MQTT runtime recovery và VERIFIED_LIVE readiness

Ngày thực hiện: **21/10/2026, UTC+7**. Không thử bơm, không sửa firmware/topic/schema, không bật quyền điều khiển.

```text
MQTT_RUNTIME_RECOVERED
TELEMETRY_LIVE_PASS
PHASE13_4_NOT_READY — chưa đủ điều kiện công bố/bật VERIFIED_LIVE
COMMANDS=false
AUTOMATION=false
GATEWAY_MODE=DISABLED
PENDING=0
PHYSICAL_PUMP_NOT_TRIGGERED
```

Kết luận NOT_READY áp dụng cho bật VERIFIED_LIVE: dữ liệu và kết nối đã phục hồi, có thể dùng báo cáo này để duyệt phạm vi xây adapter read-only ở Phase 13.4, nhưng adapter/trust contract hiện chưa đầy đủ. Không đồng nghĩa MQTT còn lỗi.

## 1. Hiện trạng và nguyên nhân có bằng chứng

Kiểm tra đầu phiên khoảng **10:02 UTC+7**:

- HTTP localhost:5000 không kết nối được; không có process/listener backend 5000.
- Không có Mosquitto LAN; chỉ service PID **4572** trên 127.0.0.1/::1:1883. Không có Node process ứng dụng đang chạy.
- Wi-Fi Windows **172.20.10.2/28**, network category Public; firmware `MQTT_HOST=172.20.10.2`, backend cũng kết nối host này. **Không có bằng chứng lệch IP hiện tại.** Không đổi IP, Wi-Fi hoặc firewall.
- Config thực `C:\mosquitto\config\mosquitto.conf`: listener1883, allow_anonymous=false, password file/ACL hiện hữu, persistence=true. Không thay nội dung config/password/ACL.
- PostgreSQL production PID **7848** vẫn hoạt động tại 5432; 55433 không có listener.
- SELECT READ ONLY: ESP32 OFFLINE, lastSeen **2026-10-20T18:49:05.590Z**, readings cuối **18:49:05.428Z**; DB còn giá trị OFF lịch sử **18:48:58.497Z**, **không được dùng làm bằng chứng relay hiện tại**. PENDING=0.

**Nguyên nhân trực tiếp hiện tại:** thiếu cả tiến trình backend và broker LAN, nên broker service loopback còn chạy không giúp ESP32/backend kết nối endpoint LAN. Chưa có log bền vững chứng minh vì sao các process trước dừng, hoặc nguyên nhân chính xác MQTT disconnected trong snapshot cuối Phase 13.3B; không quy kết chắc chắn là đổi mạng, ACL, phần cứng hoặc PostgreSQL test.

Hệ thống **không tự phục hồi** trước kiểm tra; đã cần khởi chạy lại hai process ứng dụng bằng cấu hình cũ. Không restart hay thay service production.

## 2. Thao tác khôi phục tối thiểu

Sau khi kiểm tra không có listener LAN/backend trùng:

1. Khởi chạy hidden process `C:\Program Files\mosquitto\mosquitto.exe -c C:\mosquitto\config\mosquitto.conf -v`, **PID1340**. Logs tại `build/phase13-3c/broker.out.log` và `broker.err.log`.
2. Khởi chạy backend qua Node/tsx `src/server.ts`, thư mục backend, process environment rõ ràng **MQTT_COMMANDS_ENABLED=false, MQTT_AUTOMATION_COMMANDS_ENABLED=false, MQTT_PUMP_TEST_MODE=true**. Không sửa `.env`.
3. Backend phục vụ API **PID2984**, startup **2026-10-21T03:03:39.882Z = 10:03:39.882 UTC+7**. Runtime log chứng minh `effectiveMaxRunSeconds=1`, commands=false, automation=false, testMode=true.
4. Log xác nhận `MQTT connected: host=172.20.10.2 port=1883`, `MQTT subscriptions restored`, `MQTT OFF-state observation subscribed (commands disabled)`.

Backend startup chạy recovery bình thường, có thể đưa actuator UNKNOWN trước khi nhận OFF mới; ingestion/presence cập nhật DB theo pipeline đang có. Không UPDATE tay, publish OFF giả, seed/migration hoặc tạo DeviceCommand để vượt gate.

Không dừng service loopback4572, không chỉnh Windows Time/firewall/ACL, không flash ESP32, không nhấn BẬT/TẮT. Broker/backend được để chạy phục vụ hệ thống sau bàn giao. Đây vẫn là process thủ công, chưa có cơ chế auto-start/watchdog mới; lý do process cũ dừng chưa xác định. Không tự tạo thêm service hoặc task scheduler.

Một lệnh diagnostic ban đầu chạy trực tiếp file TypeScript bằng `node` bị SyntaxError trước khi thực hiện truy vấn; đã dùng đúng launcher `node node_modules/tsx/dist/cli.mjs ...`. Không sửa module/package để xử lý việc gọi nhầm launcher.

## 3. Kiểm chứng MQTT → PostgreSQL → API

Probe mới `backend/scripts/phase13-3c-observe.ts`:

- Chỉ SUBSCRIBE các topic telemetry/status/actuator-state đúng ESP32, client ID riêng; **không publish**, không gọi ingestion/gateway/evaluator.
- Quan sát **40 giây**, packet bound100, sau đó tự ngắt; SELECT trong transaction READ ONLY để khớp từng sensorCode/value/source/timestamp với PostgreSQL.
- Không nhận password/token qua CLI và không lưu chúng vào artifact.

Khoảng quan sát **03:04:49.029Z–03:05:29.404Z** (10:04:49–10:05:29 UTC+7):

| recordedAt UTC | TEMP_01 °C | HUM_01 % | LIGHT_01 lux | SOIL_01 % | Kết quả PostgreSQL |
| --- | ---: | ---: | ---: | ---: | --- |
| 2026-10-21T03:04:53.285Z | 30.9 | 70.3 | 0 | 16.21 | Đủ4, source MQTT, value/time khớp |
| 2026-10-21T03:05:08.285Z | 30.9 | 70.4 | 0 | 16.26 | Đủ4, source MQTT, value/time khớp |
| 2026-10-21T03:05:23.285Z | 30.9 | 70.3 | 0 | 16.01 | Đủ4, source MQTT, value/time khớp |

**3/3 batch, 12/12 readings khớp**, telemetry QoS1, retain=false, dup=false; có heartbeat ONLINE non-retained qua từng chu kỳ. LIGHT_01=0 là giá trị thật được giữ nguyên, không thay bằng missing.

Probe cũng nhận retained status OFFLINE lịch sử khi subscribe lần đầu. Bản tin này được phân biệt rõ và **không dùng làm liveness**; backend presence loại retained/dup tại `backend/src/mqtt/mqtt-presence.adapter.ts`. Trạng thái ONLINE sau đó đến từ heartbeat/telemetry mới.

Authenticated API snapshot **03:06:06.120Z** và SELECT READ ONLY **03:06:08.334Z** khớp:

- Device ONLINE, lastSeen **03:05:54.681Z**.
- Reading batch **03:05:53.285Z**: TEMP30.9, HUM70.4, SOIL16.41, LIGHT0, tất cả source MQTT.
- DB receivedAt của batch **03:05:53.523Z**, khoảng cách recorded→DB nhận ~238ms. Đây là tổng clock/network/queue/DB timing, **không phải phép đo riêng clock skew**.
- PUMP_01 OFF, stateAt/lastStateChangedAt **03:05:54.244Z**.
- `controlEnabled=false`, `gatewayMode=DISABLED`; PENDING=0.
- `/api/health` HTTP200: database connected, MQTT connected. TCP established cho backend PID2984 tới **172.20.10.2:1883**, không chỉ chứng minh có listener.

Bằng chứng: [MQTT và các hàng PostgreSQL](../report/phase13_3c/mqtt-postgresql-evidence.json), [API snapshot](../report/phase13_3c/api-snapshot.json). Log backend/broker cục bộ trong build không chứa credential được in ra trong phiên này; không đưa password file vào báo cáo.

## 4. OFF mới và phiên backend

Ba báo cáo `reason=PERIODIC`, state=OFF, QoS1, retain=false, dup=false quan sát trực tiếp:

- **03:04:53.606Z**.
- **03:05:08.784Z**.
- **03:05:23.970Z**.

Tất cả mới hơn backend startup **03:03:39.882Z**. Backend log có `MQTT OFF-state committed` đúng cả ba timestamp; sau đó API xác nhận OFF hiện tại với timestamp mới hơn nữa, không lấy OFF lịch sử trong DB.

Nguồn code xác minh:

- `backend/src/mqtt/mqtt-client.service.ts`: khi connect reset observer generation, phục hồi subscriptions; state handling chỉ chạy khi observer ready/generation khớp.
- `backend/src/mqtt/mqtt-pump-state.adapter.ts`: loại retained/dup, timestamp trước session start, sai device/actuator/topic, quá cũ/future; chỉ cập nhật nếu timestamp mới hơn. Sau commit mới confirmOff trong RAM.
- `backend/src/mqtt/mqtt-state-observer.ts`: generation/sessionStartedAt, TTL OFF30giây và timestamp map.
- `backend/src/services/actuator.service.ts:20`: API chỉ trả OFF khi device ONLINE và OFF timestamp được observer phiên hiện tại xác nhận, không chỉ đọc cột OFF tồn tại.

“Đúng session” ở đây là **phiên kết nối/quan sát của backend**. JSON hiện không có ESP32 boot/session ID đã xác thực; chưa thể tuyên bố đã có device-boot identity đầy đủ cho VERIFIED_LIVE. OFF chỉ là báo cáo GPIO, không chứng minh động cơ ngừng quay hoặc nước ngừng chảy.

## 5. Serial và Windows Time — kiểm tra nhanh

Người dùng cung cấp Serial Monitor **#20**, recordedAt **2026-10-21T03:05:38.285Z**:

- WiFi CONNECTED, MQTT CONNECTED, NTP SYNCED, TIME_AT_SAMPLE SYNCED.
- PUMP_COMMANDS ENABLED; RELAY OFF (GPIO only).
- TEMP30.90, HUM70.40, LIGHT0.00, SOIL16.76; rawADC3166, min3158/max3179.
- PUBACK thành công. PUBACK không tự chứng minh DB commit; bằng chứng PostgreSQL/API độc lập ở mục3.

Serial batch03:05:38 và API batch03:05:53 là **hai lần đo khác nhau**, không phải giá trị soil bị lệch giữa nguồn.

Windows Time chỉ đọc lúc10:02–10:05 UTC+7: Leap0, Stratum5, LastSyncError0, source `time.windows.com,0x8`, peer Active, LastSuccessfulSync09:56:36. Stripchart3mẫu:

```text
10:05:09  -0.0139794 s
10:05:12  -0.0110476 s
10:05:14  -0.0071447 s
```

**SHORT_TIME_CHECK_PASS**; không resync, sửa registry/peer hoặc nới timestamp guard. Không chạy monitor45–60phút, không nghiệm thu ổn định dài hạn từ ba mẫu này.

## 6. VERIFIED_LIVE: hiện có và khoảng trống

| Trường/trust | Có sẵn | Còn thiếu để cấp VERIFIED_LIVE |
| --- | --- | --- |
| Reading identity/value/times | SensorReading có id/sensorId/source/value/recordedAt/receivedAt | source MQTT không phải bằng chứng receipt được xác thực đầy đủ |
| MQTT receipt metadata | Callback có retain/dup/receivedAt; topic và payload được validate | Không lưu receipt context gắn readingId trong DB hoặc evidence cache dùng chung đáng tin |
| Topic/provenance/auth | Broker auth+ACL hiện hữu, topic/payload identity checks; subscribe thành công | Subscriber không nhận publisher username trong MQTT3 payload; backend auth tới broker không tự chứng minh publisher ESP32. Cần policy/ACL attestation và định nghĩa mức assurance, không gán authenticated=true tùy tiện |
| Packet retain/dup/QoS/digest | Probe có bằng chứng trong cửa sổ40giây | Chưa là adapter production cho từng reading; packet DUP=false không loại được application-level duplicate |
| Out-of-order | DB unique(sensorId,recordedAt), checks freshness cho side effects | Chưa có high-water per-sensor/session và receipt provenance bền/chặt cho engine. Telemetry retained/dup vẫn có thể lưu history, không được lấy latest(source=MQTT) rồi tự nâng trust |
| receivedAt | DB default now() | Không đồng nhất với callback context.receivedAt; queue/transaction có thể làm chênh. Cần mang exact receiptAt qua evidence boundary |
| Device session | Backend observer generation và sessionStartedAt | Không có ESP32 boot/session identifier trong schema MQTT hiện tại; phải định nghĩa rõ verification-session thay vì giả mạo device session |
| OFF evidence | Observer RAM loại replay, TTL, đúng backend generation | Map hiện chỉ giữ code/timestamp, chưa expose envelope đầy đủ reason/retain/dup/receiptAt/session/digest cho SHADOW |
| Clock health | W32Time có thể đọc, probe NTP hiện tại đạt | Chưa có adapter backend HEALTHY/UNHEALTHY/UNKNOWN với checkedAt/TTL/offset/jump detection và fail-closed |
| Cycle/budget/safety | Foundation và PG integration cô lập PASS | Chưa có production migration/adapter được duyệt; không được dùng ledger test hoặc reset RAM quota làm trạng thái ACTIVE đáng tin |
| SOIL quality | Finite0..100, rawADC và diagnostics ở Serial | JSON telemetry chỉ value, không gửi calibration/ADC rail/health metadata; ngưỡng minh họa không phải ngưỡng nông học đã hiệu chuẩn |

Các file chính: `backend/src/mqtt/mqtt.types.ts`, `mqtt-message.schema.ts`, `mqtt-telemetry.adapter.ts`; `backend/src/services/telemetry-ingestion.service.ts`; `backend/src/repositories/sensor-reading.repository.ts`; `backend/prisma/schema.prisma:446`.

Đặc biệt, ingest hiện gọi evaluator production cho operational readings theo guard sẵn có. **Không nối pure SHADOW engine vào evaluator này** để tránh vô tình kế thừa side effects. Cả việc `source=MQTT` và replay history trong DB đều không được dùng làm bằng chứng verified duy nhất.

## 7. Thiết kế Phase13.4 đề xuất — chưa triển khai

1. **Server-owned receipt envelope**: capture thụ động metadata ngay ở boundary MQTT đã validate, gồm envelopeId/digest, topic/device/sensor, callbackReceivedAt, recordedAt, retain/dup/QoS, topic match, backend subscription generation, verified-by-policy version. Cache bounded có TTL, reset trust khi reconnect/restart. Không ghi command, rule, reading giả hoặc chạy evaluator từ adapter này.
2. Liên kết receipt với readingId/value/time đã lưu qua đường backend kiểm soát; nếu không chứng minh được match hoặc receipt thiếu thì NOT_VERIFIED/BLOCKED. Observer độc lập như probe hôm nay là bằng chứng chẩn đoán, **không tự thay thế correlation chính xác trong pipeline production**.
3. Dedupe và high-water per-sensor/session: loại retained, packet/application duplicate, out-of-order, future/stale; không refresh timestamp cho dữ liệu cũ. So cả recordedAt và callbackReceivedAt; DB receivedAt bổ trợ chứ không thay exact receipt time.
4. Fresh OFF envelope cùng verification generation, ghi rõ đây là backend session hay device session. Chưa có device boot ID thì phải ghi giới hạn/contract được duyệt; thiếu chứng minh → fail-closed, không tạo session giả chỉ để thỏa schema engine. Không thêm MQTT field/topic trong Phase13.3C.
5. Clock-health adapter **read-only**: kết quả typed HEALTHY/UNHEALTHY/UNKNOWN, source/status/error/offset/checkedAt/TTL, phát hiện rollback và invalidation. Không tự resync hoặc đổi Windows config. Lỗi quyền đọc/timeout/TTL stale → UNKNOWN. Runtime cap1giây và firmware guard2giây không bị nới.
6. Backend snapshot assembler được kiểm soát quyền/farm/device; không nhận client flags verified/authenticated/trusted. Cần đọc cycle/budget/safety từ nguồn đã được phê duyệt, không lấy PG test instance làm production ledger. Nếu chỉ mô phỏng độc lập không có trusted cycle/budget, ghi VERIFIED_READING_ONLY hoặc NOT_VERIFIED, không giả vờ toàn snapshot đã verified.
7. Chỉ gọi pure engine với `mode=SHADOW`, không import gateway/command service/scheduler. GET preview hiện chỉ FIXTURE/MOCK; không tự mở source VERIFIED_LIVE trong phiên này. Endpoint đọc riêng/contract nguồn phải được review với authentication/scope và cảnh báo rõ không điều khiển bơm.
8. Test offline và mock receipt đủ guard, rồi kiểm chứng cửa sổ live ngắn có đối chiếu envelope→DB→API; không cấp quyền ACTIVE. Persistence production/migration hoặc hardware automation vẫn cần phê duyệt riêng.

## 8. Calibration/data quality SOIL_01

Config local đang dùng dryADC3500, wetADC1507. `firmware/SmartAgricultureESP32/PumpProtocol.h:125` tính `100*(dry-adc)/(dry-wet)` rồi clamp0..100. Với ADC3166 trong Serial: xấp xỉ **16.76%**, nhất quán phép tính cấu hình, **không chứng minh phần trăm độ ẩm thể tích hoặc phù hợp cây/đất**.

`FirmwareDiagnostics.h` có kiểm tra calibration/ADC/range/rail; metadata này chưa được backend nhận qua JSON telemetry. Cần hiệu chuẩn dry/wet theo đầu dò/nguồn/đất thực, đánh giá nhiễu/mất cảm biến/đầu dò ăn mòn/giá trị clamped, khoảng ổn định và sample liên tiếp. Không mặc định soil0 là missing hoặc đủ lý do tưới; không dùng ngưỡng fixture20/40 làm ngưỡng tưới thật. Không hiệu chuẩn hay sửa firmware trong Phase này.

## 9. An toàn, file thay đổi và bàn giao

- Thêm `backend/scripts/phase13-3c-observe.ts` và báo cáo này; artifacts `report/phase13_3c/`. Không sửa runtime source, Prisma schema, migration, firmware, `.env`, ACL/password/firewall hoặc UI.
- Startup runtime PID2984 chứng minh false/false/testMode=true/cap1s; API control disabled. SELECT cuối03:06:57.245Z: **PENDING=0**, số command phiên vật lý cũ vẫn2, không command mới.
- Production PostgreSQL PID7848 không restart, schema SHA256 vẫn `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`. Cluster test55433 vẫn dừng, dữ liệu không bị đụng tới.
- Không gửi ON/OFF, không simulator, không ép OFF DB. Chỉ app ingest/recovery/presence bình thường được khôi phục cùng backend. Không tuyên bố toàn DB không ghi vì telemetry thật đang được lưu.
- Giữ adapter bơm rút điện theo yêu cầu/điều kiện đã xác nhận; không cấp nguồn hoặc thay phần cứng. Serial OFF không chứng minh trạng thái motor/nước.
- Không chạy lại 38 PG integration/243 regression của Phase13.3B, không browser E2E mới, không monitor kéo dài. Probe đã tự kết thúc, broker/backend tiếp tục hoạt động.

**Điều kiện chuyển sang VERIFIED_LIVE Phase13.4:** phê duyệt phạm vi adapter read-only; chốt receipt provenance/auth/session contract và calibration policy; có clock adapter fail-closed; chứng minh match reading/OFF cùng generation; có nguồn cycle/budget/safety hợp lệ; tests bảo đảm không có command/gateway side effects. Hiện chưa đủ nên giữ **PHASE13_4_NOT_READY**, không tự kích hoạt.
