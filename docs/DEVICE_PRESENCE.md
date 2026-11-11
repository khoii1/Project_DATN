# Device presence: TTL, MQTT replay và nghiệm thu

## Phạm vi

Giữ nguyên Prisma schema, MQTT JSON/topic, credential, RBAC, farm scope và MockDeviceGateway. `lastSeenAt` đã có trong Device; không cần migration. Không chạy seed/simulator/test ghi trên database chứa readings thật.

## Chính sách

| Sự kiện | connectionStatus | lastSeenAt |
|---|---|---|
| Telemetry hợp lệ live hoặc status ONLINE live | ONLINE | Giờ backend nhận packet, không dùng recordedAt |
| Status OFFLINE live, gồm LWT do broker phát | OFFLINE | Giữ nguyên heartbeat cuối |
| Retained status replay ONLINE hoặc OFFLINE | Không thay đổi | Không thay đổi |
| Retained telemetry replay | Có thể lưu readings theo validation/idempotency cũ; không thay presence hoặc chạy Alert/Automation | Không thay đổi |
| Quá TTL, MQTT observer có subscription thành công | OFFLINE | Không thay đổi |
| Quá TTL, MQTT observer disconnected/chưa subscribe được | UNKNOWN | Không thay đổi |
| MQTT hoạt động lại, UNKNOWN có lastSeenAt quá hạn | OFFLINE ở lượt watchdog kế tiếp, hoặc ONLINE nếu có tín hiệu live mới | Chỉ tín hiệu live hợp lệ làm mới |

OFFLINE do TTL nghĩa là không còn bằng chứng liveness trong cửa sổ quy định, không khẳng định nguyên nhân là mất điện. UNKNOWN phân biệt mất khả năng quan sát broker với kết luận về từng Device. Không đổi toàn bộ trạng thái ngay khi broker disconnect. Device chưa từng có tín hiệu (UNKNOWN + lastSeenAt null) vẫn UNKNOWN.

## Cấu hình và vòng đời

- `DEVICE_PRESENCE_TIMEOUT_SECONDS`: mặc định **90**, tương đương khoảng 6 chu kỳ telemetry 15 giây.
- `DEVICE_PRESENCE_CHECK_INTERVAL_SECONDS`: mặc định **10**, số nguyên dương và không lớn hơn TTL.
- Không cần sửa `.env` thật nếu dùng mặc định; `.env.example` có tên biến để cấu hình sau.
- Watchdog chỉ start khi MQTT_ENABLED=true; singleton start idempotent, kiểm tra đầu tiên ngay sau startup rồi chờ 10 giây sau khi lượt trước kết thúc. Không có DB checks chồng chéo.
- Shutdown clear timer và đợi lượt đang chạy trước khi đóng MQTT/Prisma. Lỗi DB được log an toàn và tự thử lại.
- Với tải bình thường: watchdog phát hiện timeout khoảng **90–100 giây** sau lastSeenAt; UI thêm tối đa một chu kỳ polling 10 giây và độ trễ request. LWT có thể sớm hơn, phụ thuộc MQTT keepalive/đường mạng.
- MQTT state chỉ connected sau khi cả hai subscriptions được cấp; subscribe lỗi/denied được coi là observer chưa sẵn sàng. Resubscribe do connect handler quản lý, tránh hai cơ chế resubscribe chạy cùng lúc.

## Retained, receipt time và concurrency

MQTT client truyền `packet.retain` và thời điểm nhận packet vào router/adapters trước khi xếp hàng. Nhờ vậy queue chậm không biến giờ xử lý thành heartbeat mới. Packet đã nằm chờ quá TTL không làm ONLINE.

MQTT DUP redelivery cũng không được coi là bằng chứng liveness mới: status DUP bỏ qua; telemetry DUP vẫn có thể lưu lịch sử nhưng không refresh presence hoặc chạy side effects. Chính sách bảo thủ này tránh bản OFFLINE cũ bị phát lại sau ONLINE mới. Nếu DUP là lần đầu backend thực sự nhận payload, readings vẫn được bảo toàn; xác nhận presence/evaluation chờ packet live tiếp theo. Telemetry trùng recordedAt nhưng là publish live mới (không DUP) vẫn làm mới lastSeenAt như bình thường.

MQTT 3.1.1 broker đặt RETAIN=1 cho replay do subscription mới, RETAIN=0 cho delivery tới subscription hiện hữu, kể cả publisher gửi retained. Vì vậy vẫn tương thích birth/LWT retained của firmware; không cần đổi JSON hay xóa retained trên broker. Tham khảo [OASIS MQTT 3.1.1 §3.3.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html).

Mọi transition dùng UPDATE có điều kiện:

- Watchdog kiểm tra connectionStatus và lastSeenAt quá hạn **ngay trong UPDATE**; không SELECT danh sách stale rồi update theo id.
- Heartbeat chỉ cập nhật khi lastSeenAt hiện tại không mới hơn thời điểm packet được nhận.
- OFFLINE live không ghi đè heartbeat có receipt time mới hơn.
- Telemetry trùng timestamp vẫn có thể làm mới presence nếu live/hợp lệ; readings vẫn skipDuplicates và chỉ reading mới chạy side effects.
- Thay đổi presence tự nó không gọi Alert/Automation hoặc tạo command. Telemetry live mới vẫn đi qua evaluators hiện hữu; ngưỡng/cooldown/override không đổi. OFFLINE/UNKNOWN tiếp tục bị DeviceCommandService chặn theo kiểm tra sẵn có.

Nhiều watchdog dùng chung DB có predicate an toàn, nhưng deployment hiện tại cần **một MQTT ingestion consumer hoạt động**. API replicas có thể tắt MQTT. Không chạy hai MQTT consumers dùng cùng client ID (có thể reconnect qua lại). Nếu muốn nhiều ingestion consumers, cần thiết kế leader/event ordering riêng: status schema không có event timestamp/sequence nên không thể đảm bảo thứ tự toàn cục qua nhiều kết nối hoặc đồng hồ không đồng bộ. Không thay schema trong task này.

## Frontend

Devices List được thêm REST polling 10 giây cho list + summary, giữ filter/page/form, cancellation và visibility qua usePolling. Device Detail và Dashboard tái sử dụng polling trước đó. Không suy luận OFFLINE từ HTTP error.

Zone overview chỉ có readings/timestamp, không có connectionStatus trong response; không tự gán trạng thái Device hoặc đổi API để suy đoán. Dữ liệu đo cũ vẫn là lịch sử đo, không bị xóa khi Device OFFLINE.

## Kiểm thử an toàn

```powershell
npm --prefix backend run test:presence
npm --prefix frontend run test:polling
```

Presence suite transpile source trong bộ nhớ với DB/MQTT/timers mock. Loader chặn import config database/env thật và MQTT client không mock. Không kết nối PostgreSQL/broker, không ghi file, không tạo credential. Bao gồm ONLINE, TTL/boundary, race, reconnect, retained replay, live LWT delivery, watchdog lifecycle/retry, multi-device, auth/farm scope, giữ history/idempotency, transport metadata, SUBACK denied và policy UNKNOWN.

Đây là unit/source integration tests, **không phải** bằng chứng đã rút điện ESP32 hoặc restart broker/backend thật. Test polling frontend cũng không thay thế nghiệm thu browser.

## Nghiệm thu với ESP32 thật — người dùng chủ động thực hiện

1. Chạy bản backend mới theo quy trình hiện tại. Nếu dùng tsx watch, thay đổi source có thể đã được tự nạp; nếu dùng dist cần người dùng restart bản đã build. Agent không tự dừng dịch vụ để kiểm thử.
2. Giữ Device Detail và Devices List mở. Khi ESP32 gửi mỗi 15 giây, trạng thái ONLINE và lastSeenAt tiến theo backend; không F5.
3. Khi sẵn sàng, tự ngắt ESP32/mạng. Quan sát OFFLINE bởi live LWT hoặc sau TTL + watchdog + UI polling. Ghi thời điểm lastSeenAt; nó không được tiến khi watchdog chạy.
4. Tự kết nối lại ESP32: telemetry/status live mới khôi phục ONLINE; không có lệnh tưới chỉ vì presence đổi.
5. Tự thử broker outage sau khi đồng ý: sau TTL là UNKNOWN, không gán nguyên nhân cho từng Device. Broker trở lại resubscribe; replay retained không hồi sinh ONLINE. Tín hiệu live mới xác nhận lại trạng thái.
6. Tự thử backend restart khi ESP32 đang gửi và khi đã tắt: kiểm tra log một watchdog, subscriber restored, readings lịch sử không mất và không tin retained cũ.
7. Đổi Farm/Zone/filter nhanh trên Devices List; mở form nhập dở; xác nhận polling không reset state và không nhận response scope cũ.

## Arduino IDE: kiểm tra thủ công, chưa sửa firmware

- Giữ Device code/username hiện hữu và telemetry 15 giây/lần.
- Last Will đăng ký ngay khi CONNECT: status topic hiện tại, OFFLINE JSON schemaVersion=1, retained=true; birth ONLINE gửi lại sau mỗi reconnect.
- Telemetry retained=false. Chọn keepalive phù hợp thư viện Arduino đang dùng; LWT không được bảo đảm tức thì khi mất Wi-Fi/điện.
- Nếu chỉ disconnect chủ động, broker thường không phát LWT: publish OFFLINE trước disconnect nếu muốn báo ngay. TTL vẫn là fallback nếu không có bản tin đó.
- Không thêm heartbeat mới nếu telemetry đã đủ; không cung cấp password trong log/source được commit.

## Giới hạn

Chưa nghiệm thu hardware failure/broker restart/browser trong task. Không thêm physical fail-safe cho pump; Device OFFLINE không tự tắt actuator thật. Correlation/ACK/timeout command và fail-safe firmware vẫn thuộc phần điều khiển vật lý riêng.
