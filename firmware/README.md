# Smart Agriculture ESP32 — Phase 12B / 12B.1

> Source update 21/10/2026 — Phase13.4D: đã chuẩn bị SNTP refresh30phút và recoverybackoff, giữ expiry2giờ, thêm clock/samplegeneration và diagnostics. **Compile/host tests PASS, CHƯA NẠP ESP32**; không bật bơm. Core3.3.12 thực tế có defaultSNTP3giờ nên không dùng giả định1giờ. Xem [báo cáo SNTP và gate phê duyệt flash](../docs/PHASE13_4D_ESP32_SNTP_RECOVERY.md), đặc biệt xác nhận configWiFi hiện tại trước upload. Các hướng dẫn/báo cáo lịch sử bên dưới không phải phê duyệt flash mới.

Firmware hợp nhất nằm tại `SmartAgricultureESP32/SmartAgricultureESP32.ino`. Dùng ESP32 DevKit V1 (ESP32 dual-core), DHT22, BH1750, LM393 AO và relay MKE-M05 active HIGH. **Không cần đấu lại dây đã được người dùng test thành công.** Chưa nạp lên ESP32 hoặc thử bơm qua website trong đợt triển khai này.

## 1. Pin và hiệu chuẩn

| Chức năng | GPIO |
| --- | --- |
| DHT22 data | 4 |
| BH1750 SDA / SCL | 21 / 22 |
| LM393 AO | 34 |
| MKE-M05 relay | 26, HIGH ON / LOW OFF |

Không có firmware gốc trong repository để kiểm chứng độc lập pin. Mapping trên dựa vào thông tin người dùng đã cung cấp, không được coi là kết quả đo lại phần cứng. LM393 dùng ADC 12 bit, hiệu chuẩn khô 3500 / ướt 1507; công thức `100 * (dry - adc) / (dry - wet)`, clamp 0..100%. Có thể điều chỉnh hằng số trong config local sau đối chiếu phép đo thực tế. Không thay pin/wiring để khớp một sketch khác.

## 2. Cài thư viện và cấu hình Arduino IDE

Arduino IDE → Boards Manager → **esp32 by Espressif Systems**. Bản đã biên dịch tại máy agent: core 3.3.12, board **ESP32 Dev Module**, FQBN `esp32:esp32:esp32`, dành cho classic ESP32 DevKit V1 dual-core, không phải ESP32-C3/S2.

Library Manager:

- ArduinoMqttClient by Arduino — đã kiểm tra 0.1.8.
- DHT sensor library by Adafruit — đã kiểm tra 1.4.7.
- Adafruit Unified Sensor — đã kiểm tra 1.1.15 (dependency DHT).
- BH1750 by Christopher Laws — đã kiểm tra 1.3.0.
- WiFi/Wire/time/FreeRTOS/esp_sntp/driver/gpio đi cùng ESP32 core.

Không cần thêm ArduinoJson: `PumpProtocol.h` có parser command flat JSON bounded, strict, test bằng C++ thật. Chỉ nhận schema v1 đã biết, strings ASCII không escape, integer canonical, UTC `...ss.sssZ` hoặc `...ssZ`; backend hiện phát `...ss.sssZ`. Các biểu diễn JSON khác tuy hợp lệ theo JSON chung nhưng không thuộc subset này sẽ bị từ chối an toàn. Không dùng parser này để nhận JSON tổng quát.

Mở đúng file `.ino` trong folder cùng tên. Để nhập credentials, tự sao chép nội dung `config.example.h` thành `config.local.h` trong cùng thư mục. File local đã được .gitignore; không gửi/chụp nội dung có mật khẩu. Điền:

- WIFI_SSID / WIFI_PASSWORD của Wi-Fi 2.4 GHz ESP32 đang dùng.
- MQTT_HOST là IPv4 Windows cùng mạng, mẫu `172.20.10.2`; xác minh lại bằng `ipconfig`, không dùng localhost từ ESP32.
- MQTT_PORT 1883 theo broker hiện tại.
- MQTT_USERNAME `ESP32-GF-A-01`, MQTT_PASSWORD là mật khẩu thiết bị do người vận hành đã cấp; **không dùng password backend**.
- MQTT_CLIENT_ID riêng `ESP32-GF-A-01-physical`; không chạy simulator trùng client ID.
- **Giữ ENABLE_PUMP_COMMANDS=false**. Không thay Device/Actuator/topic đã đăng ký.

Không có config.local.h: sketch biên dịch bằng mẫu nhưng **không kết nối mạng**; GPIO vẫn LOW. Thêm macro `SMART_AGRI_EXAMPLE_CONFIG=1` cưỡng chế bản build dùng mẫu, bỏ qua config local; chỉ dùng cho CI/kiểm tra compile, **không nạp artifact mẫu nếu muốn kết nối Wi-Fi**.

## 3. Verify/compile và upload thủ công

IDE chọn ESP32 Dev Module (cấu hình đã kiểm tra), chọn đúng COM của ESP32 đang cắm USB, Serial Monitor 115200. Verify trước, không bấm Upload nếu local config chưa được kiểm tra false. Không chọn nhầm thiết bị/COM. Upload chỉ do người dùng chủ động thực hiện; agent không chạy upload/serial monitor và không điều khiển ESP32 thật.

Compile không có credentials, không upload, từ PowerShell tại repository:

```powershell
$cli = 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
& $cli compile --fqbn esp32:esp32:esp32 --build-property 'compiler.cpp.extra_flags=-DSMART_AGRI_EXAMPLE_CONFIG=1' --build-path 'C:\DATN\Project_datn\build\esp32-phase12b' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Điều chỉnh vị trí CLI nếu Arduino IDE được cài nơi khác. Số flash/globals trong báo cáo là của cấu hình mẫu false; bản local có network path hoạt động có thể khác do compiler dead-code elimination, cần Verify lại bản local trước upload. Không có lệnh upload tự động trong script test. Giữ nguyên mạch; phần mềm đưa GPIO26 LOW từ đầu setup, không khôi phục ON. Phần mềm không kiểm soát được mức điện trong ROM boot/reset/brownout hoặc relay kẹt. Không thể hứa loại bỏ mọi xung thoáng qua. Biện pháp phần cứng pull-down/interlock chỉ là đánh giá an toàn cho giai đoạn sau, không yêu cầu đấu lại bộ mạch hiện tại.

## 4. Luồng runtime và giới hạn

- Sensor task độc lập đọc cả bốn giá trị mỗi 15 giây; sample lưu timestamp **lúc đo**, không đổi giờ khi gửi. Chỉ gửi đủ bốn reading hữu hạn/hợp lệ. DHT/BH1750/NTP lỗi: bỏ sample, Serial thông báo; LIGHT=0 và SOIL=100 vẫn hợp lệ.
- MQTT/network chỉ do loop Arduino sử dụng; reconnect theo lịch, không có vòng `while(!connected)` vô hạn. TCP/MQTT connect/PUBACK timeout 1000 ms, payload receive deadline 100 ms.
- Safety task riêng core 0, kiểm tra mỗi 5 ms, runtime theo unsigned millis (đã test wrap). Không phụ thuộc vòng reconnect, DHT hoặc publish chờ broker. HIGH chỉ qua controller + guard ENABLE_PUMP_COMMANDS thứ hai, cap cứng tối đa 5 giây. GPIO write và mức logic đọc lại phải thành công mới APPLIED; đây không phải feedback relay/motor/nước.
- Network-progress lease 250 ms: nếu loop/network operation bị kẹt khi đang ON, safety task LOW và yêu cầu đóng transport. Khi đang ON gửi ONLINE QoS1 mỗi 200 ms để probe broker PUBACK; khi OFF heartbeat mỗi 15 giây. Việc này chỉ tăng heartbeat trong tối đa vài giây tưới, giữ schema presence cũ. Mất Wi-Fi được event handler đưa LOW ngay khi ESP32 nhận event; socket/MQTT disconnect được loop/safety xử lý.
- Mạng bị black-hole nhưng TCP chưa báo lỗi không thể nhận biết “ngay tức thì”: probe 200 ms + lease 250 ms là mục tiêu phát hiện, cộng độ trễ scheduler; chưa đo trên phần cứng. Deadline ON 1..5 giây là lớp bảo vệ riêng. FreeRTOS không phải bảo đảm hard real-time khi CPU treo/nguồn lỗi; vẫn cần ngắt nguồn tại chỗ khi khẩn cấp.
- SNTP callback xác nhận đồng bộ, UTC gettimeofday; đồng bộ cũ quá 2 giờ bị vô hiệu cho đến callback mới. Khi chưa có UTC tin cậy, không ON, không dựng ACK timestamp giả. OFF có cấu trúc/địa chỉ đúng vẫn LOW, nhưng nếu clock/expiry sai thì REJECTED hoặc không thể gửi ACK hợp lệ, backend có thể timeout.
- 64 UUID cache, giữ ít nhất 120 giây nếu chưa đầy; đầy cache không chấp nhận ON mới, OFF vẫn dùng được. Duplicate cùng UUID không kích HIGH lần nữa, không gia hạn deadline và giữ recordedAt gốc. ON đã hết chu kỳ trả ALREADY_COMPLETED. UUID cùng ID đổi body bị từ chối. high-water issuedAt giữ suốt uptime, OFF ưu tiên ở timestamp bằng nhau. Lệnh ON phát trước MQTT session hiện tại bị từ chối, ngăn replay qua reboot/reconnect.
- ACK queue 8 bản tin, JSON command <=1024 byte; oversize/retained/wrong topic/packet thiếu/queue đầy đóng transport sau LOW. Invalid JSON/schema/identity bị bỏ qua, backend tự timeout; không ACK một UUID không đáng tin cậy. MQTT callback chỉ áp dụng GPIO và xếp ACK, không publish lồng trong callback.
- Sau reconnect xóa ACK queue cũ, chỉ báo state OFF mới, không replay ON/ACK ON. Không backlog telemetry; chỉ latest sample còn hạn30giây. Publish thất bại được retry tối thiểu5giây cùng timestamp gốc; chỉ đánh dấu SENT sau PUBACK. PUBACK thất bại có thể là delivery unknown, không chứng minh broker chưa nhận.

## 5. Hợp đồng MQTT không thay đổi backend

Đầy đủ JSON tại [hợp đồng Phase 12](../docs/ESP32_PUMP_MQTT_INTEGRATION.md). Prefix `smart-agriculture/v1/devices/ESP32-GF-A-01`:

| Suffix | Chiều | QoS / retain |
| --- | --- | --- |
| telemetry | ESP32 → backend | 1 / false |
| status (birth / heartbeat / LWT OFFLINE) | ESP32 → backend | 1 / false |
| commands/PUMP_01 | backend → ESP32 | subscribe 1, reject retained |
| command-acks/PUMP_01 | ESP32 → backend | 1 / false |
| actuator/state | ESP32 → backend | 1 / false, **OFF only** |

Backend schema không hỗ trợ unsolicited state ON. Vì vậy ON được báo qua ACK APPLIED sau GPIO HIGH, không phát một state ON trái schema. OFF/BOOT/MAX_RUNTIME/loss gửi state OFF reason hợp lệ; nếu mất mạng, gửi xác nhận OFF **mới** sau reconnect và có UTC. Đây là thống nhất với source Phase 12, không tự mở rộng backend schema.

## 6. Test tự động không cần ESP32 hoặc broker thật

### Phase 12D.2 — OFF định kỳ (cần người dùng duyệt nạp firmware mới)

Source 12D.2 bổ sung `OffStateSchedule.h`: gửi OFF có `reason=PERIODIC` mỗi 15 giây khi GPIO được controller xác nhận LOW và NTP còn hợp lệ. Dùng topic actuator/state hiện hữu, QoS1/non-retained, recordedAt UTC mới; không replay OFF cache. BOOT/loss/COMMAND/failsafe vẫn ưu tiên và dùng reason cũ; ACK vẫn được xử lý trước state trong loop. Không gửi state ON ngoài schema, không điều khiển GPIO trong scheduler, không đổi guard 2 giây hoặc hard cap 5 giây.

Backend phải được cập nhật để chấp nhận reason PERIODIC trước khi người vận hành nạp firmware. Đây là mở rộng enum reason của v1, không đổi topic/field/ACL/migration. Firmware đang nạp cũ không tự có tính năng này; **chưa tự upload**. Giữ `ENABLE_PUMP_COMMANDS=false`, adapter rút điện; giữ cấu hình Wi-Fi và chân hiện hữu. Báo cáo GPIO không phải feedback động cơ/nước.

Backend 12D.2 chỉ công nhận OFF từ báo cáo mới trong session, còn hạn 30 giây và Device ONLINE. Khi đồng hồ ESP32 không hợp lệ, GPIO không được xác nhận OFF hoặc MQTT mất kết nối, UNKNOWN là kết quả an toàn. Trước nghiệm thu phải kiểm tra Serial NTP SYNCED và bốn cảm biến còn gửi dữ liệu mới, không chỉ heartbeat ONLINE.

Hướng dẫn nghiệm thu và giới hạn chạy thử 1 giây: [Phase12D.2](../docs/PHASE12D2_STATE_RECOVERY_FRONTEND.md).

```powershell
Set-Location C:\DATN\Project_datn
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

Hoặc `-Compiler 'g++'` nếu có compiler C++11+ trên PATH. Script build native EXE trong build/ bị ignore; fake pin callback chỉ sửa biến bộ nhớ, không GPIO/network/serial. 36 test controller/parser/serializer, 18 test diagnostics/delivery/lease và 5 test dùng JSON từ **chính serializer C++** chạy qua gateway/validator backend với MQTT fake. Cần backend node_modules đã có TypeScript/Zod. Script không đọc .env, không dựng Prisma/MQTT thật.

Các bài test host không kiểm chứng scheduling FreeRTOS, Wi-Fi RF, driver sensor, GPIO điện, relay/motor hoặc upload. Compile board không phải xác nhận firmware đã chạy trên ESP32.

## 7. Test thủ công từng bước, giữ nguyên dây

1. Giữ ENABLE_PUMP_COMMANDS=false; backup sketch đang dùng và kiểm tra đúng COM, pin, địa chỉ broker. Không đổi dây. Backend/Mosquitto giữ cờ thật false trước khi được duyệt migration/ACL.
2. Người dùng chủ động upload bản local config false, mở Serial115200. Phải thấy `BOOT: GPIO26 LOW requested; physical pump commands DISABLED`. Bơm không được tự chạy lúc boot/reset/reconnect; nếu thấy bất thường, ngắt adapter5V tại chỗ và dừng test, không sửa phần mềm để bỏ qua fault.
3. Kiểm tra Wi-Fi/MQTT subscribe QoS1 và NTP. Mỗi15giây Serial có bốn readings published; website/DB hiển thị bốn mã, giá trị 0 hợp lệ, timestamp UTC mới. Không khởi động backend Phase12 mới nếu migration chưa deploy; telemetry có thể tiếp tục qua backend phiên bản tương thích hiện đang chạy.
4. Sau khi người vận hành **cho phép và đã deploy migration + ACL** mới bật riêng backend MQTT_COMMANDS_ENABLED=true, automation=false, firmware vẫn false. ON 1 giây từ UI phải nhận REJECTED PUMP_COMMANDS_DISABLED, không HIGH, không success giả. OFF hợp lệ phải LOW/APPLIED và state OFF. Nhấn ON qua UI lúc này là kiểm thử rejection có giám sát, không phải automated script.
5. Reset ESP32, tắt/bật Wi-Fi để test reconnect với flag false: luôn OFF, telemetry tiếp tục sau kết nối, không restore ON. ACK retained, expiry, malformed, duplicate đã có test offline; không dùng retained ON trong broker thật để thử.
6. Chỉ sau khi các điều kiện trên đạt, người dùng chủ động duyệt lần thử vật lý: giữ nguyên dây, nguồn USB + adapter5V/GND chung như bài test cũ, có nước/tải phù hợp và công tắc adapter trong tầm tay, người giám sát. Sửa **local config** true, upload bản đã review; cap5giây vẫn giữ, request đầu chỉ1giây. Không dùng script/simulator tự động.
7. UI: PENDING → ACK APPLIED, relay HIGH rồi LOW sau1giây, state OFF MAX_RUNTIME. Quan sát motor/nước riêng; backend chỉ biết GPIO. Thử OFF ưu tiên và ngắt Wi-Fi có giám sát, xác nhận LOW; reconnect không ON lại. Nếu phản hồi/timer không đúng, cắt nguồn motor và quay lại flag false.

Không có bước nào bắt buộc đấu lại dây đã được test. Cắt/bật nguồn adapter là thao tác vận hành an toàn do người dùng kiểm soát, không là thay đổi sơ đồ đấu nối.

## 8. Nguồn API đã đối chiếu

Header/source **thư viện đã cài tại máy** là nguồn kiểm chứng compile. Nguồn upstream để tham khảo: [ArduinoMqttClient header](https://github.com/arduino-libraries/ArduinoMqttClient/blob/master/src/MqttClient.h), [implementation](https://github.com/arduino-libraries/ArduinoMqttClient/blob/master/src/MqttClient.cpp), [BH1750](https://github.com/claws/BH1750/blob/master/src/BH1750.h), [DHT](https://github.com/adafruit/DHT-sensor-library/blob/master/DHT.h), [ESP32 NetworkClient](https://github.com/espressif/arduino-esp32/blob/master/libraries/Network/src/NetworkClient.h). messageRetain(), beginMessage(topic,size,false,1), subscribeQoS() và timeout API đã đối chiếu; không giả định API PubSubClient hỗ trợ QoS1 publish.

## 9. Phase 12B.1 — Serial diagnostics trước khi nạp

Xem [báo cáo rà soát và checklist đầy đủ](../docs/PHASE12B1_FIRMWARE_REVIEW.md). Firmware hiện log version12B.1, pin/calibration/mode, các thay đổi Wi-Fi/MQTT/NTP/GPIO và một block SENSOR MONITOR mỗi15giây. Raw ADC gồm average/min/max. DHT NaN/range, BH1750 init/not-ready/read failure, ADC invalid/rail-warning, NTP và publish được phân biệt, không thay lỗi bằng0 hay gửi partial batch.

TELEMETRY trong block đầu có thể là PENDING/NOT_SENT/SKIPPED vì chưa publish. Sau PUBACK mới có event cùng sequence: `TELEMETRY #N: SENT (BROKER_PUBACK; backend DB not verified)`. Đây không xác nhận lưu PostgreSQL hay nước chảy. Nếu PubACK timeout, log FAILED/PUBACK_UNCONFIRMED và bounded retry của latest fresh sample. Không gán timestamp lúc gửi cho sample đo cũ.

Ngưỡng control lease250ms giữ nguyên, có cảnh báo SLOW PUBACK>=200ms để thu thập dữ liệu thực. Transport timeout1000ms không phải thời gian bơm được phép tiếp tục khi mất progress. Không tự nới lease hoặc bật physical commands để vượt lỗi. GPIO snapshot được đọc để hiển thị OFF/ON/UNKNOWN; GPIO/ACK vẫn không phải feedback relay/motor/flow.

OFF trong lỗi clock/expiry/disconnect vẫn nâng high-water để chặn ON cũ; ON bị chặn nếu LOW chưa được xác nhận. Trong khi publish state OFF, callback ON tạm REJECTED qua readiness gate, không tự retry sau đó; OFF vẫn được ưu tiên. Schema/topic giữ nguyên.

Nạp lần đầu: kiểm tra **config.local.h thực tế vẫn false**, Verify bằng ESP32 Dev Module, đúng COM, sau đó người dùng chủ động Upload/Serial115200. Không dùng artifact mẫu không có credentials để kiểm tra mạng. Nghiệm thu2–3chu kỳ đo: sensor hữu hạn, raw ADC hợp lý, NTP SYNCED, MQTT subscribed, telemetry có kết quả riêng, PUMP_COMMANDS DISABLED và GPIO/bơm thực luôn OFF. Không cần gửi command bật bơm để kiểm tra vòng cảm biến. Nếu LOW_NOT_CONFIRMED hoặc bơm chạy bất thường, ngắt adapter tại chỗ và dừng; không thay wiring đã test hoặc bỏ guard.

Ví dụ formatter host (fixture, không đo ESP32) có thể xem bằng:

```powershell
& .\build\firmware-tests\firmware_diagnostics_test.exe --example
```

Giữ nguyên config.example.h và không sửa config.local.h trong Phase12B.1. Không apply migration/ACL, không bật backend flags, không khởi động backend mới khi DB chưa tương thích. Các số liệu DB/broker ở báo cáo Phase12B là snapshot đợt trước, không phải xác minh lại live trong đợt này.
