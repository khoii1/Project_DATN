# Phase 12D.3B — Pre-flash safety check, chờ phê duyệt A

Ngày kiểm tra: 18/10/2026, khoảng 15:00–15:05 Việt Nam (UTC+7).

## 1. Kết luận và phạm vi

**READY_FOR_APPROVAL_A**: đủ thông tin để người dùng xem xét phê duyệt riêng việc đổi đúng một cờ firmware và compile/flash, trong khi adapter bơm vẫn rút điện và backend vẫn khóa command. **Chưa có phê duyệt A và chưa đủ điều kiện thực hiện thử bơm vật lý/phê duyệt B.**

Trong phiên này không đổi ENABLE_PUMP_COMMANDS, không compile/upload, không mở COM3/reset ESP32, không bật feature flag, không gửi ON/OFF, không cấp điện, không chạy migration hoặc chỉnh dữ liệu PostgreSQL. Chỉ tạo báo cáo này; các thay đổi khác trong worktree có từ trước.

Người dùng đã xác nhận tại chỗ: relay MKE-M05/GPIO26, nguồn bơm qua COM/NO, adapter 5V riêng, USB ESP32, GND chung, dây an toàn/không chạm chập, khu vực khô ráo, có người giám sát/ngắt adapter và adapter hiện rút điện. Đây là **xác nhận của người dùng**, không phải phép đo điện độc lập của agent.

## 2. Board, source và cổng nạp

| Hạng mục | Bằng chứng / kết quả |
| --- | --- |
| ESP32 DevKit V1 | Người dùng và hồ sơ thiết bị; lần upload 12D.2B trên COM3 nhận ESP32-D0WD-V3 rev3.1, hash flash verified |
| COM3 hiện tại | Win32_SerialPort: Silicon Labs CP210x USB to UART, VID 10C4/PID EA60, serial 0001 |
| Cổng có đang rảnh độc quyền không | NOT VERIFIED: không mở serial để tránh reset; kiểm tra lại trước upload được phê duyệt |
| Firmware source | `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino:23`, version `12D.2` |
| FQBN đã sử dụng | `esp32:esp32:esp32` trong build.options.json của bản 12D.2B |
| Upload | 115200; metadata bản build cũ có `upload.speed=115200`; lần nạp 12D.2B thành công |
| Arduino CLI | `C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe` tồn tại |

COM3 không tự chứng minh chip thực tế; khi upload sau phê duyệt phải đối chiếu chip ESP32, dừng nếu khác thiết bị hoặc cổng bị chiếm. Không tự đóng Arduino IDE hay tiến trình người dùng.

## 3. File cấu hình thực tế và backup

`SmartAgricultureESP32.ino:14–20` ưu tiên `config.local.h` khi file tồn tại và không định nghĩa `SMART_AGRI_EXAMPLE_CONFIG`. File thực tế:

`C:\DATN\Project_datn\firmware\SmartAgricultureESP32\config.local.h`

Các giá trị không bí mật đã kiểm tra: ENABLE_PUMP_COMMANDS=false, RELAY_PIN=26, MAX_PUMP_SECONDS=5, TELEMETRY_INTERVAL_MS=15000, DEVICE_CODE=ESP32-GF-A-01, ACTUATOR_CODE=PUMP_01. Không đưa SSID, mật khẩu hoặc credential MQTT vào báo cáo.

Backup nguồn/cấu hình sẵn có:

`C:\DATN\backups\phase12d2b-before-upload-20261018-140955`

Đã kiểm tra đủ sáu file và hash khớp nguồn hiện tại: config.example.h, config.local.h, FirmwareDiagnostics.h, OffStateSchedule.h, PumpProtocol.h, SmartAgricultureESP32.ino. Cờ trong backup là false. Đây là **backup source/config, không phải bản dump toàn bộ flash**. Backup chứa secrets, chỉ lưu riêng trên máy, không commit/chia sẻ.

SHA256 phục vụ đối chiếu trước khi thay đổi:

- config.local.h: `FD1F8D856EF2D1478BC2BFFDF1E5C7227BD2BFB8F8B89B1DBE9198497776BD3E`
- SmartAgricultureESP32.ino: `B6C748CEF7C37A9041F569005A6437DC11AB5865B5A41C39DBE86ED9A744CFAC`
- OffStateSchedule.h: `9F594A1A698CC5F0B869F198D27198DCD27ECB2B1ACD064A2CAC4193CAB172DE`

Bản binary DISABLED đã nạp/hash-verified ở 12D.2B còn tại `build/esp32-phase12d2b-local/`, gồm application, bootloader, partitions và boot_app0. Application `.ino.bin` và `_flashed.bin` cùng 965776 byte, SHA256:

`D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB`

config.local.h và build artifact được git ignore. Không ghi đè build directory DISABLED này khi chuẩn bị bản enabled. Binary có thể chứa credential nhúng, không chia sẻ.

## 4. Rà soát guard an toàn

| Guard | Bằng chứng source | Đánh giá |
| --- | --- | --- |
| Boot LOW, không tự ON | `.ino:237` setup đặt LOW trước/sau cấu hình GPIO; PumpController constructor gọi write(false) | PASS source; chưa đo xung điện lúc boot |
| HIGH=ON, LOW=OFF | `.ino:54` writeRelay dùng on?1:0 và readback; lỗi thử LOW | PASS source; wiring theo xác nhận người dùng |
| Khóa firmware | `.ino:54` writeRelay và `PumpProtocol.h:107` controller cùng dùng ENABLE_PUMP_COMMANDS | PASS hiện tại false |
| Retained | Callback và `PumpProtocol.h:85` từ chối retained; clean session `.ino:265` | PASS source |
| Expired / future / session cũ | `PumpProtocol.h:95–97`, FUTURE_COMMAND vẫn 2000 ms | PASS, không sửa guard thời gian |
| Duplicate / replay | Cache commandId, ID_REUSED, ALREADY_COMPLETED, high-water OUT_OF_ORDER; duplicate không gia hạn started_/runtime_ | PASS source |
| Monotonic timeout | `PumpProtocol.h:77–81,115`: millis/uint32 subtraction, không phụ thuộc bước nhảy NTP | PASS source; không phải chứng nhận độ rộng GPIO chính xác |
| OFF priority | OFF hợp lệ/đúng địa chỉ forceOff trước các kiểm tra clock/expiry; high-water chặn ON cũ | PASS; retained/malformed không được bỏ qua validation |
| Network/clock fail-safe | `.ino:77` safetyTask riêng core0, ưu tiên4, tick5ms; Wi-Fi/MQTT lease/clock lỗi đưa LOW | PASS source; không bảo đảm khi MCU treo/relay dính |
| OFF định kỳ | `.ino:142` sendOffState; OffStateSchedule.h interval15000; chỉ báo khi confirmedOff và clock đáng tin | PASS source và MQTT/API hiện tại |
| Telemetry | Sensor task/luồng bốn cảm biến không phụ thuộc enable; ACK xử lý trước state, không thay schema/topic | PASS source và MQTT/API hiện tại |

**Đổi false→true sẽ chủ ý mở cả hai kiểm tra ENABLE nêu trên**, không được mô tả chúng vẫn khóa ON. Các bảo vệ retained/expiry/duplicate, clock guard 2s, timeout monotonic, network fail-safe, OFF priority, cap firmware 5s và OFF định kỳ không bị thay đổi. Với firmware enabled, quyền publish của broker và khóa backend càng quan trọng; bật firmware không đồng nghĩa đã được phép gửi command.

GPIO OFF chỉ là trạng thái điện/logic được báo; không phải bằng chứng động cơ ngừng quay, tiếp điểm không dính hay có/không có dòng nước.

## 5. Bằng chứng runtime chỉ đọc

Diagnostic `backend/scripts/phase12d2-readonly-check.ts` lúc `2026-10-18T08:00:52.469Z`:

- Device ONLINE, lastSeenAt `08:00:45.654Z`.
- PostgreSQL PUMP_01 OFF, stateAt `08:00:45.003Z`.
- Bốn SensorReading source MQTT cùng recordedAt `08:00:37.000Z`, receivedAt `08:00:37.571Z`: TEMP 24.9, HUM 51.2, SOIL 13.85, LIGHT 0. Giá trị 0 không phải thiếu dữ liệu.
- DeviceCommand PENDING: **0**. Các command cũ không bị thay đổi.
- Cấu hình đọc bởi diagnostic: MQTT_COMMANDS_ENABLED=false, MQTT_AUTOMATION_COMMANDS_ENABLED=false, pump test mode=true.
- Health HTTP200, PostgreSQL/MQTT connected.

Observer chỉ subscribe MQTT và đọc API (không publish command), bằng chứng tiếp theo:

```json
{"mqttAt":"2026-10-18T08:01:45.968Z","topic":"smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state","qos":1,"retain":false,"dup":false,"payload":{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"PERIODIC","recordedAt":"2026-10-18T08:01:45.419Z"}}
```

API lúc `08:01:46.200Z` trả OFF với đúng stateAt `08:01:45.419Z`, controlEnabled=false, gatewayMode=DISABLED, connectionStatus=ONLINE. State trước đó `08:01:30.271Z` → state mới cách 15.148s. Đây là bản tin live non-retained, không phải dùng OFF lịch sử để vượt precheck.

Telemetry live `08:01:52.622Z`, recordedAt `08:01:52.000Z`: TEMP24.8, HUM51.5, LIGHT0, SOIL14.65; API `08:01:53.439Z` trả đủ bốn reading mới source MQTT. Presence ONLINE mới nhận `08:01:46.070Z`.

Windows Time đọc tại precheck: Leap Indicator0, Stratum5, source time.windows.com,0x9, last successful sync18/10/2026 14:35:25. Không resync/thay cấu hình giờ trong phiên này. Kết quả không thay thế việc đo offset sát lúc thử B hoặc bảo đảm đồng bộ dài hạn.

SELECT kiểm tra cuối `2026-10-18T08:05:17.767Z`: vẫn ONLINE, PUMP_01 OFF (stateAt `08:05:02.018Z`), pending0, hai cờ false; bốn readings MQTT mới recordedAt `08:05:07.000Z`: TEMP24.8, HUM51.2, SOIL15.1, LIGHT0. Health database/MQTT connected. Hash config.local.h kiểm tra cuối không đổi.

API DISABLED/controlEnabled=false là bằng chứng khóa của runtime đang phục vụ. Diagnostic đọc env riêng không phải bằng chứng độc lập rằng mọi tham số test-mode của PID backend đang chạy đã được nạp; vấn đề attestation cap1s còn dành cho trước B.

## 6. Thay đổi duy nhất dự kiến — CHƯA ÁP DỤNG

Chỉ trong `firmware/SmartAgricultureESP32/config.local.h`:

```diff
-static constexpr bool ENABLE_PUMP_COMMANDS = false;
+static constexpr bool ENABLE_PUMP_COMMANDS = true;
```

Giữ config.example.h=false, MAX_PUMP_SECONDS=5, GPIO26, topic/schema, SSID/credential/host, NTP và code khác nguyên trạng. Version source vẫn 12D.2: **chỉ nhìn version không phân biệt enabled/disabled**. Cần đối chiếu Serial enable, artifact và cấu hình build sau flash.

## 7. Quy trình sau phê duyệt A riêng — KHÔNG chạy hiện tại

1. Xác nhận lại adapter rút điện, USB ESP32, người giám sát, backend hai cờ false và pending0. Dừng nếu khác điều kiện.
2. Kiểm tra hash/backup còn nguyên, tạo snapshot riêng ngay trước chỉnh sửa nếu nguồn đã thay đổi; không lộ secrets. Chỉ áp dụng diff một dòng đã duyệt.
3. Compile từ local config, không định nghĩa SMART_AGRI_EXAMPLE_CONFIG; dùng build directory mới, không ghi đè binary rollback.

```powershell
Set-Location C:\DATN\Project_datn
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase12d3a-enabled' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

4. Chỉ upload nếu compile exit0, đúng local config, diff chỉ một cờ, backend vẫn khóa. Đóng Serial Monitor/Plotter khi cần giải phóng COM3; không rút/cấp nguồn adapter bơm.

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' upload -p COM3 --fqbn esp32:esp32:esp32 --upload-property 'upload.speed=115200' --input-dir 'C:\DATN\Project_datn\build\esp32-phase12d3a-enabled' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

5. Kiểm tra chip ESP32 đúng, exit0, flash hash verified; lưu hash binary và log không chứa credential. Đọc Serial115200 để nghiệm thu. Nếu lỗi/khác board/trạng thái HIGH bất thường, dừng, giữ nguồn bơm ngắt và xử lý rollback; không thử ON/OFF.

## 8. Tiêu chí nghiệm thu sau flash (hiện NOT VERIFIED)

- Serial mới: PUMP_COMMANDS: ENABLED, RELAY: OFF (GPIO), Wi-Fi/MQTT connected, NTP synced. Không dùng log cũ/version12D.2 đơn lẻ làm bằng chứng.
- ESP32 ONLINE, đủ bốn SensorReading MQTT mới sau flash qua ít nhất 2–3 chu kỳ; timestamp đo thực, giá trị0 hợp lệ.
- Ít nhất hai bản tin PERIODIC OFF mới sau flash, khoảng15s, non-retained, timestamp mới; database/API khớp, không tạo OFF giả.
- Backend MQTT_COMMANDS_ENABLED=false và MQTT_AUTOMATION_COMMANDS_ENABLED=false; API gatewayMode=DISABLED, controlEnabled=false; DeviceCommand PENDING0 và không xuất hiện command mới do flash.
- Adapter tiếp tục rút điện, không nhấn BẬT/TẮT, không thử động cơ/nước.

## 9. Rollback

Nếu phải rollback trong phiên flash được duyệt: adapter vẫn rút điện, hai cờ backend false. Khôi phục **cờ local về false**, giữ nguyên credential và các cấu hình khác; đối chiếu backup. Chỉ sửa source false **không** khóa binary enabled đã chạy, phải nạp lại bản disabled và xác minh Serial.

Ưu tiên compile bản false vào `build/esp32-phase12d3a-rollback-disabled` rồi upload với COM3/115200 bằng lệnh ở trên, thay đúng build-path/input-dir. Có thể dùng nguyên bộ build DISABLED `build/esp32-phase12d2b-local` đã xác minh SHA256 nếu cấu hình mạng/phần cứng vẫn phù hợp; không dùng artifact enabled hoặc app.bin không rõ nguồn. Không erase toàn flash hay khôi phục file secret bằng cách in nội dung ra terminal.

Sau rollback phải xác minh log mới DISABLED/OFF, NTP/network tốt, telemetry bốn cảm biến, PERIODIC OFF mới, backend DISABLED và pending0. Nếu upload/serial chưa xác minh được, báo NOT VERIFIED, không cấp nguồn bơm. Giữ backup/binary disabled đến khi kết thúc toàn bộ nghiệm thu.

## 10. Test và những điều kiện còn thiếu cho B

Phiên này PASS: source review, mapping COM3, backup/hash, nguồn cấu hình false, SELECT pending0/readings/state, passive MQTT PERIODIC OFF/telemetry/presence và API khóa. Không compile/upload hoặc chạy test điều khiển phần cứng.

Regression phần mềm đã PASS tại 12D.3A, **không chạy lại trong phiên này**: backend pump38, presence27, firmware controller36, diagnostics18, OFF scheduler5, serializer contract6, frontend irrigation8/polling12. Browser E2E thực tế đã PASS ở12D.2C; không mở lại/click pump trong12D.3B. Xem các báo cáo tương ứng để tránh hiểu nhầm là đã kiểm thử firmware enabled trên board.

Trước B còn cần:

1. Phê duyệt A riêng và nghiệm thu bản enabled trên board theo mục8; hiện chưa thực hiện.
2. Phê duyệt B riêng cho việc cấp nguồn/thử thật; xác nhận an toàn tại chỗ sát phiên thử. Phê duyệt A không bao gồm B.
3. Xác minh trực tiếp runtime backend áp dụng test mode và cap tối đa1s trước publish; không chỉ tin frontend hoặc đọc .env bởi process khác. Giữ automation false.
4. Đo lại Windows/NTP/clock skew; bật backend chỉ trong phiên B được duyệt, chờ OFF mới sau reload, ONLINE và pending0. Không dùng UNKNOWN/OFF cũ vượt guard.
5. Firmware MAX_PUMP_SECONDS vẫn5, backend cap1 là hai lớp khác nhau. Nếu publisher khác vượt backend, firmware không tự giới hạn1s. Không bypass API/direct MQTT.
6. Chưa đo thực tế độ rộng HIGH1s, xung boot, tiếp điểm relay/motor/nước hoặc worst-case scheduling. Tick5ms không chứng minh hard upper1.000s; ACK/state timestamp không phải phép đo cạnh GPIO. Thiết kế phương án đo/ngắt nguồn độc lập và dừng ngay khi bất thường.
7. Polling2s có thể không nhìn thấy pha ON1s; không gửi lại ON chỉ để nhìn UI. ACK_TIMEOUT không chứng minh chưa từng HIGH; ngắt nguồn độc lập là phương án khẩn cấp khi không chắc chắn.

**Dừng tại đây chờ phê duyệt A rõ ràng. Không có thao tác bật điều khiển hoặc nạp firmware nào được thực hiện bởi báo cáo này.**
