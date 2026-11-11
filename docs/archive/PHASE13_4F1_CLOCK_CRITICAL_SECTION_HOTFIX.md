# Phase13.4F.1 — Clock critical-section hotfix

Ngày21/10/2026, UTC+7. Phạm vi: sửa source, host tests, compile và chuẩn bị artifact; **không flash/reset/mở COM3**. ESP32 thật vẫn chạy binary13.4D có lỗi đã ghi ở13.4F, chưa phải hotfix.

```text
CRITICAL_SECTION_FIX_READY (SOURCE_AND_HOST_REVIEW_ONLY)
HOST_TESTS_PASS
FIRMWARE_COMPILE_PASS
FLASH_NOT_PERFORMED
ON_DEVICE_STABILITY_NOT_VERIFIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
VERIFIED_LIVE_NOT_READY
```

## 1. Nguyên nhân và thay đổi

Backtrace đã capture ở13.4F: `lock_acquire_generic → _lock_acquire → gettimeofday → utcNow → clockSnapshot → reliableClock → safetyTask`, sau khoảng60s hoạt động rồi abort/reboot. Bản13.4D gọi gettimeofday bên trong clockMux critical section; newlib time cần mutex, không được chờ mutex trong ngữ cảnh không thể yield. Bằng chứng gốc giữ nguyên ở `build/phase13-4f-backtrace-decoded.log` và báo cáo13.4F. Không cho rằng host test tái hiện được đúng libc/FreeRTOS abort trên ESP32.

File thay đổi trực tiếp:

- `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino`: version13.4F.1, ba wrapper clockMux ngắn, đọc UTC ngoài lock, kiểm tra gettimeofday thất bại trả0; callback tính millis/UTC trước lock.
- `firmware/SmartAgricultureESP32/SntpRecovery.h`: store/revision, snapshot optimistic bounded3attempts, reasonSNAPSHOT_RACE.
- `firmware/tests/clock_snapshot_test.cpp`: 13 test mới, gồm thread thật trên host.
- `firmware/tests/clock-critical-section.test.cjs`: 5 source/instrumentation guards.
- `firmware/tests/run-host-tests.ps1`: thêm hai nhóm mới, giữ nhóm cũ.
- Báo cáo này và ghi chú liên kết trong báo cáo13.4F. Helper/artifacts riêng dưới build và log dưới report; không sửa backend/frontend/config chính.

## 2. Snapshot nhất quán và không mất callback

1. `loadClockState()` copy SntpClock/revision dưới clockMux, nhả lock.
2. `readClockTime()` đọc UTC qua gettimeofday và monotonic millis **ngoài mọi clockMux**. Có thể bị preempt; các guard drift/rollback/expiry vẫn fail-closed. Không khẳng định hai đồng hồ được đọc nguyên tử tại cùng một nanosecond.
3. Chạy pure `snapshot(mono,utc)` trên private copy, không syscall/I/O.
4. `commitClockState()` giữ clockMux chỉ để so revision/copy state. Chỉ commit nếu revision vẫn khớp.
5. Callback và **mọi reader commit** đều tăng revision64bit. Không chỉ so generation: reader cũ cũng không được xóa jump/expiry latch do reader khác phát hiện.
6. Nếu callback xảy ra giữa load và commit, reader bỏ copy cũ và retry tối đa3lần. Hết lượt trả unreliable/SNAPSHOT_RACE và measuredUtc0; không publish timestamp hoặc tự coi clock synced.
7. Nếu đọc thời gian thất bại, trả invalid/UTC_INVALID, timestamp0. Invalid-time latch chỉ commit khi revision vẫn khớp, nên không ghi đè callback/reader mới hơn. Clock đã synced bị latch phải chờ callback hợp lệ để khôi phục. Không ghi false từ reader cũ một cách không điều kiện.

SNTP callback lấy millis và chuyển timeval thành số nguyên trước lock, rồi chỉ cập nhật state/counter. Không nested clock/pump lock, không dùng volatile thay synchronization. Revision là số64bit dưới lock; không coi counter này là publisher boot identity hoặc cryptographic assurance.

## 3. Mọi vị trí clockMux đã rà soát

| Hàm | Nội dung bên trong critical section |
| --- | --- |
|loadClockState|`ClockReadState read=ntpClock.load();`|
|commitClockState|`const bool committed=ntpClock.commit(read);`|
|timeSynced|`ntpClock.onCallback(mono,utc);`|

Các method store chỉ copy/cập nhật số nguyên/bool, gọi pure state arithmetic; không allocation, libc time, Serial, network, delay/yield hoặc mutex khác. snapshot validation/drift math nằm ngoài lock. Static test allowlist đúng ba thân critical section, phát hiện thêm utcNow/gettimeofday hoặc helper khác trong đó; một negative test đưa lại kiểu lỗi cũ và phải bị guard từ chối. Header được kiểm tra các API I/O/RTOS/time bị cấm. Đây là source guard có phạm vi review, **không phải formal whole-program static analyzer**.

## 4. Bảo vệ giữ nguyên

Manifest xác nhận config.local khớp approved13.4D và bản compile; so sánh trong bộ nhớ, loại bỏ duy nhất Arduino-generated `#line` khi chuẩn hóa. Không đổi credentials/SSID/MQTT/IP/relay26/ENABLE_PUMP_COMMANDS=true/MAX_PUMP_SECONDS5.

`PumpProtocol.h`, `FirmwareDiagnostics.h`, `OffStateSchedule.h` khớp baseline approved13.4D. Giữ SNTP30phút/expiry2giờ, backoff, future guard2giây, OFF priority, monotonic timeout, network lease/WiFi/MQTT/clock fail-safe, retained/duplicate/expiry/replay protections. Recovery chỉ CAS pendingPERIODIC khi trống, không đè MAX_RUNTIME/COMMAND/OFF quan trọng. Sample measuredUtc/generation vẫn được chốt lúc đo, không tái timestamp/gửi mẫu cũ sau recovery.

Clock snapshot tranh chấp quá3lần có thể khiến một lượt đọc fail-closed (bỏ telemetry timestamp hoặc dừng relay nếu đangON); ưu tiên không false-valid hơn cố gắng chạy tiếp. Không giảm độ an toàn để làm test xanh.

## 5. Kết quả kiểm thử

Lệnh:

```powershell
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

Log `report/phase13_4f1-host-tests.log`, exit0:

| Nhóm | Kết quả |
| --- | --- |
|Controller/parser/serializer, fake GPIO|36/36 PASS|
|Diagnostics/delivery/network lease|18/18 PASS|
|OFF schedule|5/5 checks PASS|
|SNTP recovery cũ|24/24 PASS|
|Snapshot/concurrency mới|13/13 PASS|
|Source critical-section guards|5/5 PASS|
|C++ JSON → backend fake validators/gateway|6/6 PASS|

13 test mới bao gồm callback khi đang đọc UTC, generation thay đổi liên tục/bounded retry, reader cũ không đè callback hoặc jump latch, failed read/latch/recovery, failed reader cạnh tranh callback, rollback/forward jump, millis rollover/expiry, sample generation cũ không được dùng, reader-reader conflict,1000callback xen kẽ. Test cuối dùng **3 reader thread host và1 callback writer thread**,1000reads mỗi reader/1000callbacks, mutex thật trên host. Lặp toàn bộ binary20lần, exit0 cả20. Không đồng nhất host mutex với FreeRTOS critical section hoặc coi đây là on-device soak.

OFF priority/no unexpected ON được bảo vệ bởi source guard và các controller tests cũ: retained/replay/duplicate không HIGH, OFF high-water, clock unavailable OFF, MAX_RUNTIME, mất WiFi/MQTT. Chỉ fakeGPIO, không nối gateway thật.

Backend **408/408 PASS,0FAIL/0SKIP**, `report/phase13_4f1-backend-tests.tap`. Chỉ bảy offline suites presence/pump/shadow/shadow-preview/persistence/live-provenance/live-readiness; không PostgreSQL integration, seed, simulator hoặc migration. Các test JSON dùng fake gateway, không lệnh MQTT thật.

## 6. Compile và artifact cuối

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase13-4f1-hotfix' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Core3.3.12/FQBNesp32:esp32:esp32, **exit0**. Thư mục mới, không ghi đè13.4D/rollback13.4E. Trong task có compile trung gian; sau review invalid-read latch đã compile lại trong riêng thư mục hotfix. **Chỉ hash cuối dưới đây được bàn giao**, không dùng size/hash compile trung gian.

- Firmware version **13.4F.1**.
- Sketch968434bytes(73%); static globals60628bytes(18%); application binary968576bytes. Static RAM không phải tổng stack task/high-watermark.
- Log `report/phase13_4f1-compile.log`.
- Binary `build/esp32-phase13-4f1-hotfix/SmartAgricultureESP32.ino.bin`.
- SHA256 **D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A**.
- Manifest `build/esp32-phase13-4f1-hotfix/hotfix-manifest.json`: nguồn non-secret hashes, app/ELF/bootloader/partition hashes, config-equality booleans, guards/test counts/flashPerformedfalse.

So với13.4D: sketch967870→968434(+564bytes), staticRAM60620→60628(+8bytes), app968016→968576(+560bytes).13.4Dhash441E33… giữ nguyên, có lỗi phần cứng; không dùng làm rollback an toàn. Không chia sẻ binary/header chứa secrets.

### Sự cố công cụ so sánh config

Lần chạy manifest đầu thất bại vì header Arduino thêm `#line`, **không phải thay credentials**. Assertion in actual/expected đã vô tình hiển thị nội dung config nhạy cảm trong tool output. Không chép giá trị vào báo cáo, không lưu tool output đó vào artifact. Helper đã sửa: chuẩn hóa #line và chỉ assert boolean cho config/physical flag; chạy lại PASS, manifest không chứa credentials hoặc config hashes. Đã báo người dùng, khuyến nghị thay các mật khẩu bị lộ trong một phiên cấu hình riêng. **Chưa tự đổi credentials** vì ngoài phạm vi, và việc thay đổi sau này sẽ làm artifact hiện tại cần kiểm tra/build lại. Không tuyên bố secret handling hoàn toàn PASS cho lần thực hiện này.

## 7. Runtime safety chỉ đọc — không phải nghiệm thu hotfix

Snapshot08:10:29.657Z, `report/phase13_4f1-runtime-readonly.json`:

- Runtime API: commandsEnabled=false, automationEnabled=false, pumpTestMode=true.
- PENDING0/tổngDeviceCommand43, không tăng baseline.
- ONLINE, lastSeen08:10:24.438Z; PERIODIC OFF recordedAt08:10:24.028Z.
- GET08:09:12.997Z: controlEnabledfalse/gatewayDISABLED, bốn sensorMQTT mới08:09:03.009Z TEMP27.1/HUM50.7/SOIL22.08/LIGHT0.
- Windows clock adapter vẫn UNHEALTHY, không thay/resync Windows Time. Không biến offset nhỏ hoặc telemetry mới thành clock health PASS.
- Backend5000PID3572/MosquittoLAN1883PID1340/PG5432PID7848 giữ nguyên; không restart hoặc mở cluster test.
- Adapter phải tiếp tục rút điện theo xác nhận người dùng trước đó, không có phép đo nguồn độc lập trong task này.

Các snapshot là firmware **13.4D đang chạy**, không chứng minh lỗi reboot đã hết. Không mở COM3, nhấnEN, flash/reset, ON/OFF, bật flag, đổi broker/ACL hoặc sửa PostgreSQL. Browser không nằm trong task này, không ghi browser PASS.

## 8. Rollback và nghiệm thu sau flash được phê duyệt riêng

RollbackDISABLED còn nguyên/hash xác minh lại:

```text
build/esp32-phase13-4e-disabled/SmartAgricultureESP32.ino.bin
B30DDF0E4107942451C5692CEC9725F9061968C547A4D9357DA66E478BD6BC88
```

Version12D.2, config mạng hiện tại theo baseline13.4E, ENABLE_PUMP_COMMANDS=false. Có giới hạn SNTPcũ3h/2h; chưa nghiệm thu mạng/GPIO của rollback trên board trong task này. Source rollback staging/manifest có sẵn dưới build13.4E. **Không tự nạp rollback**.

Sau khi người dùng phê duyệt flash riêng, cần kiểm tra lại config/artifacthash, adapter ngắt/USB only, đúng board/COM3, commands/automationfalse/PENDING0. Nạp đúng hash cuối, capture boot13.4F.1/SNTPcallback/GPIOOFF, ít nhất3batch bốn sensor và2–3PERIODICOFF mới qua Serial→MQTT→PG→API, không phát command. Theo dõi vượt mốc lỗi cũ60s, heap/stack/tasklatency/reboot; nếu crash dừng/thu backtrace và trình rollback, không tự retry.

Refresh30phút và expiry/recovery thực tế vẫn cần bằng chứng riêng, không gọi PASS từ host tests. Scheduling/critical-section duration, libc mutex contention thực và safety task latency chỉ nghiệm thu trên ESP32; chưa được chứng minh bởi compile. Không coi snapshot là bảo đảm chống mọi UTC jump ngoài callback; drift/rollback/expiry guards hiện tại vẫn fail-closed.

**Dừng trước flash. Hotfix source/host/compile READY, on-device stability NOT VERIFIED. Không chuyển ACTIVE/VERIFIED_LIVE hoặc thử bơm.**
