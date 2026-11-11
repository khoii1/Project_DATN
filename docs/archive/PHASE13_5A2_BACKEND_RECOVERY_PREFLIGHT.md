# Phase 13.5A.2 — Backend recovery preflight

Ngày **22/10/2026, UTC+7**. Chỉ kiểm tra read-only và chuẩn bị startup; không khởi động backend.

## 1. Kết luận

```text
BACKEND_EXIT_ROOT_CAUSE_UNKNOWN
BACKEND_STARTUP_PREFLIGHT_READY — ready for separate startup approval only
BACKEND_STARTUP_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false — no activation performed
PHYSICAL_PUMP_NOT_TRIGGERED
SERVING_RUNTIME_FLAGS_NOT_VERIFIED — backend not running
```

READY nghĩa là cấu hình dự kiến đã được kiểm tra, safety/startup side effects đã được xác định và có thể trình duyệt khởi động. **Không có nghĩa process đang chạy, MQTT credentials đã được broker xác thực hoặc runtime flags/API đã nghiệm thu.** Mọi gate phải đọc lại sát thời điểm startup trong phiên được duyệt riêng.

Người dùng đã trả lời **“xac nhan”** trong phase này: ESP32 chỉ cấp USB, adapter5V bơm vẫn rút điện. Đây là xác nhận vận hành, không phải đo nguồn độc lập và không phải approval startup.

## 2. Runtime / nguyên nhân backend dừng

Snapshot SQL/config **2026-10-22T04:43:27.141Z**, process/network **04:43:31.281Z** (11:43 UTC+7).

- Không listener5000, không có Node backend trong process snapshot. **BACKEND_NOT_RUNNING** được xác minh.
- Broker LAN1883 hiện PID**3592**, listen0.0.0.0/::; Wi-FiWindows**172.20.10.2**. Có TCP Established từ**172.20.10.3:49514** tới LAN broker. Service loopback1883 PID**4572** là instance khác; không chọn localhost thay LAN.
- Production PostgreSQL5432 PID**7848** hoạt động, SQL kết nối READ ONLY thành công; test55433 vẫn không listener. Không khởi động cluster test trong phase này.
- Không thấy listener frontend5173 trong snapshot; không khởi động/dừng frontend.
- Backend log cũ `build/phase13-4a/backend-final.out.log` cập nhật cuối **2026-10-21T12:06:15.103Z**; stderr cuối **12:06:50.091Z** (19:06 ngày21/10 UTC+7).
- Stderr có **`MQTT disconnected`**, **`MQTT reconnecting`**, **`ECONNREFUSED 172.20.10.2:1883`**. Đây là lỗi TCP từ chối kết nối ở thời điểm cũ, không phải bằng chứng credential bị từ chối, firmware lỗi hoặc nguyên nhân process cuối cùng thoát.
- Không có exit-code sidecar gắn với startup13.4A được tìm thấy; exit code **NOT_CAPTURED**. Không thấy SIGINT/SIGTERM/graceful marker trong hai log này.
- Windows Application events1000/1001 trong48giờ không có event nhắc node.exe. Không tìm thấy service/task khớp Node/PM2/backend/SmartAgriculture theo các filter đã dùng. Không diễn giải kết quả filter này thành bằng chứng không tồn tại mọi supervisor bên ngoài.

**Đã chứng minh:** backend không chạy; từng mất kết nối MQTT trước đó; log không ghi exit code. **Chưa chứng minh:** user đóng terminal, process bị terminate, crash không được capture, hoặc supervisor dừng process. Các trường hợp này chỉ là giả thuyết; không sửa code dựa trên ECONNREFUSED lịch sử.

BrokerPID3592 khác snapshot13.5A.1. Đây là trạng thái đã có khi bắt đầu preflight; Agent không restart broker. TCP client hiện tại không tự chứng minh MQTT principal/telemetry freshness. Không lấy Serial frame871 của phase trước làm bằng chứng mới cho phiên11:43 này.

## 3. Environment, dependencies và Prisma readiness

`backend/scripts/phase13-5a2-preflight.cjs` đọc `.env`/process environment trong bộ nhớ; evaluate **chỉ module config/env.ts** bằng VM, stub dotenv, không import server/app/gateway/database singleton. Output chỉ allowlist metadata/booleans/endpoint không userinfo; không in database URL/JWT/password.

| Gate | Kết quả |
| --- | --- |
| Node/npm |v22.20.0 /11.17.0 |
| Runtime/dev dependencies |Tất cả package khai báo có package.json cục bộ; không install/update |
| TSX loader |`node --import tsx --eval ...` đã chạy offline, in TSX_IMPORT_HOOK_OK_NO_SERVER; không load server |
| Prisma Client |6.19.3; không thiếu transport/correlationId/expiresAt/acknowledgedAt/maxRunSeconds/sentAt trong generated model |
| Database tương ứng |smart_agriculture/public:5432; read_only=on; start `2026-10-16 12:13:43.656514+07` |
| Schema Command thực tế |Không thiếu các cột Command cần thiết;11 migrations, unfinished=0; không migrate/generate/db push |
| DATABASE_URL / JWT_SECRET / MQTT_USERNAME / MQTT_PASSWORD |Có trong môi trường hiệu lực; giá trị không xuất ra log/report |
| Config validation hiện tại / planned |PASS / PASS |
| Current config (không phải serving runtime) |PORT5000, MQTT_ENABLED=true, broker172.20.10.2:1883 |
| Safety config đã evaluate |Commands=false, Automation=false, TestMode=true, effectiveMaxRunSeconds=1 |
| DeviceCommand |PENDING=0; MQTT PENDING=0; tổng43 |
| Phần cứng theo xác nhận người dùng |USB only, adapter bơm rút điện |

Không thử MQTT CONNECT/auth bằng account backend trong phase này. Credentials tồn tại + config validation không thay CONNACK/SUBACK thật; phải kiểm tra khi startup được duyệt. Không dùng account ESP32 thay account backend, không đổi mật khẩu/ACL.

Kiểm tra dependency bằng package.json, không dùng riêng `require.resolve(package)` để kết luận @types/Prisma CLI bị thiếu: các package này có thể không export JS main. Typecheck cuối PASS.

## 4. Startup path và side effects đã xác minh

Nguồn: `backend/package.json`, `src/server.ts`, `config/env.ts`, `config/database.ts`, `mqtt/mqtt-client.service.ts`, `mqtt/mqtt-pump-state.adapter.ts`, `services/presence-watchdog.service.ts`, `services/device-command.service.ts`, `services/automation-evaluation.service.ts`, `mqtt/mqtt-telemetry.adapter.ts`, `services/telemetry-ingestion.service.ts`, `services/pump-command-policy.ts`.

```text
source bootstrap
  -> connectDatabase / SELECT1
  -> recoverMqttCommands (DML safety recovery)
  -> listen5000 / print serving PID + safety attestation
  -> MQTT connect + subscribe telemetry/status/actuator-state
  -> presence watchdog
  -> incoming telemetry/OFF -> normal ingestion writes
```

### Không có migration/seed hoặc auto replay ON

- `dev = tsx watch src/server.ts`; `start = node dist/server.js`; không predev/prestart hook. `prisma:generate`, `prisma:migrate`, `prisma:seed` là script riêng, không tự chạy từ bootstrap.
- Startup path không gọi migration/seed/DDL. Không nối repository SHADOW/SQL proposals vào production startup.
- Gateway waiting map mới rỗng. Recovery fail pending MQTT bằng BACKEND_RESTARTED_NO_REPLAY, không publish lại ON.
- `device-command.service.ts`: khi real gateway và Commands=false/MQTT disabled thì từ chối **trước** DeviceCommand.create; không fallback mock. Controller không nhận injected test gateway từ HTTP.
- MQTT transport publish cũng kiểm tra Commands=false và từ chối; Automation=false là khóa thêm. Không có auto-ON-on-boot routine.
- `pumpRuntimeLimit` = min(configured, TestMode?1:5); prepared environment dùng TestMode=true và configured=1. Không thay fail-safe firmware5giây.

### Startup KHÔNG read-only — cần hiểu rõ trong approval sau

1. `recoverMqttCommands()` chạy trước listen, có UPDATE DeviceCommand PENDING và Actuator UNKNOWN. Hiện MQTT PENDING0 nên không có command pending cần fail; SELECT cho thấy **1 actuator khớp điều kiện reset UNKNOWN** do có lịch sử MQTT command. PUMP_01 có thể chuyển UNKNOWN là expected fail-closed, không sửa DB ép OFF.
2. Chờ báo cáo PERIODIC OFF **mới sau session startup** để xác nhận OFF; payload retained/duplicate, quá cũ/future hoặc trước session bị chặn. Không dùng OFF lịch sử.
3. Presence watchdog và MQTT receipt có DML status/lastSeen. Ingestion ghi SensorReading, alert evaluation có thể ghi alert/activity.
4. Có **1 automation rule enabled trong DB**. Flag Automation=false không có nghĩa engine legacy không evaluate: telemetry mới vẫn có thể cập nhật lastEvaluatedAt/lastCommandAttemptAt. Nhưng real command bị khóa trước DeviceCommand.create/publish; không mở tưới tự động và command count phải giữ43. Đây là metadata side effect đã xác định, không che là “không có writes”.

Vì vậy approval startup sau này phải bao gồm **normal recovery/ingestion DML**, không phải migration hoặc cho phép phát lệnh bơm. Nếu người dùng muốn startup tuyệt đối không ghi metadata automation/alert, cần thiết kế/phê duyệt thay đổi khác; không tự sửa code/config ở preflight để đạt điều đó.

## 5. Lệnh khởi động dự kiến — CHƯA THỰC HIỆN

Lệnh development theo package hiện tại: `cd C:\DATN\Project_datn\backend` rồi `npm run dev`. Log lịch sử chứng minh application từng listen5000, nhưng exact argv/parent/exit code của phiên13.4A không được lưu đủ để khẳng định wrapper cũ.

Cho phiên recovery có kiểm soát, chọn source entry **không watch**, không dùng dist có thể stale, không build/generate/install trong startup:

```powershell
Set-Location 'C:\DATN\Project_datn\backend'
# Chỉ sau approval startup riêng; KHÔNG chạy trong phase preflight.
node.exe --import tsx src/server.ts
```

Launcher sau approval phải inject **child-only**, không ghi `.env`/registry/user/machine environment:

```text
PORT=5000
MQTT_ENABLED=true
MQTT_BROKER_URL=mqtt://172.20.10.2:1883
MQTT_COMMANDS_ENABLED=false
MQTT_AUTOMATION_COMMANDS_ENABLED=false
MQTT_PUMP_TEST_MODE=true
MQTT_PUMP_MAX_RUN_SECONDS=1
```

Giữ credential/JWT/database settings từ nguồn cục bộ hiện có, không đưa chúng vào command-line. Trước launch phải recheck port5000 trống, broker/DB/PENDING và config validation; nếu khác baseline/sai flags thì STOP.

### Capture stdout/stderr/exit code

Prepared design cho launcher phiên được duyệt (chưa tạo/chạy launcher trong preflight):

1. Tạo run-id UTC mới; dùng log riêng không overwrite: `build/backend-recovery-<runid>.stdout.log`, `.stderr.log`, `.exit.json`. Đây là operational logs, **không phải nơi lưu credentials**; không copy `.env` hay dump process.env.
2. Dùng `System.Diagnostics.ProcessStartInfo`: FileName=node.exe đã resolve, Arguments=`--import tsx src/server.ts`, WorkingDirectory=backend, UseShellExecute=false, RedirectStandardOutput/RedirectStandardError=true; inject allowlisted child-only flags ở trên.
3. Drain hai stream đồng thời qua `.BaseStream.CopyToAsync(FileStream)` trước khi chờ process exit, tránh pipe deadlock. Không dùng PowerShell NativeCommandError làm lý do bỏ mất stderr/exit code như sự cố esptool trước đây.
4. Chạy trực tiếp trong terminal vận hành có thể gửi Ctrl+C cho Node, không detached Windows service; không tạo broker/backend trùng. `.WaitForExit()` rồi await cả hai stream, lấy **Process.ExitCode** vào JSON cùng PID/start/end. Nếu session/tool bị ngắt và không lấy được exit code thì ghi NOT_VERIFIED, không gán0.
5. Giữ raw logs cục bộ/ignored; chỉ export allowlist PID, flag, endpoint, topic/reading/OFF timestamp, error class/code. Redact trước khi chia sẻ nếu raw error chứa dữ liệu nhạy cảm. Không stream toàn environment/password/token/database URL ra chat/report.

### Nhận biết lỗi và dừng

- Không listener / process thoát / exit code≠0: startup FAIL, giữ stdout+stderr, không retry loop hoặc sửa migration/config tự động.
- `MQTT connection error ... ECONNREFUSED` + reconnect: lỗi kết nối endpoint/listener ở lần thử đó; không tự quy thành auth error hoặc process crash. CONNACK auth denial, SUBACK denial và ECONNREFUSED là các loại lỗi khác nhau.
- Serving log `MQTT pump safety runtime` phải có đúng PID của listener, Commands=false, Automation=false, TestMode=true, cap1; API phải xác nhận tương ứng. Sai flag → Ctrl+C ngay, không tiếp tục nghiệm thu.
- Node đăng ký SIGINT/SIGTERM trong `server.ts`: dừng watchdog, MQTT, HTTP và disconnect Prisma. Dùng **Ctrl+C đúng terminal của backend**, kiểm tra PID/listener thực sự mất. Không dùng `taskkill /IM node.exe` hoặc stop broker/PostgreSQL service.
- `Stop-Process`/SIGTERM qua công cụ Windows không được mặc định là graceful. Nếu console interrupt không hoạt động hoặc shutdown bị treo, giữ adapter bơm ngắt và báo để xử lý đúng PID; không tuyên bố graceful chỉ vì process biến mất.
- Không thay frontend/broker. Nếu frontend vẫn chưa chạy, UI acceptance phải ghi NOT_VERIFIED hoặc phối hợp startup frontend riêng; không tự mở thêm dịch vụ ngoài approval.

## 6. Acceptance SAU approval startup riêng

| Bước | Tiêu chí |
| --- | --- |
| Fresh baseline |Đọc lại flags/port/DB/PENDING, giữ adapter ngắt; ghi session start, command count43 và latest reading/OFF IDs |
| Serving process |5000 LISTENING, đúng PID/startup argv; stdout có database connected và safety attestationfalse/false/testtrue/cap1 |
| Backend MQTT |Kết nối **LAN172.20.10.2:1883**, CONNACK/SUBACK thành công, telemetry/status/state subscriptions; không nhầm loopback4572 |
| Runtime API |GET `/api/health`; actuator/live-evidence APIs qua auth hợp lệ: gatewayMode=DISABLED, controlEnabled=false, runtime commands/automation false, testMode true |
| Presence |ESP32 ONLINE từ receipt mới sau startup; không lấy lastSeen/DB ONLINE lịch sử |
| Telemetry |Ít nhất3 batches **sau startup**, tổng12 rows, mỗi batch đủ TEMP/HUM/LIGHT/SOIL; MQTT receipt → DB id/source/recordedAt/receivedAt/value → API khớp; giữ giá trị0 hợp lệ |
| Relay state |Ít nhất3 PERIODIC OFF mới cùng observer session, non-retained/nonduplicate, timestamp sau startup và DB/API khớp; không ép OFF hoặc dùng retained lịch sử |
| Monitoring/Irrigation |Browser thật nếu frontend khả dụng: polling cập nhật, ONLINE/OFF hợp lệ, nút điều khiển khóa; không nhấn ON/OFF. Không gọi API tests là browser E2E |
| No unintended commands |PENDING0, command count vẫn43; không có MQTT command mới; rule metadata changes không bị nhầm thành command |
| Scope |Không migration/seed/DDL, no firmware/reset/credential changes, no Commands/Automation/VERIFIED_LIVE/ACTIVE activation |

Serial PUBACK chỉ là bằng chứng thiết bị→broker, không thay DB/API correlation. GPIO OFF/ACK/state không chứng minh động cơ hoặc nước. Không gửi ON/OFF để kiểm tra kết nối. Nếu MQTT/clock guard/payload validation thất bại, dừng nghiệm thu để điều tra, không reset/flash hoặc tự nới timestamp guard.

## 7. Tests và artifacts của preflight

- Offline safety regression **67/67 PASS** (pump40 + presence27), không network/DB writes từ suite.
- Backend `tsc --noEmit -p backend/tsconfig.json`: PASS.
- Node TSX import hook smoke test offline: PASS, không import `server.ts`.
- Main production package/schema/startup/config không sửa, không npm install/generate/build/migrate/seed.
- Không chạy lại59 SQL integration/501 full regression đã PASS ở phase trước vì đây không phải thay đổi persistence/runtime code; không tính chúng là kết quả test mới.

File thêm:

- `backend/scripts/phase13-5a2-preflight.cjs`: config-in-memory + dependencies + Prisma/SQL READ ONLY + sanitized historical logs. Không startup.
- `scripts/phase13-5a2-runtime-readonly.ps1`: process/listener/service/task/events snapshot, không chạy hoặc restart dịch vụ.
- Báo cáo này và evidence: `report/phase13-5a2-preflight.json`, `report/phase13-5a2-runtime.json`, `report/phase13-5a2-safety-tests.tap`.

**Điểm dừng:** preflight READY, nhưng backend vẫn chưa được khởi động. Chờ người dùng quyết định/phê duyệt riêng cho một phiên startup với hai khóa command/automation giữ false và normal recovery/ingestion DML đã mô tả. Không tự chuyển sang thực thi startup hay Phase13.5B.
