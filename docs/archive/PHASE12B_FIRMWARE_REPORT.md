# Báo cáo Phase 12B — firmware ESP32 hợp nhất

## 1. Kết luận

Hoàn thành **mức mã nguồn, host test và compile target ESP32**, chưa nghiệm thu phần cứng. Có sketch đọc bốn sensor + MQTT command/ACK + fail-safe GPIO26; default ENABLE_PUMP_COMMANDS=false, thêm guard vật lý thứ hai ở hàm GPIO. Không upload, không bật bơm, không connect MQTT thật từ script test, không chạy simulator/seed/migration, không restart Mosquitto/backend.

Hướng dẫn đầy đủ cài IDE/library, credentials cục bộ, Verify/Upload và test giữ nguyên dây: [firmware/README.md](../firmware/README.md).

## 2. File tạo/sửa

Tạo:

- `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino` — sketch hoàn chỉnh, sensor/safety task riêng, single MQTT network loop, bounded callbacks, ONLINE/LWT, SNTP, ACK/state queue.
- `firmware/SmartAgricultureESP32/PumpProtocol.h` — C++11 portable strict command parser, UTC validation, UUID cache/high-water/session barrier, millis timer, GPIO-confirmation adapter, ACK/OFF-state/telemetry serializers.
- `firmware/SmartAgricultureESP32/config.example.h` — pins/calibration/credentials placeholders, default false.
- `firmware/tests/pump_controller_test.cpp` — controller/parser test bằng fake GPIO, xuất fixture JSON từ serializer thật.
- `firmware/tests/backend-contract.test.cjs` — fixture native C++ → backend gateway/schema, không env/DB/network thật.
- `firmware/tests/run-host-tests.ps1` — build/run test, không upload.
- `firmware/README.md` — vận hành, thư viện, nạp thủ công, checklist an toàn.
- `infrastructure/mosquitto/phase12b-state-acl.patch` — diff đề xuất cho ACL thực tế, chưa apply.
- `docs/PHASE12B_FIRMWARE_REPORT.md` — báo cáo này.

Sửa `.gitignore` để bỏ `firmware/**/config.local.h`; tài liệu MQTT/firmware Phase12 cập nhật liên kết và mâu thuẫn mô tả cũ. Không sửa Prisma schema/migration/API/firmware ở ngoài repo; không sửa config.local.h vì chưa tạo file đó. Bảo toàn các thay đổi Phase12/presence/polling và thư mục report của người dùng.

## 3. Pin, thư viện, hiệu chuẩn

Không có firmware gốc trong repo. Pin dựa trên thông tin người dùng: DHT22 GPIO4, BH1750 SDA21/SCL22, LM393 AO34, MKE-M05 relay GPIO26 HIGH ON/LOW OFF. Không độc lập xác minh dây/pin bằng phần cứng, không yêu cầu đấu lại dây. PUMP_01 là logical code, RELAY_1 trong DB không có nghĩa GPIO1.

LM393 dry3500/wet1507, 12-bit ADC, clamp 0..100%, average8 mẫu. DHT đơn vị Celsius/%RH, BH1750 lux, soil %. Backend suy ra đơn vị từ `SENSOR_TYPE_METADATA[Sensor.type]`, không có cột unit ở Sensor/SensorReading; JSON readings không thêm unit ngoài schema. Không gửi NaN hoặc timestamp giả.

Compile bằng Arduino CLI1.5.1, esp32 core3.3.12, FQBN esp32:esp32:esp32. Libraries local: ArduinoMqttClient0.1.8, DHT1.4.7, BH1750 1.3.0, Adafruit Unified Sensor1.1.15. WiFi/Wire/time/FreeRTOS/ESP-IDF đi cùng core. Không cài/nâng package hoặc thư viện vào môi trường người dùng. Parser C++ nội bộ chỉ hỗ trợ subset command đã biết; không thêm ArduinoJson.

## 4. MQTT và JSON thực tế

Tất cả publish QoS1, retain=false; clean session. Command subscribe QoS1, retained bị từ chối. Prefix cố định mặc định `smart-agriculture/v1/devices/ESP32-GF-A-01`:

- `/telemetry`, `/status` giữ schema cũ.
- `/commands/PUMP_01` backend → firmware.
- `/command-acks/PUMP_01` firmware → backend.
- `/actuator/state` firmware → backend, OFF only.

JSON command minh họa (giờ cố định này không được publish lại để điều khiển):

```json
{"schemaVersion":1,"commandId":"550e8400-e29b-41d4-a716-446655440000","deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","type":"PUMP_SET","state":"ON","maxRunSeconds":1,"issuedAt":"2026-10-14T15:00:00.000Z","expiresAt":"2026-10-14T15:00:10.000Z"}
```

OFF cùng fields, `state:"OFF"`, UUID mới, bỏ maxRunSeconds. ACK thực:

```json
{"schemaVersion":1,"commandId":"550e8400-e29b-41d4-a716-446655440000","deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","type":"PUMP_SET","state":"ON","result":"APPLIED","recordedAt":"2026-10-14T15:00:00.500Z"}
```

Với flag false, result REJECTED và thêm `"reason":"PUMP_COMMANDS_DISABLED"`, không HIGH. OFF state thực:

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"MAX_RUNTIME","recordedAt":"2026-10-14T15:00:01.500Z"}
```

Telemetry thực:

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","recordedAt":"2026-10-14T15:00:00.500Z","readings":[{"sensorCode":"TEMP_01","value":31.50},{"sensorCode":"HUM_01","value":69.40},{"sensorCode":"LIGHT_01","value":0.00},{"sensorCode":"SOIL_01","value":100.00}]}
```

Status birth/heartbeat `{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","status":"ONLINE"}`, LWT status OFFLINE. Các ví dụ sensor là fixture kiểm thử, không phải đo mới từ ESP32.

Mâu thuẫn yêu cầu phát state ON với backend strict OFF-only: giải quyết bằng **ACK APPLIED ON**, không tự thêm state ON hoặc sửa backend. OFF/BOOT/loss/runtime có state OFF mới khi có kết nối+UTC. ACK chỉ xác nhận GPIO set/readback, không xác nhận relay/motor/nước. Payload command tối đa1024byte, body sai/truncated/unknown field/duplicate key/string escapes/sai kiểu bị từ chối.

## 5. An toàn và concurrency

GPIO26 LOW đầu setup; không restore ON. Chỉ controller và low-level guard mới cho HIGH; GPIO write/readback lỗi không APPLIED. Safety task độc lập, millis wrap-safe, interval5ms, cap5giây; loop MQTT không giữ timer. Sensor task15giây giữ sample+measurement timestamp. MQTT reconnect retry có lịch, không busy-loop vô hạn; ACK queue8, không publish reentrant từ callback.

UUID cache64 tối thiểu120giây, full fail-closed ON; high-water issuedAt + OFF ưu tiên; MQTT session barrier chặn ON phát trước session hiện tại, kể cả sau reboot. Duplicate không restart timer hoặc làm mới recordedAt. Queue cũ bị xóa reconnect; không phát lại ON/ACK ON.

Network lease250ms cắt GPIO nếu network task kẹt; khi ON thêm ONLINE QoS1 probe mỗi200ms, khi OFF15giây. Đây là kiểm tra broker round-trip, không flow sensor. Wi-Fi loss event yêu cầu LOW; silent partition detection có độ trễ probe/lease/scheduler, không khẳng định mất mạng là được phát hiện tức thời. Chưa đo latency điện/FreeRTOS trên thiết bị; CPU treo, reset/brownout, xung ROM boot hoặc relay kẹt vẫn cần bảo vệ/ngắt nguồn vật lý. Giữ nguyên wiring đã thử, không yêu cầu đấu lại.

Clock phải có SNTP callback và còn hạn2giờ. OFF có cấu trúc đúng vẫn LOW nếu clock/expiry không hợp lệ, nhưng không tạo ACK APPLIED/timestamp giả. Khi không có UTC tin cậy, backend có thể timeout dù đã cố gắng OFF; cần kiểm tra thực tế tại chỗ.

## 6. Kiểm thử đã chạy

PowerShell tại root:

```powershell
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

- Host GCC4.9.2, C++11 `-Wall -Wextra -Werror -static`: compile pass, **31 pass / 0 fail**. Bao phủ 20 ca tối thiểu bằng policy/fake pin cộng retained, coercion/duplicate key, clock-unsynced redelivery, out-of-order, max cap, NaN, reused ID, invalid UTC, original ACK timestamp, full cache và GPIO failure. Runtime của FreeRTOS/sensor driver là phần chưa test trên host.
- Node contract fixture → backend: **5 pass / 0 fail**, APPLIED ACK, REJECTED ACK, OFF state, bốn readings/zero, status. Native serializer thực được dùng, không chép một bộ JSON giả riêng để giả tương thích.
- Backend `npm run test:pump`: **26 pass / 0 fail**.
- Backend `npm run test:presence`: **21 pass / 0 fail**.
- Arduino CLI compile target ESP32 bằng macro cưỡng chế config mẫu false: pass. Build artifact cục bộ trong `build/`, không upload. Flash khoảng957KB/1.31MB (~73%), globals60436/327680byte (~18%); tham khảo log compile cuối, không phải số heap FreeRTOS còn lại khi runtime.
- `git diff --check`, kiểm tra config.local.h bị ignore: pass.

Các lỗi harness phát hiện ban đầu: GCC cũ cảnh báo aggregate chưa khởi tạo đầy đủ, và fixture commandId khác ACK id. Đã sửa initializer/fixture, giữ nguyên backend validation và chạy lại pass. Không có lỗi compiler/test còn tồn tại trong phạm vi đã chạy.

Không test với ESP32 thật, không Upload, không chạy Serial Monitor, không bật bơm. Không test credentials/RF/NTP actual, driver cảm biến, FreeRTOS worst-case latency, brownout/boot glitch hoặc flow. Không chạy regression API suite ghi PostgreSQL. Không khởi động backend mới khi DB còn thiếu cột.

## 7. PostgreSQL: tình trạng và chuẩn bị migration, chưa apply

Truy vấn chỉ đọc xác minh database **smart_agriculture**, PostgreSQL17.2, loopbackIPv6 `::1`, port5432. Device ESP32-GF-A-01 OFFLINE, actuator PUMP_01 hardwareChannel RELAY_1. Bốn Sensor đều ACTIVE: TEMP_01/TEMP, HUM_01/AIR_HUMIDITY, LIGHT_01/LIGHT, SOIL_01/SOIL_MOISTURE. Bốn cột Phase12 chưa có; migration mới chưa áp dụng. Các migration cũ gần nhất có finished_at; không reset/seed.

Migration đã review: `backend/prisma/migrations/20261014090000_mqtt_pump_commands/migration.sql`, chỉ ADD COLUMN transport(defaultMOCK), expires_at/max_run_seconds/acknowledged_at nullable, không DROP/DELETE/đổiID. Phải backup và kiểm tra pending migrations trước deploy; migrate deploy chạy **toàn bộ pending**, không riêng Phase12 nếu còn migration khác.

**Lệnh dưới đây chỉ dành cho người vận hành sau khi cho phép; agent chưa thực hiện backup/deploy/restore.** Không đưa DATABASE_URL có password lên CLI/log. PostgreSQL17 tools có tại máy:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
New-Item -ItemType Directory -Force -Path 'C:\DATN\backups' | Out-Null
$backup = 'C:\DATN\backups\smart_agriculture_before_phase12_' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '.dump'
if (Test-Path -LiteralPath $backup) { throw 'Backup path already exists; do not overwrite' }
# Username tự điền; -W hỏi password tương tác, không ghi password vào lệnh.
& "$pgBin\pg_dump.exe" -h localhost -p 5432 -U '<PG_USER>' -W -Fc -d smart_agriculture -f $backup
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; DO NOT migrate' }
& "$pgBin\pg_restore.exe" --list $backup
if ($LASTEXITCODE -ne 0) { throw 'Archive check failed' }

Set-Location C:\DATN\Project_datn\backend
.\node_modules\.bin\prisma.cmd migrate status
# Review migration SQL và tất cả pending; chỉ sau khi user cho phép:
.\node_modules\.bin\prisma.cmd migrate deploy
npm run prisma:generate
npm run build
```

Archive list không thay việc thử restore vào **database test riêng mới do người vận hành chọn**. Không restore đè smart_agriculture, không `--clean`, không drop/reset DB thật. Rollback ứng dụng ưu tiên checkout/deploy bản backend trướcPhase12 theo quy trình người vận hành (không reset worktree hiện tại); các cột additive có thể giữ lại. Prisma không tự cung cấp down migration. Nếu migration lỗi, dừng dịch vụ/app deploy, đọc trạng thái/SQL, không tự migrate resolve hoặc xóa lịch sử; cần duyệt riêng. Chưa viết destructive rollback để xóa cột/dữ liệu.

## 8. Mosquitto ACL: so sánh thực tế, chưa thay đổi

Đọc `C:\mosquitto\config\mosquitto.conf`: listener1883, allow_anonymous false, password_file/acl_file ở C:/mosquitto/config. Không đọc/in nội dung password file. ACL thực tế `C:\mosquitto\config\acl` đã có telemetry/status và plural commands/command-acks, **chưa có hai quyền state**. Repo acl.example đã có chúng từ Phase12.

Diff đề xuất tại `infrastructure/mosquitto/phase12b-state-acl.patch`, thêm:

```text
# Trong block user smartagri_backend:
topic read smart-agriculture/v1/devices/+/actuator/state
# Giữ username thiết bị đúng deviceCode như %u hiện tại:
pattern write smart-agriculture/v1/devices/%u/actuator/state
```

Giữ nguyên mọi quyền telemetry/status. Backend writecommands/readACK/state; ESP32 readcommands và writeACK/state chỉ namespace của chính nó. Không đổi password, không anonymous, không sửa/restart/reload Mosquitto trong đợt này. Người vận hành backup ACL, apply diff đúng block user, duyệt cách reload service thực tế trước khi làm; không giả định ACL mẫu đã áp dụng.

Kiểm tra quyền thủ công, ví dụ CMD/PowerShell chỉ subscribe (không lệnh ON/OFF), sau khi ACL được duyệt. `<DEVICE_PASSWORD>` là placeholder, không chụp/in mật khẩu; CLI -P có thể lộ trong process list/history, ưu tiên profile client được bảo vệ nếu quy trình máy hỗ trợ:

```powershell
# Thiết bị phải được subscribe command chính nó (SUBACK QoS1):
& 'C:\Program Files\mosquitto\mosquitto_sub.exe' -h 127.0.0.1 -p 1883 -u ESP32-GF-A-01 -P '<DEVICE_PASSWORD>' -q 1 -d -t 'smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01'
# Thiết bị KHÔNG được subscribe command thiết bị khác (phải bị từ chối):
& 'C:\Program Files\mosquitto\mosquitto_sub.exe' -h 127.0.0.1 -p 1883 -u ESP32-GF-A-01 -P '<DEVICE_PASSWORD>' -q 1 -d -t 'smart-agriculture/v1/devices/ESP32-GF-B-01/commands/PUMP_01'
```

Mosquitto2.0/MQTT3 publish-denial không luôn có reason trong PUBACK; không coi process exit0 là proof ACLwrite được phép. Write ACL/ACK/state kiểm tra bằng broker test riêng đã xác thực/không bridge, xem broker ACL denial logs bằng người vận hành, hoặc thử firmware OFF/REJECTED có giám sát sau khi user duyệt. Không publish retainedON vào broker thật để kiểm tra quyền. Không mở broker thứhai trên1883 đang dùng; không restart brokerproduction để chạy debug.

## 9. Bước tiếp theo và tiêu chí bật vật lý

Theo checklist tại firmware/README.md: điền local credentials, giữ flag false → người dùng tự Verify/Upload → xác nhận GPIO LOW, bốn telemetry, NTP và reconnect → người dùng duyệt backup/migration/ACL → bật backend commands, giữ automation=false và firmware false → UI ON phải REJECTED, OFF hợp lệ LOW → người dùng phê duyệt riêng thử vật lý 1 giây, cap <=5 giây, có giám sát và ngắt adapter trong tầm tay.

Không cần đấu lại dây đã test. Không bật ENABLE_PUMP_COMMANDS=true trong lần bàn giao này. Firmware flagfalse không bảo vệ được xung điện ROMboot/relaykẹt: nếu thấy bơm chạy bất thường, ngắt adapter và dừng. Nghiệm thu website→pump còn phụ thuộc firmware upload, config credentials/NTP, migration/ACL actual và quan sát motor/nước thực tế.
