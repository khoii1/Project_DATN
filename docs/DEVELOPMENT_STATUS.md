# Trạng thái phát triển

> Bộ nhớ kỹ thuật cập nhật sau mỗi Phase lớn. Quy ước: ✅ hoàn thành/xác minh; 🟡 một phần/đang làm; ⬜ chưa triển khai. “Xác minh ngoài repository” không đồng nghĩa có artifact tái lập trong source.

## Ảnh chụp trạng thái hiện tại

- ✅ Website full-stack và database cho Phase 1–10 đã có source và test scripts.
- ✅ MQTT telemetry/status backend của Phase 11 đã có source, broker config, simulator và integration test.
- 🟡 Command device vẫn dùng `MockDeviceGateway`; command/ACK MQTT mới là contract chuẩn bị.
- 🟡 Hardware telemetry đang tích hợp: ESP32/BH1750 được chủ dự án xác nhận chạy ngoài repo; soil sensor đang debug.
- ⬜ DHT22, relay và pump vật lý chưa được xác minh hoàn tất.

## Theo Phase

| Phase | Trạng thái | Bằng chứng/chức năng |
|---|---|---|
| 1 — Khởi tạo | ✅ | Frontend/backend tách riêng, health, layout, login UI, routes cơ bản, root scripts |
| 2 — Auth/RBAC | ✅ | bcrypt, JWT, restore session, logout, 3 roles, protected route/403, user CRUD, login limiter, logs |
| 3 — Farm/Zone/Crop | ✅ | CRUD, owner/staff scope, assignment, search/filter/page, detail pages, logs |
| 4 — Device | ✅ | CRUD, operational/connection status, summary, real dashboard API, status simulator |
| 5 — Sensor/ingest | ✅ | Sensor/Reading, validation, idempotency, latest, source, simulator |
| 6 — History | ✅ | Range, raw pagination, stats, presets, downsampling, 90-day limit |
| 7 — Alert | ✅ | Rule/lifecycle, operators, hysteresis, recovery, acknowledge/manual resolve |
| 8 — Actuator/manual | ✅ phần mềm | Actuator, command/history, irrigation permission; execution là mock |
| 9 — Automation | ✅ phần mềm | Soil/Pump same-zone rule, hysteresis, cooldown, override, safety; output là mock |
| 10 — Hardening/report | ✅ | Reports/charts/CSV/activity/dashboard, RBAC/IDOR and regression test scripts |
| 11 — MQTT ingest | ✅ telemetry/status; 🟡 tổng thể | Mosquitto/MQTT.js, adapter, persistence, freshness, alert/automation, health, reconnect; command path chưa có |

## Đang dùng mock hoặc simulator

- `MockDeviceGateway`: đích thực thi của toàn bộ `DeviceCommand`, gồm cả manual và automation.
- MQTT device simulator: publish status/telemetry, retained birth, LWT và graceful offline.
- Các simulator backend khác tạo status/readings/history/alert/irrigation/automation cho dev/test.
- Seed tạo reading `SIMULATOR` và thiết bị/sensor/actuator demo.
- File `frontend/src/data/dashboard.mock.ts` là artifact cũ không được dashboard hiện tại import.

## Hardware

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| ESP32 upload/USB/COM/Serial | ✅ xác minh ngoài repo | Chủ dự án báo đã chạy bằng Arduino IDE; repo không có firmware/log |
| BH1750 tại `0x23`, lux thật | ✅ xác minh ngoài repo | Đã hàn và đọc lux theo báo cáo của chủ dự án |
| Soil sensor GPIO34 | 🟡 | ADC chạy; giá trị từng gần 0 ở 3.3 V; cần debug/calibration |
| DHT22 GPIO4 | ⬜ chưa xác minh | Không có firmware/test evidence |
| Relay GPIO26 và pump | ⬜ | Chưa có physical command path |

## Giới hạn hiện tại

- Không có firmware/hardware test artifact trong source.
- Không có MQTT command publisher, command consumer trên ESP32 hay ACK handler.
- Mock gateway không chứng minh relay/pump thật hoạt động.
- MQTT sample deployment là plaintext, chưa TLS/certificate/provisioning production.
- JWT không có refresh/revocation; logout stateless.
- Root không có test aggregator; suite Phase 11 cần broker thật và credential test.
- Prisma seed khai báo theo cơ chế còn dùng được ở Prisma 6 nhưng cần chuyển khi nâng Prisma 7.

## Công việc tiếp theo

1. Đưa firmware ESP32 có cấu hình tách secret vào repository; publish status và bốn sensor code theo contract.
2. Hoàn tất hiệu chỉnh soil sensor, xác minh DHT22 và chạy telemetry end-to-end ESP32 → broker → database → UI.
3. Thiết kế an toàn rồi triển khai command publish, ESP32 subscribe, correlation/ACK, timeout/retry và fail-safe.
4. Chỉ sau test điện/relay/tải an toàn mới đánh dấu relay/pump hoàn thành.
5. Bổ sung TLS và quy trình cấp credential nếu triển khai ngoài mạng tin cậy.

## Cách cập nhật file này

Mỗi thay đổi phải ghi trạng thái theo bằng chứng source/test. Không xóa giới hạn trước khi có implementation. Nếu thay gateway, topic hoặc luồng ingest, đồng thời cập nhật `ARCHITECTURE.md` và `IOT_MQTT.md`; nếu thay schema, cập nhật `DATABASE.md` và số migration.
