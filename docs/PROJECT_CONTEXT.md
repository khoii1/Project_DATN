# Bối cảnh dự án

> Trạng thái nghiệm thu mới nhất: [PROJECT_COMPLETION_STATUS](archive/PROJECT_COMPLETION_STATUS.md) và [FINAL_ACCEPTANCE_MATRIX](archive/FINAL_ACCEPTANCE_MATRIX.md), ngày28/10/2026. Các mô tả Phase11 về chưa có firmware/gateway chỉ còn là baseline lịch sử.

## Mục tiêu và phạm vi

Smart Agriculture là đồ án website tích hợp IoT để quản lý trang trại và biến dữ liệu môi trường thành thông tin vận hành: theo dõi cảm biến, cảnh báo ngưỡng, điều khiển tưới và báo cáo.

Phạm vi hiện có gồm ba lớp:

- Quản trị: user, quyền, farm, staff assignment, zone, crop, device, sensor và actuator.
- Quan sát/vận hành: telemetry, lịch sử, biểu đồ, cảnh báo, command, automation, dashboard, report, CSV và activity log.
- IoT: Mosquitto, backend MQTT telemetry/presence/command/ACK, ESP32 firmware13.4F.1 và simulator riêng; vật lý/production phải nghiệm thu tách biệt.

## Quyết định kiến trúc quan trọng

- Source code là nguồn sự thật; tài liệu phải cập nhật cùng source.
- Frontend không kết nối broker và không truy cập database trực tiếp; dùng REST API.
- Prisma là lớp truy cập PostgreSQL. Thay đổi schema phải có migration, không sửa dữ liệu cấu trúc thủ công.
- `TelemetryIngestionService` là đường ingest trung tâm cho mọi nguồn. `SensorReading.source` phân biệt `SIMULATOR` và `MQTT`.
- Alert và Automation được đánh giá độc lập sau khi reading mới được tạo. Reading trùng vẫn idempotent và không lặp side effect.
- Automation legacy đi qua `DeviceCommandService`; gateway runtime là MQTT có cờ khóa. Mock chỉ dùng test có dependency injection. SHADOW/persistence mới không nối vào luồng command production.
- Data scope được áp dụng ở backend. UI ẩn chức năng không thay thế kiểm tra quyền phía server.
- Tài nguyên ngoài phạm vi farm thường được trả `404` để giảm rò rỉ ID; hành động sai role trả `403`.
- MQTT không phải điều kiện để HTTP API khởi động. Health phản ánh MQTT là `connected`, `disconnected` hoặc `disabled`.

## Thuật ngữ

- Farm scope: tập farm mà actor được phép truy cập.
- Fresh telemetry: reading đủ mới để được phép tạo side effect.
- Active alert: Alert có trạng thái `OPEN` hoặc `ACKNOWLEDGED`.
- Manual override: khoảng thời gian automation nhường quyền sau command thủ công.
- Contract-only topic: topic đã có builder/ACL nhưng chưa có runtime publish/subscribe.

## Nguồn bằng chứng

- Trạng thái phần mềm trong tài liệu được xác minh từ source, migration, package scripts và test code.
- Phần cứng có source firmware và báo cáo nghiệm thu Phase12/13; đối chiếu evidence theo ngày/phạm vi. Quan sát người dùng, MQTT ACK, GPIO và nước chảy là những loại bằng chứng khác nhau.

## Hướng dẫn cho Agent mới

1. Đọc `README.md`, rồi `docs/PROJECT_CONTEXT.md` và `docs/DEVELOPMENT_STATUS.md`.
2. Với backend, đọc `docs/ARCHITECTURE.md`, `docs/DATABASE.md` và route/service liên quan.
3. Với MQTT/hardware, đọc `docs/IOT_MQTT.md`, `docs/HARDWARE_SETUP.md` và cấu hình Mosquitto.
4. Xác minh kế hoạch trong `DEVELOPMENT_STATUS.md`; không biến roadmap thành trạng thái hoàn thành.
5. Không phá RBAC/farm scope hoặc coi kiểm tra phía frontend là đủ.
6. Giữ `TelemetryIngestionService` là ingest trung tâm.
7. Giữ Alert và Automation độc lập; Automation đi qua `DeviceCommandService`.
8. Không ghi database trực tiếp để né validation/business service.
9. Không commit `.env`, password, token, broker credential hoặc connection string thật.
10. Đọc toàn bộ migration trước khi đổi schema; tạo migration phù hợp nếu một task sau này cho phép đổi schema.
11. Sau Phase lớn hoặc thay đổi kiến trúc, cập nhật tài liệu và trạng thái tương ứng.

Danh sách quy tắc 15 điểm đầy đủ nằm trong `README.md`.

## Tài liệu định tuyến

- Cần hiểu luồng hệ thống: `ARCHITECTURE.md`.
- Cần biết đã làm/chưa làm: `DEVELOPMENT_STATUS.md`.
- Làm Prisma/schema: `DATABASE.md`.
- Làm endpoint/quyền: `API_AND_RBAC.md`.
- Làm broker/topic/payload: `IOT_MQTT.md`.
- Đấu nối phần cứng: `HARDWARE_SETUP.md`.
- Chạy kiểm thử: `TESTING.md`.

