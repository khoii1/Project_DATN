# IoT và MQTT

## Trạng thái topic

Prefix cấu hình bằng `MQTT_TOPIC_PREFIX`, mặc định `smart-agriculture/v1`.

| Topic | Trạng thái | Runtime hiện tại |
|---|---|---|
| `.../devices/{deviceCode}/telemetry` | ✅ triển khai | Backend subscribe QoS 1, parse và ingest |
| `.../devices/{deviceCode}/status` | ✅ triển khai | Backend subscribe QoS 1, cập nhật presence |
| `.../devices/{deviceCode}/commands/{actuatorCode}` | Phase 12 opt-in | Backend publish QoS1/non-retain; mặc định COMMANDS_ENABLED=false, firmware cần tích hợp |
| `.../devices/{deviceCode}/command-acks/{actuatorCode}` | Phase 12 opt-in | ACK correlation, timeout, persistence; chưa test bơm thật |

`{deviceCode}`/`{actuatorCode}` được chuẩn hóa uppercase và phải khớp `[A-Z0-9_-]{3,64}`.

## Payload

Telemetry JSON schema:

```json
{
  "schemaVersion": 1,
  "deviceCode": "ESP32-GF-A-01",
  "recordedAt": "2026-08-27T10:00:00.000Z",
  "readings": [
    { "sensorCode": "SOIL_01", "value": 42.5 },
    { "sensorCode": "LIGHT_01", "value": 850.0 }
  ]
}
```

Status JSON schema:

```json
{ "schemaVersion": 1, "deviceCode": "ESP32-GF-A-01", "status": "ONLINE" }
```

Payload là strict schema; `deviceCode` trong topic phải khớp payload; telemetry có 1–32 readings, timestamp ISO có offset, value hữu hạn. Adapter giới hạn kích thước (mặc định 32768 byte).

## Luồng telemetry

```text
Device/simulator --QoS 1--> Mosquitto
  -> mqtt-message-router
  -> MqttTelemetryAdapter
  -> TelemetryIngestionService(source=MQTT)
  -> SensorReading + device ONLINE/lastSeenAt
  -> Alert evaluation
  -> Automation evaluation
  -> DeviceCommandService
  -> MQTT Gateway (explicit opt-in; disabled by default)
```

Reading hợp lệ nhưng quá cũ hoặc xa trong tương lai vẫn được lưu để bảo toàn dữ liệu, nhưng adapter truyền cờ không chạy Alert/Automation. Ngưỡng tuổi dùng `MQTT_SIDE_EFFECT_MAX_AGE_SECONDS`; lệch tương lai trên 60 giây không tạo side effect. Duplicate `(sensorId, recordedAt)` bị bỏ qua và không lặp side effect.

## Kết nối và presence

- MQTT.js dùng `clean: true`, auto reconnect theo `MQTT_RECONNECT_PERIOD_MS` (mặc định 3000 ms).
- Backend subscribe telemetry/status với QoS 1 mỗi lần connect/reconnect; khi bật Phase 12, thêm ACK/state filters.
- Message được xếp hàng xử lý tuần tự; lỗi payload không làm client crash.
- MQTT disabled/disconnected được thể hiện trong `/api/health`; HTTP vẫn hoạt động.
- Simulator publish birth `ONLINE` retained, telemetry không retained, cấu hình Last Will `OFFLINE` retained và gửi graceful `OFFLINE` khi dừng.

### Device presence đáng tin cậy

Backend truyền retained flag và receipt time từ MQTT packet vào adapters. Retained status replay (cả ONLINE/OFFLINE) không thay presence; retained telemetry có thể lưu lịch sử nhưng không làm mới presence hoặc kích hoạt side effects. Live telemetry/ONLINE cập nhật lastSeenAt theo giờ backend nhận packet; live OFFLINE/LWT giữ heartbeat cuối.

Watchdog mặc định TTL 90 giây, check 10 giây; expire bằng conditional UPDATE để không ghi đè heartbeat mới. Khi MQTT observer hoạt động, stale Device thành OFFLINE; khi mất khả năng quan sát broker, stale ONLINE thành UNKNOWN. Không sửa JSON/topic hoặc credential. Chi tiết cấu hình, concurrency/multi-instance và nghiệm thu: [DEVICE_PRESENCE.md](DEVICE_PRESENCE.md).

## Broker và authentication

`infrastructure/mosquitto/` có cấu hình mẫu cổng 1883, `allow_anonymous false`, password file, ACL và persistence. ACL cho backend đọc telemetry/status và chuẩn bị write command/read ACK; device được write telemetry/status của chính nó và chuẩn bị read command/write ACK của chính nó.

File password thật không được commit. Mẫu hiện là MQTT plaintext cho local/LAN; production cần TLS, network isolation và quy trình cấp/rotate credential.

## Chạy simulator

Sau khi tạo broker credential và bật MQTT backend:

```powershell
npm --prefix backend run simulate:mqtt-device -- --device-code ESP32-GF-A-01
```

Simulator dùng credential từ environment, QoS 1 và dữ liệu xác định được. Xem setup broker chi tiết tại `infrastructure/mosquitto/README.md` và test tại `TESTING.md`.

## Ranh giới chưa hoàn thành

Phase 12 đã có `MqttDeviceGateway`; default command path bị khóa, không fallback mock. Phase 12B có firmware hợp nhất, đã compile/test offline nhưng chưa upload hoặc kiểm chứng bơm thật. Không suy luận phần cứng hoạt động chỉ từ topic/ACK.

## Phase 12: điều khiển relay thật, mặc định bị khóa

Xem [hợp đồng firmware](ESP32_PUMP_MQTT_INTEGRATION.md) và [báo cáo triển khai](archive/PHASE12_IMPLEMENTATION_REPORT.md). Bổ sung topic `.../devices/{deviceCode}/actuator/state` (OFF, QoS1, non-retain). Giữ topic plural commands/command-acks có sẵn. Command/ACK yêu cầu actuatorCode; migration additive cần duyệt và deploy **trước khi chạy backend mới**. Chưa apply migration, sửa ACL broker thực tế hoặc publish lệnh bơm trong đợt triển khai. Không chạy simulator điều khiển cũ khi bật cờ MQTT thật.

## Phase 12B: firmware ESP32 hợp nhất

Source và hướng dẫn IDE/credentials/Verify/Upload thủ công: [firmware/README.md](../firmware/README.md). Báo cáo kiểm thử, migration/ACL còn chờ duyệt: [PHASE12B_FIRMWARE_REPORT.md](archive/PHASE12B_FIRMWARE_REPORT.md). Giữ ENABLE_PUMP_COMMANDS=false trong lần bàn giao; không thay wiring đã test, schema telemetry hoặc schema OFF-only của actuator/state.
