# Phase 12D — MQTT Command/ACK readiness

Ngày kiểm tra: 16/10/2026. **Đã chuẩn bị/kiểm tra source và regression offline. Chưa gửi bất kỳ command thật nào, chưa bật feature flag, chưa chứng minh điều khiển website → ESP32 → ACK thực tế.**

## 1. Database và migration

SELECT snapshot `2026-10-16T12:24:06.618Z` = **19:24:06.618 UTC+7** qua Prisma transaction `SET TRANSACTION READ ONLY`, SQL xác nhận read_only=on:

- Config: `backend/.env`; schema: `backend/prisma/schema.prisma`.
- PostgreSQL `localhost:5432`, database `smart_agriculture`; server thực `::1/128:5432`, current_database khớp.
- So sánh các thư mục `backend/prisma/migrations` với `_prisma_migrations`: **không có migration đang chờ**.
- `20261014090000_mqtt_pump_commands` finished **2026-10-16T11:09:39.621Z**, rolled_back_at=null. Đây là migration đã áp dụng trong lần sửa lỗi trước, không chạy lại trong Phase12D.
- `information_schema.columns` xác nhận bốn cột: transport TEXT NOT NULL DEFAULT 'MOCK'; expires_at TIMESTAMP(3) NULL; max_run_seconds INTEGER NULL; acknowledged_at TIMESTAMP(3) NULL. Generated Prisma Client SELECT các trường transport/command/status thành công.
- Device ESP32-GF-A-01 ONLINE, lastSeenAt 12:24:04.943Z. PUMP_01 id `demo_actuator_pump_a`, DB currentState OFF, lastStateChangedAt **2026-10-16T12:18:45.935Z** (mới hơn OFF MOCK cũ 13/10). Thông tin người dùng website đã Tắt phù hợp snapshot này; lượt này không nhìn browser trực tiếp.
- Ba DeviceCommand mới nhất vẫn source AUTOMATION/transport MOCK ngày 13/10. Không dùng chúng để chứng minh command vật lý thành công.

DeviceCommand giữ enum PENDING/SUCCESS/FAILED. APPLIED ACK tương ứng SUCCESS, REJECTED/timeout tương ứng FAILED với failureReason; không có enum APPLIED ở DB. correlationId unique; migration cũ có partial unique index một PENDING/actuator; service còn có row lock và serial queue. Migration Phase12 chỉ thêm cột, không đổi enum/xóa readings. Chưa chạy schema drift toàn bộ bằng công cụ so sánh introspection; tương thích ở đây là cấu trúc Command hiện dùng và SELECT thực tế, không khẳng định mọi bảng của DB đều hoàn toàn không drift.

**Không cần duyệt/apply migration mới cho trạng thái hiện tại.** Điều này không tự cấp phép ghi command thật; vẫn cần các điều kiện an toàn ở mục 7.

### Phương án backup/migration/recovery — chỉ hướng dẫn, chưa chạy

Backup cũ trước migration đã có trong đợt trước, không thay cho backup mới ngay trước dry-run có ghi DeviceCommand. Thay `<database-user>` bằng username cấu hình, không dán DATABASE_URL hoặc password vào CLI:

```powershell
New-Item -ItemType Directory -Path 'C:\DATN\backups' -Force | Out-Null
$commandBackup = 'C:\DATN\backups\smart_agriculture_before_phase12d_' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump'
if (Test-Path -LiteralPath $commandBackup) { throw 'Backup already exists' }
& 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe' -h localhost -p 5432 -U '<database-user>' -W -F c -f $commandBackup smart_agriculture
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; do not proceed' }
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' --list $commandBackup
if ($LASTEXITCODE -ne 0) { throw 'Archive validation failed' }
```

Password nhập ở prompt, không in/env dump. Kiểm tra archive list không thay cho restore rehearsal vào DB cách ly; việc tạo/restore DB kiểm thử cần phê duyệt riêng.

Nếu sau này xuất hiện migration pending, trước hết review toàn bộ SQL, backup, xin duyệt rõ ràng rồi mới dùng:

```powershell
cd C:\DATN\Project_datn\backend
npx prisma migrate status
# Chỉ sau duyệt và review TẤT CẢ pending; hiện không cần chạy deploy:
npx prisma migrate deploy
npm run prisma:generate
npm run build
```

Không tự dùng reset/db push/seed. Migration lỗi: dừng thao tác ghi, giữ flags false, kiểm tra lịch sử migration/log; không xóa cột/mark migration resolved hoặc restore đè DB live theo suy đoán. Ưu tiên phục hồi backup vào DB mới cách ly, kiểm tra đầy đủ rồi xin duyệt chuyển kết nối. Restore live hoặc rollback migration đều là thao tác riêng cần phê duyệt vì có thể mất telemetry mới sau thời điểm backup.

## 2. MQTT ACL và kết nối

Đã đọc `C:\mosquitto\config\mosquitto.conf`, `C:\mosquitto\config\acl` thực tế và `infrastructure/mosquitto/acl.example`. Config thực listener 1883, allow_anonymous=false, tham chiếu đúng ACL/password paths; không đọc password file, không thay config/restart broker trong lượt này.

ACL trên đĩa hiện có hai quyền state hẹp người dùng đã áp dụng sau Phase12C.3:

```text
user smartagri_backend
topic write smart-agriculture/v1/devices/+/commands/+
topic read smart-agriculture/v1/devices/+/command-acks/+
topic read smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state

# Global pattern permissions hiện hữu:
pattern read smart-agriculture/v1/devices/%u/commands/+
pattern write smart-agriculture/v1/devices/%u/command-acks/+

user ESP32-GF-A-01
topic write smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
```

Đây là trích các quyền liên quan, không phải toàn bộ file để copy đè. Telemetry/status giữ nguyên. %u áp dụng namespace theo MQTT username thiết bị. Theo nội dung ACL: backend được write commands/read ACK; ESP32 được read commands/write ACK. **Publish/ACK ACL runtime chưa kiểm chứng bằng command thật**; không coi file config hoặc SUBACK là bằng chứng toàn luồng hoạt động.

Runtime backend health HTTP 200, database/MQTT connected tại 12:24:06.896Z; broker cấu hình `172.20.10.2:1883`. Hai flags commands=false, automation=false, MQTT_ENABLED=true. Chưa xác minh independent memory env của process; source config và health là bằng chứng đang dùng.

## 3. Hợp đồng Command/ACK giữ nguyên

| Luồng | Topic |
| --- | --- |
| Command | smart-agriculture/v1/devices/ESP32-GF-A-01/commands/PUMP_01 |
| ACK | smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01 |
| OFF state | smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state |

Tất cả publish command/ACK/state QoS1, retain=false theo source và native/offline tests. Không gửi publish trong Phase12D.

- Command: schemaVersion=1, commandId UUID, deviceCode, actuatorCode, type=PUMP_SET, state ON/OFF, issuedAt/expiresAt UTC ISO. ON thêm maxRunSeconds; OFF không nhận trường đó.
- ACK: schemaVersion/commandId/deviceCode/actuatorCode/type/state tương ứng requested state, result APPLIED/REJECTED, recordedAt UTC ISO, reason tùy chọn. REJECTED state=ON **không phải** báo GPIO đang ON; đó là lệnh ON bị từ chối.
- State: strict OFF-only schema với reason BOOT/MQTT_LOST/WIFI_LOST/MAX_RUNTIME/COMMAND. Không dùng unsolicited ON state để cập nhật relay ON.
- Backend `mqtt-device.gateway.ts` chỉ ACK đúng live pending commandId/topic/device/actuator/requested state; chặn retained, sai schema, expired, stale/future; duplicate/late ACK không settle lần hai. PUBACK chỉ ghi sentAt, không SUCCESS.
- Backend `mqtt-client.service.ts` clean session, explicit subscriptions, QoS1/non-retained; command readiness fail-closed khi store processing; disconnect remove outgoing packet rồi fail pending, không replay ON. ACK/state queue riêng khỏi telemetry để tránh automation chờ ACK của chính queue.
- Firmware strict decoder, UUID/cache/high-water/session floor/max runtime; duplicate ON không kéo dài deadline, ưu tiên OFF, boot/reconnect không restore ON. Cache RAM không phải journal durable; an toàn reboot dựa clock/session floor và fail-OFF, không tự nhận là exactly-once MQTT.

## 4. Firmware và backend an toàn

Files đọc: `firmware/SmartAgricultureESP32/{SmartAgricultureESP32.ino,PumpProtocol.h,config.example.h}`, `backend/src/{services/device-command.service.ts,gateways/mqtt-device.gateway.ts,mqtt/mqtt-client.service.ts,mqtt/mqtt-pump-state.adapter.ts}`.

- Config example ENABLE_PUMP_COMMANDS=false, relay GPIO26 HIGH ON/LOW OFF, firmware hard cap 5 giây. Không sửa/read config.local.h chứa credentials, không flash hoặc thay dây/Wi-Fi.
- `PumpController.apply` khi disabled trả REJECTED/PUMP_COMMANDS_DISABLED trước write HIGH; low-level writeRelay cũng có enable guard độc lập.
- OFF well-formed/addressed yêu cầu LOW trước các kiểm tra ACK clock/expiry; GPIO write/readback thất bại không fake APPLIED. Điều này không chứng minh motor hoặc nước.
- Callback `if(decision.reportOff) pendingOffReason.store("COMMAND")`: ON bị từ chối khi confirmedOff vẫn gửi OFF state riêng sau ACK. Backend có thể tạm UNKNOWN khi settle REJECTED, sau state OFF hợp lệ mới trở lại OFF. **Không suy OFF chỉ từ ACK REJECTED**; nghiệm thu dry-run phải thấy OFF state/DB/UI cuối cùng. Nếu mất bản state, giữ UNKNOWN là thận trọng, không ép DB OFF.
- `device-command.service.ts`: scoped JWT/role/current user, STAFF cần canControlIrrigation; tài nguyên ACTIVE, ON cần ONLINE+heartbeat còn TTL90; allowlist ESP32-GF-A-01/PUMP_01, MQTT enabled+commands enabled, automation opt-in riêng false. Chặn broker unavailable, pending conflict, ON quá nhanh, duration ngoài giới hạn; OFF supersede ON pending. Không REST mock fallback.
- Default backend maxRunSeconds=5, expiry=10 giây. API validator cap 30 nhưng service cap theo env (hiện 5); firmware cap 5 độc lập.
- **NOT VERIFIED: flag trong firmware thực đang nạp, nguồn bơm đã ngắt, GPIO thực khi nhận ON.** Không lấy config.example hoặc lời mô tả thay cho safety check tại thời điểm chạy command.

## 5. Irrigation UI và API

Đọc đầy đủ phần control/PumpCard/history trong `frontend/src/pages/irrigation/IrrigationPage.tsx`, service `frontend/src/services/actuator.service.ts`; backend `routes/actuator.route.ts`, `controllers/actuator.controller.ts`, validator/service/gateway.

- Trang `/irrigation`, tab Điều khiển thủ công. Nút gọi `actuatorService.command(id, TURN_ON/TURN_OFF)` → POST `/api/actuators/:id/commands`; không publish trực tiếp từ browser.
- Backend REST kiểm tra authenticate + scoped service/permission. POST trả 202 nếu PENDING; 201 nếu đã settle. HTTP 201 không tự có nghĩa APPLIED: phải xem command.status/failureReason.
- `control()` kiểm tra FAILED trước thông báo; PENDING ghi “đang chờ ESP32 xác nhận”, không báo máy bơm đã bật. Thay currentState bằng response backend, không tự set ON khi bấm nút.
- PumpCard hiển thị latestCommand.status và failureReason; history phân biệt MOCK. Timeout/REJECTED hiển thị FAILED/lý do qua polling; feedback PENDING cũ có thể còn đến thao tác tiếp theo nhưng card status/lý do được cập nhật, không có tuyên bố APPLIED giả.
- Manual/history polling 2000ms sau khi request hoàn tất; history chỉ tải khi mở tab history; automation tab không polling. commandGeneration chặn snapshot GET cũ ghi đè kết quả POST. Tab hidden pause và foreground refresh theo hook chung.
- controlEnabled=false giữ nút không khả dụng. API OFF/UNKNOWN dựa evidence và presence, không dùng connection ONLINE để suy relay ON.
- **Giới hạn 1 giây:** frontend hiện POST chỉ `{command}`, không gửi maxRunSeconds. Không thể khẳng định nút ON thử đúng 1 giây với default backend 5. Phương án không cần đổi UI: khi được duyệt test thật, đặt backend MQTT_PUMP_MAX_RUN_SECONDS=1 trước khi mở commands và xác minh payload có maxRunSeconds=1. Chưa thực hiện thay đổi này.
- Build/lint/static inspection không phải test click UI/authenticated E2E. Không đăng nhập hoặc POST command trong lượt này. Trang live và phản hồi actual REJECTED/ACK vẫn NOT VERIFIED.

## 6. Regression đã chạy, không ghi database thật

| Suite | Kết quả | Phạm vi |
| --- | --- | --- |
| Backend npm run test:pump | 33/33 PASS | Gateway/service/DB mock, pending/APPLIED/REJECTED, expiry/timeout, offline/RBAC, duplicate/reconnect/no replay, ưu tiên OFF, passive state/API unit |
| Backend npm run test:presence | 27/27 PASS | ONLINE/OFFLINE/TTL/retained/concurrent/reconnect, telemetry mapping mock |
| Firmware native controller | 36/36 PASS | Disabled ON không HIGH, OFF, duplicate/session/expiry, GPIO failure, timer/failsafe |
| Firmware diagnostics | 18/18 PASS | Bốn sensors/zero/ADC/time/network/retry/lease |
| Native C++ payload → backend | 5/5 PASS | Actual serializer APPLIED và dry-run REJECTED, state/telemetry/status schema |
| Frontend npm run test:polling | 12/12 PASS | Non-overlap/cancellation/visibility/StrictMode/races/recovery |
| Backend npm run build | PASS | TypeScript |
| Frontend npm run lint | PASS | ESLint |
| Frontend npm run build | PASS | Typecheck+Vite, cảnh báo chunk >500 kB hiện hữu |

Các test fake GPIO/network/Prisma, không chạy integration suite ghi PostgreSQL. Native compile không phải Arduino compile/nạp firmware; lượt này không cần compile board lại vì không sửa firmware. Polling suite không mô phỏng UI Irrigation click thật. Không test MQTT.js internal readiness bằng broker reconnect thật có pending ON trong lượt này.

## 7. Phê duyệt cần có trước dry-run thật (nguồn bơm ngắt)

**Chưa được phép thực thi các bước dưới; đây là checklist xin duyệt, không phải kết quả đã chạy.**

1. Backup mới, kiểm tra không có migration pending và app tương thích. Hiện migration đã applied, không cần deploy lại.
2. Người dùng xác nhận **nguồn công suất bơm đã ngắt thực tế**, ESP32 vẫn có nguồn riêng; không thay dây/GPIO theo suy đoán. Có phương án cắt nguồn khẩn cấp và người giám sát.
3. Xác minh firmware thực đang nạp báo PUMP_COMMANDS DISABLED/RELAY OFF ở Serial, và nếu cần Verify/build/hash bản nạp phù hợp mà không lộ config secrets. Chỉ file example false là chưa đủ. Nếu không xác minh được thì dừng.
4. Người dùng duyệt rõ **mở MQTT_COMMANDS_ENABLED=true chỉ cho thử khô**, giữ automation false; không bật ENABLE_PUMP_COMMANDS. Kiểm tra allowlist/device ONLINE và ACL runtime; ghi nhận trước/sau và kế hoạch trả commands=false.
5. Thử từ website đúng farm/zone/actuator, không gửi ON bằng công cụ MQTT để bỏ qua auth/UI. Lệnh ON dry-run: UUID mới, non-retained/QoS1; GPIO26 không HIGH; ACK REJECTED/PUMP_COMMANDS_DISABLED; DeviceCommand FAILED, không SUCCESS; OFF state riêng được commit và UI cuối OFF. Không có ACK → timeout FAILED, không xem là thành công.
6. OFF dry-run: GPIO LOW được xác nhận, ACK APPLIED nếu clock/payload/GPIO hợp lệ; DB SUCCESS, state OFF; không coi đó là bằng chứng motor/ngừng nước.
7. Kiểm tra khôi phục backend/broker và invalid ACK bằng môi trường thử cách ly hoặc unit tests, không cố tình phá broker live/đưa retained ON để thử trên hệ thống đang có thiết bị thật.
8. Kết thúc trả commands=false, automation=false, giữ firmware false. Không tự rollback dữ liệu command kiểm thử bằng DELETE; ghi rõ kết quả lịch sử.

Hiện chưa có xác nhận nguồn bơm ngắt/firmware binary và phê duyệt dry-run nên dừng ở readiness, không đổi `.env`.

## 8. Kế hoạch máy bơm thật 1 giây — giai đoạn sau, cần duyệt riêng

Chỉ sau dry-run REJECTED/OFF đạt và kiểm tra phần điện/cơ khí bởi người có chuyên môn phù hợp:

1. Phê duyệt riêng cho nạp firmware ENABLE_PUMP_COMMANDS=true và nối nguồn bơm; giữ automation false. Không dùng thay đổi firmware này trong Phase12D hiện tại.
2. Backend giới hạn MQTT_PUMP_MAX_RUN_SECONDS=1; firmware cap tối đa5 không được tăng. Kiểm chứng command thực phát có maxRunSeconds=1, issuedAt/expiresAt đúng UTC, không retained. Chuẩn bị công tắc/cắt nguồn vật lý, không chỉ dựa vào nút OFF qua mạng.
3. Một thao tác ON từ website bởi actor có quyền: PENDING → ACK APPLIED đúng UUID → trạng thái relay ON; firmware phải tự LOW khi đạt 1 giây, phát state OFF reason MAX_RUNTIME → DB/UI OFF. Không gửi lặp hoặc kéo dài runtime.
4. Nếu timeout/disconnect/lỗi GPIO, không coi UNKNOWN là an toàn vật lý đã xác nhận; người giám sát thực hiện phương án cắt nguồn. Đo/quan sát thực tế motor và nước riêng; ACK/GPIO không thay cho bằng chứng đó.
5. Kết thúc khóa commands=false, automation=false; quyết định firmware quay về false/nguồn bơm tách theo người vận hành. Không tự động lặp test để tìm thành công.

## 9. Bàn giao và kết luận

Chỉ tạo file báo cáo này trong Phase12D; không sửa source/ACL/config/feature flag/firmware, không restart service, không migration, không ghi DB hoặc publish command. Các build artifacts do compiler/test tạo cục bộ là bình thường, không phải thay source.

| Kết luận | Trạng thái |
| --- | --- |
| Migration Command hiện tại đã applied, không pending | PASS |
| Cấu trúc Command đang dùng tương thích | PASS cho các trường đã kiểm tra |
| ACL trên đĩa có đủ Command/ACK/State | PASS cấu hình, runtime publish/ACK NOT VERIFIED |
| Regression an toàn/Command/ACK offline | PASS |
| Source UI không optimistic ON, polling 2s | PASS kiểm tra source/test hook; UI click live NOT VERIFIED |
| Firmware đang nạp false + bơm đã ngắt nguồn | NOT VERIFIED tại thời điểm trial |
| Website → MQTT → ESP32 REJECTED/APPLIED → DB thật | NOT VERIFIED, chưa được phép thử |
| Điều khiển máy bơm thật 1 giây | NOT VERIFIED, ngoài quyền hiện tại |

**Sẵn sàng chuyển sang checklist xin duyệt dry-run an toàn, không đồng nghĩa đủ điều kiện tự bật commands hoặc website đã điều khiển máy bơm thật thành công.**
