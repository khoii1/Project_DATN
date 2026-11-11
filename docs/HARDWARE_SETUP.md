# Hardware setup

## Phạm vi bằng chứng

**Cập nhật05/11/2026:** các mục phía dưới là ghi chép ban đầu, đã lỗi thời về việc chưa có firmware/DHT22/relay. Repository hiện có `firmware/SmartAgricultureESP32` hotfix13.4F.1; PhaseY đã đối chiếu12readings MQTT→DEV DB/API và3PERIODIC OFF; Phase12D4 có quan sát motor chạy/tựdừng~1s nhưng toàn phiênPARTIAL. SOIL chưa hiệu chuẩn, không dùng tự tưới. Xem [ma trận hiện hành](FINAL_FEATURE_ACCEPTANCE.md), [kiến trúc](FINAL_SYSTEM_ARCHITECTURE.md) và [12D4](archive/PHASE12D4_PHYSICAL_PUMP_ACCEPTANCE.md). Không dùng danh sách “chưa triển khai” lịch sử bên dưới làm tình trạng hiện tại hoặc chỉ dẫn phải flash/tạo lại firmware.

Repository hiện không có file `.ino`, PlatformIO project, firmware C/C++ hoặc log hardware. Trạng thái “xác minh” bên dưới dựa trên báo cáo thử nghiệm của chủ dự án ngoài repository; người mới chưa thể tái lập nếu chỉ clone source.

## Board và pin map mục tiêu

Board: ESP32 DevKit V1 CP2102 30P Type-C, module ESP32-WROOM-32.

| Thành phần | Kết nối | Sensor code | Trạng thái |
|---|---|---|---|
| BH1750 | VCC→3V3, GND→GND, SDA→GPIO21, SCL→GPIO22 | `LIGHT_01` | ✅ ngoài repo |
| Soil moisture analog | AOUT→GPIO34/ADC1; nguồn thử 3.3 V | `SOIL_01` | 🟡 hiệu chỉnh/debug |
| DHT22 | DATA→GPIO4 | `TEMP_01`, `HUM_01` | ⬜ chưa xác minh |
| Relay tương lai | IN→GPIO26 | actuator, không phải sensor | ⬜ chưa triển khai |

Tất cả tín hiệu đưa vào ESP32 phải ở mức điện áp an toàn 3.3 V. Không cấp tải pump trực tiếp từ GPIO; relay/driver, nguồn tải, mass chung/cách ly và bảo vệ điện phải được thiết kế đúng trước khi thử.

## Kết quả đã biết

### ✅ Xác minh ngoài repository

- Arduino IDE upload thành công; USB/Serial, COM port và Serial Monitor hoạt động.
- BH1750 đã hàn, I2C scanner thấy địa chỉ `0x23`, đã đọc giá trị lux thực tế.
- ADC GPIO34 trên ESP32 đã đọc được trong thử nghiệm.

### 🟡 Đang làm

- Soil sensor từng trả gần 0 khi chạy 3.3 V. Cần kiểm tra wiring/nguồn, raw ADC khô–ướt, độ ổn định và xây dựng calibration map sang phần trăm. Chưa đánh dấu hoàn thành.
- Physical ESP32 telemetry tới broker chưa có firmware trong repo để xác minh end-to-end.

### ⬜ Chưa xác minh/triển khai

- DHT22 đọc nhiệt độ/độ ẩm thực.
- ESP32 subscribe command MQTT và gửi ACK theo correlation.
- GPIO26 điều khiển relay, interlock/fail-safe, pump thật và thử tải.

## Checklist tích hợp tiếp theo

1. Tạo thư mục firmware có README, pin constants và `.env`/secrets bị ignore; không hard-code broker password.
2. Xác minh riêng từng sensor và ghi raw/đơn vị/tần suất; dùng code `TEMP_01`, `HUM_01`, `SOIL_01`, `LIGHT_01` khớp seed/database.
3. Publish status retained/LWT và telemetry schema version 1; xác minh database lưu `source=MQTT` và UI hiển thị.
4. Hiệu chỉnh soil sensor bằng nhiều điểm, lưu công thức/version calibration.
5. Chỉ sau khi telemetry ổn định mới thiết kế command/ACK. Test relay với tải an toàn trước pump; có timeout, trạng thái an toàn khi mất Wi-Fi/broker và chống bật ngoài ý muốn.

