# Phase 13.5A.3 — Controlled backend startup & live recovery

## Kết quả hoàn tất — 22/10/2026, UTC+7

```text
BACKEND_STARTUP_PASS
MQTT_BACKEND_CONNECTION_PASS
LIVE_TELEMETRY_RECOVERY_PASS — 3 new batches / 12 database/API-correlated readings
FRESH_PERIODIC_OFF_PASS — 3 new reports, QoS1 / retain=false / duplicate=false
COMMANDS_DISABLED=true
AUTOMATION_DISABLED=true
PENDING=0
COMMAND_COUNT=43 (baseline43, unchanged)
BACKEND_PROCESS_RUNNING — PID22400, one listener5000
BACKEND_STARTUP_ATTEMPTS_USED=1/1
BROWSER_VERIFICATION_NOT_VERIFIED — frontend5173 not running
PRODUCTION_MIGRATION_NOT_PERFORMED
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
BACKEND_HISTORICAL_EXIT_ROOT_CAUSE_UNKNOWN
```

**Đây là trạng thái cuối có hiệu lực; phần nhật ký chuẩn bị ở cuối file chỉ là lịch sử trước khi người dùng trả lời xác nhận.**

### 1. Preflight và startup thực tế

Người dùng đã trả lời **“xac nhan”** cho câu hỏi refresh13.5A.3: adapter5V bơm rút điện, ESP32 chỉUSB. Giữ nguyên trạng thái đó; Agent không tác động nguồn/COM/reset/firmware.

Refresh ngay trước startup: `report/phase13-5a3-preflight.json`, baseline `report/phase13-5a3-controlled-20261022-01-baseline.json`:

- Port5000 trống, không có backend khác; LAN broker172.20.10.2:1883 PID3592, production5432 PID7848 hoạt động. Test55433/frontend5173 không listener.
- Config validation PASS, dependencies/Prisma readiness PASS, không thiếu Command columns/client fields. PENDING0, MQTT PENDING0, tổng command43.
- Commands=false, Automation=false, TestMode=true, effective cap1. Source không gọi migration/seed/DDL hoặc tự replay ON; startup recovery/telemetry metadata DML đã được phê duyệt.

Chỉ gọi Backend mode **một lần**, run-id **controlled-20261022-01**. Atomic marker `build/phase13-5a3-startup.attempt.json` đã tiêu thụ lượt1/1; runner không tự retry hoặc chạy lại với run-id khác.

```text
Executable: node.exe
Arguments: --import tsx src/server.ts
WorkingDirectory: C:\DATN\Project_datn\backend
Node backend PID: 22400
Launcher Process.Start timestamp: 2026-10-22T05:45:03.8780667Z
Serving runtime attestation: 2026-10-22T05:45:11.435Z
Observer session start: 2026-10-22T05:45:11.443Z
```

Giờ Việt Nam tương ứng: launcher12:45:03, serving12:45:11 ngày22/10. Inject chỉ vào child: PORT5000, MQTT_ENABLEDtrue, brokerLAN, Commandsfalse, Automationfalse, TestModetrue, MQTT_PUMP_MAX_RUN_SECONDS1. Không sửa `.env`, user/machine environment, main schema, startup source hay credentials. Không dùng dist/watch/build/install/generate/migration.

### 2. Capture và trạng thái tiến trình

Runner PowerShell/.NET drain đồng thời stdout/stderr bằng CopyToAsync vào hai file riêng, không xử lý stderr qua NativeCommandError. Đã kiểm tra offline capture exit7 và Ctrl+C/SIGINT exit0 trước khi dùng backend thật; không coi smoke processes là lượt startup backend.

Artifacts:

- `build/phase13-5a3-controlled-20261022-01.stdout.log`
- `build/phase13-5a3-controlled-20261022-01.stderr.log`
- `build/phase13-5a3-controlled-20261022-01.state.json`
- Exit path dự kiến: `build/phase13-5a3-controlled-20261022-01.exit.json`

**Exit file chưa tồn tại vì backend vẫn RUNNING**, không ghi exit code0 giả. Runtime attestation PID22400 khớp đúng owner của listener5000. PowerShell logger là monitor, không phải backend thứ hai; giữ phiên launcher để tiếp tục capture. Không cài service/supervisor hoặc cam kết độ ổn định dài hạn.

### 3. PostgreSQL / MQTT / safety runtime

Serving stdout ghi:

```text
Database: connected
Smart Agriculture API running on port 5000
MQTT pump safety runtime: pid22400 / testMode=true / effectiveMaxRunSeconds=1
                         commandsEnabled=false / automationEnabled=false
MQTT connected: host=172.20.10.2 port=1883
MQTT subscriptions restored
MQTT OFF-state observation subscribed (commands disabled)
```

MQTT.js connect callback cùng successful subscribe grants/log và healthMQTT=connected là bằng chứng CONNACK được chấp nhận và subscriptions thành công; không phải raw CONNACK byte capture hoặc xác thực publisher của từng ESP32 packet. Không nhầm brokerLAN3592 với loopback4572.

Runtime qua `/api/live-evidence` xác nhận Commandsfalse/Automationfalse/TestModetrue; `/api/actuators/demo_actuator_pump_a` trả **gatewayMode=DISABLED, controlEnabled=false**. Không chỉ dựa vào `.env`. Health cuối lúc **2026-10-22T05:46:51.792Z**: databaseconnected/MQTTconnected, HTTPsuccess.

### 4. Recovery DML / UNKNOWN

`server.ts` await `recoverMqttCommands()` trước listen. Pre-start SELECT xác nhận1 actuator khớp điều kiện invalidation UNKNOWN và0 MQTT PENDING. Startup đi qua recovery transaction thành công; không tạo DeviceCommand mới hoặc replay ON.

**Không bắt được snapshot SQL trung gian UNKNOWN**: báo cáo OFF đầu tiên commit rất sớm lúc `05:45:11.631Z`, trước lượt SELECT của verifier. Vì vậy chỉ xác nhận source path đã await recovery và subsequent fresh OFF; không giả nhận đã chụp được UNKNOWN→OFF trong database history. Không update trực tiếp DB ép OFF.

Telemetry/presence/OFF và metadata alert/automation tiếp tục ghi bình thường theo approval. Legacy enabled rule có thể evaluate và cập nhật metadata, nhưng command gateway bị khóa trước DeviceCommand.create/publish. Hai lần normal API login của verifier tạo activity LOGIN_SUCCESS dự kiến; không seed/tạo account hoặc giả JWT.

### 5. Ba batch mới — đủ12 readings, MQTT→PostgreSQL→REST API

Tất cả timestamp sau startup; cùng observer session **backend-observer:b8f0fe0e-474d-4247-b7c8-49ea36c9c935**, generation1. Backend receipt metadataQoS1/retainfalse/dupfalse. Đối chiếu từng row: databaseID, sensorCode, sourceMQTT, recordedAt, receivedAt và value với history REST API; không restamp mẫu cũ.

| recordedAt UTC (ngày22/10/2026) | TEMP_01 | HUM_01 | LIGHT_01 | SOIL_01 |
| --- | --- | --- | --- | --- |
|05:45:49.535Z|26.1|53.3|0|8.63|
|05:46:04.535Z|26.1|53.4|0|8.53|
|05:46:19.535Z|26.1|53.6|0|8.68|

ReceivedAt database lần lượt **05:45:49.868Z**, **05:46:04.927Z**, **05:46:19.876Z**. LIGHT=0 được giữ nguyên là giá trị hợp lệ, không chuyển thành missing. Chi tiết12 database IDs và receipt IDs có trong evidence JSON, không tạo dữ liệu giả.

API kiểm chứng: `/api/health`, `/api/live-evidence?deviceId=demo_device_esp32_a`, `/api/actuators/demo_actuator_pump_a`, `/api/sensors/{sensorId}/readings` với khoảng quanh timestamp±1ms. Dùng normal auth hiện có, token chỉ trong RAM và không lưu report/log.

### 6. Ba PERIODIC OFF mới

| recordedAt UTC | callbackReceivedAt UTC | reason | QoS | retain | duplicate |
| --- | --- | --- | --- | --- | --- |
|05:45:57.097Z|05:45:57.447Z|PERIODIC|1|false|false|
|05:46:12.249Z|05:46:12.508Z|PERIODIC|1|false|false|
|05:46:27.317Z|05:46:27.650Z|PERIODIC|1|false|false|

Cả3 đúng device/actuator/topic, cùng observer session/generation với telemetry; backend store đánh dấu commit-observed, timestamp khớp PostgreSQL `lastStateChangedAt` và API OFF tại từng sample. Không dùng retained/historical state, không gửi OFF thủ công.

Đây là báo cáo **GPIO/relay logic**, không xác minh motor dừng hoặc nước chảy. Publisher identity vẫn NOT_VERIFIED, observer session không phải authenticated device boot session.

### 7. Kết quả cuối / giới hạn

Nghiệm thu hoàn tất **2026-10-22T05:46:29.156Z (12:46:29 UTC+7)**:

- ESP32ONLINE; lastSeen `05:46:27.757Z` từ receipt mới; PUMP_01OFF/stateAt `05:46:27.317Z`.
- Command count **43→43**, PENDING **0→0** xuyên các snapshots; không command mới, không ON/OFF gửi từ Agent hoặc verifier.
- Một backend PID22400 được giữ RUNNING theo approval. Diagnostic Node verifier kết thúc, Prisma client đã disconnect; không mở MQTT diagnostic subscriber riêng.
- Broker3592/4572 và production PostgreSQL7848 không đổi/restart; test55433 vẫn dừng.
- Frontend5173 không chạy, Agent không khởi động: **BROWSER_VERIFICATION_NOT_VERIFIED**. Không suy UI PASS từ API.
- Clock adapter chỉ đọc báo HEALTHY ngắn hạn, source time.windows.com,0x8, offset khoảng−159ms, Leap0/Stratum5/LastSyncError0. Không resync/đổi Windows Time; long-term stability vẫn NOT_VERIFIED.
- VERIFIED_LIVE=false, engineCalled=false; không nối SHADOW persistence/ACTIVE, không migration5432, không đổi credential/ACL/firmware hoặc cấp nguồn bơm.

Backend exit lịch sử vẫn **UNKNOWN**. Startup mới PASS không chứng minh vì sao phiên cũ dừng. Không claim firmware/SNTP reliability dài hạn hoặc physical pump test từ nghiệm thu này.

### 8. Lỗi diagnostic đã xử lý — không restart backend

Verifier lần đầu dùng history filter `from=to`, API trả400 đúng contract `from<to` trong `sensor.schema.ts`. Đã giữ evidence lỗi ở `report/phase13-5a3-controlled-20261022-01-api400-attempt.json`.

Chỉ sửa helper diagnostic dùng timestamp±1ms, vẫn match chính xác rowID/time/value. Không sửa API/validator/source production, không nới hợp đồng và **không dùng lượt startup thứ hai**. Chạy lại verification bằng cùng backendPID22400 và observer session; kết quả12 readings/3OFF PASS ở evidence cuối.

### 9. File/evidence

- Báo cáo này; `report/phase13-5a3-controlled-20261022-01.json` là evidence nghiệm thu authoritative.
- `report/phase13-5a3-controlled-20261022-01-baseline.json`, `report/phase13-5a3-preflight.json`.
- `scripts/phase13-5a3-capture.ps1`: launcher/capture, one-attempt marker, graceful smoke verified.
- `backend/scripts/phase13-5a3-live-recovery.cjs`: SELECT/GET + normal auth verifier, không command API/MQTT publish.
- `backend/scripts/phase13-5a2-preflight.cjs`: tùy chọn output riêng13.5A.3.
- Raw stdout/stderr/state/marker ở build; không chứa environment dump hoặc credentials được Agent in ra. Token không persist. Không lưu secrets vào staging.

**Dừng sau13.5A.3, giữ backend chạy với control khóa. Không tự chuyển13.5B, VERIFIED_LIVE hoặc ACTIVE automation.**

---

## Phụ lục: nhật ký chuẩn bị trước xác nhận (lịch sử, không phải trạng thái cuối)

Snapshot trước khi nhận câu trả lời refresh của người dùng. Phần dưới được giữ để đối chiếu việc chưa tiêu thụ lượt startup ở thời điểm đó.

## Trạng thái hiện tại

```text
STARTUP_APPROVAL_RECEIVED
BACKEND_STARTUP_ATTEMPTS_USED=0/1
BACKEND_STARTUP_NOT_PERFORMED
HARDWARE_REFRESH_CONFIRMATION_PENDING
MQTT_BACKEND_CONNECTION_NOT_VERIFIED
LIVE_TELEMETRY_RECOVERY_NOT_VERIFIED
FRESH_PERIODIC_OFF_NOT_VERIFIED
CONFIG_COMMANDS_DISABLED=true
CONFIG_AUTOMATION_DISABLED=true
SERVING_RUNTIME_FLAGS_NOT_VERIFIED
PENDING=0 (pre-start SELECT)
PRODUCTION_MIGRATION_NOT_PERFORMED
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

Approval startup đã có trong attachment13.5A.3. Không cần xin lại approval đó. Agent đã hỏi refresh: adapter5V bơm vẫn rút điện và ESP32 chỉ cấpUSB. Có xác nhận ở phase13.5A.2, nhưng chưa có reply cho câu hỏi refresh trong phase này tại thời điểm ghi báo cáo. Không tự ghi rằng đã nhận được reply mới.

## Những việc đã thực hiện an toàn

- Đọc toàn bộ yêu cầu13.5A.3 và báo cáo preflight13.5A.2.
- Refresh config/dependencies/Prisma/PENDING qua helper chỉ đọc: `report/phase13-5a3-preflight.json`. Safety environment dự kiến: Commands=false, Automation=false, TestMode=true, maxRunSeconds1; broker172.20.10.2:1883, credential hiện có chỉ dùng trong bộ nhớ, không in giá trị.
- Baseline SELECT READ ONLY: command count**43**, PENDING**0**, DB presenceOFFLINE, PUMP_01 lưuOFF lịch sử. Không coi đó là trạng thái mới.
- Port5000 trống; PostgreSQL5432 PID7848, LAN broker1883 PID3592 hoạt động, loopback brokerPID4572 riêng; test55433 và frontend5173 không listener. Không restart/start bất kỳ service nào.
- Chuẩn bị capture bằng .NET ProcessStartInfo + drain đồng thời stdout/stderr qua CopyToAsync; child-only environment, không sửa `.env` hay environment toàn máy. Có marker CreateNew để chỉ cho một backend attempt trong phase, không retry bằng run-id khác.

## Kiểm thử capture offline — không phải backend startup

Hai tiến trình Node chỉ chạy `--eval`, không import server/app, không DB/MQTT và không listen5000:

1. PID5504 ghi `SMOKE_STDOUT` / `SMOKE_STDERR` vào hai file riêng, exit thực tế**7** được capture đúng.
2. PID14428 nhận Ctrl+C qua PTY, handler ghi `SMOKE_SIGINT_HANDLED`, exit thực tế**0**. PowerShell wrapper có thể trả code1 sau console interrupt; không nhầm với exit code của child Node đã lưu0.

Bằng chứng: `report/phase13-5a3-capture-smoke.json` và `build/phase13-5a3-smoke-*.stdout.log/.stderr.log/.exit.json`.

Không tạo exit-code file cho backend vì backend **chưa được tạo**. Không có backend process đang RUNNING từ phase này.

## Mã chuẩn bị

- `scripts/phase13-5a3-capture.ps1`: capture runner; Backend mode yêu cầu approval và hardware-confirmation switches; entry chính xác `node.exe --import tsx src/server.ts`, cwdbackend. Chưa gọi Backend mode.
- `backend/scripts/phase13-5a3-live-recovery.cjs`: baseline READ ONLY; verifier dự kiến health/runtime/PID, một login hợp lệ hiện có (activity LOGIN_SUCCESS bình thường), rồi GET+SELECT để đối chiếu3 batches/12rows và3 PERIODIC OFF. Không import command service/gateway, không gửi ON/OFF. Mới chạy `--baseline`, chưa chạy verifier với backend.
- `backend/scripts/phase13-5a2-preflight.cjs`: thêm tùy chọn output13.5A.3 để không ghi đè snapshot13.5A.2; không thay production runtime.

Run-id dự kiến: `controlled-20261022-01`. Baseline: `report/phase13-5a3-controlled-20261022-01-baseline.json`. Khi tiếp tục phải refresh baseline và gates một lần nữa trước lần startup duy nhất.

## Các bước chưa thực hiện

Sau xác nhận nguồn: refresh gates → một startup → xác minh safety attestation đúng PID/listener → MQTT CONNACK/SUBACK → normal auth/GET/SELECT →3 batches/12rows mới và3 OFF PERIODIC mới cùng observer session, qos1/retainfalse/dupfalse → PENDING0/count43 → giữ đúng một backend nếu PASS.

Frontend chỉ kiểm tra nếu đã có5173; không tự khởi động. Nếu phát hiện unsafe flags/command mới/crash, gửi Ctrl+C đúng PTY đã được smoke-test, giữ exit evidence, không retry startup. Recovery DML UNKNOWN, telemetry/presence/OFF và normal operational metadata chỉ được phép sau startup như approval; hiện chưa phát sinh từ phase này.

Backend exit lịch sử vẫn UNKNOWN như13.5A.2; không lấy ECONNREFUSED lịch sử làm lý do sửa code. Không migration, seed, generate/build/install, credential/ACL changes, reset/flash ESP32, gửi command hoặc cấp nguồn bơm.

**Điểm dừng của snapshot lịch sử: lúc đó chờ refresh phần cứng, lượt startup0/1. Kết quả cuối sau xác nhận và startup xem đầu báo cáo:1/1, PASS, RUNNING.**
