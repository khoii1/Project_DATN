# IoT và MQTT

## Trạng thái topic

Prefix cấu hình bằng `MQTT_TOPIC_PREFIX`, mặc định `smart-agriculture/v1`.

| Topic | Trạng thái | Runtime hiện tại |
|---|---|---|
| `.../devices/{deviceCode}/telemetry` | ✅ triển khai | Backend subscribe QoS 1, parse và ingest |
| `.../devices/{deviceCode}/status` | ✅ triển khai | Backend subscribe QoS 1, cập nhật presence |
| `.../devices/{deviceCode}/commands/{actuatorCode}` | 🟡 contract chuẩn bị | Có topic builder và ACL mẫu; backend chưa publish, device chưa subscribe trong repo |
| `.../devices/{deviceCode}/command-acks/{actuatorCode}` | 🟡 contract chuẩn bị | Có topic builder và ACL mẫu; chưa có ACK handler/runtime |

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
  -> MockDeviceGateway
```

Reading hợp lệ nhưng quá cũ hoặc xa trong tương lai vẫn được lưu để bảo toàn dữ liệu, nhưng adapter truyền cờ không chạy Alert/Automation. Ngưỡng tuổi dùng `MQTT_SIDE_EFFECT_MAX_AGE_SECONDS`; lệch tương lai trên 60 giây không tạo side effect. Duplicate `(sensorId, recordedAt)` bị bỏ qua và không lặp side effect.

## Kết nối và presence

- MQTT.js dùng `clean: true`, auto reconnect theo `MQTT_RECONNECT_PERIOD_MS` (mặc định 3000 ms).
- Backend subscribe hai filter telemetry/status với QoS 1 mỗi lần connect/reconnect.
- Message được xếp hàng xử lý tuần tự; lỗi payload không làm client crash.
- MQTT disabled/disconnected được thể hiện trong `/api/health`; HTTP vẫn hoạt động.
- Simulator publish birth `ONLINE` retained, telemetry không retained, cấu hình Last Will `OFFLINE` retained và gửi graceful `OFFLINE` khi dừng.

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

Không có `MqttDeviceGateway`. Mọi manual/automation command hiện chạy qua `MockDeviceGateway`; topic command/ACK không chứng minh relay hoặc pump thật hoạt động. Đây là phần tiếp theo, không phải Phase 11 đã hoàn tất.
