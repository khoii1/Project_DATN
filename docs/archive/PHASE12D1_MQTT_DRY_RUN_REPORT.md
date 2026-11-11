# Phase12D.1 — Kết quả Dry Run thực tế sau đồng bộ thời gian

## Kết quả hiện tại — 16/10/2026, 21:22 UTC+7

**PASS luồng API → backend → Mosquitto → ESP32 → ACK → PostgreSQL → API. Đã gửi đúng một ON và một OFF. ON bị từ chối đúng PUMP_COMMANDS_DISABLED, OFF được APPLIED. Không thử máy bơm vật lý. Giao diện trình duyệt trực tiếp: NOT VERIFIED.**

Phiên capture bắt đầu 2026-10-16T14:21:30.758Z, kết thúc 2026-10-16T14:22:51.166Z (UTC). Các phần lịch sử bên dưới được giữ để kiểm toán, không đại diện cấu hình hiện tại.

### 1. Safety gate và OFF mới — PASS

- Adapter 5V vẫn rút điện theo xác nhận người dùng; Serial mới lúc 14:17:51.591Z báo PUMP_COMMANDS DISABLED, RELAY OFF, WiFi/MQTT/NTP CONNECTED/CONNECTED/SYNCED. Không nạp firmware, không thay GPIO hoặc cấp nguồn bơm.
- Backend reload chuẩn bị: **2026-10-16T14:11:15.826Z**.
- Capture broker `build/phase12d1-stageA-1792159865492.ndjson` nhận OFF/BOOT lúc **14:16:56.749Z**, recordedAt **14:16:56.564Z**, QoS 1, retain=false, dup=false. Đây là báo cáo mới sau reload, không phải OFF MOCK hay timestamp cũ:
```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"BOOT","recordedAt":"2026-10-16T14:16:56.564Z"}
```
- SELECT và GET authenticated trước trial khớp OFF/lastStateChangedAt 14:16:56.564Z, Device ONLINE, pending=0. Bốn SensorReading source MQTT khớp timestamp Serial 14:17:51.591Z và các giá trị 24.2/50.7/1.67/34.07.
- Windows query: Leap 0, Stratum 5, source time.windows.com; stripchart 21:20:50/52/54 có offset −2.4871/+7.3237/−1.3759 ms. Không resync/thay policy hoặc nới guard FUTURE_COMMAND 2 giây. ACK thực tế được backend chấp nhận, không FUTURE_COMMAND/ACK_TIMEOUT trong phiên mới.
- Migration Phase 12 đã áp dụng; không chạy migration/db push/seed. Quyền command/ACK/state hoạt động thực tế qua capture và cập nhật DB, không sửa ACL/restart broker.
- Commands runtime MQTT/controlEnabled=true, automation=false; pending=0 trước ON. Observer dùng client ID riêng, chỉ subscribe, không publish trực tiếp hoặc dùng simulator. Nguồn ACK được đối chiếu firmware, commandId và reported state; không coi PUBACK là DB đã cập nhật.

### 2. Lệnh qua API và kết quả PostgreSQL — PASS

Đăng nhập owner qua cơ chế hiện hữu, không bypass RBAC. Endpoint:
`POST /api/actuators/demo_actuator_pump_a/commands`.

ON body `{"command":"TURN_ON","maxRunSeconds":1}`; OFF body `{"command":"TURN_OFF"}`.
Cả hai HTTP 202 trả PENDING, không đồng nghĩa thi hành thành công. Không retry ON.

| Trường | ON dry run | OFF |
| --- | --- | --- |
| commandId / correlationId | c38e4482-c49c-44b6-aa69-72e311cdcad3 | edf66e25-4533-4342-99b2-1a749d44273a |
| DeviceCommand.id | cmvb23jxb004vum2wt6sv0zw9 | cmvb23onl004zum2w03m6fkcc |
| source / transport | MANUAL / MQTT | MANUAL / MQTT |
| requestedAt | 14:21:55.482Z | 14:22:01.611Z |
| sentAt | 14:21:55.500Z | 14:22:01.625Z |
| expiresAt | 14:22:05.482Z | 14:22:11.611Z |
| maxRunSeconds | 1 | null (không có trong OFF payload) |
| ACK | REJECTED / PUMP_COMMANDS_DISABLED | APPLIED |
| acknowledgedAt | 14:21:55.670Z | 14:22:01.755Z |
| completedAt | 14:21:55.671Z | 14:22:01.756Z |
| DB status | FAILED (đúng kỳ vọng từ chối) | SUCCESS |
| failureReason | REJECTED: PUMP_COMMANDS_DISABLED | null |

Toàn bộ timestamp trong bảng thuộc ngày 2026-10-16 UTC. FAILED của ON là **PASS bài kiểm thử khóa bơm**, không phải ACK timeout. Command cũ 741478cf-1204-47dd-8709-7a6db3cf7be3 vẫn FAILED/ACK_TIMEOUT, không bị sửa.

### 3. Payload MQTT thực tế

Các gói dưới đây được broker giao cho observer qua subscription được cấp quyền; QoS 1, retain=false, dup=false. Không phải payload giả được publish bằng tool. Không có token/mật khẩu. Không trích được stdout broker riêng để khẳng định từng dòng Mosquitto log; capture cộng DB/API là bằng chứng end-to-end.

Nhận **2026-10-16T14:21:55.500Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01`:

```json
{
  "schemaVersion": 1,
  "commandId": "c38e4482-c49c-44b6-aa69-72e311cdcad3",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "maxRunSeconds": 1,
  "issuedAt": "2026-10-16T14:21:55.482Z",
  "expiresAt": "2026-10-16T14:22:05.482Z"
}
```

Nhận **2026-10-16T14:21:55.670Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01`:

```json
{
  "schemaVersion": 1,
  "commandId": "c38e4482-c49c-44b6-aa69-72e311cdcad3",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "result": "REJECTED",
  "recordedAt": "2026-10-16T14:21:55.534Z",
  "reason": "PUMP_COMMANDS_DISABLED"
}
```

Nhận **2026-10-16T14:21:55.859Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`:

```json
{
  "schemaVersion": 1,
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "state": "OFF",
  "reason": "COMMAND",
  "recordedAt": "2026-10-16T14:21:55.677Z"
}
```

Nhận **2026-10-16T14:22:01.625Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01`:

```json
{
  "schemaVersion": 1,
  "commandId": "edf66e25-4533-4342-99b2-1a749d44273a",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "OFF",
  "issuedAt": "2026-10-16T14:22:01.611Z",
  "expiresAt": "2026-10-16T14:22:11.611Z"
}
```

Nhận **2026-10-16T14:22:01.755Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01`:

```json
{
  "schemaVersion": 1,
  "commandId": "edf66e25-4533-4342-99b2-1a749d44273a",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "OFF",
  "result": "APPLIED",
  "recordedAt": "2026-10-16T14:22:01.674Z"
}
```

Nhận **2026-10-16T14:22:01.785Z**, topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`:

```json
{
  "schemaVersion": 1,
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "state": "OFF",
  "reason": "COMMAND",
  "recordedAt": "2026-10-16T14:22:01.737Z"
}
```

**ACK state=ON của lệnh REJECTED phản ánh trạng thái yêu cầu, không phải xác nhận GPIO HIGH.** Hai báo cáo actuator/state sau command đều OFF. GPIO không được đo điện độc lập trong phiên; bằng chứng gồm khóa trong firmware, xác nhận Serial của người dùng và ACK/state thiết bị, không phải bằng chứng động cơ/nước.

### 4. API và frontend

| Thời điểm UTC | Kết quả GET actuator HTTP 200 |
| --- | --- |
| 2026-10-16T14:21:55.613Z | currentState=OFF; command=TURN_ON; status=PENDING |
| 2026-10-16T14:21:56.644Z | currentState=OFF; command=TURN_ON; status=FAILED; reason=REJECTED: PUMP_COMMANDS_DISABLED |
| 2026-10-16T14:22:01.649Z | currentState=OFF; command=TURN_OFF; status=PENDING |
| 2026-10-16T14:22:02.679Z | currentState=OFF; command=TURN_OFF; status=SUCCESS |

API quan sát được PENDING → FAILED/REJECTED cho ON, PENDING → SUCCESS cho OFF; không có snapshot ON. GET dùng đúng API frontend sử dụng; đây **không phải** kiểm thử trình duyệt hay timer polling UI 2 giây. Browser tích hợp không khả dụng (`Browser unavailable: iab`), nên render thông báo/không ON giả trên màn hình và polling UI thực tế là **NOT VERIFIED**. Không tuyên bố hoàn thành toàn bộ Website → ... → Website.

### 5. Hoàn nguyên và kiểm tra cuối — PASS khóa điều khiển

- Backup trước thay đổi: `C:\DATN\backups\backend-env-phase12d1b-approved-20261016-211104-599.bak`. Chứa bí mật, không commit/chia sẻ.
- Đã bỏ hai biến tạm trong .env để khôi phục nguyên bản (hai biến ban đầu không khai báo, defaults=false); SHA hash khớp backup. Không in nội dung .env.
- Reload tsx bằng mtime server.ts, không sửa nội dung source. Backend mới PID 23440, start **14:22:08.3538072Z**.
- GET authenticated **14:22:48.821Z**: HTTP 200, **gatewayMode=DISABLED, controlEnabled=false, currentState=UNKNOWN**, latestCommand=OFF/SUCCESS, acknowledgedAt=14:22:01.755Z.
- SELECT **14:22:50.448Z**: commands=false, automation=false, **0 PENDING**, đúng **2 lệnh mới** trong phiên. Không lệnh tự động/trùng/retry. Device ONLINE, lastSeenAt=14:22:42.046Z.
- Bốn MQTT readings mới sau reload, recordedAt **14:22:36.591Z**, receivedAt **14:22:36.827Z**: TEMP_01=24.2, HUM_01=50.4, SOIL_01=33.07, LIGHT_01=2.5. Health lúc 14:22:50.679Z: PostgreSQL/MQTT connected.
- Harness và observer riêng đã dừng; không gửi thêm lệnh, không reset ESP32 thêm, không ép DB OFF.
- **PUMP_01 cuối phiên UNKNOWN**, lastStateChangedAt vẫn 14:22:01.737Z. OFF đã được báo và xác minh trước reload cuối, nhưng recovery xóa độ tin cậy của state cho session mới. Không dùng timestamp OFF lịch sử để khẳng định currentState OFF sau recovery.

### 6. Vấn đề đồng bộ lâu dài — chỉ đề xuất

`backend/src/mqtt/mqtt-pump-state.adapter.ts:25` / `recoverMqttCommands()` đặt currentState UNKNOWN khi startup có MQTT command history (kể cả cờ false). Firmware `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino` / `sendOffState()` báo OFF theo boot/reconnect/command; backend restart không nhất thiết làm ESP32 reconnect broker. Vì vậy UNKNOWN có thể kéo dài dù telemetry/ONLINE bình thường.

Đề xuất giai đoạn riêng: báo cáo trạng thái định kỳ khi GPIO OFF được xác nhận và UTC hợp lệ, hoặc cơ chế hỏi trạng thái chỉ đọc khi backend sẵn sàng. Phải có recordedAt mới, QoS/retain và reason/schema tương thích, kiểm thử session/replay/offline. Không tự suy OFF từ ONLINE, không sửa DB, không phát lại OFF cũ hoặc nới guard thời gian. Chưa thay firmware/contract trong phiên này.

### 7. Tổng kết nghiệm thu

| Hạng mục | Kết quả |
| --- | --- |
| OFF mới sau reload chuẩn bị / API / DB | PASS |
| Clock / ONLINE / telemetry / automation locked / pending gate | PASS |
| Đúng một ON, maxRunSeconds=1, REJECTED đúng lý do và acknowledgedAt | PASS |
| Đúng một OFF, APPLIED / SUCCESS / reported OFF | PASS |
| API PENDING và kết quả ACK, không ON giả trong snapshot | PASS |
| Khôi phục flags false / runtime DISABLED / 0 PENDING | PASS |
| Telemetry và presence sau hoàn nguyên | PASS |
| OFF duy trì sau backend restart | Chưa giải quyết; thực tế UNKNOWN |
| Render frontend / UI polling 2 giây | NOT VERIFIED |
| Đo GPIO điện độc lập / motor / dòng nước | NOT VERIFIED; không thử bơm vật lý |

Nghiệm thu trên web chỉ đọc: mở trang tưới thủ công, chọn ESP32-GF-A-01/PUMP_01, xem lịch sử đúng hai commandId trên và lý do từ chối ON; OFF SUCCESS không có nghĩa đã thử bơm thật. Sau reload cuối có thể hiển thị Chưa xác định và điều khiển bị khóa. Không nhấn Bật/Tắt thêm, giữ adapter rút điện.

Artifact bằng chứng cục bộ: `build/phase12d1-evidence-2026-10-16T14-21-30-758Z.json` (raw command/ACK/state, HTTP responses, DB snapshots, API polling). Không chạy lại harness vì quota phiên đã dùng hết.

---

## Lịch sử Giai đoạn A — cấu hình TRUE/chờ EN dưới đây không còn là trạng thái hiện tại


## Phiên12D.1B được phê duyệt — Giai đoạn A ngày16/10/2026

Đã nhận xác nhận adapter ngắt/firmware DISABLED/GPIO OFF/Serial14:06:56.996Z. Windows gần lúc chuẩn bị synchronized, offset3–26ms. Đã backup `C:\DATN\backups\backend-env-phase12d1b-approved-20261016-211104-599.bak`, mở tạm commands=true, automation=false, reload backend hiện hữu lúc **2026-10-16T14:11:15.826Z**, PID15656. GET runtime HTTP200 gatewayMode MQTT/controlEnabled true, Device ONLINE, pending0/newCommands0.

PUMP_01 UNKNOWN theo recovery, timestamp OFF trước reload13:52:57.293Z không đủ làm precheck. Chưa nhận OFF mới trong capture `build/phase12d1-stageA-1792159865492.ndjson` lúc kiểm tra cuối. **Chưa gửi ON/OFF trong phiên mới; dừng chờ người dùng nhấn EN và Serial mới, không cần xin phê duyệt lặp lại.**

Chỉ sau state OFF thật có timestamp sau14:11:15.826Z được broker/backend/DB/API đối chiếu và safety gate còn đạt mới dùng quota tối đa1 ON(maxRunSeconds1)/1 OFF. Commands đang TRUE có chủ đích chờ phối hợp, automation FALSE; hoàn nguyên cuối phiên chưa tới bước. Không tự gửi lệnh/khởi động bơm/ép DB. Chi tiết và bảng trạng thái hiện tại ở `docs/PHASE12D1B_DRY_RUN_PRECHECK.md`.

---

## Lịch sử phiên cũ trước đồng bộ giờ — không phải kết quả của phiên12D.1B mới

**Kết quả: đã gửi đúng 1 ON qua API, ESP32 REJECTED/FUTURE_COMMAND; không đạt lý do PUMP_COMMANDS_DISABLED. Backend bỏ ACK không hợp lệ thời gian và ghi FAILED/ACK_TIMEOUT. Không gửi lại ON, không gửi OFF. Đã hoàn nguyên commands=false/automation=false và kiểm tra runtime khóa.**

## K1. Giai đoạn B đã xác minh đạt

- Người dùng xác nhận firmware DISABLED, adapter 5V vẫn rút điện và cung cấp Serial mới. Block `2026-10-16T13:07:11.996Z` khớp đủ bốn SensorReading MQTT: TEMP26, HUM56.1, LIGHT1.67, SOIL27.65.
- Backend reload trước đó `2026-10-16T13:02:41.348Z`.
- Passive broker capture `build/phase12d1-stageA-1792155728502.ndjson` nhận **OFF/BOOT**, QoS1, retain=false, dup=false lúc `13:05:50.349Z`, recordedAt **13:05:46.707Z**, sau reload. Không phải OFF MOCK cũ. Capture là message broker giao cho subscriber thật, không phải payload tự tạo; không đọc được stdout Mosquitto cũ để trích trực tiếp dòng Received PUBLISH.
- SELECT `13:09:18.571Z`: Device ONLINE, PUMP_01 OFF với lastStateChangedAt 13:05:46.707Z; pending=0. Authenticated GET actuator HTTP200 trả đúng OFF/timestamp, controlEnabled=true/gatewayMode MQTT. Chứng minh bản OFF mới đã được handler ghi DB, không chỉ PUBACK.
- Migration và ACL đã được kiểm tra ở A; commands=true, automation=false. Không reset EN lần nữa, không sửa firmware/Wi-Fi/GPIO/migration.

## K2. Phiên Command/ACK thực tế

Capture/harness bắt đầu **2026-10-16T13:09:53.286Z** (20:09:53.286 UTC+7), kết thúc **2026-10-16T13:11:46.836Z** (20:11:46.836 UTC+7), 16/10/2026. Tài khoản chủ trang trại đăng nhập qua API bình thường; không bypass RBAC hoặc tự ký token.

Đúng một POST:
`POST /api/actuators/demo_actuator_pump_a/commands`, body `{"command":"TURN_ON","maxRunSeconds":1}`.

API HTTP202 trả PENDING. **Không retry POST.** Observer device-account chỉ subscribe commands, backend-account chỉ subscribe ACK/state; client IDs riêng không trùng ESP32. Không trực tiếp publish bằng MQTT tool.

| Thuộc tính | Giá trị thật |
| --- | --- |
| Device / Actuator | ESP32-GF-A-01 / PUMP_01 |
| DeviceCommand row ID | cmvazjmcd003fumck92m98f4v |
| commandId / correlationId | 741478cf-1204-47dd-8709-7a6db3cf7be3 |
| source / transport | MANUAL / MQTT |
| requestedAt / issuedAt | 2026-10-16T13:10:26.264Z |
| sentAt (PUBACK) | 2026-10-16T13:10:26.287Z |
| expiresAt | 2026-10-16T13:10:36.264Z |
| maxRunSeconds | 1 |
| ACK thật | REJECTED / FUTURE_COMMAND |
| ACK recordedAt | 2026-10-16T13:10:22.782Z |
| ACK nhận bởi subscriber | 2026-10-16T13:10:26.466Z |
| Kết quả DB cuối | FAILED / ACK_TIMEOUT |
| completedAt | 2026-10-16T13:10:36.265Z |
| acknowledgedAt | null — ACK không vượt qua validation |
| OFF request riêng | **0, không có OFF commandId/ACK APPLIED** |

### Payload Command thật (QoS1, retain=false, dup=false)

Topic `smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01`, nhận lúc `2026-10-16T13:10:26.287Z`:

```json
{
  "schemaVersion": 1,
  "commandId": "741478cf-1204-47dd-8709-7a6db3cf7be3",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "maxRunSeconds": 1,
  "issuedAt": "2026-10-16T13:10:26.264Z",
  "expiresAt": "2026-10-16T13:10:36.264Z"
}
```

### Payload ACK thật (QoS1, retain=false, dup=false)

Topic `smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01`, nhận lúc `2026-10-16T13:10:26.466Z`:

```json
{
  "schemaVersion": 1,
  "commandId": "741478cf-1204-47dd-8709-7a6db3cf7be3",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "result": "REJECTED",
  "recordedAt": "2026-10-16T13:10:22.782Z",
  "reason": "FUTURE_COMMAND"
}
```

**state=ON ở ACK là requested state, không phải báo relay đang ON. result=REJECTED.**

### OFF state riêng thật sau lệnh bị từ chối

Topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`, QoS1/non-retained, nhận lúc `2026-10-16T13:10:26.568Z`:

```json
{
  "schemaVersion": 1,
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "state": "OFF",
  "reason": "COMMAND",
  "recordedAt": "2026-10-16T13:10:22.887Z"
}
```

Đây là báo GPIO OFF theo firmware, không phải ACK của một lệnh OFF và không chứng minh motor/nước. Agent không gửi yêu cầu OFF riêng vì ON không đạt kỳ vọng safety gate.

## K3. Nguyên nhân thất bại đã xác định

1. Command backend issuedAt `13:10:26.264Z`; firmware timestamp khi reject `13:10:22.782Z`, thấp hơn **3.482 giây**. Round trip từ issuedAt đến subscriber nhận ACK khoảng 202ms; telemetry cũng có chênh lệch receivedAt-recordedAt khoảng3.7s. Không quy toàn bộ chênh lệch thành thời gian xử lý mạng.
2. `firmware/SmartAgricultureESP32/PumpProtocol.h::PumpController.apply`, dòng guard `cmd.issuedAt > ctx.utc + 2000` trả **FUTURE_COMMAND** trước bước kiểm tra enable flag. Vì vậy **chưa kiểm chứng được nhánh PUMP_COMMANDS_DISABLED thực tế**, dù Serial/nguồn adapter đã đạt.
3. `backend/src/gateways/mqtt-device.gateway.ts::handleAck` chặn `recordedAt < issuedAt - 2000ms`. ACK22.782Z < ngưỡng24.264Z nên không được settle; pending tồn tại đến timer rồi FAILED/ACK_TIMEOUT. Raw ACK có trên broker, nhưng **không đồng nghĩa acknowledgedAt phải được ghi**. Backend stdout không trích được ở phiên này; điều kiện guard, raw timestamps và DB result là bằng chứng quyết định.
4. OFF state COMMAND22.887Z vẫn nằm trong giới hạn receipt-age30s, nên lưu OFF. Nhưng `cancelActuator` chỉ hủy pending ON nếu issuedAt<=stateAt; ở đây26.264Z>22.887Z nên pending không bị hủy. Đến timeout, service ghi UNKNOWN theo thiết kế; lastStateChangedAt vẫn giữ22.887Z.
5. Lệnh chỉ đọc `w32tm /query /status` trả **Leap Indicator=3 (not synchronized), Stratum=0, Last Successful Sync Time=unspecified, Source=Local CMOS Clock**. Chứng minh Windows chưa đồng bộ NTP, phù hợp lỗi hai đồng hồ vượt tolerance. Firmware cấu hình SNTP pool.ntp.org/time.google.com. Chưa đo độc lập offset với nguồn UTC chuẩn nên không gán sai số tuyệt đối cho từng đồng hồ.
6. Không phải lỗi ACL/đường truyền command: raw command đúng UUID và raw ACK/state thật đã nhận. Không tăng tolerance, đổi reason, sửa clock hoặc phát lại ON để “làm cho PASS”.

Theo source guard và ACK REJECTED, nhánh write HIGH không được chạy cho lệnh này; **không đo điện GPIO26 độc lập**, nên không báo PASS đo phần cứng hoặc motor. Người dùng giữ adapter ngắt điện; không có thử bơm vật lý.

## K4. Hoàn nguyên, database/API cuối phiên

Khối finally xóa hai dòng tạm, khôi phục .env byte-identical với backup:
`C:\DATN\backups\backend-env-phase12d1-stageA-20261016-200207-765.bak`.
Không chia sẻ backup vì chứa secrets. Watcher reload source mtime (không sửa nội dung), server listener PID12240 sau hoàn nguyên.

Authenticated GET lúc **13:11:44.702Z**:
- HTTP200, **controlEnabled=false**, **gatewayMode=DISABLED**.
- currentState UNKNOWN, latestCommand FAILED/ACK_TIMEOUT, acknowledgedAt=null.
- Device ONLINE.

SELECT độc lập **13:11:46.395Z**:
- commands=false/automation=false theo config default cũ; backup hash khớp.
- **Đúng 1 DeviceCommand mới**, correlationId nêu trên; **pending=0**.
- Device ONLINE, lastSeenAt13:11:45.690Z.
- PUMP_01 **UNKNOWN**, lastStateChangedAt13:10:22.887Z. Không ép DB OFF.
- Bốn readings MQTT chung recordedAt13:11:41.996Z, receivedAt13:11:45.696Z: TEMP25.7, HUM55.1, SOIL27.3, LIGHT2.5.
- Harness/observer command/ACK đã đóng; observer A chỉ đọc cũng đã dừng. Không còn tác vụ gửi lệnh trong nền.
- Adapter không được cấp điện; không sửa/nạp firmware, GPIO, Wi-Fi, schema/migration, broker/ACL hoặc đồng hồ Windows.

## K5. Frontend và bằng chứng

API polling của harness có **16 samples**, trạng thái chỉ **OFF → UNKNOWN**, chưa bao giờ ON. HTTP202 ban đầu PENDING, sau expiry API trả FAILED/ACK_TIMEOUT; không SUCCESS giả. Đây là API polling khoảng1s phục vụ kiểm thử, **không phải** bằng chứng browser polling2s.

Website trực tiếp PENDING/FAILED/không ON giả: **NOT VERIFIED**, Browser tích hợp không khả dụng ở các phiên trước, không thao tác click UI. Không lấy kết quả API thay cho quan sát website. Theo source Irrigation hiện hữu, latestCommand FAILED/failureReason sẽ hiển thị qua polling nhưng lần này chưa nghiệm thu trực quan.

Evidence thật, không credentials/token:
`build/phase12d1-evidence-2026-10-16T13-09-53-286Z.json`.
File gitignored gồm1 response HTTP,3 MQTT packets,16 API polling snapshots và các SELECT snapshots. Evidence cũ và nhật ký A giữ lại để không mất dấu các lần precheck; chỉ file timestamp mới này chứng minh lượt POST thật.

## K6. PASS / FAIL / NOT VERIFIED

| Bước | Kết quả |
| --- | --- |
| B: OFF mới sau reload, broker → handler → DB/API | PASS, BOOT timestamp13:05:46.707Z |
| Serial mới khớp bốn readings/disabled theo người dùng | PASS đối chiếu, không kiểm chứng điện độc lập |
| API auth/RBAC, command QoS1/non-retained đúng topic/UUID | PASS thực tế |
| ESP32 nhận ON và gửi ACK | PASS về transport |
| ON REJECTED đúng lý do PUMP_COMMANDS_DISABLED | **FAIL: FUTURE_COMMAND** |
| Backend lưu ACK REJECTED như kỳ vọng | **FAIL nghiệp vụ trial: ACK bị chặn thời gian, DB ACK_TIMEOUT** |
| Chặn ACK sai thời gian / không SUCCESS giả | PASS fail-closed |
| OFF command riêng / ACK APPLIED | NOT VERIFIED, chủ động không gửi sau ON bất thường |
| UI browser live / polling2s | NOT VERIFIED |
| API không trả ON giả | PASS trong16 snapshot |
| Hoàn nguyên flags, runtime khóa, pending=0 | PASS |
| Relay OFF sau hoàn nguyên | Không đạt: UNKNOWN, không che lỗi |
| Presence/telemetry tiếp tục | PASS SELECT thật |
| Bơm vật lý | Không thử, nguồn ngắt theo người dùng |

**Phiên dry-run FAIL có kiểm soát, không phải Command/ACK đã hoàn tất PASS. Quota đã dùng1 ON /0 OFF; không tự retry.**

## K7. Đề xuất tiếp theo và thiết kế lâu dài (chưa áp dụng)

- Trước phiên mới, cần phê duyệt đồng bộ Windows Time với nguồn NTP tin cậy, xác minh offset Windows/ESP32 nằm trong tolerance2s; không chỉ nhìn NTP SYNCED của ESP32. Không tự thay service/clock/network policy trong nhiệm vụ kiểm thử này.
- Sau đồng bộ phải kiểm tra lại issue/ACK/receipt timestamps bằng truy vấn và dữ liệu mới; chỉ mở phiên ON mới khi người dùng duyệt. Không replay commandId cũ; không sửa FAILED thành REJECTED hoặc ghi acknowledgedAt giả.
- Backend restart mất session evidence nhưng không làm ESP32 reconnect: đánh giá OFF heartbeat định kỳ khi confirmedOff+clock hợp lệ, dùng UTC mới và non-retained/QoS1, hoặc request state sync riêng không phải lệnh ON/OFF. Cần xác định reason semantics tương thích hợp đồng hiện tại, không tự thêm reason hoặc giả BOOT, và regression stale replay/TTL/reconnect/race/clock skew trước triển khai.
- Chưa đổi firmware/backend safety contract hoặc yêu cầu EN thêm trong phiên đã dừng. UNKNOWN là thiếu bằng chứng mới, không phải bằng chứng bơm đang bật/tắt.

---

## Nhật ký Giai đoạn A và các phiên trước (lịch sử; cờ TRUE dưới đây không còn là hiện trạng)

## Snapshot lịch sử Giai đoạn A — 16/10/2026, 20:02:44 UTC+7

**Giai đoạn A PASS. Đang dừng theo yêu cầu để người dùng reset ESP32; chưa gửi bất kỳ POST ON/OFF nào. MQTT_COMMANDS_ENABLED tạm TRUE, automation FALSE. Không tuyên bố dry-run hoàn tất hoặc đã hoàn nguyên phiên này.**

- Precheck 13:01:43.561Z: ESP32 ONLINE, PUMP_01 UNKNOWN, pending=0; không migration pending, ACL Command/ACK/State đầy đủ trên đĩa. Không thay migration, broker, firmware, Wi-Fi hoặc database để ép OFF.
- Backup cấu hình trước mở cờ: `C:\DATN\backups\backend-env-phase12d1-stageA-20261016-200207-765.bak`. Hash khớp bản gốc. Backup chứa bí mật .env, không chia sẻ/commit.
- Thêm tạm `MQTT_COMMANDS_ENABLED=true` và `MQTT_AUTOMATION_COMMANDS_ENABLED=false`, giữ nguyên phần còn lại. Reload watcher hiện hữu bằng mtime server.ts, không sửa nội dung source. Backend listener PID13780 → PID21188, process start **2026-10-16T13:02:41.348Z**. Báo cáo OFF dùng để nghiệm thu B phải mới hơn mốc này.
- Kiểm chứng authenticated API qua tài khoản chủ trang trại mẫu, luồng login bình thường, không tự ký token hoặc bypass RBAC. GET actuator HTTP200 lúc **2026-10-16T13:02:44.871Z** trả gatewayMode MQTT, controlEnabled=true, Device ONLINE, currentState UNKNOWN. Health database/MQTT connected. Với source hiện hữu, transport chỉ ready khi toàn bộ subscription group (telemetry/status/ACK/state) được grant và outgoing store không đang replay; readiness này là bằng chứng subscribe runtime, không phải bằng chứng đã nhận ACK thực.
- Runtime kiểm tra cùng lúc: commands=true, automation=false, pending=0, commandsDuringStageA=0. Không POST API command, không publish MQTT, không có CommandId/ACK thử nghiệm.
- Chấp nhận UNKNOWN sau recovery; không dùng OFF cũ lastStateChangedAt 12:38:28.334Z để vượt safety gate. Giai đoạn B phải nhận state OFF với timestamp SAU backend reload hiện tại.
- Observer chỉ đọc đang chạy để giữ bằng chứng boot/reconnect sau EN: `build/phase12d1-stageA-observer.cjs`, session công cụ 88135. Capture `build/phase12d1-stageA-1792155728502.ndjson`, QoS1 ACK/state/status, client ID riêng. Nó **không có mã publish hoặc API command**. SUBACK thành công, heartbeat ONLINE non-retained đã quan sát. Không lấy retained OFFLINE cũ làm presence mới.
- Theo chỉ thị cụ thể dừng sau A, cờ commands được giữ TRUE để chờ reset/kiểm tra B; bước hoàn nguyên D chưa diễn ra. Chỉ sau xác nhận mới của người dùng mới kiểm tra B rồi cân nhắc tối đa một ON/một OFF. Không bấm Bật/Tắt website trong thời gian chờ hoặc cấp nguồn adapter.
- Frontend click/PENDING/REJECTED và Command/ACK thực tế: NOT VERIFIED. Browser không khả dụng ở phiên trước; không coi API readiness là UI E2E.

**Handoff:** Backend đã sẵn sàng. Hãy nhấn nút EN trên ESP32 một lần, giữ adapter máy bơm rút điện, sau đó gửi log Serial Monitor mới. Cần PUMP_COMMANDS DISABLED, RELAY OFF, WiFi/MQTT/NTP connected/synced và timestamp mới. Agent chưa tự reset board hoặc gửi command.

Giai đoạn E mới chỉ đề xuất, chưa triển khai: backend restart mất session evidence nhưng không làm ESP32 reconnect nên không có OFF mới. Có thể đánh giá heartbeat OFF định kỳ chỉ khi confirmedOff+clock hợp lệ, timestamp UTC mới, QoS1/non-retained; hoặc kênh yêu cầu đồng bộ state riêng, không phải ON/OFF command. Cần đánh giá freshness/replay/session/RBAC/ACL và regression trước khi đổi firmware/safety; không dùng retained replay hoặc ép DB OFF. Phân tích cuối sẽ cập nhật sau phiên thử thực tế.

---

## Nhật ký phiên trước — đã khóa lại lúc 12:46Z (không phải trạng thái cờ hiện tại)

**DỪNG AN TOÀN, chưa thực hiện POST ON/OFF. Đã bật cờ tạm, xác minh runtime, phát hiện PUMP_01 chuyển UNKNOWN sau restart, rồi hoàn nguyên và xác minh runtime khóa.**

## 1. Điều kiện an toàn và precheck cuối

Ngày 16/10/2026, UTC+7. Người dùng xác nhận adapter 5V vẫn rút điện, ESP32 qua USB, firmware đang DISABLED. Log mới recordedAt `2026-10-16T12:38:38.247Z` được đối chiếu **đủ bốn readings MQTT trong DB**, chính xác TEMP=30.6, HUM=69.5, LIGHT=1.67, SOIL=32.21. Source firmware Phase12B.1 có enable guard/controller+GPIO, không chỉnh/nạp lại.

SELECT lúc `12:41:04.097Z`: Device ONLINE, lastSeenAt 12:41:02.195Z, PUMP_01 OFF với lastStateChangedAt 12:38:28.334Z; bốn sensors mới đến 12:40:53.247Z, pending=0. Migration Phase12 finished, ACL Command/ACK/State có đủ trên đĩa, automation=false. Không có bằng chứng mới mâu thuẫn firmware disabled/adapter ngắt nguồn. Chưa đo độc lập GPIO/điện vật lý.

Đăng nhập tài khoản chủ trang trại mẫu qua **POST /api/auth/login thông thường**, không tự ký token/bypass auth hoặc tạo user. GET actuator có phân quyền trả 200/OFF/controlEnabled=false. Password/token không ghi vào báo cáo/evidence. Hai lần đăng nhập do observer đầu không giữ được stdin; observer đầu đã dừng trước command, không tạo command nào.

Browser skill đã thử kết nối, trả Browser unavailable; không dùng công cụ ngoài để đọc session/cookie hoặc tự tuyên bố nhìn thấy UI. Do yêu cầu cho phép API, precheck tiếp tục qua API hợp lệ.

## 2. Sao lưu và thay đổi tạm

Backup cấu hình trước thay đổi:

`C:\DATN\backups\backend-env-before-phase12d1-20261016-1244.bak`

**Backup này chứa bí mật .env: không chia sẻ, upload hoặc commit.** Backup nằm ngoài repository. Đã xác minh hash khớp bản gốc trước khi sửa và khớp .env sau hoàn nguyên.

File gốc không có hai biến explicit; hiệu lực mặc định false. Đã thêm tạm:
- MQTT_COMMANDS_ENABLED=true
- MQTT_AUTOMATION_COMMANDS_ENABLED=false

Không đổi các giá trị/credentials còn lại. Restart qua watcher hiện hữu bằng cập nhật mtime `backend/src/server.ts`, **không sửa nội dung source**. Server listener đổi PID 23892 → 11480 khi mở cờ, →13780 khi khóa lại; không tạo backend thứ hai, không restart broker.

## 3. Sự cố thực tế trước khi publish

Lúc `2026-10-16T12:46:01.054Z` (=19:46:01 UTC+7), GET authenticated `/api/actuators/demo_actuator_pump_a` trả:

```json
{
  "currentState": "UNKNOWN",
  "controlEnabled": true,
  "gatewayMode": "MQTT",
  "device": { "connectionStatus": "ONLINE" }
}
```

DB cũng đã đổi currentState UNKNOWN, lastStateChangedAt vẫn `2026-10-16T12:38:28.334Z`, pending=0, không DeviceCommand mới.

**Nguyên nhân đã xác minh:** `backend/src/server.ts::bootstrap` gọi `recoverMqttCommands()`; tại `backend/src/mqtt/mqtt-pump-state.adapter.ts`, khi MQTT_COMMANDS_ENABLED=true, recovery UPDATE actuator trong allowlist thành UNKNOWN ngay khi khởi động, kể cả không có pending command. Đây là fail-closed recovery, không phải GPIO ON hoặc mất telemetry.

Đồng thời `mqtt-state-observer.ts` xóa evidence trong bộ nhớ khi backend kết nối lại. Firmware chỉ publish OFF khi boot/reconnect/sự kiện COMMAND/failsafe, không heartbeat state mỗi 15 giây. **Restart riêng backend không buộc ESP32 reconnect hoặc phát OFF mới**, nên không khôi phục OFF tự động ngay trong phiên này. DB/health ONLINE không thay cho chứng cứ relay mới.

Bộ harness nhận tín hiệu nội bộ “ON”, nhưng `run()` kiểm tra authenticated actuator phải OFF trước POST. Check này thất bại, báo `STOP_TEST: RUNTIME_NOT_READY` lúc `12:46:02.146Z`; **dừng trước dòng fetch POST commands**. Không retry, không thực hiện OFF vì ON chưa được xác minh an toàn.

Thông báo tiến độ tự động “đã gửi duy nhất yêu cầu ON” phát ra quá sớm ngay sau thao tác điều phối harness. Đã đính chính ngay: **không có POST ON, không MQTT ON, không commandId**. SELECT độc lập chứng minh không bản DeviceCommand nào từ lúc 12:43:00Z; không dùng thông báo đó làm bằng chứng publish.

Không sửa recovery policy hoặc ép UPDATE actuator OFF trong nhiệm vụ kiểm thử này.

## 4. Command/ACK, database và evidence

Hai subscriber dùng client ID riêng, không trùng ESP32 physical/backend, đăng ký thành công:
- Backend account: ACK PUMP_01 và actuator/state.
- Device account: đọc commands/PUMP_01 để quan sát payload, không publish.
- Device MQTT credentials chỉ được đọc các literal cần thiết từ config.local.h vào bộ nhớ, không in/ghi evidence, không sửa file. Không chạy simulator. Không khẳng định đã loại trừ mọi client trùng ID từ máy khác vì không có registry broker độc lập.

| Mục | ON | OFF |
| --- | --- | --- |
| POST API commands | 0 | 0 |
| MQTT publish command từ phiên thử | 0 | 0 |
| CommandId/correlationId | Không có | Không có |
| ACK result/reason/recordedAt | Không có | Không có |
| acknowledgedAt/expiresAt/maxRunSeconds | Không có bản ghi để đối chiếu | Không có |
| DeviceCommand được tạo | 0 | 0 |

ON dự kiến có maxRunSeconds=1 trong HTTP body, nhưng không gửi nên không báo đó là payload thực. Không tạo payload command/ACK minh họa thay cho chứng cứ.

Artifact cục bộ, gitignored:
- `build/phase12d1-dryrun.cjs`: harness có guard, một lần ON/tối đa một OFF, không retry POST; GET/SELECT và observers.
- `build/phase12d1-evidence.json`: snapshots và packets quan sát; commands=[]/packets=[] trong phiên tiếp tục, không credentials/token.
- Evidence start `2026-10-16T12:43:58Z`, end `2026-10-16T12:46:49.642Z` xấp xỉ theo file. Precheck bắt đầu 12:41Z; không nhầm với lần precheck cũ 12:34Z được lưu cuối báo cáo.

Đăng nhập hợp lệ ghi ActivityLog theo logic ứng dụng. Backend recovery khi restart ghi UNKNOWN theo logic hiện hữu. Agent không trực tiếp UPDATE database, không migration/seed/reset, không ghi command giả.

## 5. Hoàn nguyên bắt buộc và kiểm chứng cuối

Khối finally đã xóa hai dòng tạm để khôi phục .env byte-identical với backup, default commands=false/automation=false; watcher restart backend nạp lại cấu hình. Không chỉ thay file mà bỏ qua runtime.

Authenticated GET lúc `2026-10-16T12:46:47.551Z`:
```json
{
  "currentState": "UNKNOWN",
  "controlEnabled": false,
  "gatewayMode": "DISABLED",
  "device": { "connectionStatus": "ONLINE" }
}
```

SELECT độc lập lúc `12:46:49.290Z`:
- commandsSinceTest=[]; pending=0.
- Device ONLINE, lastSeenAt 12:46:47.188Z.
- PUMP_01 currentState UNKNOWN; lastStateChangedAt 12:38:28.334Z.
- Bốn MQTT readings chung recordedAt 12:46:38.247Z: TEMP 28.1, HUM 64.1, SOIL 31.71, LIGHT 2.5.
- Health HTTP 200, database/MQTT connected.
- Config parse commands=false và automation=false; .env hash khớp backup.
- Harness và hai observer đã dừng, token chỉ ở bộ nhớ process đã kết thúc.
- Không cấp điện adapter, không thao tác firmware/GPIO.

**Tiêu chí PUMP_01 OFF sau hoàn nguyên chưa đạt:** dữ liệu báo UNKNOWN do recovery và chưa có state mới. Không được báo “hoàn nguyên toàn bộ PASS” hoặc suy UNKNOWN là phần cứng đã ON. Khóa quyền đã PASS; xác minh trạng thái relay mới còn thiếu.

## 6. Kết quả website / PASS–FAIL–NOT VERIFIED

| Tiêu chí | Kết quả |
| --- | --- |
| Log Serial mới khớp telemetry/firmware disabled theo người dùng | PASS đối chiếu, không đo GPIO độc lập |
| Precheck ONLINE/OFF/migration/pending/ACL | PASS trước restart |
| Backup + mở cờ runtime đúng phạm vi | PASS |
| Relay vẫn OFF ngay sau reload để đủ điều kiện gửi ON | FAIL: DB/API chuyển UNKNOWN |
| ON → REJECTED/PUMP_COMMANDS_DISABLED | NOT VERIFIED: chưa POST |
| OFF → APPLIED | NOT VERIFIED: chưa POST |
| API đúng trạng thái runtime/cờ trước–sau | PASS, GET thật có xác thực |
| Website PENDING/REJECTED/không ON giả | NOT VERIFIED: Browser không khả dụng, không tạo request |
| Sensor/presence tiếp tục hoạt động | PASS, SELECT timestamp mới/health |
| Không có command thử trùng/PENDING | PASS, 0 command / 0 pending |
| Khôi phục .env và runtime khóa | PASS, hash + controlEnabled=false/gatewayMode DISABLED |
| PUMP_01 OFF mới sau hoàn nguyên | NOT VERIFIED, hiện UNKNOWN |
| Kiểm thử máy bơm vật lý | Không thực hiện, adapter ngắt theo người dùng |

## 7. Bước tiếp theo cần thiết

Giữ cờ khóa và adapter rút điện. **Cần OFF trực tiếp mới sau lần backend reload**, không phải thêm log DISABLED nữa hoặc sửa DB:
1. Người dùng có thể reset/reconnect ESP32 trong khi giữ firmware DISABLED và adapter ngắt để thiết bị phát BOOT/reconnect OFF mới; không cần nạp lại firmware.
2. Trước lần mở cờ tiếp theo, lên lịch sau restart backend mới xác minh/reconnect ESP32 rồi chờ state OFF commit. Thứ tự hiện tại phải là bật cờ/reload → nhận OFF mới → xác minh OFF → mới gửi tối đa một ON. Không mặc định OFF được giữ xuyên backend restart.
3. Nếu muốn xử lý startup behavior/evidence durable thay vì reset ESP32 thủ công, đó là task source riêng cần review/test; không bỏ UNKNOWN guard hoặc giữ OFF cũ để che vấn đề.
4. Phiên này không tiêu thụ quota request mạng: thực tế **0 ON / 0 OFF**; tuy nhiên đã dừng theo điều kiện lỗi. Chỉ tiếp tục sau khi điều kiện mới được xác minh, không tự động thử lại trong nền.

<details>
<summary>Nhật ký lịch sử: precheck trước khi người dùng cung cấp Serial mới (12:34–12:35Z)</summary>

# Phase12D.1 — MQTT dry-run có giới hạn

**Trạng thái: DỪNG Ở PRECHECK — chưa bật quyền gửi lệnh, chưa gửi ON/OFF.** Không tuyên bố dry-run hoặc điều khiển máy bơm thật thành công.

## 1. Phạm vi và thời gian

- Bắt đầu kiểm tra: `2026-10-16T12:34:18.879Z` = 19:34:18.879 UTC+7, 16/10/2026.
- SELECT cuối: `2026-10-16T12:35:06.294Z` = 19:35:06.294 UTC+7.
- Repository `C:\DATN\Project_datn`; PostgreSQL dùng backend/.env. Chỉ SELECT trong transaction READ ONLY, GET health, kiểm tra ACL/process/socket/serial device metadata và tạo báo cáo này.
- Người dùng đã xác nhận firmware DISABLED, ENABLE_PUMP_COMMANDS=false, adapter 5V máy bơm rút điện, ESP32 qua USB. Không thao tác cấp nguồn, firmware, GPIO, Wi-Fi, simulator hoặc relay.
- Điều kiện bổ sung bắt buộc trong yêu cầu: **phải kiểm tra log runtime mới nhất xác nhận DISABLED; nếu không thể xác minh, không gửi ON.** Chưa đạt điều kiện này nên dừng trước feature flag.

## 2. Precheck thực tế

| Kiểm tra | Bằng chứng | Kết quả |
| --- | --- | --- |
| Device ONLINE | SELECT lastSeenAt 12:34:18.634Z lúc đầu; 12:35:04.968Z lúc cuối | PASS |
| PUMP_01 state DB | OFF, lastStateChangedAt 2026-10-16T12:18:45.935Z, id demo_actuator_pump_a | PASS cho DB; API/UI runtime chưa đối chiếu trực tiếp |
| Bốn sensors mới | TEMP/HUM/SOIL/LIGHT đều source MQTT, recordedAt 12:34:14.639Z | PASS |
| Backend/broker/DB | GET /api/health 200, database/MQTT connected tại 12:34:19.153Z | PASS |
| Broker endpoint | 172.20.10.2:1883; backend socket PID23892, broker LAN PID19156, ESP32-side TCP peer 172.20.10.3 | PASS kết nối; không suy clientId từ TCP |
| Migration Phase12 | finished_at 2026-10-16T11:09:39.621Z, rolled_back_at null | PASS |
| ACL Command/ACK/State | Đọc C:/mosquitto/config/acl có backend write commands/read ACK và device namespace read commands/write ACK, state exact permissions | PASS cấu hình; chưa thử publish command |
| Automation flag | MQTT_AUTOMATION_COMMANDS_ENABLED effective theo .env false | PASS cấu hình, không chỉnh |
| Pending commands | SELECT count=0 lúc đầu và cuối | PASS |
| Simulator trùng client ID | Không phát hiện Node process có command line chạy simulator repository; chỉ có backend connection local và peer ESP32 tại snapshot | NOT VERIFIED tuyệt đối; chưa đọc broker client registry/log mới để loại trừ mọi client từ máy khác |
| Firmware actual runtime DISABLED | Người dùng xác nhận; chưa đọc được Serial runtime mới trong phiên agent | **NOT VERIFIED — điều kiện chặn gửi ON** |
| Adapter pump rút nguồn | Người dùng xác nhận; không quan sát độc lập phần cứng | Xác nhận người dùng, không tuyên bố đo nguồn vật lý |

Windows liệt kê COM3 `Silicon Labs CP210x USB to UART Bridge` và process `serial-monitor` PID24548 cùng Arduino IDE. Điều này không chứng minh nội dung Serial hoặc chính xác port process đang mở. Không đóng Serial Monitor hoặc mở thêm COM3 để tránh giành cổng/reset ESP32 ngoài ý muốn. Các công cụ hiện tại chưa cung cấp nội dung cửa sổ Serial Monitor.

Không thay thế bằng cách xem config.example.h, đọc config.local.h chứa bí mật hoặc tự phát ON để “thử xem có bị từ chối”. Cần block Serial mới có timestamp và PUMP_COMMANDS DISABLED trước khi tiếp tục.

## 3. Cấu hình trước/sau và hoàn nguyên

| Cấu hình | Trước | Sau |
| --- | --- | --- |
| MQTT_COMMANDS_ENABLED | false (đọc .env, bao gồm default nếu unset) | false, không chỉnh |
| MQTT_AUTOMATION_COMMANDS_ENABLED | false | false, không chỉnh |
| ENABLE_PUMP_COMMANDS firmware | Người dùng xác nhận false | Không sửa/nạp firmware |

Chưa tới bước thay đổi backend nên không tạo backup .env chứa credentials và không cần restart/rollback. Không khẳng định đã đọc biến môi trường trong bộ nhớ process; không có lệnh gửi thử để xác minh flag. Health vẫn connected, pending=0, Device ONLINE/PUMP_01 DB OFF sau kiểm tra. Không bật nguồn adapter.

## 4. Lệnh và payload thực tế

| Mục | ON | OFF |
| --- | --- | --- |
| Yêu cầu API/website | Không gửi | Không gửi |
| Command ID / correlationId | Không có | Không có |
| MQTT command payload | Không phát | Không phát |
| MQTT ACK payload | Không có ACK của thử nghiệm | Không có ACK của thử nghiệm |
| DeviceCommand được phiên thử tạo | 0 | 0 |
| result / acknowledgedAt / expiresAt / maxRunSeconds | Không áp dụng | Không áp dụng |

Không tạo payload giả, không sửa trạng thái command/actuator DB để có PASS. OFF lưu hiện tại là state đã tồn tại trước precheck, không phải kết quả OFF dry-run.

## 5. Frontend và tiêu chí toàn luồng

- Chưa bấm nút hoặc POST API. PENDING → REJECTED/APPLIED trên website: **NOT VERIFIED**.
- GPIO26 không HIGH khi nhận ON: **NOT VERIFIED hardware**, vì không gửi ON.
- ACK ON REJECTED/PUMP_COMMANDS_DISABLED và DB FAILED đúng commandId: **NOT VERIFIED**.
- ACK OFF APPLIED và state OFF mới sau thử: **NOT VERIFIED**.
- Polling 2 giây trong phiên thử: **NOT VERIFIED live**, không dùng regression offline Phase12D để thay thế.
- Device ONLINE/telemetry đang cập nhật: PASS bằng SELECT/health trước và sau; chưa kiểm chứng độc lập browser display.

## 6. Bước cần người dùng cung cấp

Giữ nguồn bơm ngắt, firmware không đổi, backend commands/automation false. Trong Arduino IDE, chọn Serial Monitor của ESP32 (CP210x COM3), 115200 baud. Sao chép **một block SENSOR MONITOR mới**, gồm:

```text
RECORDED_AT   : <timestamp UTC mới>
WiFi          : CONNECTED
MQTT          : CONNECTED
PUMP_COMMANDS : DISABLED
RELAY         : OFF
```

Không gửi password, SSID/token, config.local.h hoặc nguyên .env. Không cần reset board chỉ để có block mới, firmware xuất mỗi 15 giây.

Sau khi nhận bằng chứng mới, phải kiểm tra lại ONLINE/OFF, automation khóa và điều kiện safety tại thời điểm thử. Quyền người dùng đã cấp chỉ giới hạn một ON và tối đa một OFF; số yêu cầu đã dùng hiện **0 ON / 0 OFF**. Chưa sử dụng quyền này để bật cờ trước khi safety gate đạt. Các bằng chứng còn thiếu về clientId/broker log và phiên API có quyền cũng cần hoàn tất trước publish. Không tự cấp token quản trị hoặc bypass RBAC để thử.

## 7. Kết luận

**Precheck hạ tầng PASS; safety gate runtime firmware DISABLED NOT VERIFIED nên đã dừng đúng quy trình.** Backend config vẫn khóa, không có PENDING, không có command thử thật; mục tiêu Website → ESP32 → ACK → PostgreSQL → Website chưa được thực hiện. Không cần “hoàn nguyên thành công” giả vì chưa thay đổi cấu hình, dịch vụ hay database.

</details>

