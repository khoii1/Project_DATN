# Phase 12C.1 — Xác minh PostgreSQL telemetry ESP32

## A. Phạm vi và database

**PASS: PostgreSQL đã lưu đủ bốn loại dữ liệu, bản mới nhất nguồn MQTT, đúng Device/Sensor. Không PASS toàn bộ tiêu chí: có một khoảng gián đoạn và chưa kiểm chứng trực tiếp website/API có đăng nhập.**

- Repository: `C:\DATN\Project_datn`.
- Cấu hình đọc từ `backend/.env`; Prisma schema `backend/prisma/schema.prisma`.
- NODE_ENV=development; database cấu hình `localhost:5432/smart_agriculture`.
- Kết nối SQL thực tế: PostgreSQL 17.2, server address `::1/128`, port 5432, `current_database()=smart_agriculture`.
- Snapshot chính: **2026-10-16T11:50:49.742Z**, tức **2026-10-16 18:50:49.742 UTC+7**. PostgreSQL session timezone Asia/Bangkok.
- Mọi truy vấn DB nằm trong Prisma transaction; snapshot chính isolation RepeatableRead, câu đầu `SET TRANSACTION READ ONLY`; SQL xác nhận `transaction_read_only=on`. Các transaction bổ sung cũng READ ONLY.
- Database này có Device demo IDs và lịch sử simulator; không suy ra môi trường production từ tên database. Health backend hiện hữu xác nhận connected, nhưng không có endpoint công khai cho biết DSN của process; nguồn cấu hình được đối chiếu bằng `src/config/env.ts`, không đọc bộ nhớ process.
- Chỉ tạo báo cáo Markdown được yêu cầu. Không sửa firmware/backend/frontend/cấu hình, không INSERT/UPDATE/DELETE/DDL/migration/seed/test suite, không publish MQTT/command hoặc can thiệp relay. ESP32/backend đang chạy tiếp tục ghi dữ liệu tự nhiên; đó không phải thao tác ghi của phiên kiểm tra.
- Không in URL kết nối đầy đủ, mật khẩu hoặc token.

Mapping đã đọc trước truy vấn:

| Model | Bảng | Mapping liên quan |
| --- | --- | --- |
| Device | devices | device_code, connection_status, last_seen_at, updated_at, zone_id |
| Sensor | sensors | device_id, sensor_code, type, status |
| SensorReading | sensor_readings | sensor_id, value, source, recorded_at, received_at |

SensorReading không có createdAt hay unit riêng. Unit lấy theo Sensor.type từ `backend/src/constants/sensor-metadata.ts`. Unique constraint trên (sensor_id, recorded_at).

## B. Device và Sensor

| Thuộc tính | Giá trị snapshot |
| --- | --- |
| Device ID | demo_device_esp32_a |
| Device Code | ESP32-GF-A-01 |
| Vận hành | ACTIVE |
| Kết nối | ONLINE |
| lastSeenAt | 2026-10-16T11:50:48.328Z / 2026-10-16 18:50:48.328 UTC+7 |
| updatedAt | 2026-10-16T11:50:48.338Z |
| Farm | Green Farm (demo_green_farm) |
| Zone | Khu A (demo_zone_a) |

| Sensor Code | Sensor ID | Type | Unit | Status | Device ID |
| --- | --- | --- | --- | --- | --- |
| HUM_01 | demo_sensor_hum | AIR_HUMIDITY | % | ACTIVE | demo_device_esp32_a |
| LIGHT_01 | demo_sensor_light | LIGHT | lux | ACTIVE | demo_device_esp32_a |
| SOIL_01 | demo_sensor_soil | SOIL_MOISTURE | % | ACTIVE | demo_device_esp32_a |
| TEMP_01 | demo_sensor_temp | TEMP | °C | ACTIVE | demo_device_esp32_a |

Đúng bốn Sensor liên kết cùng Device; tất cả ACTIVE, đều có readings. Không có dấu hiệu thiếu mapping hiện tại. ID có tiền tố demo không có nghĩa bản reading hiện tại là simulator; source được kiểm tra trên từng reading.

## C. Latest readings — snapshot cố định, không lấy bốn dòng toàn bảng

Truy vấn riêng latest cho từng Sensor: `orderBy: [{recordedAt:"desc"},{id:"desc"}], take:1` trong quan hệ Sensor.readings, lọc Device.deviceCode chính xác. ID là tie-breaker ổn định dù unique constraint hiện ngăn trùng timestamp trong cùng sensor.

| Sensor Code | Value | Unit | Recorded At UTC | Local Time | Source |
| --- | --- | --- | --- | --- | --- |
| HUM_01 | 69.9 | % | 2026-10-16T11:50:44.639Z | 2026-10-16 18:50:44.639 UTC+7 | MQTT |
| LIGHT_01 | 2.5 | lux | 2026-10-16T11:50:44.639Z | 2026-10-16 18:50:44.639 UTC+7 | MQTT |
| SOIL_01 | 29 | % | 2026-10-16T11:50:44.639Z | 2026-10-16 18:50:44.639 UTC+7 | MQTT |
| TEMP_01 | 32.3 | °C | 2026-10-16T11:50:44.639Z | 2026-10-16 18:50:44.639 UTC+7 | MQTT |

| Sensor | Reading ID (bằng chứng tra cứu) |
| --- | --- |
| HUM_01 | cmvawp7nx004jum2s08z02359 |
| LIGHT_01 | cmvawp7nx004kum2s8buwtts4 |
| SOIL_01 | cmvawp7nx004lum2s667gfbag |
| TEMP_01 | cmvawp7nx004ium2srncfcsu0 |

Cả bốn chung recordedAt `2026-10-16T11:50:44.639Z`, receivedAt `2026-10-16T11:50:48.334Z`, phù hợp thiết kế một telemetry batch. Latest age tại snapshot khoảng 5,103 giây; độ trễ đo → nhận 3,695 giây. Không thay timestamp phía frontend.

Phạm vi validation source thực tế: TEMP -100..150 °C; humidity/soil 0..100%; light 0..200000 lux. Tất cả latest hợp lệ. Đây là kiểm tra phạm vi và lưu dữ liệu, không phải hiệu chuẩn độ chính xác cảm biến hoặc chứng minh ánh sáng/độ ẩm vật lý tuyệt đối.

`source=MQTT` được đọc trực tiếp trong DB, không suy ra từ UI. Quan hệ sensorId → Device đã kiểm tra; không lấy nhầm Device khác. Tuy nhiên schema không lưu MQTT clientId hoặc chữ ký phần cứng: source MQTT chứng minh transport, không tự chứng minh tuyệt đối mọi bản lịch sử MQTT đều từ ESP32 vật lý. Log broker người dùng cung cấp và quan sát heartbeat thật ở lượt trước hỗ trợ luồng thiết bị; không có crypto provenance.

## D. Cửa sổ 10 phút và bất thường

Khoảng đo được khóa theo snapshot: **2026-10-16T11:40:49.742Z → 2026-10-16T11:50:49.742Z**, tương ứng 18:40:49.742 → 18:50:49.742 UTC+7, ngày 16/10/2026.

| Sensor | Số reading | First recordedAt UTC | Last recordedAt UTC | Gap TB (s) | Gap min / max (s) | Ngoài phạm vi |
| --- | --- | --- | --- | --- | --- | --- |
| HUM_01 | 38 | 2026-10-16T11:40:56.001Z | 2026-10-16T11:50:44.639Z | 15.909 | 15 / 48.638 | 0 |
| LIGHT_01 | 38 | 2026-10-16T11:40:56.001Z | 2026-10-16T11:50:44.639Z | 15.909 | 15 / 48.638 | 0 |
| SOIL_01 | 38 | 2026-10-16T11:40:56.001Z | 2026-10-16T11:50:44.639Z | 15.909 | 15 / 48.638 | 0 |
| TEMP_01 | 38 | 2026-10-16T11:40:56.001Z | 2026-10-16T11:50:44.639Z | 15.909 | 15 / 48.638 | 0 |

- 152 readings = **38 bộ timestamp × 4 Sensor**; mọi bộ đều đủ bốn sensor, không có batch thiếu trong cửa sổ.
- Tất cả 152 readings source MQTT; không có SIMULATOR/MANUAL xen kẽ trong cửa sổ này.
- Bình thường khoảng 15 giây, **một khoảng trống chung 48,638 giây**: `11:44:56.001Z → 11:45:44.639Z` (18:44:56.001 → 18:45:44.639 UTC+7).
- Không kết luận mất chính xác bao nhiêu message hoặc nguyên nhân restart/mất mạng/cảm biến/NTP chỉ từ SELECT. Không có log firmware/broker đúng đoạn này để phân biệt. Không có batch mất riêng một Sensor.
- Độ trễ receivedAt − recordedAt trong cửa sổ: 3,608..3,927 giây, không âm.
- Không có recordedAt đảo thứ tự theo receivedAt (tie-break ID) trong cửa sổ. Không có timestamp tương lai quá 60 giây trong truy vấn toàn lịch sử thiết bị.
- Duplicates toàn lịch sử Device, GROUP BY sensor_id/recorded_at HAVING COUNT(*)>1: **0 nhóm**; unique schema cũng bảo vệ cặp khóa này.
- Giá trị min..max: TEMP 32,2..32,3; HUM 69,2..69,9; LIGHT 1,67..2,5; SOIL 23,28..30,56. Không có NaN/Infinity hoặc ngoài validation trong toàn lịch sử thiết bị tại lần kiểm tra.
- Chuỗi cùng value dài nhất trong cửa sổ: TEMP 21 mẫu, HUM 6, LIGHT 17, SOIL 1. recordedAt vẫn tăng và các kênh khác biến đổi; không đủ căn cứ coi sensor bị treo chỉ vì nhiệt độ/ánh sáng ít thay đổi. Ghi nhận, không tự sửa hoặc giả tạo dữ liệu.

### Lịch sử simulator và timestamp cũ

SELECT bổ sung lúc khoảng 11:51:24Z (ESP32 tiếp tục gửi nên count MQTT tăng so với snapshot chính):

| Sensor | Source | Count toàn lịch sử | First recordedAt UTC | Last recordedAt UTC |
| --- | --- | --- | --- | --- |
| HUM_01 | SIMULATOR | 1476 | 2026-07-27T10:00:00.000Z | 2026-08-27T02:30:00.000Z |
| HUM_01 | MQTT | 853 | 2026-10-12T06:30:05.000Z | 2026-10-16T11:51:14.639Z |
| LIGHT_01 | SIMULATOR | 1476 | 2026-07-27T10:00:00.000Z | 2026-08-27T02:30:00.000Z |
| LIGHT_01 | MQTT | 853 | 2026-10-12T06:30:05.000Z | 2026-10-16T11:51:14.639Z |
| SOIL_01 | SIMULATOR | 1491 | 2026-07-27T10:00:00.000Z | 2026-08-27T11:46:45.000Z |
| SOIL_01 | MQTT | 731 | 2026-10-13T02:29:47.000Z | 2026-10-16T11:51:14.639Z |
| TEMP_01 | SIMULATOR | 1482 | 2026-07-27T10:00:00.000Z | 2026-08-27T02:53:00.000Z |
| TEMP_01 | MQTT | 853 | 2026-10-12T06:30:05.000Z | 2026-10-16T11:51:14.639Z |

Simulator là dữ liệu lịch sử tháng 7–8, không nằm trong cửa sổ đo thật hiện tại. Không có source khác ngoài MQTT/SIMULATOR trong kết quả nhóm thiết bị này.

Phát hiện **20 readings SIMULATOR cũ có receivedAt < recordedAt**: HUM 1, LIGHT 1, SOIL 12, TEMP 6, ngày 26–27/08/2026; chênh lệch -293,574..-1,190 giây. Đây là bất thường timestamp của lịch sử simulator, không phải lỗi múi giờ hoặc dữ liệu MQTT mới. Không xóa/dọn dữ liệu. MQTT không có trường hợp receivedAt trước recordedAt trong truy vấn đó.

## E. Timestamp và đối chiếu website/API

Các cột recorded_at/received_at/last_seen_at là PostgreSQL `timestamp without time zone`; Prisma biểu diễn bằng Date/ISO Z theo quy ước UTC của ứng dụng. Session timezone Asia/Bangkok không biến phép hiển thị +7 thành lỗi. Không khẳng định kiểu SQL này tự mang timezone.

- Ingestion `src/services/telemetry-ingestion.service.ts` giữ batch.recordedAt cho mọi reading.
- `src/repositories/sensor-reading.repository.ts` trả Date, không tự cộng 7 giờ. Express JSON serialize Date thành ISO.
- Frontend `SensorValueCard.tsx` dùng new Date(recordedAt) + Intl.DateTimeFormat("vi-VN", ...), **không đặt timeZone cố định**: hiển thị theo timezone browser. Browser ở UTC+7 thì đúng giờ Việt Nam; locale vi-VN một mình không đảm bảo timezone nếu máy khách đổi múi giờ.
- Timestamp bản Serial ví dụ `2026-10-16T10:57:03.946Z` đổi đúng thành 17:57:03.946 UTC+7. SELECT exact timestamp/source MQTT cho bốn Sensor trả **0**, nên **không xác nhận sample Serial cụ thể đó từng được lưu**; điều này không phủ nhận các sample mới đã lưu sau khi kết nối backend được khắc phục.

### Bộ dữ liệu website người dùng cung cấp

SELECT khoảng `[2026-10-16T11:42:11Z, 2026-10-16T11:42:12Z)` trả đủ bốn bản source MQTT:

| Sensor | Giá trị DB | Giá trị website do người dùng nêu |
| --- | --- | --- |
| TEMP_01 | 32.3 °C | 32.3 °C |
| HUM_01 | 69.3 % | 69.3 % |
| LIGHT_01 | 1.67 lux | 1.67 lux |
| SOIL_01 | 24.44 % | 24.44 % |

Cả bốn recordedAt `11:42:11.001Z` = **18:42:11.001 UTC+7**; receivedAt `11:42:14.690Z` = **18:42:14.690 UTC+7**. Khớp giá trị và giờ cập nhật trong mô tả website. Last seen 18:42:14 là tương thích với receipt time nhưng không chứng minh lịch sử Device.lastSeenAt: Device chỉ lưu trạng thái hiện tại, không có lịch sử heartbeat trong các bảng đã truy vấn.

**PASS đối chiếu bộ dữ liệu người dùng cung cấp; NOT VERIFIED đối chiếu trực tiếp website hiện tại.** Không đánh dấu trường hợp D (cả hai phía thực tế đều kiểm chứng) chỉ dựa vào mô tả người dùng.

GET thực tế `/api/health`: HTTP 200, database connected, MQTT connected lúc 11:51:24Z. GET `/api/devices/demo_device_esp32_a` và `/api/devices`: HTTP 401 khi không có token. Không bypass auth, tạo token quản trị hoặc dùng POST login (có thể ghi ActivityLog). Chưa kiểm chứng authenticated sensor/device API hoặc phiên browser; Browser không khả dụng ở lượt kiểm tra trước. Chưa có bằng chứng API trả sai; 401 chỉ phản ánh thiếu session kiểm thử.

## F. Bằng chứng truy vấn và kết luận

Các câu truy vấn thực hiện trực tiếp bằng Prisma Client, transaction READ ONLY; không chỉ đưa hướng dẫn SQL. Ví dụ phần latest đã chạy:

```typescript
await prisma.$transaction(async tx => {
  await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
  return tx.device.findUnique({
    where: { deviceCode: "ESP32-GF-A-01" },
    select: {
      sensors: {
        select: {
          id: true, sensorCode: true, type: true, status: true, deviceId: true,
          readings: {
            orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { id: true, value: true, source: true,
                      recordedAt: true, receivedAt: true }
          }
        }
      }
    }
  });
}, { isolationLevel: "RepeatableRead" });
```

Bản chạy thực tế còn SELECT Device/Farm/Zone, metadata DB/columns; danh sách readings trong khoảng snapshot được sắp recordedAt ASC/id ASC rồi tính gaps/latency/runs trong bộ nhớ, không ghi bảng.

SQL duplicate thực chạy, tham số $1 = ESP32-GF-A-01:

```sql
SELECT sr.sensor_id, sr.recorded_at, COUNT(*)::int AS count
FROM sensor_readings sr
JOIN sensors s ON s.id = sr.sensor_id
JOIN devices d ON d.id = s.device_id
WHERE d.device_code = $1
GROUP BY sr.sensor_id, sr.recorded_at
HAVING COUNT(*) > 1;
-- Kết quả: 0 dòng.
```

Gap kiểm tra bằng SQL LAG partition theo Sensor, ORDER BY recorded_at/id, ngưỡng >22,5 giây; kết quả bốn dòng cùng khoảng 48,638 giây nêu ở D. Các truy vấn bất thường/nguồn đều JOIN đúng Device code, không quét lẫn thiết bị khác vào kết luận.

| Tiêu chí | Kết quả | Giải thích |
| --- | --- | --- |
| Đủ bốn loại dữ liệu trong PostgreSQL | PASS | Sensor mapping đúng; latest đầy đủ |
| Latest source MQTT | PASS | Đọc trực tiếp từng reading |
| Device ONLINE | PASS | SELECT snapshot xác nhận |
| Timestamp batch mới / UTC+7 | PASS | Chung thời điểm, không tương lai; đổi giờ đúng |
| Nhịp đo thường khoảng 15 giây | PASS | Min 15 giây, TB 15,909 giây |
| Liên tục không gián đoạn toàn cửa sổ | FAIL | Một gap 48,638 giây, nguyên nhân NOT VERIFIED |
| Không duplicate Sensor/timestamp | PASS | GROUP BY toàn lịch sử không có nhóm trùng |
| Giá trị trong validation | PASS | Không có giá trị ngoài phạm vi/NaN/Infinity |
| Không simulator xen kẽ cửa sổ thật | PASS | 152/152 readings MQTT |
| Toàn lịch sử không có bất thường timestamp | FAIL | 20 simulator cũ receivedAt trước recordedAt |
| Sample Serial 10:57:03.946Z đã lưu | FAIL | Exact-match count=0 |
| Khớp bộ dữ liệu website người dùng mô tả | PASS | Bốn giá trị và timestamp 18:42:11 khớp |
| API authenticated và UI live nhất quán | NOT VERIFIED | Không có session, chỉ health GET thành công |
| Chứng minh nguồn phần cứng cho mọi dòng MQTT | NOT VERIFIED | Schema không lưu client identity/chữ ký |

**Phase 12C.1 đạt kiểm tra lưu PostgreSQL thực tế cho đủ bốn cảm biến MQTT mới. Không tuyên bố toàn bộ kiểm thử PASS, lịch sử hoàn toàn sạch hoặc E2E website/API đã hoàn tất.**

## G. Đề xuất chỉ từ vấn đề đã phát hiện

1. Giữ nguyên dữ liệu. Khi cần phân tích lịch sử phần cứng, lọc source MQTT và khoảng hoạt động thực tế để không trộn simulator cũ.
2. Đối chiếu Serial/Mosquitto/backend tại 18:44:56–18:45:44 UTC+7 để tìm nguyên nhân gap chung. Không tăng TTL hoặc chèn bù readings chỉ để có đường biểu đồ liên tục.
3. Khi có phiên đăng nhập, dùng DevTools Network GET latest/device, so recordedAt và giá trị cùng thời điểm với DB; chưa cần sửa giao diện vì chưa phát hiện mismatch trực tiếp.
4. Kiểm tra mẫu Serial 17:57:03 riêng nếu cần bằng chứng lịch sử; không coi PUBACK là commit DB.
5. 20 timestamp simulator cũ chỉ cần đánh dấu trong báo cáo nghiên cứu, không tự cleanup. Nếu triển khai đa múi giờ, ghi nhận quyết định timezone UI/quy ước lưu UTC trong nhiệm vụ khác, không đổi schema ở đây.

