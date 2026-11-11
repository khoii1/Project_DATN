# Phase 12D.3B — Nghiệm thu firmware ENABLE_PUMP_COMMANDS

## Phạm vi và an toàn

Ngày 18/10/2026, người dùng phê duyệt A riêng: cho phép đổi một cờ, compile và nạp firmware, không cấp nguồn/chạy bơm. Người dùng xác nhận lại “okay” rằng adapter 5V bơm vẫn rút điện và ESP32 chỉ cấp USB. Đây là xác nhận tại chỗ của người dùng, không phải phép đo nguồn độc lập của agent.

Giữ MQTT_COMMANDS_ENABLED=false và MQTT_AUTOMATION_COMMANDS_ENABLED=false. Không gửi MQTT/API ON/OFF, không click BẬT/TẮT, không thay dây/GPIO, không migration hoặc chỉnh trực tiếp PostgreSQL. Firmware enable không đồng nghĩa cho phép thử bơm thật.

## Precheck

- SELECT lúc `2026-10-18T08:15:53.113Z`: ESP32-GF-A-01 ONLINE, PUMP_01 OFF, 0 PENDING; bốn readings mới source MQTT.
- API `08:15:55.192Z`: OFF, controlEnabled=false, gatewayMode=DISABLED, ONLINE.
- Hai cờ cấu hình backend false, health HTTP200 database/MQTT connected.
- COM3: Silicon Labs CP210x USB UART, VID10C4/PIDEA60, serial0001; không sử dụng COM4/COM5 Bluetooth.
- Backup source/config `C:\DATN\backups\phase12d2b-before-upload-20261018-140955`: sáu file khớp trước chỉnh sửa, config backup=false. Có chứa secrets, không commit/chia sẻ.
- Bộ binary DISABLED còn nguyên trong `build/esp32-phase12d2b-local`; SHA256 application `D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB`.

## Thay đổi được phê duyệt

Chỉ `firmware/SmartAgricultureESP32/config.local.h`:

```diff
-static constexpr bool ENABLE_PUMP_COMMANDS = false;
+static constexpr bool ENABLE_PUMP_COMMANDS = true;
```

Đã so sánh nội dung chuẩn hóa CRLF/LF với backup: chỉ khác cờ này. config.example.h, FirmwareDiagnostics.h, OffStateSchedule.h, PumpProtocol.h và SmartAgricultureESP32.ino vẫn khớp hash backup. Không in credential hoặc nội dung config đầy đủ.

Giữ GPIO26 active-HIGH, boot LOW, MAX_PUMP_SECONDS=5, guard FUTURE_COMMAND2s, retained/expiry/duplicate/session guards, monotonic timeout, OFF priority, network fail-safe, OFF định kỳ15s và luồng bốn cảm biến. Hai kiểm tra ENABLE trong controller/writeRelay được mở có chủ ý; không mô tả chúng vẫn khóa.

## Compile / upload / nghiệm thu

**PASS cho nạp firmware và nghiệm thu ở trạng thái không cấp nguồn bơm. Không phải PASS thử bơm vật lý.** Phiên thực hiện khoảng 15:15–15:26 Việt Nam (08:15–08:26Z).

### Compile

Arduino CLI tại `C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe`:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase12d3a-enabled' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Exit0, hoàn tất khoảng08:21:00Z:

```text
Sketch uses 965634 bytes (73%) of program storage space. Maximum is 1310720 bytes.
Global variables use 60572 bytes (18%) of dynamic memory, leaving 267108 bytes for local variables. Maximum is 327680 bytes.
```

Build directory mới, không ghi đè bản DISABLED. Tên thư mục theo phương án đã duyệt; đây là artifact được tạo cho phê duyệt A của12D.3B. Metadata FQBN đúng, upload.speed115200, không có macro SMART_AGRI_EXAMPLE_CONFIG. Header config.local.h trong build chứa enable=true và nội dung khớp nguồn sau khi bỏ **đúng directive `#line 1 ...` do Arduino tự chèn đầu header**. Kiểm tra so sánh ban đầu dừng trước upload vì directive này; đã điều tra bằng so sánh trong bộ nhớ, không có thay đổi credential hoặc lỗi compile. Không bỏ qua khác biệt nội dung khác.

### Upload và hash

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' upload -p COM3 --fqbn esp32:esp32:esp32 --upload-property 'upload.speed=115200' --input-dir 'C:\DATN\Project_datn\build\esp32-phase12d3a-enabled' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Bắt đầu gọi upload `2026-10-18T08:21:36.0636429Z`, hoàn tất trước Serial đầu tiên15:23:03; không ghi riêng UTC chính xác thời điểm exit. Exit0, esptool5.3.1 xác nhận:

```text
Connected to ESP32 on COM3:
Chip type: ESP32-D0WD-V3 (revision v3.1)
Crystal frequency: 40MHz
Wrote 965776 bytes (632167 compressed) at 0x00010000 in 58.0 seconds.
Verifying written data...
Hash of data verified.
Hard resetting via RTS pin...
New upload port: COM3 (serial)
```

Bootloader, partitions, boot_app0 và application đều có `Hash of data verified`. Chỉ erase/write vùng firmware theo uploader, không chạy erase-all/reset database. Lần reset bằng RTS là kết thúc upload được phê duyệt, không yêu cầu người dùng nhấn EN.

SHA256 application `.ino.bin` và `.ino_flashed.bin` bằng nhau:

`2502AE1C994861FAF23830A35F60BF9E9FC3D6296E9885C5A844001EC00F474A`

SHA256 local config sau thay đổi:

`6CF74CC8AC35C3B49B056B0D866E715E2BAA0848314AC00D86FDEAB816CFC0F7`

Binary DISABLED hash vẫn `D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB` sau upload. Không cần rollback vì không có lỗi compile/upload, GPIO ON hoặc mất kiểm soát GPIO được quan sát. Bản enabled đã nạp được giữ nguyên theo phê duyệt A; không tự đưa local config về false để tạo hiểu nhầm firmware đang khóa.

### Serial115200 thực tế

Trước nạp, đọc COM3 DTR/RTS=false lấy được sample270, recordedAt08:18:37Z, DISABLED/OFF/NTP SYNCED; sau đó tiến trình PowerShell/.NET đọc serial thoát lỗi `-1073741819`. Đã xác minh tiến trình kết thúc, không ép chiếm cổng. Đây là lỗi công cụ đọc, không phải lỗi uploader hoặc bằng chứng GPIO bất thường. Python hiện tại không có pyserial; không cài package.

Sau nạp dùng monitor Arduino CLI, DTR/RTS=off:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' monitor --port COM3 --config 'baudrate=115200,dtr=off,rts=off' --timestamp
```

Monitor bắt đầu sau boot banner nên không tuyên bố đã chụp bannerversion. Version12D.2 xác nhận từ source/build; bằng chứng enable thực tế là log mới trên thiết bị:

```text
[2026-10-18 15:23:05] NTP: SYNCED | UTC=2026-10-18T08:23:05.080Z
[2026-10-18 15:23:18] ========== SENSOR MONITOR #2 ==========
TEMP_01       : 24.40 C
HUM_01        : 49.60 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3163 (min=3157 max=3170)
SOIL_01       : 16.91 %
RECORDED_AT   : 2026-10-18T08:23:18.344Z
TIME_AT_SAMPLE: SYNCED
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : ENABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY #2: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-18T08:23:18.344Z | publish=115 ms
```

Trích nội dung đọc từ terminal, đã bỏ mã ANSI/wrapping và các dòng trang trí; không sửa giá trị. Sample1 khi mới boot chưa có NTP: SKIPPED_NTP_AT_MEASUREMENT, timestamp không được bịa. NTP đồng bộ sau đó; samples2–6 đều ENABLED/OFF, WiFi/MQTT connected, NTP synced, SENT. Sample3 timestamp08:23:33.344Z publish170ms; sample4 08:23:48.344Z publish111ms; sample6 08:24:18.344Z publish37ms.

Đã đóng riêng monitor bằng Ctrl-C sau nghiệm thu, không dừng backend/broker/ESP32. Exit1 của monitor do chủ động ngắt, không phải upload thất bại. COM3 được nhả lại.

### Ba chu kỳ telemetry: Serial → MQTT → PostgreSQL → API

Observer dùng MQTT client ID riêng, **subscribe-only**, QoS1; API login hợp lệ rồi chỉ GET actuator/latest-readings. Không chạy seed dù có đọc file seed để lấy credential đăng nhập trong bộ nhớ; không in password/token.

| RecordedAt UTC (18/10) | TEMP C | HUM % | LIGHT lux | SOIL % | PostgreSQL receivedAt UTC |
| --- | --- | --- | --- | --- | --- |
| 08:23:18.344 | 24.4 | 49.6 | 0 | 16.91 | 08:23:18.777 |
| 08:23:33.344 | 24.4 | 49.8 | 0 | 16.96 | 08:23:33.831 |
| 08:23:48.344 | 24.4 | 49.6 | 0 | 16.96 | 08:23:48.793 |

MQTT nhận tương ứng08:23:18.770/33.826/48.745Z, QoS1 retain=false dup=false. API GET sau mỗi lần nhận trả đúng bốn giá trị/timestamp/sourceMQTT. SELECT lúc08:24:21.335Z tìm đúng **12/12 readings**, mỗi thời điểm đủ4sensorCodes, sourceMQTT; không suy diễn DB từ PUBACK. Giá trị LIGHT0 là dữ liệu hợp lệ.

Script kiểm chứng chỉ đọc, local git-ignored: `build/phase12d3b-db-readonly.cjs`. Transaction dùng SET TRANSACTION READ ONLY; findMany SensorReading theo deviceCode, source và ba timestamp; count DeviceCommand PENDING/toàn hệ thống tạo sau precheck; SELECT actuator. Exit0. Không import server/gateway hoặc publish MQTT.

### PERIODIC OFF và API

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"PERIODIC","recordedAt":"2026-10-18T08:23:20.205Z"}
```

| RecordedAt OFF UTC | Broker nhận UTC | API OFF với cùng stateAt |
| --- | --- | --- |
| 08:23:20.205 | 08:23:20.627 | 08:23:21.996 |
| 08:23:35.360 | 08:23:35.688 | 08:23:36.399 |
| 08:23:50.426 | 08:23:50.824 | 08:23:50.944 |
| 08:24:05.597 | 08:24:05.976 | Kiểm chứng DB/API tiếp tục ở snapshot cuối |

Topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`, cả bốn bản tin QoS1 retain=false dup=false. Hai khoảng đầu15.155s/15.066s; đều mới sau flash, không lấy retained/MOCK/OFF lịch sử. Backend log có `MQTT OFF-state committed` với stateAt08:23:50.426,08:24:05.597,08:24:20.729Z. SELECT cuối trả OFF stateAt08:24:20.729Z; API08:24:33.184Z khớp, ONLINE, gatewayModeDISABLED/controlEnabledfalse.

Observer có nhận retained statusOFFLINE cũ lúc subscribe; không dùng nó thay cho ONLINE live. StatusONLINE non-retained mới nhận08:23:08.874/23.890/38.954/53.895Z.

**Quan sát cần theo dõi trước B:** đúng một GET bắt đầu08:23:20.621Z trả UNKNOWN với stateAt cũ08:23:05.081Z, trùng cửa sổ xử lý OFF mới; GET kế tiếp đã OFF mới. Không có relayON trong Serial hay command mới. Source `mqtt-pump-state.adapter.ts` update database rồi mới `mqttStateObserver.confirmOff`; `actuator.service.ts` chỉ trả OFF khi timestamp DB khớp evidence trong memory. Điều này phù hợp một cửa sổ race đọc giữa DB commit và memory confirm (suy luận từ source/timing, chưa có trace để chứng minh tuyệt đối). Đây là fail-closed API UNKNOWN ngắn, không phải bằng chứng GPIO ON. Không sửa backend ngoài phạm vi A, không ép DB, không gửi command để thử lại. Không tuyên bố API không bao giờ nhấp UNKNOWN; nghiệm thu ổn định tuyệt đối phần đó **NOT VERIFIED**, cần đánh giá trước B.

### Khóa backend và DeviceCommand cuối phiên

- API08:24:33.184Z: controlEnabled=false, gatewayModeDISABLED, ONLINE, OFF; latest readings vẫn mới recordedAt08:24:18.344Z.
- SELECT08:24:21.335Z: PENDING0, **commandsSincePrecheck0** trên toàn hệ thống từ08:15:53.113Z. Không có command mới do phiên flash.
- Không sửa .env/reload backend để bật điều khiển. Diagnostic trước/sau xác nhận commandsEnabled=false và automationEnabled=false; quan sát API xác nhận runtime điều khiển bị khóa. Không kiểm thử bằng cách POST ON/OFF.
- Không áp dụng migration, không thay đổi schema hoặc cập nhật DB thủ công. Các SensorReading/state mới do luồng ESP32 thật được backend tiếp nhận tự nhiên.
- Kiểm tra cuối lúc08:25:51.473Z: commandsEnabled=false, automationEnabled=false, ONLINE, PUMP_01 OFF stateAt08:25:36.285Z, pending0; bốn readings mới cùng recordedAt08:25:48.344Z/receivedAt08:25:48.755Z, health database/MQTT connected. Latest command vẫn là command cũ16/10, không có command từ phiên này.

## Bảng nghiệm thu

| Hạng mục | Kết quả |
| --- | --- |
| Phê duyệt A / xác nhận nguồn bơm rút, ESP32USB | PASS, xác nhận người dùng |
| Backup source/config/binary DISABLED | PASS, hash giữ nguyên |
| Chỉ đổi cờ local, guard/code khác không đổi | PASS, so sánh nội dung/hash |
| Compile ESP32 Dev Module build mới | PASS exit0 |
| UploadCOM3/115200, đúngESP32, hash verified | PASS exit0 |
| Serial ENABLED/OFF/network/NTP | PASS samples2–6; sample1 bỏ khi NTP chưa có |
| Ba bộ telemetry mới vào DB/API | PASS12/12 readings |
| Hai PERIODIC OFF mới hoặc nhiều hơn | PASS4 bản tin live; DB/API/log nhất quán sau xử lý |
| Backend command/automation false, không command mới, pending0 | PASS |
| API luôn OFF không có cửa sổ UNKNOWN | NOT VERIFIED; đã thấy một GET UNKNOWN ngắn, xem phân tích race |
| GPIO điện thực / relay cơ khí / motor / nước / chính xác thời lượng1s | NOT VERIFIED, không chạy bơm |
| Browser thao tác điều khiển sau flash | NOT VERIFIED, chủ ý không click hoặc gửi command |
| Rollback đã thực thi phiên này | Không cần; chỉ xác minh artifact rollback, chưa nạp lại |

File source thay đổi duy nhất là config.local.h; ngoài ra tạo báo cáo này và helper SELECT-only trong build (ignored). Firmware build mới là artifact cục bộ có thể chứa credential, không commit/chia sẻ. Không công bố secrets.

## Rollback và giới hạn phê duyệt B

Backup và binary DISABLED ở trên được giữ nguyên. Nếu lỗi/bất thường, giữ adapter rút điện và backend khóa; khôi phục cờ false, nạp bản DISABLED bằng COM3/115200, xác minh Serial DISABLED/OFF. Chỉ đổi source false không khóa binary enabled đang chạy.

Phê duyệt B chưa có hiệu lực. Trước thử thật cần: nghiệm thu firmware enabled, phê duyệt B riêng và xác nhận an toàn tại chỗ sát thời điểm thử; Windows/NTP offset ổn định; xác minh runtime backend thực sự cap ON tối đa1s/test-mode; automation vẫn false, fresh OFF sau reload, ONLINE và 0 PENDING; phương án ngắt nguồn/đo độc lập. Firmware cap5 không thay thế backend cap1. Chưa đo GPIO/relay/motor/nước thực tế; GPIO OFF/ACK không chứng minh cơ khí hoặc dòng nước. UI polling2s có thể bỏ qua toàn bộ pha ON1s, không được gửi lại để nhìn UI.
