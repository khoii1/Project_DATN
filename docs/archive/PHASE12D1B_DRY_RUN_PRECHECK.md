# Phase12D.1B — Precheck và kết quả Dry Run đã thực hiện

## Trạng thái mới nhất — 16/10/2026, 21:22 UTC+7

**Phiên được phê duyệt đã gửi đúng 1 ON + 1 OFF qua API. PASS luồng API/MQTT/ESP32/ACK/PostgreSQL; frontend trực tiếp NOT VERIFIED. Đã hoàn nguyên commands=false, automation=false, runtime DISABLED/controlEnabled=false, 0 PENDING. Không kích hoạt máy bơm vật lý.**

| Điều kiện / bài thử | Bằng chứng | Kết quả |
| --- | --- | --- |
| OFF mới sau backend reload 14:11:15.826Z | State OFF/BOOT recordedAt14:16:56.564Z, broker nhận14:16:56.749Z; DB/API khớp | PASS |
| Firmware / adapter | Serial14:17:51.591Z DISABLED/GPIO OFF/NTP SYNCED; adapter rút điện theo người dùng | PASS theo xác nhận, không đo điện độc lập |
| Windows Time | Leap0/Stratum5; 21:20:50–54 offset −2.4871/+7.3237/−1.3759ms | PASS trong mẫu đo |
| Backend / DB / broker / migration / ACL | Health kết nối; migration đã áp dụng, không chạy lại; command/ACK/state được giao và xử lý thật | PASS |
| Gate trước ON | Device ONLINE, PUMP_01 OFF mới, pending0, command runtime MQTT, automation=false | PASS |
| ON duy nhất, maxRunSeconds1 | ACK REJECTED/PUMP_COMMANDS_DISABLED, DB FAILED với acknowledgedAt; không ACK_TIMEOUT | PASS |
| OFF duy nhất | ACK APPLIED, DB SUCCESS, state OFF mới | PASS |
| API chuyển trạng thái | HTTP202 PENDING → GET FAILED hoặc SUCCESS; toàn bộ snapshot trong trial OFF | PASS |
| Website render / polling UI2s | Browser tích hợp không khả dụng; không thay kiểm thử UI bằng API | NOT VERIFIED |
| Hoàn nguyên | .env hash khớp backup; backend start14:22:08.3538072Z; GET14:22:48.821Z DISABLED/controlEnabledfalse | PASS |
| Pending / telemetry / presence cuối | 0 PENDING; ONLINE; đủ4 readings MQTT recordedAt14:22:36.591Z | PASS |
| OFF tồn tại sau recovery cuối | DB/API thực tế UNKNOWN, không ép OFF | Chưa giải quyết |
| Máy bơm vật lý / nước / đo GPIO độc lập | Adapter ngắt điện, không thực hiện | NOT VERIFIED |

### Command mới (2026-10-16 UTC)

| Thuộc tính | ON | OFF |
| --- | --- | --- |
| commandId/correlationId | c38e4482-c49c-44b6-aa69-72e311cdcad3 | edf66e25-4533-4342-99b2-1a749d44273a |
| DeviceCommand.id | cmvb23jxb004vum2wt6sv0zw9 | cmvb23onl004zum2w03m6fkcc |
| requestedAt | 14:21:55.482Z | 14:22:01.611Z |
| acknowledgedAt | 14:21:55.670Z | 14:22:01.755Z |
| completedAt | 14:21:55.671Z | 14:22:01.756Z |
| Kết quả | FAILED / REJECTED: PUMP_COMMANDS_DISABLED | SUCCESS / APPLIED |

FAILED của ON là kết quả từ chối đúng kỳ vọng; không phải lỗi bài dry run. ACK state ON là trạng thái yêu cầu, không xác nhận GPIO ON. Firmware phát OFF sau ON bị từ chối (recordedAt14:21:55.677Z), rồi OFF sau lệnh OFF (14:22:01.737Z).

Thời gian capture: 14:21:30.758Z–14:22:51.166Z. Payload command/ACK/state nguyên bản, API PENDING và SELECT chi tiết được ghi tại [báo cáo Dry Run](PHASE12D1_MQTT_DRY_RUN_REPORT.md), artifact cục bộ `build/phase12d1-evidence-2026-10-16T14-21-30-758Z.json`.

### Hoàn nguyên và giới hạn

Backup: `C:\DATN\backups\backend-env-phase12d1b-approved-20261016-211104-599.bak` (bí mật, không chia sẻ/commit). Hai biến tạm đã được loại bỏ để khôi phục .env nguyên bản byte-identical; defaults cả hai false, đã kiểm tra runtime thực tế, không chỉ đọc file. Backend mới PID23440; không sửa nội dung server.ts, chỉ mtime để watcher reload.

SELECT cuối14:22:50.448Z: đúng2 lệnh mới, pending0; command cũ741478cf-1204-47dd-8709-7a6db3cf7be3 vẫn FAILED/ACK_TIMEOUT. Device ONLINE,lastSeen14:22:42.046Z; bốn readings sourceMQTT: TEMP24.2/HUM50.4/SOIL33.07/LIGHT2.5, recordedAt14:22:36.591Z/receivedAt14:22:36.827Z. Health PostgreSQL/MQTT connected.

**State cuối UNKNOWN là kết quả recovery sau reload hoàn nguyên**, timestamp OFF lịch sử14:22:01.737Z không phải báo cáo mới trong session cuối. Không reset ESP32 thêm/ép DB/phát OFF giả để làm đẹp kết quả. Đề xuất riêng báo cáo GPIO OFF định kỳ hoặc đồng bộ chỉ đọc theo yêu cầu có UTC mới; chưa thay firmware hay contract.

Không thay migration, ACL, firmware, Wi-Fi, guard2s, automation logic hoặc nguồn adapter. Harness/observer đã dừng. Quota phiên đã dùng hết, không gửi lại ON/OFF. UI cần nghiệm thu chỉ đọc lịch sử lệnh và trạng thái khóa, không bấm thử thêm.

---

## Lịch sử Giai đoạn A — nội dung TRUE/chờ EN dưới đây không còn là trạng thái hiện tại


## Snapshot lịch sử — 16/10/2026, khoảng21:11 UTC+7

**Người dùng đã phê duyệt riêng phiên mới và xác nhận adapter5V vẫn rút điện, firmware DISABLED/GPIO OFF, Wi-Fi/MQTT/NTP hoạt động, Serial timestamp14:06:56.996Z. Chỉ thực hiện Giai đoạn A; chưa gửi POST ON/OFF.**

- Đo gần thời điểm chuẩn bị21:10:13–22: Windows Leap0/Stratum5, Source time.windows.com, Last Sync Error0. Stripchart: +5.5560, +20.2671, +25.5283, +3.3988, +25.3686ms. Không còn độ lệch3.5s trong mẫu đo, không nới guard2s.
- SELECT trước reload14:10:22.728Z: Device ONLINE, pending0; bốn MQTT readings chung recordedAt14:10:11.996Z/receivedAt14:10:12.333Z; OFF trước reload13:52:57.293Z chỉ dùng baseline, không dùng để vượt precheck sau reload. Targeted SELECT timestamp Serial14:06:56.996Z khớp4 readings MQTT.
- Backup .env trước sửa: `C:\DATN\backups\backend-env-phase12d1b-approved-20261016-211104-599.bak`, hash khớp. Có bí mật, không chia sẻ/commit.
- Đã thêm tạm commands=true/automation=false; reload watcher hiện hữu bằng mtime server.ts, không sửa nội dung source. Backend PID12240 →15656, **start2026-10-16T14:11:15.826Z =21:11:15.826 UTC+7**.
- Authenticated GET actuator14:11:19.317Z HTTP200: gatewayMode MQTT, controlEnabled true, Device ONLINE, currentState UNKNOWN/lastStateChangedAt13:52:57.293Z. Health database/MQTT connected; pending0, newCommands0. Source readiness chỉ bật sau grant subscription group ACK/state/telemetry/status, không đồng nghĩa đã có ACK thử nghiệm.
- Observer passive đang chạy, không publish hoặc API command: tool session22359, capture `build/phase12d1-stageA-1792159865492.ndjson`. Subscribe state/ACK/status QoS1 thành công, nhận heartbeat ONLINE live; tới kiểm tra cuối chưa có state OFF mới. Không dùng retained OFFLINE cũ hoặc ép DB OFF.
- **Dừng để người dùng nhấn EN một lần**, giữ adapter rút điện và gửi Serial mới. B cần OFF trực tiếp có timestamp sau14:11:15.826Z, commit đúng DB/API; nếu còn UNKNOWN không gửi ON. User đã cho phép phiên này, không yêu cầu phê duyệt lặp lại chỉ vì đang phối hợp EN.
- Quota hiện tại **0 ON /0 OFF**, chưa có CommandId/ACK mới; old command giữ nguyên. Cờ commands tạm **TRUE** để chờ phối hợp theo Giai đoạn A, automation FALSE. Hoàn nguyên C chưa thực hiện vì phiên chưa thử/kết thúc; bắt buộc finally khóa và verify khi trial kết thúc hoặc bị hủy/lỗi.
- Không tự reset ESP32, không firmware/migration/broker/ACL/time-policy changes, không bật adapter. Không bấm Bật/Tắt website khi đang chờ.

| Giai đoạn phiên mới | Kết quả |
| --- | --- |
| Windows/telemetry/pending/safety confirmation/bản backup | PASS (phần điện/GPIO theo xác nhận người dùng) |
| Backend command-runtime ready, automation false | PASS qua config/GET thật |
| OFF mới sau reload | NOT VERIFIED, chưa nhận; trạng thái UNKNOWN được giữ an toàn |
| ON/ACK và OFF trial | NOT VERIFIED, chưa gửi |
| Website/UI trực tiếp | NOT VERIFIED |
| Hoàn nguyên cuối phiên | Chưa tới bước này; hiện commands TRUE có chủ đích chờ EN |

---

## Nhật ký PRECHECK trước phê duyệt (lịch sử; xem kết quả mới nhất ở đầu báo cáo)

Ngày16/10/2026, kiểm tra20:59–21:03 UTC+7. **Chỉ PRECHECK. Không bật commands, không gửi ON/OFF, không reset/nạp ESP32, không chạy migration hoặc sửa database. Chưa phê duyệt/chạy phiên Command/ACK mới.**

## 1. Kết luận readiness

Hạ tầng và offset đo hiện tại đạt precheck: Windows synchronized, ESP32 ONLINE/telemetry mới, PUMP_01 OFF trong DB, flags khóa/pending0. **Điều kiện vật lý/firmware ở thời điểm phiên mới còn cần xác nhận lại của người dùng.** Đã hỏi riêng adapter còn rút điện và Serial hiện DISABLED/RELAY OFF; chưa ghi nhận phản hồi mới trong báo cáo này.

Không coi sample config=false hoặc OFF trong DB là bằng chứng binary firmware không thể HIGH; không dùng precheck này để tự mở feature flag. Cần phê duyệt riêng cho phiên mới tối đa một ON/một OFF.

## 2. Windows Time — kiểm tra trực tiếp

Đã chạy query status verbose và stripchart5 mẫu, không resync hay thay cấu hình:

| Chỉ số | Kết quả |
| --- | --- |
| Source | time.windows.com,0x9 |
| Leap Indicator | 0 — no warning |
| Local Stratum | 5 — synchronized secondary reference |
| Last Successful Sync | 16/10/2026 20:48:02 UTC+7 |
| Last Sync Error | 0 — completed successfully |
| Phase Offset | 0.0052004s |
| State Machine | Hold |
| Root Dispersion | 7.7752107s |

| Giờ local | Offset so với time.windows.com |
| --- | --- |
| 20:59:15 | +11.4820ms |
| 20:59:17 | +14.3520ms |
| 20:59:19 | +14.1634ms |
| 20:59:21 | +6.8724ms |
| 20:59:23 | +9.9955ms |

Trung bình11.3731ms, range6.8724–14.3520ms, ổn định trong5 mẫu và thấp hơn nhiều so với guard2s/mục tiêu500ms. Root Dispersion còn cao, thời gian quan sát ngắn: không chứng nhận sai số UTC tuyệt đối hoặc ổn định dài hạn từ5 mẫu. Giữ nguyên nguồn/tolerance; đo lại sát phiên thử là cần thiết.

## 3. ESP32 / backend / PostgreSQL

SELECT transaction READ ONLY lúc **2026-10-16T13:59:24.297Z =20:59:24.297 UTC+7**:

- Database smart_agriculture, PostgreSQL port5432, transaction_read_only=on, cấu hình backend/.env.
- Broker172.20.10.2:1883. GET health20:59:24.484: database/MQTT connected.
- ESP32-GF-A-01 ONLINE, lastSeenAt13:59:12.677Z.
- PUMP_01 currentState OFF, lastStateChangedAt **13:52:57.293Z**; không dùng mốc MOCK13/10. Lượt này chưa có fresh state capture để thay cho yêu cầu OFF sau lần reload tương lai.
- Commands=false, automation=false trong config/default. Chưa thực hiện authenticated GET controlEnabled ở lượt precheck này; đã xác minh runtime khóa trong phiên trước và không có thay đổi cờ trong lượt này. Health connected không tự chứng minh quyền điều khiển bật/tắt.
- Pending=0. Command cũ741478cf-1204-47dd-8709-7a6db3cf7be3 vẫn FAILED/ACK_TIMEOUT, acknowledgedAt=null; không sửa hoặc tái sử dụng.

| Sensor | Value | Latest recordedAt UTC | receivedAt UTC | Source |
| --- | --- | --- | --- | --- |
| TEMP_01 | 24.6°C | 13:59:11.996Z | 13:59:12.314Z | MQTT |
| HUM_01 | 52% | 13:59:11.996Z | 13:59:12.314Z | MQTT |
| LIGHT_01 | 2.5lux | 13:59:11.996Z | 13:59:12.314Z | MQTT |
| SOIL_01 | 30.41% | 13:59:11.996Z | 13:59:12.314Z | MQTT |

Bộ liền trước recordedAt13:58:56.996Z, receivedAt13:58:57.337Z. Khoảng đo15s, apparent delay341ms và318ms. Không có dấu hiệu timestamp mới trễ3.5s như trước sửa Windows.

Subscribe telemetry chỉ đọc, không publish, client ID riêng, cửa sổ tối đa40s nhận hai payload live không-retained:

| Backend observer receipt UTC | ESP32 recordedAt UTC | Apparent delay |
| --- | --- | --- |
| 14:00:42.396Z | 14:00:41.996Z | 400ms |
| 14:00:57.348Z | 14:00:56.996Z | 352ms |

Cả hai đủ TEMP/HUM/LIGHT/SOIL, timestamp tăng15s. Collector dừng theo timeout sau2 mẫu (không phải3), không còn tác vụ gửi lệnh trong nền. Chênh lệch này là tổng offset + thời gian đọc/publish/mạng/queue, **không đo riêng offset ESP32 hoặc chứng minh tuyệt đối <500ms**. Telemetry phù hợp clock UTC có milliseconds; firmware source đã audit chỉ gửi khi reliableClock, nhưng không đọc được NTP callback/Serial live ở lượt này. Không cộng UTC+7 vào giá trị lưu, giờ local chỉ là cách hiển thị.

## 4. Firmware, ACL và safety gate

- config.example.h giữ ENABLE_PUMP_COMMANDS=false, GPIO26; không sửa firmware/local config. Serial gần nhất người dùng cung cấp13:07:11.996Z có PUMP_COMMANDS DISABLED/RELAY OFF/NTP SYNCED. Đây là bằng chứng lịch sử, không gán thành Serial mới21:00.
- Đã yêu cầu người dùng xác nhận **hiện tại** adapter5V vẫn rút điện và Serial vẫn DISABLED/OFF. Cho đến xác nhận đó, physical/binary gate là NOT VERIFIED, không được tự chạy ON.
- ACL thực tế C:/mosquitto/config/acl vẫn có backend write commands/read ACK, device namespace read commands/write ACK, state read/write exact ESP32-GF-A-01. Telemetry/status giữ nguyên, không sửa/restart broker.
- Source contract và regression đã audit ở Phase12D/12D.1A; không chạy lại software suites hoặc thử publish command chỉ để chứng minh readiness trong precheck này.
- Không có nguyên nhân kỹ thuật mới FAIL từ dữ liệu đo hiện tại; còn các phần NOT VERIFIED không được đổi thành PASS.

## 5. PASS / FAIL / NOT VERIFIED

| Điều kiện | Kết quả |
| --- | --- |
| Windows Time synchronized, không còn Local CMOS chưa sync | PASS |
| Offset Windows–NTP lặp đủ nhỏ trong mẫu hiện tại | PASS,7–14ms |
| Telemetry mới/UTC milliseconds/chu kỳ15s | PASS |
| Windows–ESP32 clock offset tuyệt đối <2s | NOT VERIFIED độc lập; chênh đo→nhận318–400ms phù hợp, chưa có dấu hiệu vi phạm |
| Backend/broker/PostgreSQL hoạt động | PASS qua health/SELECT/passive subscribe |
| PUMP_01 OFF trong DB hiện tại | PASS, timestamp mới16/10 |
| Firmware binary hiện tại DISABLED và GPIO thực OFF | NOT VERIFIED độc lập; đang chờ người dùng xác nhận hiện tại |
| Adapter hiện còn rút điện | NOT VERIFIED mới; đã hỏi người dùng |
| Commands/automation khóa trong cấu hình, pending0 | PASS cấu hình/DB; GET command-runtime chưa làm lại ở lượt này |
| ACL Command/ACK/State trên đĩa | PASS; publish/ACK phiên mới chưa thử |
| Command cũ giữ FAILED/ACK_TIMEOUT | PASS |
| OFF mới sau reload mở cờ của phiên tương lai | NOT VERIFIED, chưa được phép mở cờ/reload |
| Website/API PENDING→REJECTED/APPLIED phiên mới | NOT VERIFIED, chưa gửi request và chưa xem browser |

## 6. Kịch bản đề xuất — CHƯA THỰC THI, cần phê duyệt riêng

1. Người dùng xác nhận adapter vẫn ngắt nguồn, firmware thực DISABLED/relay OFF. Phê duyệt một phiên mới, không coi quyền phiên ON cũ đã dùng là quyền retry.
2. Backup cấu hình, đo lại offset gần lúc thử, kiểm tra migration/pending/automation false. Giữ command cũ không đổi và không tái dùng UUID.
3. Sau duyệt mới bật commands=true, automation=false; reload backend hiện hữu; xác minh MQTT subscriptions và runtime GET gatewayMode MQTT/controlEnabled=true. Chấp nhận recovery UNKNOWN, không sửa DB.
4. **Chờ OFF trực tiếp mới từ ESP32 với timestamp sau reload**. Nếu cần phối hợp EN/reconnect, chỉ yêu cầu người dùng ở phiên được duyệt; precheck này không reset. Kiểm tra raw MQTT non-retained, backend commit, DB/API cùng OFF/timestamp mới. Nếu UNKNOWN thì dừng, không ON.
5. POST ON tối đa1 lần qua API có quyền hoặc UI hiện hữu, maxRunSeconds=1. Backend sinh UUID mới; không publish MQTT trực tiếp, không tự retry khi HTTP/ACK mơ hồ. Kỳ vọng REJECTED/PUMP_COMMANDS_DISABLED, DeviceCommand FAILED với ACK hợp lệ/acknowledgedAt và lý do đúng, state OFF riêng được chấp nhận. Không optimistic ON; GPIO/motor cần phân biệt với feedback phần mềm.
6. FUTURE_COMMAND/ACK_TIMEOUT/ON bất thường hoặc bất cứ reason khác → dừng, không gửi lại ON, không tự gửi OFF trial nếu nhánh ON chưa đạt. Chỉ khi ON an toàn đúng kỳ vọng mới gửi tối đa1 OFF để kiểm chứng APPLIED/LOW, không coi ACK là motor hoặc nước.
7. Finally trả commands=false và automation=false, reload nếu cần; authenticated GET phải gatewayMode DISABLED/controlEnabled=false, pending0. Ghi nhận UNKNOWN sau recovery nếu xảy ra, không ép OFF hoặc dùng retained replay.
8. Báo cáo raw payload command/ACK, UUID, requested/sent/ack/expires timestamps, DB/API và UI thật. Website chưa quan sát thì NOT VERIFIED, không thay bằng kết quả API.

Kiểm tra kết thúc lúc14:02:49.124Z (=21:02:49.124 UTC+7): commands=false, automation=false, pending0, số DeviceCommand mới từ13:59Z=0.

**Handoff:** precheck kết thúc. Chờ xác nhận điều kiện vật lý/firmware và phê duyệt riêng trước khi thực hiện bất kỳ bước mở cờ hoặc gửi lệnh nào. Không thay đổi code/tolerance/firmware/migration; chỉ tạo báo cáo này và đọc dữ liệu.
