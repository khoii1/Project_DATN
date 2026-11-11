# Phase 12D.2B — Telemetry, firmware và actuator state recovery

Ngày 18/10/2026, giờ Việt Nam UTC+7. **PASS upload firmware12D.2 và luồng thực MQTT → backend → PostgreSQL → API, gồm restart backend → UNKNOWN → PERIODIC OFF mà không EN. Browser E2E NOT VERIFIED. Không gửi ON/OFF, không thử máy bơm vật lý.**

## 1. Điều kiện an toàn

- Người dùng xác nhận lại trong phiên này: adapter 5V bơm vẫn rút điện, ESP32 cấp USB, cho phép đọc/nạp qua COM3.
- Config backend đọc trực tiếp: commands=false, automation=false, pumpTestMode=true; hai cờ gửi lệnh chưa khai báo trong .env nên dùng default false. Không sửa .env.
- `config.local.h`: ENABLE_PUMP_COMMANDS=false, RELAY_PIN=26, Device ESP32-GF-A-01, Actuator PUMP_01, telemetry15000ms, cap firmware5s. Không in/đổi mật khẩu hoặc thông tin Wi-Fi.
- Không gửi MQTT publish bằng công cụ, không POST command, không simulator/seed/migration, không ép trạng thái DB. Login API dùng tài khoản owner hiện hữu theo luồng bình thường (có activity log đăng nhập), không bypass RBAC hoặc tự ký token.

## 2. Giai đoạn A — tình trạng trước nạp và nguyên nhân hiện tại

### 2.1 Hạ tầng lúc bắt đầu

- Không có backend/frontend Node đang chạy, không listener5000/5173. Vì vậy dù broker nhận telemetry, không có backend ingest/API trong thời gian này.
- PostgreSQL17 service đang chạy, SELECT-only transaction truy cập được.
- Hai Mosquitto: service PID4572 chỉ loopback; broker LAN PID22872 trên0.0.0.0:1883/[::]:1883. Không dừng hoặc sửa broker nào.
- Không đọc được command line nâng quyền của broker LAN từ phiên này; file `C:\mosquitto\config\mosquitto.conf` và ACL hiện hữu đã đối chiếu, nhưng không tuyên bố command line runtime đã được xác minh trực tiếp. ACL file có đúng telemetry/status/command/ACK/state; passive subscription runtime sau khi mạng ổn định được grant.
- Máy tính ban đầu báo192.168.1.6; sau đó đo lại và người dùng xác nhận **172.20.10.2**. Endpoint cũ lúc mạng đang khác không kết nối; sau chuyển lại, TCP/MQTT172.20.10.2:1883 thành công. Không ghi đè cấu hình theo IP tạm thời. Backend và ESP32 giữ MQTT_HOST172.20.10.2.

### 2.2 Serial trước nạp

COM3 được Windows xác định CP210x USB UART, VID10C4/PIDEA60; Arduino CLI nhận USB serial nhưng chưa nhận diện board cụ thể. Không nhầm COM4/COM5 Bluetooth. Đã đọc cổng với DTR=false/RTS=false, không chủ động gửi reset. Log lấy được:

```text
========== SENSOR MONITOR #39 ==========
TEMP_01       : 27.00 C
HUM_01        : 63.30 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3356 (min=3345 max=3365)
SOIL_01       : 7.23 %
RECORDED_AT   : UNAVAILABLE_AT_MEASUREMENT
TIME_AT_SAMPLE: NOT_SYNCED; sample cannot be published
WiFi          : DISCONNECTED
MQTT          : DISCONNECTED
NTP           : NOT_SYNCED_OR_EXPIRED
PUMP_COMMANDS : DISABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY     : SKIPPED_NTP_AT_MEASUREMENT (timestamp not invented)
...
WiFi: CONNECTED (status=3)
MQTT: connect failed (code -2), retry scheduled with pump OFF
```

Còn có dòng lặp `wifi:sta is connecting, return error`. Đây là bằng chứng kết nối/NTP chưa sẵn sàng ở thời điểm đọc, không chứng minh cảm biến hỏng. Không tự thay logic sensor, nới clock guard hoặc reset để làm đẹp kết quả.

### 2.3 Telemetry phục hồi trước khi nạp

Sau khi mạng trở lại172.20.10.2, observer dùng credentials backend trong bộ nhớ, client ID riêng, **subscribe-only**, grants thành công. Broker giao telemetry mới, non-retained:

- Nhận07:03:47.130Z, recordedAt **2026-10-18T07:03:46.960Z**; đủ TEMP_01/HUM_01/LIGHT_01/SOIL_01.
- ONLINE non-retained07:03:51.131Z. Retained OFFLINE cũ lúc subscribe không được dùng làm trạng thái live.
- SELECT07:03:59.057Z vẫn chỉ có readings cũ vì backend chưa chạy.

Đã khởi động backend đúng source bằng:

```powershell
Set-Location C:\DATN\Project_datn\backend
node.exe node_modules/tsx/dist/cli.mjs watch src/server.ts
```

Log runtime:

```text
Database: connected
Smart Agriculture API running on port 5000
MQTT connected: host=172.20.10.2 port=1883
MQTT subscriptions restored
MQTT OFF-state observation subscribed (commands disabled)
```

Backend không chạy dist cũ; trực tiếp nạp src có observer session floor/TTL, PERIODIC schema và test mode1s. Startup recovery có ghi UNKNOWN qua logic hệ thống hiện hữu, không phải sửa DB thủ công để ép OFF.

SELECT READ ONLY07:05:24.748Z:

| Trường | Bằng chứng |
| --- | --- |
| ESP32 | ONLINE, lastSeen07:05:21.111Z |
| SensorReading MQTT | TEMP26.5/HUM62.1/SOIL8.23/LIGHT0 |
| recordedAt | 2026-10-18T07:05:16.960Z |
| receivedAt | 2026-10-18T07:05:17.140Z |
| PUMP_01 | UNKNOWN; timestamp OFF lịch sử16/10/2026 18:07:52.779Z không dùng làm bằng chứng mới |
| PENDING | 0 |
| Health | HTTP200; database/MQTT connected |

GET authenticated lúc **07:06:37.511Z**:

- `/api/devices/demo_device_esp32_a/latest-readings`: đủ4 MQTT readings mới recordedAt **07:06:31.960Z**: TEMP26.3/HUM61.6/SOIL6.67/LIGHT0. Giá trị0 không bị biến thành null.
- `/api/actuators/demo_actuator_pump_a`: UNKNOWN, ONLINE, `controlEnabled=false`, `gatewayMode=DISABLED`.
- Không thấy lỗi validation/Prisma/ingest trong log backend mới quan sát. Không kết luận không từng có lỗi lịch sử khi các process/log cũ đã dừng. Bản đo broker trước startup không nhất thiết có trong DB vì không có ingestion process, không phải chứng cứ duplicate timestamp.

**Kết luận nguyên nhân hiện tại:** kết nối Wi-Fi/MQTT/NTP bị gián đoạn trong giai đoạn đổi mạng và backend không chạy. Telemetry/API đã phục hồi trước nạp firmware, nên không lấy nạp firmware làm cách sửa lỗi mặc định. Không đủ log để khẳng định nguyên nhân duy nhất của lần dừng23:16:51 ngày16/10; thực tế DB đã có readings mới hơn tới18:13:06.676Z ngày16/10 (01:13:06 ngày17/10), nên không lặp lại giả thuyết “vẫn dừng ở23:16:51” như sự thật hiện tại.

## 3. Giai đoạn B — firmware và COM

- Source version đích: **12D.2**. Git HEAD `94933de66b6555acb4e6c1f43cf57b5611bb5a77`, worktree dirty/untracked; đây không phải commit release chứa toàn bộ firmware mới.
- Firmware version thực sự đang nạp trước upload: **NOT VERIFIED** từ boot banner trong phiên này; Serial đang chạy có diagnostic/lock hợp đồng12B.1, không dùng Device.firmwareVersion làm chứng nhận binary.
- Sketch SHA256: `B6C748CEF7C37A9041F569005A6437DC11AB5865B5A41C39DBE86ED9A744CFAC`.
- OffStateSchedule.h SHA256: `9F594A1A698CC5F0B869F198D27198DCD27ECB2B1ACD064A2CAC4193CAB172DE`.
- Hash config.local.h trước thao tác: `FD1F8D856EF2D1478BC2BFFDF1E5C7227BD2BFB8F8B89B1DBE9198497776BD3E`; nội dung bí mật không in/chia sẻ.
- Source có PERIODIC15s, timestamp mới, QoS1/non-retained; guard GPIO confirmedOff/NTP; startup LOW, không ON tự động, clean session/reject retained/no replay. ACK ưu tiên, telemetry bốn sensor không sửa. Backend đã subscribe state ngay cả khi commands=false.
- Compile local config thật **PASS**, FQBN esp32:esp32:esp32, không macro example; artifact `build/esp32-phase12d2b-local`. Sketch965634 bytes (73%), RAM60572 bytes (18%). File application.bin có965776 bytes gồm phần đóng gói; không nhầm với số bytes sketch của compiler.

Lệnh compile đã chạy:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase12d2b-local' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

COM3 ban đầu có lúc trả **Access to the port 'COM3' is denied**. Người dùng sau đó xác nhận đã đóng Serial Monitor/Plotter; mở thử COM3 thành công. Không kill IDE/process khác, không ép chiếm cổng, không tự chọn cổng khác.

**Upload: PASS**, đúng COM3, tốc độ115200, esptool5.3.1 nhận **ESP32-D0WD-V3 revision3.1**. Các vùng bootloader/partition/application được ghi và hash verified; application965776 bytes, nén632156 bytes, ghi57.2s. CLI exit0, hard reset qua RTS theo quy trình upload tiêu chuẩn; không reset thêm để nghiệm thu backend restart.

- Backup source/header/config trước upload: `C:\DATN\backups\phase12d2b-before-upload-20261018-140955` (có config bí mật, không chia sẻ/commit). Đây là backup file nguồn trước thao tác, **không phải dump binary firmware cũ**.
- Application binary SHA256: `D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB`.
- Version sau upload: **12D.2 theo source/hash artifact đã nạp**, được củng cố bởi PERIODIC mới chỉ có trong bản cập nhật. Boot banner version trôi qua trước khi mở Serial, nên không giả nhận đã chụp riêng dòng version từ thiết bị. Device.firmwareVersion trong DB không sửa làm bằng chứng.
- Hash config.local.h sau upload vẫn `FD1F8D856EF2D1478BC2BFFDF1E5C7227BD2BFB8F8B89B1DBE9198497776BD3E`; giữ nguyên Wi-Fi/MQTT/GPIO/ENABLE_PUMP_COMMANDS=false.

## 4. Kết quả nghiệm thu

| Giai đoạn | Kết quả hiện tại |
| --- | --- |
| A: broker/DB/telemetry mới và API, hai cờ khóa | PASS sau mạng phục hồi và backend được khởi động |
| B: review source/lock/pins/local config | PASS |
| B: compile local | PASS |
| B: upload COM3 | PASS, esptool hash verified, exit0 |
| C: Serial NTP SYNCED/DISABLED/GPIO OFF/telemetry SENT | PASS; version source/hash đã xác minh, boot banner không chụp được |
| C: PERIODIC OFF15s từ firmware mới → DB/API | PASS, timestamp tăng, QoS1/retainfalse/dupfalse |
| D: restart một lần, không EN, UNKNOWN → fresh OFF | PASS, bằng chứng MQTT/log/SELECT/API bên dưới |
| E: browser E2E/polling2s/khóa nút BẬT | NOT VERIFIED: Browser iab không khả dụng |
| GPIO điện/động cơ/nước | NOT VERIFIED, không thử vật lý |

Browser skill đã được sử dụng để thử kết nối trình duyệt; trả Browser unavailable iab. Không dùng API/unit test làm browser PASS. Sau đó đã khởi chạy frontend tại `http://localhost:5173/`, HTTP200, để người dùng nghiệm thu thủ công; **HTTP200 không phải chứng minh render/polling/nút khóa trên DOM**.

## 5. Bằng chứng sau upload và backend restart

### 5.1 Upload và Serial sau upload

Lệnh **đã chạy**, sau xác nhận nguồn bơm ngắt và COM3 đã được giải phóng:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' upload -p COM3 --fqbn esp32:esp32:esp32 --upload-property 'upload.speed=115200' --input-dir 'C:\DATN\Project_datn\build\esp32-phase12d2b-local' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Serial đọc115200 trong khoảng07:11:15–07:11:49Z, DTR/RTS=false, không chủ động reset:

```text
SENSOR MONITOR #1
TEMP_01:25.80 C   HUM_01:60.20 %   LIGHT_01:0.00 lux
SOIL_RAW_ADC:3336 (min3311 max3358)   SOIL_01:8.23 %
RECORDED_AT:2026-10-18T07:11:22.000Z
TIME_AT_SAMPLE:SYNCED
WiFi:CONNECTED   MQTT:CONNECTED   NTP:SYNCED
PUMP_COMMANDS:DISABLED
RELAY:OFF (GPIO only, not motor/water feedback)
TELEMETRY #1:SENT (BROKER_PUBACK; backend DB not verified), publish118ms

SENSOR MONITOR #2
RECORDED_AT:2026-10-18T07:11:37.000Z
TEMP25.80/HUM60.20/LIGHT0/SOIL8.48
WiFi:CONNECTED   MQTT:CONNECTED   NTP:SYNCED
PUMP_COMMANDS:DISABLED   RELAY:OFF
TELEMETRY #2:SENT (BROKER_PUBACK; backend DB not verified), publish63ms
```

Trích gọn đúng giá trị Serial; kiểm chứng DB là bước riêng. Lần đọc Serial bổ sung sau bài restart có nhiều đoạn lặp/truncated `Z | publish=128 ms`, không đủ để gán một sample hoàn chỉnh; không dùng đoạn đó làm chứng cứ version/NTP mới. MQTT/SELECT/API vẫn độc lập xác nhận luồng dữ liệu sau restart; chưa xác định nguyên nhân hiện tượng đọc Serial này.

### 5.2 OFF định kỳ thực tế

Các state packet sau upload từ topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`: schemaVersion1, stateOFF, reasonPERIODIC, QoS1, retainfalse, dupfalse:

| recordedAt UTC18/10 | Broker giao tới observer |
| --- | --- |
| 07:11:27.140Z | 07:11:27.307Z |
| 07:11:42.291Z | 07:11:42.486Z |
| 07:11:57.470Z | 07:11:57.561Z |
| 07:12:12.545Z | 07:12:12.670Z |
| 07:12:27.652Z | 07:12:27.836Z |

Khoảng15.1–15.2s, timestamp mới mỗi lần, không phải replay. Backend log có `MQTT OFF-state committed` với đúng timestamp. SELECT07:11:58.752Z: PUMP_01 OFF/lastStateChangedAt07:11:57.470Z, ONLINE, pending0; bốn readings sourceMQTT recordedAt07:11:52.000Z, receivedAt07:11:52.142Z. API GET khớp. Không dựa đơn thuần PUBACK.

### 5.3 Bài restart backend — PASS

Chỉ thực hiện sau OFF mới và telemetry ổn định. Đúng **một lần** thay mtime `backend/src/server.ts` để tsx watcher reload, không sửa nội dung source/config. Không đụng nguồn/EN/serial ESP32 trong bài D.

| Thời điểm UTC18/10 | Bằng chứng |
| --- | --- |
| 07:12:28.462Z | API OFF, stateAt07:12:27.652Z, ONLINE, controlEnabledfalse/gatewayModeDISABLED |
| 07:12:28.9566419Z | Yêu cầu watcher reload duy nhất |
| 07:12:29.2826023Z | Process backend mới PID4200 bắt đầu (trước đó PID6000) |
| 07:12:29.586Z | GET tạm fetch failed trong restart; không báo thành công giả |
| 07:12:36.690Z | GET HTTP200: **UNKNOWN**, stateAt cũ07:12:27.652Z; ONLINE; hai quyền điều khiển khóa |
| 07:12:42.208Z | SELECT READ ONLY: **UNKNOWN**, stateAt cũ; telemetry vẫn mới recordedAt07:12:37.000Z, receivedAt07:12:37.251Z |
| 07:12:42.819Z | ESP32 lập **OFF/PERIODIC mới**, sau startup backend |
| 07:12:42.977Z | Broker giao OFF mới, QoS1/non-retained/non-DUP |
| Sau nhận OFF | Backend log `MQTT OFF-state committed ... recordedAt=2026-10-18T07:12:42.819Z` |
| 07:12:43.619Z | GET: **OFF**, stateAt07:12:42.819Z, ONLINE, controlEnabledfalse/gatewayModeDISABLED |
| 07:13:27.166Z | SELECT: **OFF**, stateAt07:13:13.110Z; telemetry tiếp tục, pending0 |

Payload OFF sau restart thực tế:

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"PERIODIC","recordedAt":"2026-10-18T07:12:42.819Z"}
```

Từ yêu cầu restart tới API OFF khoảng14.66s; từ process mới bắt đầu tới báo cáo thiết bị13.54s. Không cần nhấn EN. Dữ liệu không đến từ MOCK/lịch sử/retained; source tin cậy trong giới hạn MQTT authentication/ACL hiện có, không phải chứng thực động cơ/nước.

Sau đó nhận OFF mới07:12:57.957Z và07:13:13.110Z; telemetry07:12:52.000Z/07:13:07.000Z tiếp tục. SELECT07:13:27.166Z: TEMP25.8/HUM59.6/SOIL7.93/LIGHT0, recordedAt07:13:22.000Z, receivedAt07:13:22.200Z, Device ONLINE/lastSeen07:13:22.195Z, pending0. Latest commands vẫn từ16/10, không command mới.

GET cuối07:14:03.514Z: OFF/stateAt07:13:58.492Z, ONLINE, controlEnabledfalse/gatewayModeDISABLED; bốn readings MQTT recordedAt07:13:52.000Z: TEMP25.8/HUM59.5/SOIL7.98/LIGHT0.

Kiểm tra bàn giao READ ONLY **07:16:00.183Z =14:16:00 ngày18/10**: Device ONLINE/lastSeen07:15:58.818Z, PUMP_01 OFF/lastStateChangedAt07:15:58.090Z, **0 PENDING**, commands=false/automation=false/testMode=true. Bốn readings MQTT recordedAt07:15:52.000Z/receivedAt07:15:53.448Z: TEMP25.6/HUM58.6/SOIL8.93/LIGHT0. Health HTTP200/PostgreSQL và MQTT connected; latest command không đổi từ16/10. Điều này chứng minh dữ liệu tiếp tục lưu trong cửa sổ quan sát vài phút, chưa phải test soak dài hạn.

### 5.4 Clock và frontend — giới hạn còn lại

Windows query14:10–14:11 báo Leap3/Stratum0 (chưa synchronized), dù Last Successful Sync18/10 13:53:12 và nguồn time.windows.com. Stripchart14:11:00/02/04 đo +6.3968/+4.8699/+3.5703ms, và state thực vượt qua guard2s. Không tự resync/thay cấu hình Windows hoặc nới guard. **Không coi ba mẫu offset nhỏ là chứng nhận Windows Time đã synchronized**; cần xử lý/kiểm tra lại trước một phiên điều khiển hoặc thử bơm thật được phê duyệt.

Backend vẫn phục vụ5000, frontend đã khởi chạy5173/HTTP200. Browser unavailable iab, nên polling2s/render UNKNOWN→OFF/nút BẬT khóa trên màn hình **NOT VERIFIED**. Nghiệm thu thủ công: vào `http://localhost:5173`, chọn ESP32-GF-A-01/PUMP_01 ở trang tưới; xem OFF và timestamp mới, không có điều khiển khả dụng; giữ trang mở để quan sát sensor/state tự cập nhật. Không click gửi ON/OFF. Không làm lại bài restart chỉ để chụp ảnh trong Phase này khi chưa phối hợp.

## 6. Thay đổi và trạng thái bàn giao

- Chỉ bổ sung logging error code/name an toàn trong `backend/scripts/phase12d2-readonly-check.ts`; không in secrets hoặc error message chứa endpoint credentials.
- Tạo harness cục bộ ignore `build/phase12d2b-api.cjs`: normal login và GET, observer subscribe-only; không có POST command/MQTT publish.
- Tạo báo cáo này; không sửa nội dung firmware/config.local.h/.env, nhưng đã nạp source12D.2 có sẵn sau phê duyệt. Không thay broker/firewall/ACL/password, không migration. Chỉ đổi mtime server.ts để restart theo bài D, không đổi nội dung.
- Backend5000 và frontend5173 để chạy phục vụ người dùng kiểm tra tiếp. Harness observer đã kết thúc; COM3 đọc xong đã đóng, không giữ cổng hoặc kill Arduino IDE.
- Latest command vẫn là hai bản ghi từ12D.1B: ON REJECTED/PUMP_COMMANDS_DISABLED và OFF SUCCESS; không có command mới trong Phase12D.2B ở thời điểm SELECT.

**Chưa đủ điều kiện thử bơm thật1s:** cần browser nghiệm thu/khóa nút, Windows Time synchronized được xác nhận, theo dõi dài hạn telemetry/NTP và PERIODIC qua nhiều chu kỳ, xác nhận nguồn/firmware safety và phê duyệt riêng cho thử vật lý. Phase này không bật flag hoặc cấp nguồn adapter. GPIO OFF không chứng minh motor đã ngừng hoặc có nước chảy.
