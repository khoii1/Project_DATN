# Phase 13.4E — ESP32 SNTP firmware flash preflight

> Cập nhật sau flash13.4F ngày21/10/2026: preflight lịch sử bên dưới không chứng minh runtime ổn định. Firmware13.4D abort/reboot trên board; dừng nghiệm thu, không tự flash lại/rollback. Xem [báo cáo13.4F](PHASE13_4F_SNTP_FIRMWARE_FLASH_VERIFICATION.md).

Ngày kiểm tra: **21/10/2026, preflight đầu13:05–13:09, cập nhật rollback13:18–13:22 UTC+7**. Sau preflight read-only, người dùng trả lời **“cho phép”** cho riêng việc tạo/compile rollback DISABLED với Wi-Fi hiện tại. Chỉ sửa cờ trong bản sao build; không sửa source/config chính, flash, mở COM hoặc reset/EN.

```text
WIFI_CONFIG_VERIFIED (USER_CONFIRMED)
BACKEND_SAFETY_PASS
COM3_USB_MAPPING_VERIFIED
BOARD_AND_COM_VERIFIED (USB_MAPPING_AND_RECORDED_BOARD)
BOARD_IDENTITY_REPROBE_NOT_PERFORMED
FIRMWARE_BINARY_VERIFIED
ROLLBACK_PLAN_READY (COMPILED_DISABLED_CURRENT_CONFIG)
ROLLBACK_WIFI_RUNTIME_NOT_VERIFIED
HARDWARE_POWER_USER_CONFIRMED
READY_FOR_FLASH_APPROVAL
FLASH_NOT_PERFORMED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

**READY_FOR_FLASH_APPROVAL — dừng, chưa flash.** Người dùng xác nhận đổi password có chủ ý, SSID/password hiện tại đúng, adapter5V rút điện và ESP32 chỉ cấp USB; sau đó phê duyệt tạo/compile rollback. Bản DISABLED mới đã compile/đối chiếu config/hash PASS. Wi-Fi VERIFIED dựa trên kiểm tra cục bộ của người dùng và sự khớp config trong artifact, **không phải binary đã được thử trên ESP32**. Board/COM PASS ở mức mapping không-reset và board đã xác minh lịch sử; chip handshake vẫn bắt buộc trước ghi trong phiên upload được duyệt riêng. Không dùng phê duyệt compile rollback này làm phê duyệt flash.

## 1. Đối chiếu cấu hình — không hiển thị secrets

Đã đọc `firmware/SmartAgricultureESP32/config.local.h` và so sánh trong bộ nhớ với headers được Arduino lưu ở:

- `build/esp32-phase12d3a-enabled/sketch/config.local.h`: artifact của phê duyệt firmware ENABLED trước đây.
- `build/esp32-phase12d2b-local/sketch/config.local.h`: artifact DISABLED để rollback.
- `build/esp32-phase13-4d-local/sketch/config.local.h`: artifact SNTP mới.

Chuẩn hóa CRLF/LF, bỏ directive `#line` Arduino sinh tự động và khoảng trắng đầu/cuối; chỉ xuất boolean và tên field khác, không xuất giá trị password hoặc hash password.

| Đối chiếu | Kết quả |
| --- | --- |
| Config hiện tại so với build13.4D | Khớp toàn bộ nội dung chuẩn hóa |
| Config hiện tại so với build12D.3A/B ENABLED | Chỉ khác field **WIFI_PASSWORD** |
| WIFI_SSID hiện tại so với build ENABLED cũ | Khớp |
| MQTT_USERNAME/MQTT_PASSWORD so với build ENABLED cũ | Khớp; không in credentials |
| Config Wi-Fi rollback DISABLED cũ so với hiện tại | **Không khớp**; giữ artifact cũ để đối chiếu |
| Config rollback DISABLED mới13.4E so với hiện tại | **Khớp mọi field, chỉ ENABLE_PUMP_COMMANDS=false** |
| SSID Windows đang kết nối so với SSID trong config hiện tại | Khớp; không in tên mạng |
| SSID ESP32 đang kết nối đọc trực tiếp từ thiết bị trong phiên này | NOT VERIFIED; không mở Serial Monitor |
| Thay đổi WIFI_PASSWORD có chủ ý | **Người dùng xác nhận** đã cập nhật sáng21/10/2026 |
| Đã kiểm tra cục bộ SSID/password hiện tại đúng mạng ESP32 đang dùng | **USER CONFIRMED: “hiện đã đúng”**; không nhận hoặc hiển thị secret |

Các giá trị không bí mật đã đối chiếu:

```text
MQTT_HOST=172.20.10.2
MQTT_PORT=1883
DEVICE_CODE=ESP32-GF-A-01
ACTUATOR_CODE=PUMP_01
ENABLE_PUMP_COMMANDS=true (giữ nguyên từ phê duyệt trước)
MAX_PUMP_SECONDS=5 (trần fail-safe firmware, không phải quyền thử bơm)
```

Windows Wi-Fi hiện172.20.10.2/28. Broker LAN1883 PID1340, backend5000 PID3572; MQTT connection backend→172.20.10.2:1883 và ESP32peer172.20.10.3 đã established. Broker service loopback1883 PID4572 vẫn riêng biệt, không restart/chạy thêm broker.

**Giới hạn:** cùng SSID và broker đang nhận từ ESP32 không chứng minh secret trong file hiện tại trùng firmware đang nạp. Xác nhận mới của người dùng đủ chốt cấu hình dự kiến cho preflight, nhưng khả năng kết nối của binary13.4D vẫn phải nghiệm thu sau flash được duyệt. Không đọc Wi-Fi profile key/password từ Windows, không thử kết nối bằng mật khẩu mới, không tự phục hồi password từ bản cũ.

Người dùng đã xác nhận kiểm tra cấu hình hiện tại đúng. **Không gửi password/config/binary qua chat.** Nếu cấu hình thay đổi sau xác nhận này, phải đối chiếu lại với build trước mọi flash.

## 2. Runtime và an toàn backend

SELECT transaction `READ ONLY` lúc **06:08:32.253Z =13:08:32.253 UTC+7** xác minh target database smart_agriculture/schema public/port5432 trước các truy vấn:

```text
DeviceCommand PENDING=0
Tổng DeviceCommand=43
```

Tổng43 khớp baseline13.4C/D; hai ON vật lý ngày20/10 vẫn là bản ghi lịch sử, không xuất hiện command mới từ phase này. Không sửa dữ liệu lịch sử, không chạy seed/migration/simulator.

Đúng backend đang phục vụ port5000 là PID3572, creation/start khớp process13.4A trước đó. Startup runtime log `build/phase13-4a/backend-final.out.log` gắn chính PID3572 ghi:

```json
{"testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":false,"automationEnabled":false}
```

GET actuatorAPI lúc **06:06:01.449Z =13:06:01.449 UTC+7** trả controlEnabled=false, gatewayMode=DISABLED, deviceONLINE và OFF mới. Đây là kết hợp bằng chứng process/runtime log/API, không chỉ đọc `.env`. Không reload backend hoặc bật feature flag.

### Cập nhật thực tế: firmware cũ đã có dữ liệu mới trở lại

SELECT/API cùng thấy:

- TEMP_01=32.9; HUM_01=71.3; SOIL_01=26.44; LIGHT_01=0.
- RecordedAt **06:05:53.562Z**, sourceMQTT; DB receivedAt06:05:53.734Z.
- PUMP_01 OFF stateAt **06:05:56.889Z**; lastSeen06:05:57.360Z.

Khác snapshot13.4D trước đó chỉ có dữ liệu05:00. **Không flash, reset/EN hoặc restart dịch vụ trong preflight này.** Sự phục hồi phù hợp lịch refreshSNTP cũ3giờ nhưng chưa đủ xác định callback/interval đang chạy nếu không có Serial mới. Không gán thành PASS recovery của firmware13.4D và không bỏ fix chỉ vì dữ liệu đã tự trở lại.

Một lượt tool PowerShell/CIM trả output đầy đủ rồi kết thúc exit0xC0000005; không coi toàn lượt đó PASS. Những kiểm tra COM/network/hash/API/SQL được đối chiếu bằng các lệnh riêng exit0. Không có thao tác ghi hoặc thay Windows/Node/dịch vụ để xử lý lỗi kết thúc diagnostic ngoài phạm vi.

## 3. Board, cổng USB và nguồn

Read-only CIM/PnP xác nhận:

```text
COM3: Silicon Labs CP210x USB to UART Bridge
PNP: USB\VID_10C4&PID_EA60\0001
COM4/COM5: Bluetooth, không chọn
```

Đúng mapping USB COM3 đã sử dụng ở các phase trước; lịch sử esptool xác nhận ESP32-D0WD-V3 revision3.1, boardESP32 DevKitV1/ESP32 DevModule, không phải C3/S2. **CP210x là USB bridge, không tự chứng minh loại chip ESP32 bên kia.** Không chạy chip probe/esptool cần mở COM/reset; không kiểm tra tính rảnh của COM bằng cách chiếm cổng. Firmware binary FQBNesp32:esp32:esp32/upload.speed115200 khớp board lịch sử.

Vì vậy mappingCOM PASS; current chip interrogation không thực hiện trong preflight không-reset này. Trước upload được duyệt phải đối chiếu đúng board/USB tại chỗ và handshake đúng chip trước ghi, không tự chọn thiết bị khác nếu COM thay đổi.

Đã gửi câu hỏi yêu cầu xác nhận ngay lúc này:

- Adapter5V máy bơm đang rút điện.
- ESP32 chỉ cấp USB.

**Đã nhận xác nhận mới của người dùng: “đúng”.** Adapter5V đang rút điện, ESP32 chỉ cấp USB theo xác nhận tại chỗ; không phải phép đo nguồn độc lập từ agent. Giữ nguyên trạng thái này; không yêu cầu cấp nguồn hoặc nhấn BẬT/TẮT. Không dùng xác nhận nguồn làm phê duyệt flash.

## 4. Artifact13.4D

Đã kiểm tra file tồn tại, hash khớp báo cáo13.4D, tagversion13.4D có trong sketch generated và application binary. Headers SntpRecovery/PumpProtocol/OffStateSchedule/FirmwareDiagnostics hiện tại khớp bản lưu trong build. configlocal hiện tại khớp build13.4D.

```text
Artifact: build/esp32-phase13-4d-local/SmartAgricultureESP32.ino.bin
Bytes: 968016
SHA256: 441E33EE9B9B4064401819A2156CFBE59A3C898E495C80A689F048B1694EEE5D
FQBN: esp32:esp32:esp32
Core: 3.3.12
Upload speed metadata: 115200
Firmware version: 13.4D
```

Đây là xác minh tính nhất quán artifact/source/manifest, **không phải readback hash trên ESP32**. Corecompile và24SNTP/408backendtests là kết quả đã PASS ở13.4D, không chạy lại để tạo cảm giác đã nghiệm thu phần cứng mới. File binary/buildheader chứa secrets: giữ cục bộ trong build ignored, không đính kèm/commit/chia sẻ.

## 5. Rollback

Artifact DISABLED cũ tồn tại, hash khớp:

```text
build/esp32-phase12d2b-local/SmartAgricultureESP32.ino.bin
SHA256: D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB
```

Đây là fallback đã build với physicalcommandsDISABLED. Tuy nhiên Wi-Fi config trong artifact này **không khớp file hiện tại**; chưa chứng minh nó reconnect vào Wi-Fi hiện tại. Có thể đưa về chế độ DISABLED/LOW qua USB theo quy trình rollback được duyệt dù mất mạng, nhưng không được hứa telemetry/MQTT sẽ phục hồi bằng binary này.

Kế hoạch trước phê duyệt flash:

1. Chốt config Wi-Fi hiện tại với người dùng, giữ backend false/false/testtrue và adapterngắt.
2. Xác minh backup source/config/manifest hiện tại ở vị trí bảo vệ ngoài Git, không dựa hoàn toàn vào backup cũ chứa Wi-Fi khác.
3. Chốt rollback cho mục tiêu cụ thể: fallback DISABLED offline hiện hữu, hoặc chuẩn bị một bản DISABLED tương thích credentials hiện tại **sau khi được duyệt phạm vi build riêng**, không tự sửa flag/password/source trong preflight này. Build mới cần kiểm thử/hash/manifest riêng, không ghi đè oldartifact.
4. Nếu cần rollback sau flash được duyệt, chỉ thao tác đúng board/COM, adapterngắt và backendkhóa; xác minh SerialDISABLED/GPIOOFF. Không restore database hoặc đổi broker để ép kết quả mạng PASS.

### Cập nhật sau phê duyệt compile rollback

Người dùng đã cho phép tạo/compile riêng bản rollback, **không cho phép nạp**. Đã tạo mới:

- Source staging: `build/esp32-phase13-4e-rollback-src/SmartAgricultureESP32`.
- Output: `build/esp32-phase13-4e-disabled`.
- Manifest không secrets: `build/esp32-phase13-4e-disabled/rollback-manifest.json`.

Để rollback thực sự bỏ được fix SNTP nếu cần, dùng source backup **12D.2 trước fix** từ `C:\DATN\backups\phase12d2b-before-upload-20261018-140955`; không dùng code13.4D chỉ đổi tên. Năm file code/public config khớp backup nguyên trạng. Thay configlocal trong staging bằng cấu hình hiện tại đã được người dùng xác nhận; chỉ đổi **một dòng trong bản sao** ENABLE_PUMP_COMMANDS=true→false. Không sửa password/SSID/MQTT/device/pin/calibration/MAX_RUNTIME. Source chính vẫn ENABLED như trước, không thay firmware đang chạy.

Compile:

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase13-4e-disabled' 'C:\DATN\Project_datn\build\esp32-phase13-4e-rollback-src\SmartAgricultureESP32'
```

**PASS exit0**: sketch965634bytes(73%), staticRAM60572bytes(18%), application.bin965776bytes. FQBNesp32:esp32:esp32/Core3.3.12/upload metadata115200; config Arduino generated khớp staging, mọi cấu hình hiện tại giữ nguyên trừ cờfalse. Không macroexample, không upload.

```text
Rollback artifact: build/esp32-phase13-4e-disabled/SmartAgricultureESP32.ino.bin
SHA256: B30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88
Firmware version: 12D.2
ENABLE_PUMP_COMMANDS=false
```

Artifact13.4D ENABLED và DISABLED cũ giữ nguyên hash đã ghi ở trên, không ghi đè. Các header an toàn PumpProtocol/FirmwareDiagnostics/OffStateSchedule của rollback khớp byte với header đã kiểm thử hiện tại. Chạy lại native host binaries đã build từ các header này: controller36PASS, diagnostics18PASS, OFFschedule5checksPASS; log `report/phase13_4e-rollback-host-checks.log`. Đây là test logic giả lập, không test mạch/bơm và không chứng minh Wi-Fi của binary mới đã kết nối. Không chạy lại backend408 hoặc PostgreSQL integration cho một bản compile rollback không đổi backend.

**Giới hạn có chủ ý:** rollback12D.2 vẫn có expiry2h/refreshcore3h cũ, không chứa fix SNTP13.4D. Nó là fallback điều khiển vật lý DISABLED với cấu hình mạng hiện tại, không phải bản sửa SNTP. Nếu cần quay về code cũ thì chấp nhận giới hạn này, giữ adapterngắt và backendkhóa; không nâng trust vì heartbeatONLINE.

Source staging/header/binary có secrets, được xác minh nằm trong build bị Gitignore; chỉ manifest không secrets/hash được ghi báo cáo, không commit/chia sẻ artifact. **ROLLBACK_PLAN_READY** ở mức source/config/build/hash. Kết nối thực, GPIO thực và readback sau flash vẫn NOT VERIFIED, phải nghiệm thu nếu về sau được phép nạp.

Kiểm tra kết thúc **06:22:08–09Z =13:22UTC+7**: PENDING0, haiON vật lý cũ không đổi; backendcontrolEnabledfalse/gatewayDISABLED, đúng PID3572 với startupflagsfalse/false/testtrue/cap1s. DeviceONLINE, OFF mới06:22:06.119Z; bốn readingsMQTT06:22:08.562Z có TEMP32.7/HUM70.5/SOIL26.49/LIGHT0. Không có lệnh ON/OFF từ agent hoặc reloaddịchvụ.

## 6. Gate tổng hợp và điểm dừng

| Gate yêu cầu | Kết quả |
| --- | --- |
| WIFI_CONFIG_VERIFIED | **USER CONFIRMED** — thay đổi có chủ ý và SSID/password hiện tại đúng theo người dùng; không phải live connection test của binary mới |
| BACKEND_SAFETY_PASS | **PASS** — false/false/testtrue/cap1s, APIlocked, PENDING0/count43 |
| BOARD_AND_COM_VERIFIED | **PASS cho preflight không-reset** — COM3/PnP đúng mapping board đã kiểm chứng lịch sử; chip handshake trước ghi vẫn bắt buộc ở phiên upload được duyệt |
| FIRMWARE_BINARY_VERIFIED | **PASS** — hash/version/sourceheaders/buildmanifest khớp |
| ROLLBACK_PLAN_READY | **PASS** — bản12D.2 DISABLED mới, khớp config hiện tại, compile/manifest/hash PASS; mạng thực chưa chạy thử |
| Adapterngắt / USBonly | **USER CONFIRMED** — xác nhận mới, không phải phép đo độc lập |
| READY_FOR_FLASH_APPROVAL | **ĐẠT ở mức preflight**, chờ phê duyệt nạp riêng |

Chỉ tạo staging/build mới theo phê duyệt compile rollback. Không sửa code/config chính hoặc password; không ghi đè artifact cũ. Không flash, mở SerialMonitor, EN/reset, bật command/automation, gửi ON/OFF, cấp adapter, thay ACL/broker/NTPWindows, migration hoặc đổi logic an toàn.

**Dừng ở READY_FOR_FLASH_APPROVAL.** Chờ **phê duyệt flash riêng** cho firmware SNTP13.4D ENABLED, không tự nạp bản chính hoặc rollback. Trước upload được duyệt phải kiểm tra lại trạng thái an toàn, đúng chip/COM trước ghi, hash/config không đổi và giữ adapterngắt. Nếu chip/config khác dự kiến thì STOP. Không dùng phê duyệt build hoặc thử bơm của phase cũ để bỏ qua gate này.
