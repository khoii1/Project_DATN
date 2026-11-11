# Phase13.4F.2 — Hotfix flash verification

## Kết luận cuối — RETRY CONTROLLED được phê duyệt riêng, PASS ngắn hạn

Ngày21/10/2026. **Phiên mới đã nạp đúng13.4F.1 thành công, theo dõi260.05giây không crash, đối chiếu12/12readings và3PERIODICOFF mới.** Phần phiên thất bại ở dưới được giữ nguyên làm lịch sử, không phải trạng thái hiện tại. Timestamp phần này dùng UTC; giờ Việt Nam=UTC+7.

```text
FLASH_13_4F1_PASS
ESP32_BOOT_PASS
SHORT_ON_DEVICE_STABILITY_PASS
TELEMETRY_AFTER_FLASH_PASS (12/12 correlated readings)
SNTP_INITIAL_SYNC_PASS
SNTP_PERIODIC_REFRESH_NOT_YET_VERIFIED
SNTP_RECOVERY_NOT_YET_VERIFIED
LONG_TERM_STABILITY_NOT_VERIFIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
ROLLBACK_NOT_PERFORMED
VERIFIED_LIVE_NOT_ENABLED
```

### 1. Phê duyệt mới và khắc phục wrapper

Người dùng phê duyệt **MỘT PHIÊN MỚI** trong yêu cầu RETRY CONTROLLED HOTFIX FLASH, giữ adapter ngắt/USB only theo xác nhận trước đó và không có chỉ dẫn thay đổi. Không xin lại đúng phê duyệt này. Không nhấn reset thủ công, đổi config hoặc cấp nguồn bơm.

Wrapper mới `build/phase13-4f2-native-wrapper.ps1` dùng .NET ProcessStartInfo, UseShellExecutefalse, redirectstdout/stderr và ReadToEndAsync cho cả hai stream trước WaitForExit; thu ExitCode trực tiếp. Không dùng PowerShell2>&1 để biến native stderr thành terminating error khi ErrorActionPreferenceStop. Dispose process sau thu log.

Offline fixture `build/phase13-4f2-native-fixture.cjs` in stdout/stderr riêng, exit7: **PASS thu đủ hai stream và đúng exit7 khi ErrorActionPreferenceStop**, không mở COM. Log `build/phase13-4f2-retry1-offline-wrapper.*`.

Lỗi thu log PowerShell đã được khắc phục trong wrapper và phiên thực tế. **Thông báo gốc/exitcode esptool của phiên cũ vẫn không khôi phục được**, không diễn giải thành chip/driver hỏng hoặc khẳng định native process cũ exit0. Phiên mới chip/upload đều exit0; stderr logs tồn tại, rỗng, không bị mất vì exception.

Giữ marker cũ `build/phase13-4f2-upload.attempt`, helper cũ và báo cáo lỗi. Marker riêng mới `build/phase13-4f2-retry1-session.attempt` dùng CreateNew; không xóa marker cũ hoặc chạy lại phiên cũ. Trong phiên mới **1 lệnh chip-id,1 lệnh write-flash**; tool write-flash tự kết nối theo quy trình chuẩn. Không retry handshake/write hoặc rollback. Phiên cũ0applicationwrite; phiên mới1applicationwrite.

### 2. Preflight trước handshake

- WindowsWiFi172.20.10.2; MosquittoLAN1883PID13960 do người dùng vừa khởi động lại, listenerLAN hoạt động. BackendPID3572 có ESTABLISHED tới172.20.10.2:1883. Agent không restart broker/backend hoặc sửa listener/ACL/firewall.
- API runtime commandsfalse/automationfalse/testModetrue; cùng process backend đã ghi effectiveMaxRunSeconds1 trong startup log; PENDING0/tổng43, controlEnabledfalse/gatewayDISABLED.
- ESP32 trước handshake **OFFLINE**, lastSeen10:10:57.535Z. COM3 CP210x đúngUSB VID10C4/PIDEA60/0001; mở độc quyền thành công. Đọc thụ động3giây vớiDTR/RTSfalse không có bytes, nên **không xác định được trước handshake là ROMbootloader hay ứng dụng**. Không suy diễn chỉ từ OFFLINE.
- Hash application/source/ELF/bootloader/partition/rollback khớp manifest. Config artifact khớp local và baseline đã xác minh; không compile lại hoặc đổi credentials/GPIO/safety settings.
- Preflight mới được lưu `build/phase13-4f2-retry1-precheck.json`; không dùng OFF cũ làm bằng chứng nghiệm thu sau flash.

### 3. Chip identity và flash

Chip-id native exit0: **ESP32-D0WD-V3 revisionv3.1**, MAC20:50:0d:2b:27:98, COM3,115200; khớp board đã duyệt. Cảnh báo “no chip ID” chỉ cho biết tool dùng MAC thay chipID, không phải identity mismatch.

```text
Firmware13.4F.1
build/esp32-phase13-4f1-hotfix/SmartAgricultureESP32.ino.bin
SHA256 D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A
Core3.3.12 / FQBNesp32:esp32:esp32 / upload115200
```

| Mốc UTC | Thời điểm |
| --- | --- |
|Sessionstart|10:48:00.2415361Z|
|Uploadstart|10:48:03.1569281Z|
|Uploadend, exit0|10:49:09.1899529Z|
|Automatic bootpulse sau nạp|10:49:09.4297657Z|
|InitialSNTPsync|10:49:11.806Z|
|Captureend/Serialclosed|10:53:29.4991686Z|

Ghi bootloader0x1000/partition0x8000/boot_app0xe000/application0x10000 từ đúngbuild, giữ flashmode/frequency/size. Application968576bytes. **Cả bốn vùng `Hash of data verified.`**, không erase-all/NVS/đổi partition scheme. Chỉ reset tự động cho handshake/upload/boot; không reset bổ sung để che lỗi.

Logs riêng `build/phase13-4f2-retry1-chip.stdout.log`, `.stderr.log`, `.exit-code.txt`; cùng bộ tên `...-upload.*`. Structuredexecution `build/phase13-4f2-retry1-execution.json`, runner `build/phase13-4f2-retry-controlled.ps1`. Không sửa source firmware trong retry. Manifest13.4F.1 giữ nguyên là snapshot **lúc compile, trước flash**; kết quả flash hiện tại nằm ở execution/báo cáo này.

### 4. Boot, Serial và stability

Log `build/phase13-4f2-retry1-serial.log`:

```text
BOOT: GPIO26 LOW requested; physical pump commands ENABLED
DEVICE: ... ESP32-GF-A-01 | firmware 13.4F.1
RELAY: OFF (GPIO only; not relay/motor/flow feedback)
SNTP INIT: interval_ms=1800000 expiry_ms=7200000 running=true
NTP: SYNCED | UTC=2026-10-21T10:49:11.806Z
WiFi CONNECTED / MQTT CONNECTED (command QoS1 subscription ready)
```

Đo capture bằng Stopwatch **260.05giây**, khoảng**257.67giây sau initialsync** (xấp xỉ do so UTC với bootstampWindows). Chỉ1BOOT và1resetPOWERON thuộc boot sau upload; **0abort/Guru/watchdog/SW_CPU_RESET/reboot ngoài ý muốn**. Vượt mốc lỗi cũ~60s.17batch được Serial báoSENT, nhưng chỉ12readings chọn dưới đây được đối chiếu đầy đủ để cấpPASS; không mặc định tất cả68hàng đã được kiểm tra.

8worker snapshots tại millis30207/60218/90229/120240/150251/180262/210273/240287 đều runningtrue/interval1800000/clockRELIABLE/reasonOK, callback_count1, last_callback_age tăng27882→237962ms. Không thấy recoveryrestart storm. Syncgeneration nội bộ không được in trực tiếp trong log: không gán backendobservergeneration cho nó.

Không có heap/stack watermark hoặc heartbeat/latency độc lập của safetyTask trong firmware hiện tại: **NOT_VERIFIED** cho các phép đo này. Worker/telemetry tiến triển/noabort là bằng chứng gián tiếp, không chứng minh mọi deadline fail-safe. Không gửiON để đo safetyTask hoặc MAX_RUNTIME.

Cảnh báo mạng: một PUBACK538ms, cùng các cảnh báo208/224/204/222/202/240/203ms; lease250ms không thay. Không có pumpON để kiểm chứng fail-safe khi PUBACK chậm. Không kết luận cảnh báo này là crash hoặc bỏ qua rủi ro latency. Không đồng nhất GPIOOFF với phép đo động cơ/nước.

### 5. Serial → MQTT → PostgreSQL → API:12/12

Probe chỉ normal-auth/GET và SELECT READ ONLY; không tạoDeviceCommand/readinggiả. `build/phase13-4f2-retry1-verify.cjs` exit0. Bằng chứng `report/phase13_4f2_retry1/evidence.json` lưu Serialvalues, bốnAPIlatestreadings,12DBrows/ids/source/recordedAt/receivedAt vàliveobserver cùngsnapshot.

| recordedAt UTC | TEMP_01 | HUM_01 | LIGHT_01 | SOIL_01 | DBreceivedAt |
| --- | ---: | ---: | ---: | ---: | --- |
|10:49:24.588Z|31.00|62.60|2.50|25.24|10:49:25.072Z|
|10:49:54.588Z|31.10|62.30|2.50|25.44|10:49:55.069Z|
|10:50:09.588Z|31.10|62.20|2.50|25.09|10:50:09.951Z|

Ba batch tương ứng Serial#1/#3/#4, mỗi batch đủTEMP/HUM/LIGHT/SOIL đúngdevice, sourceMQTT, timestamp/value khớp API vàDB, đều sau flash/initialsync. Tất cả17samples quan sát có TIME_AT_SAMPLE SYNCED; không thấy mẫu invalid bị timestamp lại. **Không có tình huống recovery từ sampleinvalid trên thiết bị trong cửa sổ này**, nên không cấpPASS cho negativecase đó chỉ từ absence.

### 6. Ba PERIODIC OFF mới

| OFFrecordedAt UTC | CallbackreceivedAt | QoS/retain/dup |
| --- | --- | --- |
|10:49:29.689Z|10:49:30.086Z|1/false/false|
|10:49:44.861Z|10:49:45.237Z|1/false/false|
|10:50:15.272Z|10:50:15.651Z|1/false/false|

Topic actuator/state đúngESP32-GF-A-01/PUMP_01, stateOFF/reasonPERIODIC; observer ghi nhận commit vàDB/APIstate/timestamp khớp tại từng snapshot. Không dùng OFF trướcflash hoặc épDB.

Observer thực tế generation6/session `backend-observer:a919da14-3381-4540-9ad6-1fe02e467ac9`, sessionKindBACKEND_OBSERVER. Đây là session backend sau brokerreconnect, **không phải authenticated ESP32bootsession**. Publisher identity assurance vẫn NOT_VERIFIED. Không tự cấpVERIFIED_LIVE/ACTIVE hoặc nâng trust từ payload.

### 7. Safety cuối phiên

- Finalread-only **10:53:49.711Z**, `build/phase13-4f2-retry1-final-precheck.json`: commandsfalse/automationfalse/testtrue, PENDING0/tổng43 không đổi, ONLINE, PERIODIC OFFmới10:53:47.231Z, clockHEALTHY ngắn hạn.
- GET10:53:33.019Z: gatewayDISABLED/controlEnabledfalse; readingsMQTT10:53:24.588Z TEMP31.1/HUM62.4/SOIL25.39/LIGHT2.5. Không commandON/OFF mới.
- Serialclosed=true sau capture, COM3 được giải phóng; không mở lại để tạo reset.
- Adapter bơm tiếp tục ngắt theo xác nhận người dùng và yêu cầu duy trì; không có phép đo nguồn độc lập. Không cấp nguồn/thử bơm/thay dây hoặcGPIO. ENABLE_PUMP_COMMANDStrue trong firmware không phải quyền bậtbackend/cấpnguồn.
- Không restart backend/broker, sửaWindowsTime/ACL/credentials/PGschema hoặc chạy migration/seed/simulator. Brokerrestart trước phiên là người dùng thực hiện, không phải agent.

### 8. Secrets và giới hạn còn lại

Scanner cuối269tracked/67docs-report/24build-log files: không có candidate literal của mật khẩu hiện tại trong phạm vi kiểm tra; không thể chứng minh sạch mọiencoding/secret. Sự cốtool-output13.4F.1 vẫn là phơi lộ đã biết, không tái in giá trị. Config/headers/binary chỉgiữcục bộ ngoàiGit, không chia sẻ. Không đổicredentials trongflashsession. Phiên riêng tiếp theo nên rotateWiFi/MQTTcredentials liên quan và xác minh backend/device/broker; nếuconfigđổi phải build/hash/phêduyệtflash mới, không tái dùng hashcũ.

Chưa nghiệm thu: SNTPrefresh30phút thực tế, recovery sauSNTPfailure, ổn định dài hạn, heap/stack/safetyTasklatency trực tiếp, publisheridentity vàbrowserE2E. Không tạooutage để ép kiểmtra, không nới guards hoặc khẳng định fix vĩnh viễn chỉ từ260s.

RollbackDISABLED12D.2hashB30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88 vẫn tồn tại ởbuild13.4E, **không nạp**; còn giới hạnSNTPcũ3h/2h và cần phêduyệt riêng nếu dùng. Không tạo thêm phiênflash.

**Điểm dừng:** retryđã hoàn tất/PASSngắn hạn, adapterngắt/backendkhóa. Không tự chuyển sang thửbơm hoặcautomation. Tổng hợp kiểmchứng `report/phase13_4f2_retry1/summary.json`.

---

## Lịch sử phiên cũ trước phê duyệt RETRY — không phải trạng thái cuối

## Kết quả cuối sau xác nhận phần cứng — phiên đã dừng

Người dùng trả lời **“toi xac nhan”** cho adapter5V vẫn rút điện/ESP32USB. Phê duyệt một phiên nạp được sử dụng để bắt đầu preflight và handshake; **chưa gọi write-flash, chưa ghi hotfix**. Không tự thử lại handshake/upload hoặc rollback.

```text
FLASH_13_4F1_FAIL (SESSION_STOPPED_BEFORE_WRITE)
APPLICATION_WRITE_ATTEMPTS=0
CHIP_HANDSHAKE_ATTEMPTS=1
CHIP_IDENTITY_NOT_VERIFIED_THIS_SESSION
ESP32_BOOT_HOTFIX_NOT_VERIFIED
SHORT_ON_DEVICE_STABILITY_NOT_VERIFIED
TELEMETRY_AFTER_FLASH_NOT_VERIFIED
SNTP_INITIAL_SYNC_HOTFIX_NOT_VERIFIED
SNTP_PERIODIC_REFRESH_NOT_YET_VERIFIED
SNTP_RECOVERY_NOT_YET_VERIFIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
ROLLBACK_NOT_PERFORMED
```

### Thao tác thực tế và lỗi

1. Refresh preflight **10:11:04.536Z (17:11:04 UTC+7)**: artifact/config/rollback đúng, commandsfalse/automationfalse/testtrue, PENDING0/tổng43, ONLINE, fresh PERIODIC OFF10:10:57.139Z. COM3 mở độc quyền thành công vớiDTR/RTSfalse rồi đóng.
2. Chạy đúng helper `build/phase13-4f2-flash-once.ps1 -HardwareConfirmed`. Helper tạo marker `build/phase13-4f2-upload.attempt` bằng CreateNew **trước handshake** để chặn thử lại, không phải bằng chứng đã ghi flash.
3. Esptool được gọi `--chip auto --port COM3 --baud115200 --before default-reset --after no-reset --no-stub --connect-attempts1 chip-id`. Đây là handshake có thể tự reset như phạm vi được phép, không phải lệnh ghi application.
4. PowerShell dừng tại dòng14 (`$identity=& $tool ... 2>&1`), báo **NativeCommandError/RemoteException**, process tổng exit1. Với ErrorActionPreference=Stop, native stderr đã thành terminating error trước khi helper lưu identity/exitcode. **Không thu được thông báo gốc đầy đủ hoặc exitcode esptool**, nên chưa đủ bằng chứng nói chip sai, COM bị chiếm, driver lỗi hay chip đã handshake thành công.
5. Không có `phase13-4f2-chip.log`, `phase13-4f2-upload.log`, `phase13-4f2-execution.json` hoặc Serial capture. Script chưa tới write-flash, chưa automatic post-upload boot pulse. Không coi marker tồn tại là upload đã diễn ra.
6. Đã STOP đúng điều kiện handshake failure, không chạy lại esptool, mở Serial, tự reset/EN, nạp rollback hoặc gửi command. Kiểm tra read-only sau đó không thấy esptool process còn chạy; không có Serial Monitor do agent giữ.

### Hệ thống sau khi dừng

GET **10:11:49.732Z**: ESP32 **OFFLINE**, relay **UNKNOWN**, controlEnabled=false/gatewayMode=DISABLED, lastSeen10:10:57.535Z. Bốn readingsMQTT cuối10:10:51.106Z TEMP29.6/HUM53.1/SOIL22.18/LIGHT0 là **trước handshake**, không phải dữ liệu hotfix.

Precheck read-only **10:11:55.431Z**, `build/phase13-4f2-precheck.json`: commandsfalse/automationfalse/testtrue, PENDING0/tổng43, nofreshOFF, clockHEALTHY ngắn hạn; backend5000PID3572 vàMosquittoLAN1883PID1340 vẫn listen. Không thay backend/broker/PG/WindowsTime. Không épOFFdatabase.

OFFLINE có thể liên quan reset/ROM download mode của handshake đã bị ngắt, nhưng **chưa xác minh bằng Serial**, không khẳng định nguyên nhân. Flash lưu trữ chưa được thay bởi hotfix; không khẳng định firmware13.4D đang chạy bình thường, cũng không khẳng định board đã hỏng. Không có dữ liệu3–5phút hoặc12readings/3OFF sau flash để nghiệm thu.

### Bước cần phối hợp riêng

Giữ adapter bơm rút điện và backend khóa. Cần một phiên được cho phép riêng để sửa wrapper thu stdout/stderr và kiểm tra native exitcode mà không bị PowerShell NativeCommandError cắt mất log, rồi handshake/ghi hotfix đúnghash tối đa một lần. **Chưa thực hiện sửa/chạy lại hoặc rollback**. Không xóa marker để tự vượt giới hạn phiên cũ. Khi được duyệt tiếp phải refresh gates và cấu hình; không mặc định các điều kiện cũ vẫn còn hiệu lực.

Hash hotfix/rollback vẫn như dưới; không compile lại hoặc đổicredentials. Quét cuối269tracked/65docs-report/14build-log files không thấy candidate literal của mật khẩu hiện tại theo scanner; vẫn không phủ nhận sự cố output13.4F.1 hoặc đảm bảo sạch mọi encoding. Kế hoạch rotatecredentials riêng vẫn cần thực hiện sau khi phối hợp, không in giá trị.

---

## Lịch sử chuẩn bị trước khi người dùng xác nhận — không phải trạng thái cuối

Ngày21/10/2026, UTC+7. **Trạng thái hiện tại: CHƯA FLASH, chờ xác nhận nguồn phần cứng ngay trước ghi.** Người dùng đã phê duyệt một lượt nạp13.4F.1; không xin lại phê duyệt flash. Chỉ cần xác nhận adapter5V vẫn rút điện/ESP32USB theo yêu cầu preflight.

```text
FLASH_NOT_PERFORMED
WRITE_ATTEMPTS=0/1
PREFLIGHT_WAITING_HARDWARE_CONFIRMATION
ESP32_BOOT_HOTFIX_NOT_VERIFIED
SHORT_ON_DEVICE_STABILITY_NOT_VERIFIED
SNTP_PERIODIC_REFRESH_NOT_YET_VERIFIED
SNTP_RECOVERY_NOT_YET_VERIFIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

## Preflight đã kiểm tra

Read-only09:36:56–57Z (16:36UTC+7), `build/phase13-4f2-precheck.json`:

- Application hash đúng `D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A`; path `build/esp32-phase13-4f1-hotfix/SmartAgricultureESP32.ino.bin`, version13.4F.1, Core3.3.12/FQBNesp32:esp32:esp32/upload115200. Manifest/source/ELF/bootloader/partition hashes khớp.
- Config hiện tại khớp build13.4F.1 và config đã xác minh13.4D sau chuẩn hóa Arduino#line; không thay config hoặc compile lại.
- RollbackDISABLED hash `B30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88` đúng, chưa được phép tự nạp.
- Backend5000PID3572, cùng process đang phục vụ; startup log `build/phase13-4a/backend-final.out.log` ghi testModetrue/effectiveMaxRunSeconds1/commandsfalse/automationfalse. API runtime hiện tại xác nhận false/false/testtrue; gatewayDISABLED/controlEnabledfalse.
- SELECT READ ONLY: PENDING0, tổngDeviceCommand43, không command mới bất thường.
- MosquittoLAN1883PID1340 vẫn listen; có MQTT telemetry/OFF mới. PostgreSQL5432PID7848 giữ nguyên, không restart.
- DeviceONLINE, bốn sensorMQTT recordedAt09:36:42.110Z TEMP26.1/HUM48.8/SOIL21.88/LIGHT0; PERIODIC OFF09:36:47.295Z. Đây là runtime13.4D trước flash, **không phải nghiệm thu hotfix**.
- COM3 CP210x `USB\VID_10C4&PID_EA60\0001`, mở độc quyền vớiDTR/RTSfalse thành công rồi đóng; chưa handshake/reset/ghi. Chip thực tế sẽ được xác minh bằng esptool sau khi đủ gate.

## Secrets follow-up

Không tái in secrets. Scanner so mật khẩu hiện tại trong bộ nhớ với các literal có quote/password label:269tracked files,64docs/report text artifacts,14localbuild logs; **không có candidate match trong phạm vi scanner**. Không chứng minh sạch mọi secret hoặc mọi encoding/định dạng. Sự cố assertion tool-output ở13.4F.1 vẫn là phơi lộ đã biết, không được xóa bỏ bằng scan này.

Config/binary/header build chứa secrets theo thiết kế, chỉ giữ cục bộ/ngoàiGit, không chia sẻ. Không đổi credentials trong phiên flash. Sau nghiệm thu cần phiên riêng để rotate credentials bị lộ, kiểm tra broker/device/backend liên quan và build lại nếu config thay đổi; không dùng approved hash hiện tại nếu config phải đổi.

## Điểm dừng và bước tiếp theo

Đã hỏi người dùng xác nhận **ngay lúc này adapter5V vẫn rút điện, ESP32 chỉ cấpUSB**, giữ nguyên suốt phiên và COM3 rảnh. Chưa nhận xác nhận mới tại thời điểm ghi bản này, nên **không thực hiện handshake/flash**.

Helper một-lần `build/phase13-4f2-flash-once.ps1` đã chuẩn bị, chưa chạy. Sau phối hợp phải refresh gates, xác minh chip rồi mới ghi đúng artifact một lần; mọi lỗi phảiSTOP, không retry/rollback. Sau nạp captureSerial khoảng260s, dừng nếuabort/Guru/WDT/SWreset; đối chiếu ít nhất12readings và3PERIODICOFF mới quaobserver/PG/API. Mốc30phút/expiry recovery vẫn NOT_YET_VERIFIED nếu chưa quan sát. ĐóngSerial sau kiểmtra. Không gửiON/OFF hoặc cấpnguồnbơm.
