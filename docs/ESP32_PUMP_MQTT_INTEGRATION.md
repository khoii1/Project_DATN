# ESP32 pump MQTT v1 — Phase 12

## Trạng thái bàn giao và giới hạn an toàn

Đã có gateway MQTT và xử lý ACK/state ở backend. Firmware Arduino thử bơm 1 giây của người dùng **chưa phải firmware nhận MQTT**. Chưa kiểm chứng website → relay → bơm thật. Không nạp firmware, gửi lệnh đến thiết bị thật, chạy simulator hoặc áp dụng migration trong đợt triển khai này.

Mặc định `MQTT_COMMANDS_ENABLED=false`: REST control trả 503, **không tự fallback mock**. Mock chỉ còn dùng qua dependency injection rõ ràng trong test. Automation thật có cờ riêng, mặc định false. Không bật các cờ trước khi đã kiểm tra firmware fail-safe, migration và ACL.

Kiểm tra PostgreSQL chỉ đọc ngày 2026-10-14: Device `ESP32-GF-A-01` có Actuator `PUMP_01`, type PUMP, connection OFFLINE, stored state OFF, hardwareChannel `RELAY_1`. Đây là trạng thái lưu tại thời điểm kiểm tra, không phải bằng chứng bơm vật lý đang tắt. Bốn cột migration Phase 12 chưa tồn tại. `RELAY_1` là kênh logic; firmware ánh xạ `PUMP_01` → GPIO26, không suy luận số GPIO từ tên kênh trong database.

## 1. Topic chính xác

Giữ topic plural đã có trong `backend/src/mqtt/mqtt-topic.ts` và ACL mẫu; **không dùng** topic singular `/command` và `/ack` trong đề xuất ban đầu.

| Chiều | Topic | QoS | Retain |
| --- | --- | --- | --- |
| Backend → ESP32 | `smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01` | 1 | false |
| ESP32 → Backend | `smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01` | 1 | false |
| ESP32 → Backend | `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state` | 1 | false |

Giữ nguyên telemetry và presence `/telemetry`, `/status`, bao gồm LWT hiện có. ACK và state không thay thế heartbeat. Device/actuator code phải đúng uppercase, khớp `[A-Z0-9_-]{3,64}`. Nếu đổi `MQTT_TOPIC_PREFIX`, phải đổi đồng bộ firmware/ACL.

## 2. Payload command

ON:

```json
{
  "schemaVersion": 1,
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "maxRunSeconds": 5,
  "issuedAt": "2026-10-14T15:00:00.000Z",
  "expiresAt": "2026-10-14T15:00:10.000Z"
}
```

OFF:

```json
{
  "schemaVersion": 1,
  "commandId": "550e8400-e29b-41d4-a716-446655440001",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "OFF",
  "issuedAt": "2026-10-14T15:00:01.000Z",
  "expiresAt": "2026-10-14T15:00:11.000Z"
}
```

Các timestamp trên chỉ minh họa. Firmware không được dùng lại những command mẫu đã hết hạn. Backend tạo UUID mới cho mỗi yêu cầu. `actuatorCode` bắt buộc trong command và ACK, đồng thời phải khớp topic. OFF không có `maxRunSeconds`.

Backend mặc định expiry/ACK deadline 10 giây kể từ tạo lệnh; ON tối đa 5 giây. Hai biến cấu hình chỉ cho phép số nguyên 1..30; API không được vượt giới hạn server. Thời gian ON không phải timeout ACK. OFF có thể gửi dù presence không ONLINE nếu broker sẵn sàng; đó chỉ là nỗ lực yêu cầu OFF, không phải bảo đảm OFF.

## 3. Payload ACK

```json
{
  "schemaVersion": 1,
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "type": "PUMP_SET",
  "state": "ON",
  "result": "APPLIED",
  "recordedAt": "2026-10-14T15:00:00.500Z"
}
```

REJECTED sử dụng cùng cấu trúc, `result: "REJECTED"`, giữ nguyên state được yêu cầu và thêm `reason`, ví dụ `"CLOCK_UNSYNCED"`, `"EXPIRED"`, `"INVALID_MAX_RUNTIME"`, `"ALREADY_ON"`. Reason tối đa 200 ký tự. Không thêm field ngoài schema v1. JSON body tối đa 4096 byte.

ESP32 chỉ gửi APPLIED **sau khi đã áp dụng GPIO**. Đây không phải bằng chứng tiếp điểm relay đã đóng, motor quay, có nước chảy hoặc đủ lưu lượng. Muốn xác minh vật lý cần cảm biến/feedback riêng.

Backend chỉ nhận ACK cho command đang chờ trong bộ nhớ, đúng UUID, device, actuator, topic, requested state. ACK retained bị bỏ qua; ACK trùng hoặc lệnh đã kết thúc không thay đổi state. QoS DUP có thể là lần backend nhìn thấy ACK đầu tiên nên không loại chỉ vì DUP; chống trùng theo UUID pending. Nhận ACK phải trước expiresAt. `recordedAt` phải từ issuedAt trừ tối đa 2 giây đến backend receipt cộng tối đa 2 giây, không cũ hơn receipt 30 giây. NTP trên Windows và ESP32 phải đồng bộ; tolerance không thay cho đồng bộ thời gian.

MQTT PUBACK chỉ xác nhận broker nhận publish, cập nhật `sentAt`; **không chuyển SUCCESS**. Chỉ ACK APPLIED hợp lệ mới chuyển SUCCESS và cập nhật state. REJECTED/timeout/disconnect chuyển FAILED; state có thể UNKNOWN vì backend không biết GPIO thực tế.

## 4. Payload actuator state

```json
{
  "schemaVersion": 1,
  "deviceCode": "ESP32-GF-A-01",
  "actuatorCode": "PUMP_01",
  "state": "OFF",
  "reason": "MAX_RUNTIME",
  "recordedAt": "2026-10-14T15:00:05.500Z"
}
```

Reason hợp lệ: `MAX_RUNTIME`, `BOOT`, `MQTT_LOST`, `WIFI_LOST`, `COMMAND`. State endpoint chỉ nhận OFF: không chấp nhận ON tự phát để thay ACK. State không retained, tối đa 4096 byte, không cũ quá 30 giây, không tương lai quá 2 giây. Update database có điều kiện timestamp mới hơn state hiện tại; event cũ/trùng không ghi đè state mới. Event OFF hủy ON đang chờ được phát trước event; ACK ON đến sau không hồi sinh ON. OFF event không tự hoàn thành một command OFF: vẫn cần ACK tương ứng.

Khi mất kết nối, ESP32 không thể publish ngay: phải tắt GPIO tại chỗ, ghi nhớ lý do và **sau reconnect gửi state OFF mới với thời điểm báo cáo mới**, không phát lại một event quá hạn. Sau reboot, khởi tạo LOW trước Wi-Fi/NTP; chỉ publish BOOT OFF sau khi có giờ hợp lệ. Giữ publish ONLINE/LWT theo hợp đồng presence cũ.

Backend thể hiện UNKNOWN khi device không ONLINE, broker/command transport chưa sẵn sàng hoặc xác nhận ON đã vượt runtime + grace 2 giây mà không có state OFF mới. Không dựng một ACK/OFF giả. Watchdog cũng dọn command quá hạn nếu callback lưu DB gặp lỗi.

## 5. Checklist firmware bắt buộc trước khi dùng bơm

1. GPIO26 **LOW = OFF** theo bài test relay MKE-M05 của người dùng. Đặt output LOW ở đầu setup; không tự bật sau boot/reconnect. Kiểm tra lại mức active trên chính phần cứng trước sử dụng.
2. Đọc bốn cảm biến và publish telemetry như cũ, không thay code/unit/schema; lịch đọc 15 giây không được chặn loop MQTT/watchdog bơm.
3. Subscribe đúng command topic QoS1 sau mỗi connect, clean session; không tiếp nhận retained command. Thư viện Arduino phải expose được retain hoặc có cơ chế từ chối tương đương đã kiểm chứng. Nếu chưa làm được, chưa bật điều khiển.
4. Validate JSON/schema/type/deviceCode/actuatorCode/state/UUID, thời gian phát/hết hạn và maxRunSeconds. Không ON nếu clock chưa đồng bộ hoặc command hết hạn. Firmware cap cứng tối đa 5 giây trong lần tích hợp đầu; chỉ đổi cùng cấu hình server sau kiểm thử.
5. Dùng deadline monotonic `millis()` cho runtime, phép trừ unsigned an toàn khi wrap; không dùng NTP để kéo dài thời gian ON. Không `delay(5000)` chặn MQTT. Timer bắt đầu từ lần ON thực sự, không reset khi nhận command trùng.
6. Cache UUID và ACK đã xử lý ít nhất expiry + runtime + reconnect window; nên dùng ring buffer đủ lớn cho >=120 giây. Duplicate cùng UUID chỉ trả lại ACK, không tác động GPIO hoặc gia hạn deadline. Nếu đã auto-OFF, không phát ACK ON cũ gây hiểu nhầm; trả REJECTED `ALREADY_COMPLETED` và state OFF mới. Khi reboot không replay persisted ON; command phát trước thời điểm boot phải bị từ chối. Cache/boot guard phải ngăn lệnh cũ còn trong socket trước reboot được áp dụng lại.
7. Duy trì high-water mark `issuedAt` (UUID chống trùng riêng). Khi nhận OFF, LOW ngay với command hợp lệ và tiến high-water mark; ON có issuedAt cũ hơn hoặc bằng lệnh mới nhất phải bị từ chối. Timestamp bằng nhau: OFF ưu tiên; không nhận ON để đảo lại OFF. Không dùng một ON mới để gia hạn bơm đang ON; trả REJECTED `ALREADY_ON`.
8. OFF được ưu tiên xử lý trước đọc cảm biến; ACK OFF sau LOW. Khi hết deadline: LOW → state OFF MAX_RUNTIME. Không chờ backend để tự ngắt.
9. Mất Wi-Fi hoặc MQTT: LOW ngay tại firmware, xóa yêu cầu ON đang chờ. Reconnect không khôi phục bơm; gửi ONLINE và state OFF mới sau đồng bộ giờ. Backend/browser không thay thế fail-safe này.
10. Nếu relay kẹt hoặc nguồn có vấn đề, phần mềm không bảo đảm ngắt vật lý. Theo yêu cầu Phase 12B, giữ nguyên wiring đã test: thử trước bằng ENABLE_PUMP_COMMANDS=false, có công tắc adapter trong tầm tay và người giám sát. Chỉ khi người dùng phê duyệt riêng mới thử bơm 1 giây, không thử automation trước.

## 6. Backend, API và dữ liệu

Tái sử dụng một MQTT client quản lý vòng đời; không tạo client cho mỗi lệnh. ACK/state có queue riêng với telemetry, tránh deadlock khi telemetry kích hoạt automation. Reconnect subscribe một lần cho mỗi connect. Lệnh QoS1 còn trong outgoing store được bỏ khi mất kết nối/timeout/đã nhận actuator ACK; không replay ở reconnect/restart. Transport chỉ publish khi không có store-processing/queued publish. Guard fail-closed đang kiểm tra hai thuộc tính nội bộ MQTT.js 5.x; phải chạy lại test và xem adapter nếu nâng MQTT.js. Retain luôn false.

Backend triển khai này dành cho **một instance backend** như kiến trúc hiện tại. Không chạy nhiều replica điều khiển song song: pending ACK trong bộ nhớ và startup recovery chưa phải distributed coordinator. Partial unique index PENDING hiện có, transaction row lock và per-actuator queue bảo vệ request đồng thời trong instance. OFF thay thế pending ON; lệnh ON khác khi pending bị 409; ON cách lần yêu cầu trước dưới 2 giây bị 429. Không có automatic retry ON.

Model `DeviceCommand` được mở rộng, không tạo hệ điều khiển/model trùng:

- `correlationId`: UUID commandId; id database vẫn giữ nguyên.
- `transport`: MOCK cho lịch sử phần mềm cũ, MQTT cho lệnh thật.
- `expiresAt`, `maxRunSeconds`, `acknowledgedAt`: nullable, không sửa dữ liệu lịch sử.
- `PENDING` + sentAt null: chờ broker; PENDING + sentAt có giá trị: broker PUBACK, đang chờ thiết bị.
- `SUCCESS` tương đương APPLIED; `FAILED` + failureReason phân biệt REJECTED, ACK_TIMEOUT, PUBLISH_FAILED, BROKER_DISCONNECTED, SUPERSEDED_BY_OFF, DEVICE_REPORTED_OFF, BACKEND_RESTARTED_NO_REPLAY.
- `acknowledgedAt`: thời điểm backend nhận ACK; `lastStateChangedAt`: recordedAt từ thiết bị khi ACK/state hợp lệ. Timeout không được coi là timestamp đo mới.

Endpoint giữ nguyên: `POST /api/actuators/{actuatorId}/commands` với JWT. Body ON `{"command":"TURN_ON","maxRunSeconds":1}`, OFF `{"command":"TURN_OFF"}`. Body không được truyền source, userId hoặc status. maxRunSeconds mặc định theo server; OFF không nhận duration. HTTP 202 + `{command, actuator}` khi đang chờ, 201 khi đã có kết quả tức thời. Không tự POST lại khi HTTP timeout: trước hết GET trạng thái/lịch sử, OFF nếu cần. API không có idempotency key cho retry HTTP ở phiên bản này.

Farm scope/ADMIN/OWNER/STAFF vẫn dùng lookup và kiểm tra assignment cũ, STAFF phải có `canControlIrrigation`. ON cần ACTIVE toàn chuỗi farm/zone/device/actuator và heartbeat ONLINE còn TTL. OFF được phép khi presence không chắc chắn nhưng vẫn cần quyền, tài nguyên ACTIVE và broker sẵn sàng. Emergency OFF không thể vượt broker mất kết nối hoặc phần cứng hỏng; cần ngắt nguồn tại chỗ.

Automation thật mặc định khóa riêng. Khi được bật, dùng cùng gateway, runtime/expiry/allowlist, không có mock fallback; manual request trong cửa sổ override chặn automatic ON, automatic OFF vẫn ưu tiên an toàn. Hysteresis/cooldown sensor hiện có được giữ; outcome mới PENDING không giả làm SUCCESS/FAILED trước ACK.

GET `/api/actuators` và detail thêm `controlEnabled`, `gatewayMode`, `latestCommand`; currentState có thể UNKNOWN dù database còn state lịch sử. GET `/api/device-commands` giữ filter/phân trang/phạm vi cũ, thêm metadata cột mới. Trang Irrigation polling 2 giây, history chỉ được tải khi mở tab history; không polling ở tab automation. Dashboard và Device detail dùng polling 10 giây hiện có. Chu kỳ 10 giây có thể không quan sát được ON chỉ chạy 1..5 giây; xem lịch sử ACK hoặc trang Irrigation để kiểm tra. Polling không xác nhận lưu lượng nước.

## 7. Triển khai có kiểm soát — chưa thực hiện trên DB hiện tại

**Migration bắt buộc trước khi chạy backend mới, kể cả flag false**, vì Prisma/query mới đọc các cột bổ sung. Không chạy `migrate dev`, reset hoặc seed trên DB hiện tại. Xem SQL `backend/prisma/migrations/20261014090000_mqtt_pump_commands/migration.sql`; backup database và kiểm tra các migration cũ đã đồng bộ trước khi deploy. Lệnh sau dành cho người vận hành sau khi duyệt:

```powershell
Set-Location C:\DATN\Project_datn\backend
.\node_modules\.bin\prisma.cmd migrate status
# Chỉ sau backup + review toàn bộ pending migrations:
.\node_modules\.bin\prisma.cmd migrate deploy
npm run prisma:generate
npm run build
```

Không reset/xóa dữ liệu. Khi backend mới start, recovery ghi FAILED cho pending MQTT cũ và UNKNOWN cho state cần xác minh; không gửi lệnh vật lý. Không chạy simulator cũ `simulate:irrigation`/`simulate:automation` để kiểm tra với cờ thật: các script đó gọi service điều khiển và có thể gửi lệnh thật.

Cấu hình trong `.env` do người vận hành tự thiết lập, không commit mật khẩu:

```dotenv
MQTT_ENABLED=true
MQTT_COMMANDS_ENABLED=false
MQTT_AUTOMATION_COMMANDS_ENABLED=false
MQTT_COMMAND_DEVICE_CODE=ESP32-GF-A-01
MQTT_COMMAND_ACTUATOR_CODE=PUMP_01
MQTT_COMMAND_EXPIRY_SECONDS=10
MQTT_PUMP_MAX_RUN_SECONDS=5
```

Giữ MQTT_BROKER_URL/MQTT_USERNAME/MQTT_PASSWORD hiện có. Không đổi firmware credentials hoặc cấp frontend credentials MQTT. Chỉ chuyển COMMANDS_ENABLED=true khi firmware đã kiểm chứng; automation vẫn false trong lần thử đầu. Backend startup recovery không tự ON.

## 8. ACL — chỉ mẫu trong repo đã sửa

File thực tế ngoài workspace chưa được thay đổi/reload. Đối chiếu `infrastructure/mosquitto/acl.example`. Ngoài quyền telemetry/status và command/ACK cũ, bổ sung:

```text
# Trong block user của backend, trước block user khác:
topic read smart-agriculture/v1/devices/+/actuator/state
# Device username phải đúng deviceCode, như quy tắc %u hiện tại:
pattern write smart-agriculture/v1/devices/%u/actuator/state
```

Backend publish commands/+, subscribe command-acks/+ và actuator/state. ESP32 chỉ read commands/+ của chính username/deviceCode và write ACK/state/telemetry/status của chính nó. Không cấp thiết bị quyền publish commands, hoặc thiết bị khác quyền ACK cho ESP32 này. ACK không có chữ ký mật mã riêng: an ninh phụ thuộc ACL, bảo vệ backend credential và mạng/broker. Plain MQTT không bảo vệ khỏi nghe lén trên LAN; TLS/network segmentation là việc hardening riêng trước triển khai ngoài mạng thử nghiệm.

Không bật anonymous hoặc đưa password vào báo cáo/commit. Nếu username thật khác deviceCode, %u không ánh xạ đúng; người vận hành phải cấp topic cụ thể phù hợp, không mở wildcard toàn hệ thống. Khả năng áp dụng ACL trên broker đang chạy chưa được kiểm chứng trong đợt này.

## 9. Test không tác động bơm

Các lệnh sau chạy hoàn toàn fake MQTT/DB, không đọc .env hoặc kết nối database/broker thật:

```powershell
Set-Location C:\DATN\Project_datn\backend
npm run test:pump
npm run test:presence
Set-Location C:\DATN\Project_datn\frontend
npm run test:polling
npm run lint
npm run build
```

Test CLI MQTT bên ngoài chỉ trên **broker test riêng port 18884**, credentials và ACL test riêng, không bridge sang broker 1883, không có ESP32 subscribe. Thay các placeholder tại máy mình; password CLI có thể xuất hiện trong history/process list, không chụp log/commit. Không dùng tài khoản production:

```powershell
# Cửa sổ 1, chỉ nhận namespace TEST_ESP32:
mosquitto_sub.exe -h 127.0.0.1 -p 18884 -u TEST_OBSERVER -P "<TEST_PASSWORD>" -t "smart-agriculture/v1/devices/TEST_ESP32/#" -q 1 -v
# Cửa sổ 2, payload không điều khiển và không topic ESP32 thật:
mosquitto_pub.exe -h 127.0.0.1 -p 18884 -u TEST_DEVICE -P "<TEST_PASSWORD>" -t "smart-agriculture/v1/devices/TEST_ESP32/diagnostic" -q 1 -m "isolated-test"
```

Chưa dựng/chạy broker test ngoài fake trong đợt này. Các lệnh trên giả định broker test đã được người vận hành cấu hình xác thực, ACL và listener localhost. Không dùng `-r`, không publish mẫu ON vào broker thật để “thử kết nối”.

## 10. Kiểm chứng DB và UI sau triển khai được duyệt

SQL chỉ đọc (psql/pgAdmin), không seed:

```sql
SELECT d.device_code, a.id AS actuator_id, a.actuator_code, a.type,
       d.connection_status, a.current_state, a.last_state_changed_at
FROM devices d JOIN actuators a ON a.device_id = d.id
WHERE d.device_code = 'ESP32-GF-A-01';

SELECT c.id, c.correlation_id, c.transport, c.command, c.source, c.status,
       c.requested_at, c.sent_at, c.expires_at, c.max_run_seconds,
       c.acknowledged_at, c.completed_at, c.failure_reason
FROM device_commands c
JOIN actuators a ON a.id = c.actuator_id
JOIN devices d ON d.id = a.device_id
WHERE d.device_code = 'ESP32-GF-A-01' AND a.actuator_code = 'PUMP_01'
ORDER BY c.requested_at DESC LIMIT 20;
```

Sau khi có firmware phù hợp, kiểm tra đầu tiên với ENABLE_PUMP_COMMANDS=false và giữ nguyên wiring: ON phải REJECTED, không GPIO HIGH. Sau đó chỉ khi người dùng phê duyệt thử vật lý, chọn đúng farm/zone/device, Irrigation manual, chỉ một ON 1 giây. Phải thấy PENDING → ACK SUCCESS hoặc lỗi cụ thể, không success trước ACK; tiếp theo state OFF MAX_RUNTIME. Thử ngắt Wi-Fi/broker chỉ trong bài test được giám sát: GPIO phải LOW tại ESP32, UI không giữ ON chắc chắn sau mất presence; reconnect không phát lại ON. OFF đang chờ phải khóa nhấn OFF trùng nhưng ON pending vẫn cho yêu cầu OFF ưu tiên. Đổi scope/tab nhanh hoặc ẩn tab không được có response cũ ghi đè; giữ nguyên form.

Không thực hiện bài thử phần cứng này trong automated test. Kết quả fake không chứng minh motor chạy hoặc nước chảy.

## Phase 12B: hiện đã có mã nguồn firmware

Sketch hợp nhất và checklist giữ nguyên wiring: [firmware/README.md](../firmware/README.md). Đã compile ESP32 và test native controller/serialization/backend contract, chưa upload/chạy bơm. State ON được báo qua ACK APPLIED vì backend chỉ nhận OFF state. Chi tiết build/test, DB đích và ACL thực tế: [báo cáo Phase 12B](archive/PHASE12B_FIRMWARE_REPORT.md).
