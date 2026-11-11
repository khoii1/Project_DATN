# Báo cáo Phase 12 — MQTT pump command/ACK

## A. Tổng quan

Đã triển khai source backend/frontend, gateway MQTT dùng client sẵn có, lifecycle ACK/timeout/disconnect/restart, state OFF, feature flags, quyền/scoping, server runtime cap và UI chờ ACK. Không còn default mock trong REST/automation production path. Chưa tích hợp/nạp firmware, chưa thử điều khiển bơm thật, chưa áp dụng migration/ACL trên broker thực tế.

Truy vấn chỉ đọc PostgreSQL: ESP32-GF-A-01 có PUMP_01/PUMP, hardwareChannel RELAY_1, device OFFLINE, stored state OFF. Bốn cột migration mới chưa tồn tại. Không chạy backend mới trước khi người vận hành duyệt và deploy migration, dù COMMANDS_ENABLED vẫn false.

## B. File thay đổi thuộc Phase 12

Tạo mới:

- `backend/src/gateways/mqtt-device.gateway.ts`: gateway kiểm chứng ACK, pending/timer, hủy/restart, dependency-injected transport.
- `backend/src/gateways/mqtt-gateway.runtime.ts`: singleton gateway.
- `backend/src/mqtt/mqtt-command-channel.ts`: kết nối gateway với client đang quản lý.
- `backend/src/mqtt/mqtt-pump-state.adapter.ts`: state OFF, startup recovery, timeout sweep.
- `backend/prisma/migrations/20261014090000_mqtt_pump_commands/migration.sql`: migration additive, chưa apply.
- `backend/scripts/mqtt-pump.test.cjs`: unit + service/fake DB/client integration, không network/DB thật.
- `docs/ESP32_PUMP_MQTT_INTEGRATION.md`, tài liệu báo cáo này.

Sửa:

- `backend/prisma/schema.prisma`: DeviceCommand thêm transport/expiresAt/maxRunSeconds/acknowledgedAt; giữ status enum và ID.
- `backend/src/config/env.ts`, `backend/.env.example`: feature flags, allowlist, duration/expiry bounds.
- `backend/src/gateways/device.gateway.ts`: callback async, publish receipt, metadata.
- `backend/src/mqtt/mqtt-client.service.ts`: managed publish QoS1/non-retain, subscription ACK/state, queue tách telemetry, discard outgoing ON khi disconnect, fail-closed store readiness.
- `backend/src/services/device-command.service.ts`: REST MQTT thật, không mock fallback, RBAC, serialization/reservation, OFF priority, ACK guarded persistence, runtime cap, manual priority.
- `backend/src/services/automation-evaluation.service.ts`: outcome PENDING, không đánh FAILED khi đang chờ ACK.
- `backend/src/controllers/actuator.controller.ts`, `backend/src/validators/device-command.schema.ts`: body duration và HTTP 202 khi pending.
- `backend/src/services/actuator.service.ts`, `backend/src/repositories/actuator.repository.ts`: metadata control/latest command và view/summary UNKNOWN khi không còn quan sát được trạng thái.
- `backend/src/services/presence-watchdog.service.ts`: giữ presence policy, bổ sung command/state maintenance.
- `backend/package.json`: test:pump; `backend/scripts/device-presence.test.cjs`: cập nhật mocks và assertion ON guard cho gateway mới.
- `frontend/src/types/actuator.ts`, `frontend/src/services/actuator.service.ts`: metadata command/control và AbortSignal.
- `frontend/src/pages/irrigation/IrrigationPage.tsx`: polling 2 giây khi manual/history, pause hidden, cancellation, không success giả, khóa ON pending, OFF ưu tiên, lỗi command, history chỉ tải khi mở tab history.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: chờ ACK, dùng metadata latest command, khóa nhấn trùng, vẫn polling 10 giây.
- `frontend/src/pages/devices/DeviceDetailPage.tsx`: diễn đạt relay, UNKNOWN khi mất presence; polling 10 giây hiện có.
- `infrastructure/mosquitto/acl.example`: quyền state, không sửa cấu hình ngoài workspace.
- `docs/IOT_MQTT.md`: cập nhật tình trạng command/ACK và liên kết hợp đồng firmware.

Các thay đổi auto-refresh/presence đang có trong worktree từ các giai đoạn trước được giữ; thư mục report của người dùng không chỉnh sửa.

Endpoint không đổi URL: POST /api/actuators/:id/commands. Bổ sung maxRunSeconds, HTTP 202 pending; GET actuator bổ sung gatewayMode/controlEnabled/latestCommand; history thêm metadata. Không thay JWT/RBAC/farm scope, telemetry schema, sensor readings, migration cũ hoặc ID.

## C. Giao thức

Command `.../devices/ESP32-GF-A-01/commands/PUMP_01`; ACK `.../command-acks/PUMP_01`; state `.../actuator/state`. Prefix `smart-agriculture/v1`. QoS1, retain false. Command/ACK bắt buộc actuatorCode. JSON chính xác, tolerance clock, state reason, firmware ordering/cache và fail-safe trong [hợp đồng firmware](ESP32_PUMP_MQTT_INTEGRATION.md).

Default expiry/ACK deadline 10 giây, max ON 5 giây, cap cấu hình 30 giây. Chỉ APPLIED ACK hợp lệ chuyển SUCCESS; PUBACK chỉ sentAt. Không tự retry ON. OFF supersedes pending ON; duplicate/late/mismatched/retained ACK không cập nhật actuator. State OFF cập nhật có điều kiện timestamp, không có unsolicited ON. Pending/SENT không phải đã chạy.

## D. Kiểm thử và bằng chứng

Đã chạy:

- Backend `npm run prisma:generate`: pass, chỉ tạo client cục bộ.
- Backend `npm run build`: pass (TypeScript backend; repo không có lint backend riêng).
- Backend `prisma validate`: schema hợp lệ; có cảnh báo cấu hình package.json#prisma deprecated, không tự nâng package.
- Backend `npm run test:pump`: 26 pass / 0 fail, fake MQTT và fake database, không live integration.
- Backend `npm run test:presence`: 21 pass / 0 fail, bao gồm telemetry/presence regressions.
- Frontend `npm run test:polling`: 12 pass / 0 fail, StrictMode, overlap, abort, scope races, hidden tab, recovery.
- Frontend `npm run lint`: pass.
- Frontend `npm run build`: pass, bao gồm TypeScript check và Vite artifact cục bộ.

Build frontend có cảnh báo bundle chính vượt 500 kB, không phải lỗi build. Không thay bundling/kiến trúc ngoài phạm vi. Dashboard/Irrigation có command-generation guard bổ sung: response polling bắt đầu trước hoặc trong POST control không được ghi đè snapshot command mới từ POST. Đây là kiểm tra source/typecheck; chưa chạy browser E2E cho tương tác này.

26 pump tests bao phủ ON/OFF publish, ACK APPLIED/REJECTED, timeout, broker/device offline, expiry, duplicate/mismatch/retained/late ACK, ON conflict/OFF supersession, restart/no replay, auto-OFF adapter, server cap, allowlist, flags, automatic opt-in, farm scope/STAFF permission và client QoS/subscription/listener lifecycle. 21 presence tests tiếp tục kiểm tra telemetry ingestion/retained/freshness/watchdog.

Test lần đầu phát hiện mocks presence chưa cô lập module adapter mới và assertion cũ dùng enum literal: đã sửa harness, giữ nguyên kiểm tra policy/farm scope, chạy lại pass. Không chạy suite API phase 2–11, seed/simulator/migration có thể ghi DB. Không tạo real broker disconnect, không publish command thật. Không kiểm chứng browser tương tác hoặc relay/GPIO bằng phần cứng; build/unit test không thay E2E.

SQL bằng chứng đã thực thi, chỉ đọc:

```sql
SELECT d.device_code, d.connection_status, a.actuator_code, a.type,
       a.current_state, a.hardware_channel
FROM devices d LEFT JOIN actuators a ON a.device_id = d.id
WHERE d.device_code = 'ESP32-GF-A-01';
-- ESP32-GF-A-01 | OFFLINE | PUMP_01 | PUMP | OFF | RELAY_1

SELECT column_name FROM information_schema.columns
WHERE table_name = 'device_commands'
AND column_name IN ('transport','expires_at','max_run_seconds','acknowledged_at');
-- 0 rows: migration Phase 12 chưa apply.
```

## E. Vận hành và giới hạn

Giữ COMMANDS_ENABLED và AUTOMATION_COMMANDS_ENABLED false. Cần backup/review/deploy migration trước start code mới, review ACL mẫu và cấu hình thực tế ngoài workspace, phát triển firmware đúng hợp đồng, kiểm thử relay khi ngắt nguồn motor, rồi mới opt-in ON 1 giây có giám sát. Chi tiết lệnh PowerShell/SQL/CLI MQTT test riêng trong hợp đồng firmware.

Giới hạn chưa giải quyết: một backend instance (chưa distributed command ownership), ACK không có chữ ký riêng và dựa vào broker ACL/credential, MQTT.js 5.x queue-readiness guard dùng private properties nên cần re-test khi nâng thư viện; chưa có HTTP idempotency-key retry contract; ON ngắn có thể không xuất hiện trên dashboard polling 10 giây; ACK/GPIO không chứng minh nước chảy; migration/ACL và E2E PostgreSQL thật/browser/ESP32 chưa được kiểm chứng. OFF không vượt được broker mất kết nối hoặc tài nguyên bị vô hiệu hóa: fail-safe phần cứng/firmware và ngắt nguồn tại chỗ vẫn bắt buộc.

## F. Hợp đồng firmware

Tài liệu bàn giao chính: [ESP32_PUMP_MQTT_INTEGRATION.md](ESP32_PUMP_MQTT_INTEGRATION.md). Giữ telemetry bốn sensor, bổ sung MQTT command/ACK và state OFF, GPIO26 LOW startup, max-runtime monotonic, cache UUID/high-water mark, NTP và OFF khi Wi-Fi/MQTT mất. Chưa được tuyên bố điều khiển bơm thật thành công.
