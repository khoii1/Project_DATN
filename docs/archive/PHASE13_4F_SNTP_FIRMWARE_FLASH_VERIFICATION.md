# Phase 13.4F — SNTP firmware flash verification

> Tiếp nối13.4F.1: đã chuẩn bị hotfix source/host tests/compile13.4F.1, **chưa flash**. Thiết bị vẫn13.4D; kết quả FAIL phần cứng bên dưới vẫn giữ nguyên. Xem [báo cáo hotfix](PHASE13_4F1_CLOCK_CRITICAL_SECTION_HOTFIX.md).

## Kết quả cuối cập nhật sau khi người dùng báo “đã đóng” COM3

**Ngày21/10/2026: ghi firmware thành công nhưng nghiệm thu phần cứng FAIL vì firmware abort/reboot ngoài ý muốn. Đã dừng, không tự nạp rollback hoặc gửi lệnh bơm. Phần preflight cũ bên dưới chỉ là lịch sử trước upload, được thay thế bởi kết quả cuối này.** Timestamp dưới đây dùng UTC, giờ Việt Nam=UTC+7.

```text
FLASH_13_4D_PASS (WRITE_AND_VERIFY_ONLY)
FLASH_WRITE_ATTEMPTS=1/1
ESP32_BOOT_FAIL (INITIAL_BOOT_OK_THEN_ABORT_REBOOT)
TELEMETRY_AFTER_FLASH_PASS (OBSERVED_BATCHES_ONLY_NOT_STABILITY)
SNTP_INITIAL_SYNC_PASS
SNTP_PERIODIC_REFRESH_ON_DEVICE_NOT_YET_VERIFIED
SNTP_RECOVERY_ON_DEVICE_NOT_YET_VERIFIED
BROWSER_E2E_NOT_VERIFIED
FIRMWARE_HARDWARE_ACCEPTANCE_FAIL
WINDOWS_CLOCK_HEALTH_UNHEALTHY
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
ROLLBACK_NOT_PERFORMED
```

### Preflight và một lần flash đã thực hiện

Sau xác nhận đóng Serial Monitor/Plotter, mở độc quyền COM3 thành công rồi đóng cổng. Không kill Arduino IDE. Hash/config/safety trước ghi vẫn khớp approved build; không compile hoặc sửa firmware/config chính.

Chip handshake esptool exit0: **ESP32-D0WD-V3 revision3.1**, MAC20:50:0d:2b:27:98, COM3 CP210x. Backend PID3572 phục vụ5000 không restart; Commands=false, Automation=false, testMode=true/cap1s; API locked. SELECT READ ONLY06:37:17.081Z: PENDING0/tổng43. Adapter ngắt/USB only theo xác nhận13.4E, yêu cầu giữ nguyên suốt phiên; không có phép đo điện độc lập.

- Artifact: `build/esp32-phase13-4d-local/SmartAgricultureESP32.ino.bin`.
- SHA256: `441E33EE9B9B4064401819A2156CFBE59A3C898E495C80A689F048B1694EEE5D`.
- Core3.3.12/FQBNesp32:esp32:esp32/upload115200, version13.4D; ENABLE_PUMP_COMMANDS=true/MAX_PUMP_SECONDS5 không đổi.
- Bắt đầu upload **06:43:56.1014965Z**, kết thúc **06:45:02.2734282Z**, exit0.
- Tool esptool5.3.1; offsets chuẩn cùng build: bootloader0x1000, partitions0x8000, boot_app0xe000, application0x10000. Không erase-all/NVS hoặc đổi partition scheme.
- Application968016bytes; cả bốn vùng ghi đều `Hash of data verified.` Hash đúng chứng minh ghi đúng artifact, không chứng minh runtime an toàn.
- Dùng after=no-reset để mở Serial trước boot; pulse EN tự động RTS một lần lúc **06:45:02.4794866Z**, thuộc thao tác boot sau upload được phép.
- Capture Serial115200 đến **06:46:17.5008821Z**, đã đóng và giải phóng COM3.
- Một lượt ghi đã dùng hết **1/1**. Marker `build/phase13-4f-upload.attempt` chặn helper chạy lại. Log `build/phase13-4f-upload.log`; helper `build/phase13-4f-flash-once.ps1`.

### Serial và lỗi trên board

Log đầy đủ: `build/phase13-4f-serial.log`. Boot ban đầu báo version13.4D, GPIO26 LOW, PUMP_COMMANDS ENABLED, relayOFF, WiFi/MQTT CONNECTED, command subscriptionQoS1; `SNTP INIT interval_ms=1800000 expiry_ms=7200000 running=true`. Initial callback **06:45:18.444Z** thành công.

Mẫu#1 đo trước sync: SKIPPED_NTP_AT_MEASUREMENT, không có SENT#1 trong capture. Không gán timestamp mới để gửi lại mẫu cũ. Worker30s: callback_count1/age14405ms, clockRELIABLE/reasonOK. Worker60s: callback_count1/age44416ms, rồi:

```text
abort() was called at PC 0x4008329b on core 0
ELF file SHA256: e1a9d606c
Rebooting...
rst:0xc (SW_CPU_RESET)
```

ESP32 tự reboot ngoài ý muốn, không phải reset upload; boot13.4D lại, báo OFF và sync06:46:10.498Z. Vì vậy **ESP32_BOOT_FAIL**, dù boot ban đầu/sync hoạt động. Không có heap/stack watermark; không suy đoán stack overflow/WDT. SLOW_PUBACK293/295/334ms được thấy nhưng chưa chứng minh là nguyên nhân abort.

### Điểm lỗi và đề xuất sửa riêng

Giải mã đúng approved ELF bằng xtensa-esp32-elf-addr2line, log `build/phase13-4f-backtrace-decoded.log`:

```text
lock_acquire_generic -> _lock_acquire -> get_adjusted_boot_time
-> _gettimeofday_r -> gettimeofday
-> utcNow()                   SmartAgricultureESP32.ino:64
-> clockSnapshot(long long*)  SmartAgricultureESP32.ino:67
-> reliableClock()            SmartAgricultureESP32.ino:72
-> safetyTask(void*)          SmartAgricultureESP32.ino:95
```

Source tại dòng65–71 gọi utcNow/gettimeofday **bên trong portENTER_CRITICAL(clockMux)**. Đọc UTC sử dụng mutex newlib; khi mutex tranh chấp trong ngữ cảnh không thể yield/block, đường lock có thể abort. Backtrace thực tế đi đúng đường này. Host fake-clock tests không mô phỏng tương tác RTOS/libc.

Đối chiếu primary source [Espressif newlib locks](https://github.com/espressif/esp-idf/blob/v5.5.5/components/newlib/src/locks.c), [newlib time](https://github.com/espressif/esp-idf/blob/v5.5.5/components/newlib/src/time.c). Line numbers upstream có thể khác debug paths toolchain; căn cứ thiết bị là ELF/backtrace/source local. Chưa xác định task nào giữ mutex lúc abort.

**Đề xuất chưa triển khai:** lấy UTC có khả năng khóa ở ngoài critical section; thiết kế snapshot/generation vẫn nhất quán khi callback chạy đồng thời, tránh safetyTask chờ libc mutex trong critical section. Bổ sung lock-context regression và thử board sau build/hash/phê duyệt flash riêng. Không nới timestamp guard hoặc tắt bảo vệ. Phiên này chỉ duyệt fixed binary và yêu cầu STOP khi boot lỗi nên **không sửa firmware, không compile/flash lầnhai**.

### Bằng chứng telemetry PostgreSQL và API

SELECT READ ONLY **06:50:38.929Z** xác nhận cả12 SensorReading của ba batch Serial mới sau flash, deviceESP32-GF-A-01/sourceMQTT:

| recordedAt UTC | TEMP_01 | HUM_01 | LIGHT_01 | SOIL_01 | DB receivedAt |
| --- | ---: | ---: | ---: | ---: | --- |
|06:45:32.747Z|32.70|70.70|0.00|26.14|06:45:33.004Z|
|06:45:47.747Z|32.70|70.80|0.00|26.19|06:45:48.179Z|
|06:46:02.747Z|32.70|70.80|0.00|25.64|06:46:02.990Z|

SOIL readingIds lần lượt `cmvhqzwss0169umr8xn9ujqwb`, `cmvhr08ib016dumr8yu949ytp`, `cmvhr0jxq016humr81f9jdpwg`. Log12hàng `build/phase13-4f-db-readonly.log`; LIGHT0 là giá trị hợp lệ.

Probe GET/read-only hiện có dùng output riêng13.4F, không sửa service hoặc gửi command, exit0. `report/phase13_4f/live-evidence.json` chứa ba snapshot API/provenance và đối chiếu PostgreSQL cho ba batch khác sau tự reboot:

| API checkedAt | reading recordedAt | SOIL | OFF recordedAt/reason |
| --- | --- | ---: | --- |
|06:46:53.412Z|06:46:38.340Z|26.29|06:46:43.644Z/PERIODIC|
|06:47:08.463Z|06:46:53.340Z|26.54|06:46:58.815Z/PERIODIC|
|06:47:27.849Z|06:47:23.340Z|26.74|06:47:13.990Z/PERIODIC|

Probe đối chiếu đủ bốn sensor/batch nguồnMQTT, DB/API correlation. Chỉ PASS ingestion tại thời điểm quan sát, **không phủ nhận reboot hoặc chứng minh ổn định liên tục**.

Ba OFF trên mới hơn flash/boot, topic actuator/state đúngdevice/actuator, QoS1/retain=false/dup=false, backend commit observed và DB/API khớp. Không dùng OFF cũ hoặc sửa DB. Observer thực tế vẫn generation1/session `backend-observer:97ade4d7-a7d8-43d4-becf-cb78877a606d`/started04:10:04.992Z vì backend không restart/reconnect. **Không bịa generation2**; backend observer session không phải ESP32 boot identity. Firmware chưa có boot session xác thực; publisher identity vẫn NOT_VERIFIED, không cấp VERIFIED_LIVE.

### Safety cuối phiên, website và các phần chưa nghiệm thu

- Commands=false/Automation=false/testMode=true/cap1s trong cùng backend process và probe; không thay flags/reload.
- SELECT cuối06:50:38.929Z: PENDING0/tổng43, bằng baseline, không tạo command.
- API06:50:39.975Z: controlEnabled=false/gatewayMode=DISABLED, ONLINE, OFF/stateAt06:50:25.504Z; readingsMQTT06:50:35.226Z TEMP32.7/HUM69.5/SOIL26.59/LIGHT0. Đây là snapshot sau tự reboot, không phải chứng minh hết lỗi.
- Clock adapter **UNHEALTHY/WINDOWS_TIME_UNSYNCHRONIZED/LastSyncError2**, source time.windows.com,0x8. Offset~79.54ms rồi−37.26ms không biến clock thành HEALTHY. Không sửa/resync Windows Time.
- Skill browser đã thử nhưng in-app browser unavailable. Sau abort dừng nghiệm thu, không chạy browser fallback. **Browser E2E NOT_VERIFIED**, không thay bằng API PASS.
- Refresh30phút/expiry recovery trên board: **NOT_YET_VERIFIED**; không chờ dài hoặc tự reset để che crash.
- Các24 SNTP host tests/408 backend regression PASS ở13.4D là lịch sử offline, không thay hardware FAIL; không chạy lại toàn bộ để hợp thức hóa firmware.
- Adapter phải tiếp tục ngắt theo xác nhận người dùng; không cấp nguồn, ON/OFF, đổi dây, broker/ACL, migration, firmware source hoặc service restart.

**Điểm dừng: firmware13.4D đã ghi vẫn ở ESP32; chưa rollback. Không tuyên bố thiết bị đã trở lại firmware an toàn cũ.** Người dùng cần quyết định riêng giữa nạp rollback DISABLED hoặc triển khai sửa lỗi/build mới rồi phê duyệt flash riêng.

Rollback dự phòng: `build/esp32-phase13-4e-disabled/SmartAgricultureESP32.ino.bin`, SHA256 `B30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88`. Dùng mạng hiện tại và physical commands=false, nhưng source12D.2 còn giới hạnSNTP3h/2h; không phải fix SNTP hoàn thiện. Không tự nạp hoặc chia sẻ binary chứa secrets.

---

## Lịch sử preflight trước khi COM3 được giải phóng — không phải trạng thái cuối

Ngày **21/10/2026, UTC+7**. Preflight lúc khoảng13:36–13:38.

```text
FLASH_13_4D_NOT_VERIFIED — NOT_ATTEMPTED
FLASH_WRITE_ATTEMPTS=0/1
PREFLIGHT_BLOCKED_COM3_ACCESS_DENIED
ESP32_BOOT_NOT_VERIFIED_FOR_13_4D
TELEMETRY_AFTER_FLASH_NOT_VERIFIED
SNTP_INITIAL_SYNC_NOT_VERIFIED_FOR_13_4D
SNTP_PERIODIC_REFRESH_ON_DEVICE_NOT_YET_VERIFIED
SNTP_EXPIRY_RECOVERY_ON_DEVICE_NOT_YET_VERIFIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

## 1. Phê duyệt và điểm dừng hiện tại

Yêu cầu Phase13.4F trong attachment ghi rõ phê duyệt flash13.4D một lần lên đúng ESP32 COM3, cho phép reset tự động cần thiết cho handshake/upload. Không cần xin lại phê duyệt cùng thao tác. Không bao gồm commandON/OFF, cấp nguồn bơm, bật flags, đổi broker/ACL/DB hoặc tự flash rollback/lần thứhai.

**Chưa upload:** COM3 mở độc quyền thất bại, lỗi gốc `UnauthorizedAccessException: Access to the port 'COM3' is denied.` Đã dừng trước chip handshake/ghi flash. Có thể Serial Monitor/Plotter hoặc process khác giữ cổng; chưa xác định process giữ handle bằng chứng trực tiếp, không tự kill/đóng ArduinoIDE.

Đã yêu cầu người dùng đóng Serial Monitor/Serial Plotter COM3 rồi báo “đã đóng”, giữ USB và adapterbơm ngắt, không nhấnEN. Phê duyệt flash vẫn còn, số lần ghi0/1. Sau phối hợp phải kiểm tra lại preflight/cổng/chip rồi mới dùng một lần upload; nếu chưa giải phóng được cổng thì không tiếp tục.

## 2. Kết quả preflight

| Điều kiện | Kết quả / bằng chứng |
| --- | --- |
| Adapter5V ngắt, ESP32USBonly | USER_CONFIRMED ở phiên13.4E và yêu cầu duy trì suốt phiên; không có phép đo nguồn độc lập |
| Backend đúng process | PID3572 phục vụ5000, startup log gắnPID3572; không restart |
| Commands/Automation | false/false theo runtime cùng process và APIlocked |
| TestMode/cap | true/effectiveMaxRunSeconds1 tại runtime log của process3572 |
| PENDING / tổngcommand | SELECT READONLY06:37:17.081Z:0/43, không đổi baseline |
| Device/API trướcflash | ONLINE/OFF, controlEnabledfalse, gatewayDISABLED |
| COMmapping | COM3 CP210x USB UART, `USB\VID_10C4&PID_EA60\0001`; khớp lịch sử |
| COM3 có thể mở độc quyền | **FAIL — Access denied** |
| Chip handshake ESP32-D0WD-V3 rev3.1 | NOT RUN, phải làm trướcghi; PnPUSBbridge không thay chipID |
| Binary13.4D | HashPASS, đúng path/userapproved |
| Configbuild hiện tại | configlocal khớp artifact13.4D; safetyheaders khớp |
| RollbackDISABLED | Cófile/hash/manifest đúng, không được tựnạp |

Kiểm tra cổng dùng System.IO.Ports.SerialPort với DTR=false/RTS=false trước Open; không gửi dữ liệu/reset, luôn Dispose. Lượt đầu nhận wrapperMethodInvocationException, kiểm tra lỗi gốc lần sau xác nhậnAccessDenied. Không có upload retry hoặc reset thủ công. Không mở được cổng nên không coi kiểmtra quyền truy cập làPASS chỉ vì PnP hiển thịCOM3.

## 3. Artifact được phép

```text
build/esp32-phase13-4d-local/SmartAgricultureESP32.ino.bin
SHA256 441E33EE9B9B4064401819A2156CFBE59A3C898E495C80A689F048B1694EEE5D
```

FQBNesp32:esp32:esp32, Core3.3.12, uploadspeed115200, sourceversion13.4D, SNTPinterval1800000ms/expiry7200000ms, ENABLE_PUMP_COMMANDS=true/MAX_PUMP_SECONDS5. Không compile lại, không dùngexample hoặc thayconfig chính.

Đã đối chiếu normalizedconfiglocal với headerstrongapprovedbuild và các file SntpRecovery/PumpProtocol/FirmwareDiagnostics/OffStateSchedule: khớp. Credentials không được in; Wi-Fi đúng theo xác nhận13.4E. Không đọc/chia sẻ binary chứasecrets.

Rollback chỉ dựphòng:

```text
build/esp32-phase13-4e-disabled/SmartAgricultureESP32.ino.bin
SHA256 B30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88
```

ManifestcompileDISABLED/currentconfig được giữ nguyên. Firmware12D.2 này vẫn có giới hạnSNTPcũ, không phải fix13.4D và **không được tựflash rollback** theo approvalhiện tại.

## 4. Công cụ và upload chưa thực hiện

Đã đọc `arduino-cli upload --help`: upload không compile sketch; hỗ trợ `--input-dir`, `--upload-property`, COM/FQBN. Đã đọc `esptool.exe --help` của version5.3.1 trong Arduino toolchain: hỗ trợ `chip-id`,115200, beforedefault-reset/afterno-reset/hard-reset và verifyflash. Chưa chạy lệnh esptool nào mở thiết bị.

Sau khi cổng rảnh và các gate cònPASS, cần chipidentity handshake trước mọi ghi, so ESP32-D0WD-V3 revision3.1 vớiCOM3. Nếu sai thìSTOP. Uploadchỉapprovedbuild, không erase toàn bộNVS, không đổi partitionscheme và khôngfallback artifact. Logphải ghi exitcode và verifyhashsaughi. Nếu lỗi không retry hoặc tựnạp rollback.

## 5. Telemetry hiện tại — KHÔNG PHẢI sauflash

GET lúc **06:36:52.401Z (13:36:52UTC+7)**: DeviceONLINE, relayOFF/stateAt06:36:45.703Z, lastSeen06:36:45.922Z; controlEnabledfalse/gatewayDISABLED.

ReadingsMQTT recordedAt06:36:38.562Z: TEMP32.7/HUM71.1/SOIL25.89/LIGHT0. Đây là firmwarecũ vẫn hoạt động sau tựđồngbộ, **không phải bằngchứng firmware13.4D đã boot**. Không dùng chúng làm telemetryafterflash, initialsync13.4D hoặc OFFmới của session sauupload.

ChưaSerialpostboot, chưa2–3batch sauflash, chưaPERIODICOFFsauflash, chưawebsite verification. Không bịa epoch/generation mới: backendobserver chỉ đổi khi chínhbackendMQTTreset, deviceboot không tựđổi observergeneration; về sau phải ghi cả observercontextthực và timestamp sauflash, không gọi observer làESP32bootidentity.

## 6. Nghiệm thu còn phải thực hiện sau upload được phép

- Serial115200 không giữDTR/RTSreset: firmware13.4D, interval1800000/expiry7200000, callbackthànhcông, reasonOK, WiFi/MQTTconnected, PUMP_COMMANDSENABLED, GPIOOFF.
- Kiểmtra workerlog30s/callbackage/retry và dấuhiệuWDT/reboot; heap/stack nếu códiagnostics, không suy đoánPASS khi không cósốđo.
- Đốichiếu2–3chu kỳ4sensor Serial/MQTT/SELECT/API vàwebsite, timestampsmới, sourceMQTT/readingIdcorrelation; mẫuđo unsynced không timestamp lạisaucallback.
- Ítnhất2–3PERIODICOFFmới, QoS1/nonretained/nondup, đúngdevice/actuator vàobservercontextthực; DB/APIkhớp. Không épOFFDB hoặc dùng trạngthái trướcflash.
- Nếu chưaquan sát refresh30phút/expiryrecoverythật, giữ NOT_YET_VERIFIED. Host24tests làbằngchứngoffline, khôngthaycallbackrecoverytrênboard.
- Cuối phiên xácminhfalse/false/testtrue,PENDING0/commandcountkhôngđổi, ESP32ONLINE/readingsmới/OFFmới, adaptertiếptụcngắt. Không gửiON/OFF từAgent hoặcwebsite.

**Điểm dừng hiện tại:** chờ người dùng giải phóngCOM3; chưa flash, chưa cần tự rollback. Không có thao tác tácđộng bơm hoặc cấu hìnhproduction.
