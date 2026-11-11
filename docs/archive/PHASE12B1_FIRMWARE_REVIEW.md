# Phase 12B.1 — rà soát firmware trước khi nạp

Ngày bàn giao: 2026-10-16. Phạm vi: sửa firmware Phase 12B hiện có, diagnostics và test offline; **không nạp ESP32, không gửi lệnh đến bơm thật**.

## 1. Kết quả và file thay đổi

Đã bổ sung Serial Monitor theo sự kiện/mỗi chu kỳ đo, phân loại lỗi từng sensor/NTP/publish, sửa theo dõi kết quả telemetry, bổ sung bảo vệ OFF/order và GPIO fault. Không viết lại firmware, không đổi backend contract.

Sửa:

- `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino`: boot/device/version/pins, raw ADC/min/max, diagnostics sensor/network/NTP/relay, kết quả publish và thời lượng PUBACK; retry telemetry có giới hạn; ON gate trong khi báo OFF; đọc mức GPIO thực khi hiển thị diagnostics.
- `firmware/SmartAgricultureESP32/PumpProtocol.h`: OFF cập nhật high-water ngay cả khi kết quả bị REJECTED do clock/expiry/disconnect/GPIO lỗi; ON bị chặn khi LOW chưa xác nhận.
- `firmware/tests/pump_controller_test.cpp`: regression cho các lỗi trên, xác nhận đúng deadline 5 giây.
- `firmware/tests/run-host-tests.ps1`: chạy thêm test diagnostics.
- `firmware/README.md`: hướng dẫn nạp, giải nghĩa Serial, checklist nghiệm thu.

Tạo:

- `firmware/SmartAgricultureESP32/FirmwareDiagnostics.h`: sensor assessment, formatter bounded, helper lease/command readiness và trạng thái telemetry delivery, dùng chung trong sketch/test.
- `firmware/tests/firmware_diagnostics_test.cpp`: test C++ trực tiếp các helper dùng trong firmware, không phải bản logic JavaScript viết lại.
- `docs/PHASE12B1_FIRMWARE_REVIEW.md`: báo cáo này.

`config.example.h` giữ nguyên ENABLE_PUMP_COMMANDS=false; không cần thêm cấu hình mới, tránh làm hỏng config.local.h đã sao chép trước đó. Không đọc/sửa config.local.h, không ghi credentials. Database, Prisma/migration, ACL, backend flags và source backend không chỉnh sửa trong Phase 12B.1. Các thay đổi cũ trong worktree được giữ nguyên.

## 2. Vấn đề phát hiện và cách xử lý

### Diagnostics trước đây chưa đủ

Log `invalid/unsynced sample` không xác định sensor nào; không có raw ADC và thông tin NTP/publish riêng. Hiện mỗi sample có assessment TEMP/HUM/LIGHT/SOIL, raw ADC average/min/max, timestamp đo và thời gian có hợp lệ tại lúc đo không. DHT NaN/Inf khác out-of-range; BH1750 init failed khác not-ready/read negative; ADC invalid khác rail warning; NTP lỗi không gán thành lỗi sensor.

BH1750 init thất bại nay được thử init lại một lần mỗi chu kỳ 15 giây, không retry liên tục. Giá trị ADC 0 hoặc4095 chỉ là cảnh báo rail, không tự khẳng định cảm biến hỏng: đất rất ướt/khô có thể hợp lệ. Một raw read ngoài0..4095 làm batch invalid, không để averaging che giấu lỗi. Không thay lỗi bằng0, không gửi một phần batch. Calibration dry3500/wet1507 và công thức/clamp cũ giữ nguyên.

### `sentSequence` bị cập nhật trước PUBACK

Trước đây sample bị đánh dấu đã xử lý trước publish; nếu publish thất bại thì sample bị bỏ, không có theo dõi xác nhận/retry. Thay bằng TelemetryDelivery: begin là **attempt**, chỉ finish(puback=true) ghi confirmed sent. Failed/format failure có backoff tối thiểu5giây; chỉ latest sample còn trong30giây, không backlog, không tạo timestamp mới. Sample mới thay thế sample cũ thất bại.

`SENT (BROKER_PUBACK)` chỉ có nghĩa client nhận PUBACK, **không chứng minh backend lưu PostgreSQL**, ACL cho phép xử lý application, relay hoặc nước chảy. Timeout PUBACK có thể là ACK mất trong khi broker đã nhận: ghi FAILED/PUBACK_UNCONFIRMED, delivery unknown, không tuyên bố chắc chắn chưa tới broker. Retry giữ `(sensorCode, recordedAt)` gốc để tận dụng unique/dedup backend hiện có. Không tự retry command ON.

Short write ngắt luồng publish ngay, không tiếp tục chờ endMessage với payload thiếu. Mọi lỗi begin/write/PUBACK/disconnect đều yêu cầu LOW và reset transport; log nêu category và duration. Format failure cũng bị giới hạn retry, không spam mỗi5ms.

### OFF trong nhánh lỗi có thể bị ON cũ đảo lại

OFF đã LOW nhưng early-return CLOCK_UNSYNCED/EXPIRED/DISCONNECTED không nâng high-water issuedAt; ON khác UUID phát trước OFF có thể được nhận sau khi link/clock hồi phục. Regression mới32/33/36 tái hiện tình huống và xác nhận sửa: OFF cập nhật mốc trước kiểm tra lỗi, không chỉ khi APPLIED. OFF không hợp lệ về schema/identity hoặc retained vẫn bị từ chối như cũ; không nâng quyền cho packet không tin cậy.

### LOW không xác nhận nhưng ON mới vẫn có thể được thử

Controller có fault_ sau GPIO LOW thất bại nhưng chưa dùng để chặn ON. Nay ON trả REJECTED GPIO_STATE_UNCONFIRMED cho đến khi LOW đã được xác nhận; test34 kiểm tra cả chặn và phục hồi sau LOW thành công. Không thể dùng lỗi GPIO để tạo APPLIED giả.

### OFF state publish có thể nhận ON reentrant

ArduinoMqttClient endMessage() poll trong lúc chờ PUBACK, nên callback có thể chạy khi đang publish state OFF. ON phát trước snapshot OFF nhưng áp dụng trong lúc gửi snapshot có thể gây bất nhất với ACK/state ở backend. Command readiness gate nay chặn ON trong cửa sổ stateSyncInProgress, vẫn cho phép OFF; ON trả REJECTED qua controller và được cache, không tự bật lại sau cửa sổ. Không publish lồng trong callback, không thêm topic/schema.

Gate này được test bằng helper thực mà sketch gọi (diagnostics15); chưa chạy toàn bộ callback/network stack thật hay đo race trên ESP32. Safety task và callback giữ cùng pumpMux, không Serial/network trong critical section; mqttReady/reset được kiểm tra lại khi đã có lock. Diagnostics chỉ main loop in, safety task báo event qua atomic, sensor task đưa snapshot qua sensorMux.

## 3. Watchdog, reconnect và presence

**Giữ 250ms**, không nới dựa trên suy đoán. Đây là control lease fail-closed, cố ý ngắn hơn transport timeout1000ms. Helper shared/test xác nhận250ms còn hợp lệ,251ms ngắt; mô phỏng PUBACK200ms vẫn trong lease và stall251ms cắt GPIO. Đây là số thời gian giả lập, không phải đo latency Wi-Fi thực tế.

lastNetworkProgress vẫn được cập nhật trước poll/publish; nay publish thành công còn cập nhật ở thời điểm kết thúc. Không dùng completion để mở lại mqttReady hoặc xóa reset nếu safety đã trip trong lúc chờ. SLOW PUBACK >=200ms được log để người dùng thu thập bằng chứng; nếu network/Serial/CPU chậm quá250ms khi ON, OFF là hành vi bảo thủ dự kiến, không vô hiệu fail-safe để tránh ngắt nhầm.

Giữ probe ONLINE QoS1 mỗi200ms khi ON, mỗi15giây khi OFF, safety task5ms, cap<=5giây. Wi-Fi disconnect event LOW; broker/socket mất kết nối LOW/reset/retry theo lịch. Black-hole có thể chỉ được phát hiện khi probe/lease hết hạn; không hứa phát hiện tức thời hoặc hard real-time dưới CPU treo/nguồn lỗi.

Reconnect vẫn clean session, subscribe command QoS1 mỗi lần; queue ACK cũ bị xóa, session barrier + UUID cache + issuedAt high-water ngăn ON cũ. LWT OFFLINE/birth/heartbeat không retained, payload status nguyên vẹn. Backend presence dùng live receipt, bỏ retained replay; TTL90giây/check10giây là backend mặc định, không đổi trong task. Firmware OFF tại chỗ không phải đợi watchdog backend. Không chạy broker thật hoặc tạo mất kết nối thật để kiểm chứng.

## 4. Những phần giữ nguyên

- DHT22 GPIO4, BH1750 SDA21/SCL22, LM393 AO34, relay26 HIGH ON/LOW OFF; không thay dây.
- Soil dry3500/wet1507, average8 ADC12bit, đo15giây, cả bốn readings hợp lệ mới gửi.
- ESP32-GF-A-01; TEMP_01/HUM_01/LIGHT_01/SOIL_01; PUMP_01; prefix/topic/schema command/ACK/state/telemetry/status.
- State chỉ OFF; ON qua ACK APPLIED. APPLIED sau GPIO write/readback thành công; cached ACK giữ recordedAt gốc, không đại diện cho phép đo relay mới. GPIO mức logic không chứng minh tiếp điểm relay, motor hoặc lưu lượng.
- Config mẫu false, low-level guard false, boot LOW, no restore ON, retain reject, duplicate cache, expiry/session barrier, cap5giây, OFF ưu tiên và millis wrap-safe.

## 5. Kết quả kiểm thử

| Nhóm | Kết quả | Phạm vi |
| --- | --- | --- |
| Native PumpController/parser/serialization | 36 pass / 0 fail | Fake GPIO, expiry, ordering, duplicates, 5s, lỗi LOW, mất link |
| Native diagnostics/sensors/delivery/lease | 18 pass / 0 fail | NaN/range/init/not-ready/ADC/NTP, formatting, retry/PUBACK, lease/gate |
| Native JSON → gateway/schema backend | 5 pass / 0 fail | Command ACK APPLIED/REJECTED, OFF state,4readings/zero,status |
| Backend command regression offline | 26 pass / 0 fail | Fake MQTT/DB |
| Backend presence regression offline | 21 pass / 0 fail | Telemetry/presence/watchdog |
| ESP32 target compile | pass | Core3.3.12, esp32:esp32:esp32, config mẫu false |

Ba test mới32/33/34 đã được chạy **trước sửa**:31pass/3fail; sau sửa tất cả pass. Bổ sung deadline5s và disconnectedOFF regression, tổng controller36. Không chỉ thêm test rồi giả định lỗi đã được sửa.

Lệnh đã chạy tại C:\DATN\Project_datn:

```powershell
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
& .\build\firmware-tests\firmware_diagnostics_test.exe --example
npm --prefix backend run test:pump
npm --prefix backend run test:presence
$cli = 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
& $cli compile --fqbn esp32:esp32:esp32 --build-property 'compiler.cpp.extra_flags=-DSMART_AGRI_EXAMPLE_CONFIG=1' --build-path 'C:\DATN\Project_datn\build\esp32-phase12b1' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
git diff --check
```

Compile dùng Arduino CLI1.5.1, core3.3.12 và các libraries đã cài trong Phase12B, không cài/nâng dependencies. Cấu hình mẫu ép false, không đọc credentials local. Flash khoảng961KB/1.31MB (~73%), globals60540/327680byte (~18%) theo build mẫu; bản local có network path hoạt động có thể khác do optimizer. Host test không chạy Wi-Fi, MQTT thật, GPIO điện, Serial Monitor hay FreeRTOS scheduler. Không chạy suite API/seed/simulator có thể ghi DB. Không sửa/áp dụng migration, ACL hoặc backend feature flags; không khởi động backend.

## 6. Serial dự kiến và giải nghĩa

Ví dụ dưới đây là log trình bày/fixture, **không phải số đo ESP32 thật**. Soil2200 tương ứng65.23% theo calibration đã giữ, không sao chép65.18% từ ví dụ yêu cầu.

```text
BOOT: GPIO26 LOW requested; physical pump commands DISABLED
DEVICE: Smart Agriculture ESP32 DevKit V1 | ESP32-GF-A-01 | firmware 12B.1
PINS: DHT22=4, BH1750 SDA=21 SCL=22, LM393 AO=34, relay=26 (HIGH ON / LOW OFF)
SOIL: dry=3500 wet=1507, ADC=12bit; sample interval=15000 ms
RELAY: OFF (GPIO only; not relay/motor/flow feedback)
WiFi: STARTING | MQTT: DISCONNECTED | NTP: WAITING_FOR_SYNC
BH1750: INITIALIZED; DHT22: initialized, first measurement pending
WiFi: CONNECTED (status=3)
NTP: SYNCED | UTC=2026-10-16T02:30:00.000Z
MQTT: authenticated, command subscription QoS1 restored; pump stays OFF

========== SENSOR MONITOR #1 ==========
TEMP_01       : 30.50 C
HUM_01        : 70.20 %
LIGHT_01      : 250.00 lux
SOIL_RAW_ADC  : 2200 (min=2195 max=2205)
SOIL_01       : 65.23 %
RECORDED_AT   : 2026-10-16T02:30:02.000Z
TIME_AT_SAMPLE: SYNCED
========================================
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : DISABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY     : PENDING (not sent yet)
TELEMETRY #1: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-16T02:30:02.000Z | publish=12 ms
```

Full block được in một lần mỗi sequence đo, kể cả khi offline; completion/error là event gắn sequence. Không gắn SENT vào frame trước khi broker xác nhận. Thứ tự Wi-Fi/MQTT/NTP có thể khác tùy mạng; không bắt người dùng phải thấy đúng thứ tự ví dụ. Tên/mật khẩu Wi-Fi và mật khẩu MQTT không được log. Boot chỉ nói LOW requested; kết quả GPIO có thể UNKNOWN nếu không xác nhận được LOW.

Các thông báo lỗi cần phân biệt:

- `TEMP_01/HUM_01: ERROR: DHT_NAN...` — kết quả không hữu hạn; checksum/timeout/signal/power chỉ là khả năng, không kết luận dây sai.
- `BH1750_INIT_FAILED`, `BH1750_MEASUREMENT_NOT_READY`, `BH1750_READ_FAILED` — ba nhánh riêng; LIGHT0 hợp lệ, không phải lỗi mặc định.
- `ADC_OUT_OF_12BIT_RANGE` — không gửi batch; `WARNING: ADC_AT_RAIL` chỉ cảnh báo, không thay giá trị bằng0.
- `SKIPPED_NTP_AT_MEASUREMENT` — sample lúc đo chưa có UTC, không gán giờ hiện tại để gửi lại; chờ chu kỳ đo mới.
- `PUBACK_TIMEOUT_OR_FAILED`/`SHORT_WRITE`/`BEGIN_MESSAGE_FAILED` — lỗi gửi, không đổi thành SENT; delivery có thể chưa xác định.
- `FAILSAFE: ...`, `SLOW PUBACK...`, `LOW_NOT_CONFIRMED` — giữ cờfalse, kiểm tra/log lại, không nới lease hoặc bật bơm để bỏ qua lỗi.

## 7. Nạp thủ công và checklist nghiệm thu OFF

1. Trong Arduino IDE mở SmartAgricultureESP32.ino, chọn ESP32 Dev Module và đúng COM ESP32 DevKit V1, monitor115200. Giữ nguyên wiring đã test, không cần đổi chân/cáp cảm biến.
2. Tự kiểm tra config.local.h trong IDE: ENABLE_PUMP_COMMANDS=false, đúng Wi-Fi2.4GHz, broker IPv4 LAN hiện tại/1883 và tài khoản thiết bị. Agent không đọc/sửa file này. Không upload một local config cũ có true chỉ vì config.example false.
3. Verify bản local thực tế; agent chỉ compile mẫu false. Nếu thiếu local config, firmware vẫn đo/log nhưng không kết nối mạng, hiện NOT_CONFIGURED. Không dùng macro SMART_AGRI_EXAMPLE_CONFIG trong lần nạp cần Wi-Fi thật.
4. Chỉ người dùng bấm Upload sau khi kiểm tra đúng board/COM/flagfalse. Agent chưa upload hoặc chạy Serial Monitor. Có adapter ngắt nguồn trong tầm tay; phần mềm không loại bỏ xung ROM boot/reset/relay kẹt.
5. Xem boot/version/pins, PUMP_COMMANDS DISABLED, RELAY OFF; quan sát bơm thực phải dừng. Nếu bơm tự chạy hoặc LOW_NOT_CONFIRMED, ngắt adapter tại chỗ và dừng test, không bỏ qua lỗi bằng cách sửa guard.
6. Chờ ít nhất2–3chu kỳ15giây: cả TEMP/HUM/LIGHT/SOIL có số hữu hạn, raw ADC minh bạch, calibration hợp lý; LIGHT0 và SOIL100 có thể hợp lệ. Sensor lỗi thì thấy đúng sensor và batch bị skip, không có số0 giả.
7. WiFi CONNECTED, MQTT command subscription QoS1 ready, NTP SYNCED; sau mỗi sample hợp lệ có telemetry completion SENT/BROKER_PUBACK hoặc failure rõ. Kiểm tra website/DB bằng công cụ chỉ đọc riêng nếu backend tương thích đã chạy; Serial PUBACK chưa chứng minh lưu DB.
8. Với flagfalse, người dùng có thể ngắt Wi-Fi trong bài kiểm tra được giám sát: GPIO/bơm luôn OFF, log disconnect, sau reconnect subscribe/NTP/telemetry phục hồi, không replayON. Không cần gửi command ON/OFF để nghiệm thu vòng cảm biến và relay OFF.
9. Không deploy migration, đổi ACL hay bật backend flag trong task này. Các bước Phase12 còn chờ duyệt theo báo cáo trước; không start backend mới trên schema chưa tương thích. Không cần bật physical commands để hoàn tất checklist OFF.

## 8. Rủi ro còn lại

Chưa upload/chạy trên ESP32; chưa xác minh RF/NTP server thực, sensor accuracy, GPIO điện, nguồn/brownout/EMI, timing FreeRTOS hoặc độ trễ PUBACK thực. Host simulation chỉ kiểm tra policy/helper, không phải full network reconnect/SUBACK hardware test. Ngưỡng250ms có thể gây OFF bảo thủ trên mạng/Serial chậm; cần dữ liệu thật trước mọi đề xuất thay ngưỡng, không tự nới trong đợt này. Mức GPIO/ACK không xác nhận relay tiếp điểm, motor hoặc nước; muốn feedback vật lý cần thiết kế bổ sung riêng. Boot/reset glitch hoặc relay kẹt không được phần mềm bảo đảm loại bỏ.
