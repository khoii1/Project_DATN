# Phase 13.5A.1 — Isolated PostgreSQL integration & runtime diagnostics

Ngày **22/10/2026, UTC+7**. Các timestamp có hậu tố Z bên dưới là UTC; 18:00Z ngày21/10 tương ứng01:00 ngày22/10 tại Việt Nam.

## 1. Kết luận

```text
SQL_ISOLATED_INTEGRATION_PASS — 59/59 real PostgreSQL cases
OFFLINE_REGRESSION_PASS — 501/501 (500 existing + 1 new regression)
BACKEND_TYPECHECK_PASS
RUNTIME_BACKEND_STATUS_DIAGNOSED — BACKEND_NOT_RUNNING
BACKEND_EXIT_ROOT_CAUSE_UNKNOWN
ESP32_CONNECTIVITY_CONFIRMED — fresh user Serial + LAN TCP corroboration
MQTT_CONNECTED_BUT_NOT_INGESTED — fresh Serial PUBACK, matching database rows=0
DB_PRESENCE_STALE — not a current ESP32 connectivity measurement
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_STARTUP_UNCHANGED
TEST_CLUSTER_STOPPED_GRACEFULLY — DATA_AND_LOGS_RETAINED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false — no activation performed; serving runtime flags NOT_VERIFIED
PHYSICAL_PUMP_NOT_TRIGGERED
```

ESP32 connectivity confirmation ở đây là xác minh vận hành dựa trên log người dùng và TCP, **không phải authenticated publisher/device identity assurance**, không nâng trust thành VERIFIED_LIVE. Không khởi động production backend để lấy kết quả PASS.

## 2. Runtime diagnostics — chỉ đọc

Snapshot SQL trước: `2026-10-21T17:54:09.876Z` (00:54:09 ngày22/10 UTC+7). Snapshot SQL cuối: **`2026-10-21T18:04:05.343Z`** (01:04:05 ngày22/10).

### Backend

- Không listener cổng5000; snapshot process sau test không có Node backend. Kết luận **BACKEND_NOT_RUNNING**, không phải chỉ API health trả lỗi.
- `build/phase13-4a/backend-final.out.log` cập nhật cuối `2026-10-21T12:06:15.103Z`; stderr cập nhật cuối `12:06:50.091Z` (19:06 UTC+7 ngày21/10).
- Stderr có `MQTT disconnected` và **`ECONNREFUSED 172.20.10.2:1883`**. Đây là bằng chứng backend từng không kết nối được broker vào thời điểm log, **không chứng minh đây là nguyên nhân process cuối cùng thoát**.
- Không thấy signature SIGINT/SIGTERM/Graceful shutdown hoặc Prisma crash trong các log đã đọc. Truy vấn Windows Application events1000/1001 trong24giờ không có entry nhắc node.exe; không coi điều đó là bằng chứng process chưa từng lỗi.
- **Root cause cuối cùng của process exit: UNKNOWN**. Không đủ exit code/process supervisor log để phân biệt người dùng đóng terminal, bị kết thúc từ bên ngoài hoặc lỗi không được capture. Không sửa MQTT reconnect/firmware hay quy kết lỗi firmware từ DB OFFLINE.
- Health/clock endpoint và runtime Commands/Automation/TestMode: **NOT_VERIFIED**, vì không có backend phục vụ5000. File `.env` không override ba flag; source defaults false/false/true chỉ là cấu hình dự kiến, không phải runtime attestation.

### Broker / ESP32 / presence

- Wi-Fi Windows: **172.20.10.2**. LAN1883 PID**21012** lắng nghe0.0.0.0/::; instance loopback riêng PID**4572**. Không restart cả hai.
- Có TCP Established `172.20.10.2:1883 ↔ 172.20.10.3` ở các snapshot. Remote port thay đổi56970→56971 trong khoảng quan sát; không diễn giải là firmware lỗi. Không có backend Node MQTT client hiện hành.
- Không đọc được CommandLine/ExecutablePath của broker PID21012 với token hiện tại. Không dùng cấu hình/PID audit cũ để khẳng định lại effective config của process mới. Log broker được tìm thấy là log lịch sử, không đủ để coi là packet capture của session hiện tại. Không elevate, đổi ACL hoặc tạo MQTT subscriber mới.
- Người dùng cung cấp **Serial frame#871** mới lúc **`2026-10-21T18:03:18.345Z`** (01:03:18 ngày22/10): WiFi CONNECTED, MQTT CONNECTED, NTP SYNCED, PUMP_COMMANDS ENABLED, RELAY OFF GPIO; TELEMETRY SENT/BROKER_PUBACK, publish81ms.
- Frame này có TEMP22.90, HUM59.90, LIGHT0.00, SOIL8.53; ADC3330/min3318/max3344. Nguồn là Serial do người dùng gửi, không phải agent mở COM. Không nhầm LIGHT=0 với missing data.
- Serial mới + LAN TCP đối chiếu cho phép kết luận vận hành **ESP32 đang kết nối MQTT**, không phải ESP32_ACTUALLY_DISCONNECTED. TCP riêng lẻ không chứng minh principal/client identity; PUBACK không chứng minh backend đã ingest.
- DB vẫn lưu OFFLINE/lastSeen `12:06:15.174Z`; PUMP_01 OFF/stateAt `12:06:14.500Z`, gần6giờ trước snapshot cuối. Đây là **DB_PRESENCE_STALE / historical OFF**, không phải báo cáo relay mới hoặc xác minh motor/nước.
- SELECT đúng timestamp frame871, sourceMQTT, đúng device và bốn sensor: **0 matching rows**. Bốn MQTT readings mới nhất trong DB vẫn cùng timestamp `2026-10-21T12:06:09.759Z`, receivedAt `12:06:10.096Z`.

Do đó điểm đứt luồng đã xác định ở mức vận hành: **backend ingestion không chạy**, trong khi ESP32 vẫn báo gửi thành công tới broker. Không kết luận payload bị validator từ chối hoặc firmware lỗi vì không có backend đang xử lý để quan sát điều đó. Không tự phục hồi production trong phạm vi phase này.

Truy vấn đối chiếu, đã thực hiện qua Prisma trong transaction `READ ONLY`:

```sql
SELECT count(*)
FROM public.sensor_readings sr
JOIN public.sensors s ON s.id = sr.sensor_id
JOIN public.devices d ON d.id = s.device_id
WHERE d.device_code = 'ESP32-GF-A-01'
  AND s.sensor_code IN ('TEMP_01','HUM_01','SOIL_01','LIGHT_01')
  AND sr.source = 'MQTT'
  AND sr.recorded_at = TIMESTAMP '2026-10-21 18:03:18.345';
-- Prisma parameterized equivalent executed; matchingMqttRows = 0.
```

Legacy SensorReading dùng DateTime mặc định (timestamp không timezone) và lưu UTC theo mapping Prisma, nên SQL minh họa dùng TIMESTAMP UTC-naive, không implicit cast từ timestamptz theo timezone session. Evidence authoritative là exact Date parameter trong diagnostic script và JSON output; không đổi storage contract.

## 3. Identity gates trước khi start / DDL

| Thuộc tính | Test | Production, chỉ SELECT |
| --- | --- | --- |
| PGDATA | `C:\DATN\test-instances\phase13-3b\data` | `C:/Program Files/PostgreSQL/17/data` |
| System identifier | **7698826681383327460** | **7472695863566132416** |
| Port/binding | **127.0.0.1:55433** |5432 |
| Database |smart_agriculture_test_phase13_3b |smart_agriculture |
| Schema |phase13_test_phase13_3b |public |
| Runtime test role |phase13_test_app |Không dùng role production cho test |

- `pg_controldata` xác minh cluster cũ **shut down**, PG_VERSION17, system identifier khác production; `pg_ctl status` báo không server;55433 trống.
- Canonical path/realpath và symlink checks trên C:\DATN, test-instances, instance root và PGDATA không có redirect ngoài dự kiến. File config test bindloopback/55433 đúng; không initdb, không tạo cluster/role/database mới.
- Production SQL xác minh PGDATA/system ID/start khác test trước khi start. Cluster test đang shut down cùng PGDATA riêng là bằng chứng không có production server đang phục vụ bằng PGDATA test.
- Sau start và trước DDL: SQL admin test kiểm tra PGDATA/system ID; migrator/app kiểm tra exact db/user/host/port/schema. Adapter mỗi transaction vẫn kiểm tra server-start proof; không dùng proof server cũ từ13.3B.
- App role: NOSUPERUSER/NOCREATEDB/NOCREATEROLE, không sở hữu audit; migrator sở hữu audit. Credentials chỉ lấy từ test instance cũ, không in password/hash/URL hay fallback DATABASE_URL production.

## 4. SQL v2 — có COMMIT thực tế

Lượt đầu runId `a81120ae-6f63-4636-ab02-65b74b3c1b85`:

1. Start test server **00:58:25.362247 ngày22/10 UTC+7**.
2. Kiểm tra v1 constraints đã tồn tại; đọc catalog trước DDL. Không replay11 migration nền hoặc reset schema đã có.
3. Chạy `irrigation-v2-isolated-review.sql` bằng psql/ON_ERROR_STOP: **exit0**, syntax/constraints/triggers thành công, ROLLBACK đúng dry-run.
4. Chạy artifact riêng `irrigation-v2-isolated-apply.sql`: **exit0, COMMIT thực tế**. Không thay ROLLBACK rồi giả vờ durable; đây là execution artifact riêng được phase này cho phép trên test.
5. V2 thêm settlement/dispatch order CHECK và audit UPDATE/DELETE/TRUNCATE trigger, REVOKE app quyền mutate. Không tác động bảng production/legacy.

SHA256 apply artifact: `33eb31404ccdac7ab5dd2cf778330cb3b6796128733938739c5170ecfd088e5d`.

Lượt đầu có **53 PASS, 1 FAIL rồi dừng**. Agent dừng graceful cluster lúc **00:58:40.026**, giữ nguyên migration đã commit và toàn bộ data/log/failed evidence.

Lượt cuối runId `73d53627-a2bb-434c-aed6-f21b9c88979c`:

- Start lại đúng cluster **00:59:42.466625**. V2 đã commit vẫn tồn tại sau clean database restart.
- Resume chỉ khi hash/instance proof của lượt trước khớp, cả hai CHECK validated, hai trigger enabled và function có expected append-only body. Không DROP/reapply hay nới constraint để chạy lại.
- Suite bắt đầu `17:59:43.260Z`, kết thúc `17:59:54.962Z`: **59/59 PASS**.
- Graceful stop hoàn tất **00:59:55.431**; `pg_ctl status`: no server running, control state shut down,55433 không listener. PGDATA/log/credential test hiện có giữ nguyên, không cleanup phá hủy.

## 5. Lỗi code phát hiện và sửa

`IrrigationPersistenceFoundation.inhibit()` trước đây tạo audit key từ `actuatorId + safety.version`. Trong fixture PostgreSQL giữ audit lịch sử, cycle mới khởi tạo safety version đã từng dùng khiến inhibit khác bị **AUDIT_IDEMPOTENCY_CONFLICT**. Fake test cũ dùng store mới cho từng case nên chưa bắt được.

Sửa đúng audit namespace thành:

```text
inhibit:{actuatorId}:{cycleId}:{sessionId}:{nextSafetyVersion}
```

Không reset version/cycle production, không xóa audit, không bỏ collision check và không nới constraint. Thêm một offline regression dùng cùng store với cycle/session mới và version fixture lặp. Test SQL manual override cùng toàn bộ suite chạy lại PASS. Trường hợp fixture initialization này không được diễn giải thành API cho phép reset safety version production.

## 6. PostgreSQL thật — 59 cases

38 cases kế thừa chạy lại với code hiện tại +21 cases mới. Không tính mỗi assertion là một test.

| Nhóm | Bằng chứng thực tế |
| --- | --- |
| Six-ledger reserve | Budget/reservation/intent/audit/cycle/safety commit cùng transaction; một intent/reservation và quota1; replay không reserve lại |
| SQL faults | FK/CHECK injection rollback budget/intent/reservation/audit và version; thêm6 cancellation fault points sau ghi, so sánh toàn ledger trước/sau |
| Hai connections/processes | Same/different key chỉ một reservation; childPIDs lưu evidence; hai process duplicate cancel chỉ RELEASED một lần |
| FOR UPDATE | Quan sát pg_stat_activity + pg_blocking_pids: connection thứ hai chờ Lock cho đến khi coordinator transaction commit |
| CAS | JS version guard và SQL stale-version update-count0; không đổi emergency latch do stale write |
| Quota / day | Exhaustion không reset từ snapshot, UTC+7 midnight tách budget giữ ngày cũ; clock/day rollback latch fault |
| Release / charge | Cancel RESERVED chưa claim → RELEASED/quota0/audit; duplicate cancel không refund lần2; claim/publish không refund; ACK_APPLIED mô phỏng charge và fresh OFF→SOAK |
| Cancel/claim race | Chỉ một trong hai nhánh thắng; không có published/claimed intent được hưởng quota miễn phí |
| Emergency / override | Ghi qua foundation, đọc từ process mới; emergency chặn claim; override chỉ kéo dài, không tự clear sau process exit |
| Audit | App UPDATE/DELETE/TRUNCATE thực sự trả **42501**; owner cùng thao tác bị trigger trả **P0001**; audit row trước/sau không đổi |
| Audit idempotency | Identical append được chấp nhận, conflicting content rollback; SKIP replay giữ kết quả cũ, key tái dùng payload khác bị từ chối |
| Crash/restart | Kill worker thật trước commit: PostgreSQL rollback. Kill sau commit/claim/publish/ACK: process mới đọc cùng intent, recovery giữ quota/UNCERTAIN/fault/UNKNOWN, không redispatch |
| SQL v2 / v1 | CHECK/FK/unique/partial indexes/provenance constraints hoạt động; v2 settlement và dispatch ordering từ chối invalid writes |
| Serialization | Hai transaction SERIALIZABLE cạnh tranh, một commit/một SQLSTATE40001 |

Ví dụ process evidence lượt cuối: concurrent same-key PID6004/9208; kill-before-commit19348; crash-PUBLISHED20460 → process mới18188 → inspection2072; duplicate cancellation8728/10780. Đây là child test processes, không phải backend production.

Toàn bộ MQTT/ACK/OFF của SQL suite là **mô phỏng**, không kết nối broker/gateway. Device code trùng target engine nhưng nằm trong database test riêng và chỉ là synthetic fixture. Test DB vẫn **DeviceCommand0 / SensorReading0 / AutomationRule0**. Tổng audit232 là lịch sử các attempts/cases, **không phải232 tests**.

Giữa cases, migrator đóng cycle/archive open intent fixture và khởi tạo safety fixture mới như13.3B; không DELETE/TRUNCATE/reset database. Evidence chụp trạng thái từng case trước archive; audit không sửa. Không dùng fixture cleanup như thuật toán rearm production.

Đã kiểm tra worker crash/process restart và clean test cluster restart. **Chưa thử PostgreSQL power-loss/WAL corruption/Windows reboot**, không tuyên bố những hạng mục đó PASS.

Trigger từ chối DML/TRUNCATE trực tiếp của owner, nhưng owner/superuser vẫn có thể ALTER/DROP/disable trigger nếu được cấp quyền quản trị. Không quảng cáo đây là cơ chế chống DBA tampering hoặc cryptographic audit sealing.

## 7. Offline regression / typecheck

```powershell
node --test backend/scripts/device-presence.test.cjs backend/scripts/mqtt-pump.test.cjs backend/scripts/shadow-irrigation.test.cjs backend/scripts/shadow-preview.test.cjs backend/scripts/irrigation-persistence.test.cjs backend/scripts/live-provenance.test.cjs backend/scripts/live-readiness.test.cjs backend/scripts/soil-metadata-proposal.test.cjs backend/scripts/durable-irrigation.test.cjs
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
```

**501/501 PASS,0 FAIL,0 SKIP**:500 tests hiện có +1 audit namespace regression. Backend typecheck PASS. Không browser/hardware tests mới, không flash hay thay firmware hotfix.

## 8. Production safety / bằng chứng

Before/after READ ONLY snapshot:

- Production start vẫn `2026-10-16 12:13:43.656514+07`, system ID/PGDATA không đổi; listenerPID7848 giữ nguyên.
- DeviceCommand **43→43**, PENDING **0→0**; SensorReading **28135→28135**, AutomationRule **1→1**.
- Main schema/startup không sửa; repository vẫn không được production import. Không áp dụng migration5432, không ghi production rows, không restart backend/broker/service, không mở COM/reset/flash, không MQTT ON/OFF và không enable flags.
- SHA256 main Prisma schema vẫn `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`, trùng bằng chứng13.3B. Worktree có diff startup/schema từ phase trước so với Git; không hoàn nguyên hoặc gán các diff cũ đó thành thay đổi13.5A.1.
- Firmware thực tế ENABLED theo Serial của người dùng, nhưng backend command/automation không được mở trong phase này. Không khẳng định serving runtime flags đã verified từ `.env` khi process không chạy.
- Adapter bơm phải giữ rút điện theo scope. Agent không thao tác nguồn, không có xác minh nguồn độc lập hoặc motor/water feedback.
- Không sử dụng secret staging; không sửa credential/broker ACL/firewall/network/Windows Time. Không lộ password/hash/token trong output/report.

Evidence trong repository (không có credentials):

- [SQL integration results](../report/phase13-5a1-postgresql-results.json):59 cases, identity, PID/SQLSTATE, ledger snapshots synthetic và summary attempt lỗi.
- `report/phase13-5a1-sql-run-a81120ae-6f63-4636-ab02-65b74b3c1b85.json`: dry-run +COMMIT hashes, attempt lỗi và shutdown.
- `report/phase13-5a1-sql-run-73d53627-a2bb-434c-aed6-f21b9c88979c.json`: catalog proof sau restart, finalPASS và shutdown.
- `report/phase13-5a1-runtime-before.json`, `...runtime-after.json`, `...process-network.json`, `...serial-user-evidence.json`.
- `report/phase13-5a1-offline-tests.tap`.

Logs/PGDATA/fixtures và các attempts đầy đủ tiếp tục nằm tại `C:\DATN\test-instances\phase13-3b`. Credentials test chỉ ở protected instance cũ, không copy vào repository/staging/report.

## 9. File changes

Sửa:

- `backend/src/services/irrigation-persistence/foundation.ts`: audit namespace cycle/session.
- `backend/scripts/durable-irrigation.test.cjs`: regression mới.

Thêm:

- `backend/scripts/phase13-5a1-run-isolated.cjs`: existing-cluster identity/start/DDL/run/stop lifecycle; không initdb hoặc production fallback.
- `backend/scripts/phase13-5a1-integration.cjs`:59 SQL cases, kế thừa harness13.3B nhưng dùng proof/output/approval mới; không ghi đè evidence13.3B.
- `backend/scripts/phase13-5a1-runtime-readonly.cjs`: diagnostic SELECT transaction READ ONLY, exact target và Serial correlation.
- `backend/scripts/phase13-5a1-export-evidence.cjs`: synthetic export và production before/after assertions.
- `scripts/phase13-5a1-runtime-snapshot.ps1`: read-only processes/listeners/network và sanitized Windows events.
- `backend/prisma/proposals/irrigation-v2-isolated-apply.sql`: approved test-only COMMIT variant; proposal review mặc định ROLLBACK giữ nguyên.
- Báo cáo/evidence nêu trên. Không thay package/dependencies, main Prisma schema hoặc production startup.

## 10. Blockers trước production / next phase

1. Backend process exit root cause chưa xác định đầy đủ; cần phiên khôi phục runtime riêng có phối hợp, không tự restart ở phase này. Sau phục hồi phải chứng minh MQTT→DB→API mới/fresh OFF, không lấy Serial PUBACK hoặc OFF cũ thay DB/API.
2. Production adapter, schema-qualified/versioned migration plan, least-privilege roles, deployment/rollback/restore và data compatibility vẫn cần review/phê duyệt riêng. SQL v2 artifact hiện cố định target test nên không chạy được production.
3. Publisher/device identity/session anti-replay, SOIL calibration/quality và clock-health trust vẫn chưa đủ cho VERIFIED_LIVE. Serial NTP SYNCED không nghiệm thu callback refresh/recovery dài hạn hoặc Windows clock offset.
4. Không có production dispatcher/outbox/manual occupancy coordination/rearm authorization được bật; UNCERTAIN vẫn fail-closed và giữ quota.

**Dừng tại Phase13.5A.1. Không tự chuyển13.5B, migration production, ACTIVE automation hoặc thử bơm.**
