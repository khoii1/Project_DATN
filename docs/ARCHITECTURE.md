# Kiến trúc hệ thống

> Nghiệm thu MVP ngày28/10/2026: xem [trạng thái](archive/PROJECT_COMPLETION_STATUS.md) và [matrix](archive/FINAL_ACCEPTANCE_MATRIX.md). Các mô tả gateway mock ở phần baseline Phase11 bên dưới không còn mô tả đầy đủ runtime: hiện có MQTT command/ACK và firmware13.4F.1, nhưng VERIFIED_LIVE/ACTIVE vẫn chưa nghiệm thu. SHADOW/persistence mới không wire production.

## Thành phần

```text
Browser
  -> React/Vite frontend
  -> Axios REST client + Bearer JWT
  -> Express routes -> middleware -> controllers -> services -> repositories
  -> Prisma Client -> PostgreSQL

MQTT device/simulator -> Mosquitto -> MQTT.js client -> MQTT adapters
  -> TelemetryIngestionService / DevicePresenceService
```

Frontend dùng React Router cho protected routes và khôi phục phiên bằng `GET /api/auth/me`. Token được lưu ở local storage khi chọn ghi nhớ, nếu không ở session storage. HTTP client có timeout 5 giây và xóa token khi nhận `401`.

### Auto-refresh giám sát bằng REST

`usePolling` sử dụng `createPollingController`, mặc định chờ 10 giây sau khi batch trước hoàn tất. Không dùng `setInterval`: request chậm không tạo batch chồng chéo. Đổi scope/unmount hủy Axios bằng AbortSignal và vô hiệu response cũ; tab ẩn dừng timer/hủy request, tab hiện tải lại. StrictMode setup/cleanup có thể hủy dispatch ban đầu trước khi gửi.

- Device detail: Device, latest readings và actuator hiện tại.
- Sensors: trang danh sách theo filter/page hiện tại, không tải summary/dropdowns mỗi tick.
- Dashboard: device/alert summary, recent alerts; Zone hiện tại gồm readings, active alerts, pumps và automation. Reports, activity và danh sách Farm không polling.
- Alerts: summary, danh sách theo tab/filter/page và chi tiết đang mở.
- Zone sensor overview: latest readings của Zone.
- History: **không polling toàn bộ lịch sử**. Refresh preset tương đối tính lại from/to; custom range giữ nguyên. Request lịch sử và selector có cancellation.

Polling nền không bật lại skeleton, không reset form/filter/page; lỗi giữ dữ liệu đã nhận, có thông báo và tự thử lại. Form Device dùng snapshot riêng để poll không reset input. Giá trị 0 được giữ nguyên; timestamp đo là recordedAt từ backend, không thay bằng giờ frontend. Không suy ra OFFLINE từ lỗi HTTP; TTL/watchdog presence là nhiệm vụ backend riêng.

Backend khởi tạo theo thứ tự database, HTTP, rồi MQTT. Middleware chính gồm Helmet, CORS whitelist, JSON limit 1 MB, logging, authentication, authorization và error handling. Shutdown đóng MQTT, HTTP server và Prisma.

## Luồng REST và dữ liệu

Controller chỉ điều phối request/response. Service chứa validation nghiệp vụ và kiểm tra quyền; repository tạo query Prisma theo farm scope. Không lấy ID từ client làm bằng chứng quyền sở hữu.

Dashboard và report đọc dữ liệu thật từ API. File mock dashboard còn tồn tại trong frontend nhưng không được import vào luồng dashboard hiện tại.

## Telemetry

```text
HTTP simulator/service hoặc MqttTelemetryAdapter
  -> TelemetryIngestionService
  -> xác minh device ACTIVE
  -> ánh xạ sensorCode duy nhất trong device
  -> kiểm tra sensor ACTIVE, số hữu hạn và khoảng vật lý
  -> createManyAndReturn(skipDuplicates)
  -> cập nhật presence device
  -> với từng reading thực sự mới:
       |-> AlertEvaluationService
       `-> AutomationEvaluationService (nếu nguồn/độ mới cho phép)
```

Khóa `(sensorId, recordedAt)` tạo idempotency. Một batch có 1–32 reading; các khoảng vật lý là TEMP `-100..150 °C`, AIR_HUMIDITY `0..100 %`, SOIL_MOISTURE `0..100 %`, LIGHT `0..200000 lux`.

## Lịch sử và biểu đồ

Khoảng truy vấn tối đa 90 ngày. Raw data giới hạn 800 điểm. Resolution hỗ trợ `auto`, `raw`, `5m`, `15m`, `30m`, `1h`, `2h`, `6h`, `1d`; `auto` tăng bucket theo độ dài khoảng. API trả latest/count/min/max/avg và series downsampled.

## Alert

`AlertRule` có operator `LT/LTE/GT/GTE`, severity và hysteresis. Evaluator dùng watermark `lastEvaluatedAt`, transaction serializable và retry xung đột; reading cũ/out-of-order không đảo trạng thái mới hơn. Partial unique index đảm bảo tối đa một Alert active cho mỗi rule.

Reading vi phạm mở Alert; trở về vùng recovery thì tự resolve. Disable/sửa rule có thể resolve Alert. Mọi role trong scope có thể acknowledge; manual resolve chỉ ADMIN/FARM_OWNER và bị từ chối nếu giá trị vận hành mới nhất vẫn vi phạm.

## Automation và command

Automation hiện chỉ hỗ trợ sensor `SOIL_MOISTURE` và actuator `PUMP` trong cùng Zone. `startThreshold < stopThreshold` tạo hysteresis:

- Giá trị `< startThreshold`: yêu cầu bật.
- Giá trị `>= stopThreshold`: yêu cầu tắt.
- Ở giữa: không đổi.

Evaluator áp dụng watermark, freshness, cooldown, manual override và các safety check. `DeviceCommandService` kiểm tra Farm/Zone/Device/Actuator active, Device online, tránh command không đổi state và tránh nhiều command pending. Sau đó command được thực thi bởi `MockDeviceGateway`, gateway giả lập kết quả và cập nhật state. Không có publish command MQTT ở runtime hiện tại.

## MQTT

MQTT adapter chỉ nhận telemetry và device status. Dữ liệu quá cũ hoặc lệch tương lai vẫn có thể được lưu nếu hợp lệ nhưng bị tắt side effect. Broker ngắt kết nối không làm HTTP API dừng. Chi tiết topic/QoS/retained ở `IOT_MQTT.md`.

Presence dùng receipt time backend và conditional UPDATE; watchdog TTL mặc định 90 giây/check 10 giây, có lifecycle start/stop riêng. Retained replay không chứng minh liveness. Stale Device chuyển OFFLINE khi MQTT subscriber sẵn sàng, UNKNOWN nếu broker/subscription không quan sát được. Không chạy automation chỉ vì presence đổi. Devices List cũng polling 10 giây. Xem [DEVICE_PRESENCE.md](DEVICE_PRESENCE.md).

## Bảo mật và giới hạn

- Password băm bcrypt với cost 12; JWT stateless; login có rate limit.
- CORS theo `CLIENT_URL`; Helmet và validation Zod được áp dụng.
- Logout xóa token phía client và ghi activity, không blacklist JWT.
- Broker mẫu không TLS; chỉ phù hợp local/LAN kiểm soát.
- Không có firmware trong repo và chưa có physical command path.

