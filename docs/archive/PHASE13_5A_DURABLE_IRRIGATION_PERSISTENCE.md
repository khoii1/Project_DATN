# Phase 13.5A — Durable irrigation persistence

Ngày 21/10/2026, UTC+7. Phạm vi: triển khai và kiểm thử SHADOW offline; không deployment production.

## 1. Kết luận

```text
DURABLE_PERSISTENCE_OFFLINE_PASS
OFFLINE_TESTS_PASS=500/500 (458 existing + 42 new)
BACKEND_TYPECHECK_PASS
SQL_ISOLATED_INTEGRATION_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_WIRING_NOT_ENABLED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false (implementation remains isolated; no runtime activation)
PHYSICAL_PUMP_NOT_TRIGGERED
```

Không gọi 42 tests mới là PostgreSQL integration. Chúng dùng fake repository và Prisma protocol doubles; không chứng minh SQL locking, durability sau process restart hoặc trigger thực tế. 38/38 SQL integration của Phase13.3B là bằng chứng lịch sử của phiên bản trước, không thay cho nghiệm thu thay đổi mới.

## 2. Files added / changed trong phase này

| File | Thay đổi |
| --- | --- |
| `backend/src/services/irrigation-persistence/repository.ts` | Contract thêm RELEASED, getBudget và getDecisionByKey |
| `backend/src/services/irrigation-persistence/foundation.ts` | cancelUnclaimed, persistent inhibit, audit event, dispatch inhibit, immutable evaluation replay/fingerprint |
| `backend/src/services/irrigation-persistence/postgres-test.repository.ts` | Mapping budget/audit lookup, actuator-scoped reads, audit collision validation; giữ guard test endpoint/server identity |
| `backend/scripts/irrigation-persistence-fake.cjs` | Hỗ trợ contract mới, negative quota bounds, không âm thầm bỏ qua audit collision |
| `backend/scripts/durable-irrigation.test.cjs` | 42 tests offline mới |
| `backend/prisma/proposals/irrigation-v2-isolated-review.sql` | SQL review v2, explicit test schema/identity guard, constraints và append-only trigger proposal; ROLLBACK mặc định |
| `backend/scripts/phase13-5a-readonly.cjs` | Diagnostic production SELECT riêng, READ ONLY, không import repository/gateway; output đã giới hạn, không secrets |
| `docs/PHASE13_5A_DURABLE_IRRIGATION_PERSISTENCE.md` | Báo cáo này |

Bằng chứng: `report/phase13-5a-offline-tests.tap`, `report/phase13-5a-readonly.json`, `report/phase13-5a-listeners.json`.

Không sửa main Prisma schema/migrations, legacy SensorReading/DeviceCommand/AutomationRule, firmware, MQTT wire schema, routes, evaluator, production startup, backend config hay credential. Worktree có nhiều thay đổi từ các phase trước; danh sách trên chỉ là phạm vi phase này.

## 3. Kiến trúc và sáu ledger

```text
FIXTURE/MOCK -> pure SHADOW engine -> IrrigationPersistenceFoundation
                                      -> IrrigationRepository transaction
                                         -> Fake (offline)
                                         -> guarded PostgresTest adapter
```

Không có dispatcher, MQTT callback, DeviceCommand writer, ACTIVE branch hoặc production connection factory. Foundation chỉ nhận repository SHADOW thuộc FAKE/ISOLATED_TEST; reserve chỉ nhận nguồn FIXTURE/MOCK. Không lấy LIVE_OBSERVED_NOT_VERIFIED làm VERIFIED_LIVE.

| Ledger | Contract / invariant |
| --- | --- |
| irrigation_cycles | Persist policy snapshot/version, session, phase, consumed reading keys/pulses, soak; CAS |
| irrigation_decision_logs | Evaluation key duy nhất; audit chỉ append/read, replay trả kết quả cũ; payload khác không ghi đè |
| irrigation_daily_budgets | Per actuator/mode/ngày UTC+7; version và bounds; không xóa budget cũ; clock/day high-water ngăn reset quota do rollback |
| irrigation_budget_reservations | Một reservation/intent; RESERVED → CHARGED / RELEASED / UNCERTAIN |
| irrigation_command_intents | Unique logical key, correlation và cycle/pulse; CAS; uncertain không được dispatch lại |
| irrigation_safety_states | Persist emergencyStop/manualOverride/fault/session/cooldown/clock/day high-water; không tự rearm |

Foundation và adapter hiện là nền tảng có thể tái sử dụng sau review production, **không phải production adapter đã được cấp phép triển khai**. Không bỏ hard guards để dùng với production.

## 4. Transaction boundaries / locking / idempotency

Mỗi operation một transaction, một actuator. Postgres adapter xác minh database/role/host/port/schema/server-start trong transaction, sau đó `SELECT ... FOR UPDATE` safety row có schema qualification. Mọi operation cùng actuator phải lấy coordinator lock này trước khi truy cập ledger; không lấy lock actuator thứ hai trong cùng transaction.

ReadCommitted + coordinator row lock tương đương serialization per actuator cho các writer tuân thủ repository. CAS yêu cầu version mới = expected+1 và đúng một row được cập nhật. Unique indexes/FKs từ proposal v1 là lớp phòng vệ bổ sung. Các update sau coordinator lock thuộc cùng transaction; lỗi audit/CAS/constraint làm rollback toàn bộ. Không tự retry transaction/dispatch.

- **Reserve:** safety lock → idempotency/evaluation lookup → persisted cycle/policy/clock/quota → budget+cycle+intent+reservation+decision+safety commit cùng nhau.
- **Duplicate intent:** trả REPLAY cùng intent, không tạo thêm reservation, không cấp quyền gửi lệnh.
- **Duplicate SKIP/BLOCK có audit:** evaluation key v2 phụ thuộc logical request key, fingerprint nằm trong evidence. Replay trả reason/outcome đã lưu; payload khác với cùng key bị IDEMPOTENCY_KEY_REUSED. Key v2 chỉ dùng dữ liệu thử mới; không backfill hay sửa audit v1. Trước production cần kế hoạch tương thích nếu đã có dữ liệu ledger phiên bản cũ.
- **Charge:** ACK_APPLIED mô phỏng chỉ sau PUBLISHED, reservation CHARGED trong cùng transaction. Budget counters vẫn chiếm quota đã sử dụng, không trừ lần hai.
- **Release:** chỉ intent RESERVED chưa từng claim/publish/ack, đúng session/correlation, reservation còn RESERVED. Trừ một run/seconds ở đúng budget ban đầu; RELEASED + CANCELLED + audit + fault latch cùng commit. Giữ consumed keys/pulses/day high-water; không tạo cơ hội retry ON từ reading cũ.
- **Release forbidden:** DISPATCH_CLAIMED/PUBLISHED/ACKED/UNCERTAIN/REJECTED; timeout, broker loss và dispatch không chắc chắn tiếp tục giữ quota. Cancel lặp không hoàn quota lần hai.
- **Recovery:** mọi open intent thành UNCERTAIN, cycle fault-locked, state UNKNOWN, session đổi; giữ quota/cooldown/emergency/manual override. Không gửi lại ON. Fake reconstruction không được coi là process restart PostgreSQL thực tế.

`inhibit()` chỉ tăng mức khóa: latch emergency-stop hoặc kéo dài manual override, không clear latch/shorten override. Emergency-stop vẫn được lưu khi clock rollback nhưng không giảm lastAcceptedTime. Các lifecycle claim/publish bị chặn sau inhibit; ACK là observation mô phỏng, không phải yêu cầu điều khiển. **Đây là software inhibit, không phải lệnh OFF khẩn cấp vật lý**.

Audit cancel/inhibit mang nguồn MOCK và `ledgerSimulationOnly=true`; không giả làm telemetry/ACK thực tế. Postgres adapter kiểm tra duplicate audit toàn bộ nội dung đã normalize, chỉ chấp nhận giống hệt; khác nội dung thì AUDIT_IDEMPOTENCY_CONFLICT và rollback. Không có update/delete audit trong contract.

## 5. PostgreSQL độc lập và migration proposal

Kiểm tra thực tế:

- `Get-NetTCPConnection`: không listener 55433.
- `pg_ctl.exe status -D C:\DATN\test-instances\phase13-3b\data`: `no server running`.
- Giữ test cluster đang dừng; không khởi tạo cluster mới, không mở service/Docker, không truy cập production để chạy integration thay thế.
- Chọn nhánh offline/fake được cho phép khi test instance không khả dụng. Không chạy lại 38 SQL tests cũ và không tuyên bố SQL integration PASS.

`irrigation-v2-isolated-review.sql` chỉ là **review/dry-run artifact** cho đúng database test, port55433, địa chỉ127.0.0.1 và migrator role. Tất cả table/function/trigger references đều schema-qualified; không sửa bảng legacy. V2 bổ sung settlement/dispatch ordering và trigger chống UPDATE/DELETE/TRUNCATE audit, kèm REVOKE cho app role. Cuối script là ROLLBACK; **chưa chạy hoặc syntax-check trên PostgreSQL thật**. Static tests không thay SQL execution.

Proposal v1 cung cấp six-table schema, composite RESTRICT FKs, unique idempotency/correlation/open-intent/open-cycle và quota bounds. Giữ nguyên proposal v1 để không phá bằng chứng Phase13.3B. V2 chưa phải migration production hoàn chỉnh: cần duyệt target schema, migration version, index/constraint catalog, least-privilege roles, existing-data compatibility và thử SQL/restore trên instance độc lập trước. Không `db push`, `migrate deploy`, DDL production hay production startup wiring.

## 6. Tests đã thực thi

```powershell
node --test backend/scripts/device-presence.test.cjs backend/scripts/mqtt-pump.test.cjs backend/scripts/shadow-irrigation.test.cjs backend/scripts/shadow-preview.test.cjs backend/scripts/irrigation-persistence.test.cjs backend/scripts/live-provenance.test.cjs backend/scripts/live-readiness.test.cjs backend/scripts/soil-metadata-proposal.test.cjs backend/scripts/durable-irrigation.test.cjs
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
node backend/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module commonjs --skipLibCheck backend/proposals/live-trust/soil-metadata-contract.ts
```

**500/500 PASS, 0 fail, 0 skip.** Backend và SOIL proposal typecheck PASS. 42 tests mới gồm:

- Atomic release/charge quota, duplicate cancellation, hai thứ tự cạnh tranh cancel/claim.
- Rollback tại cả sáu bước ghi của cancellation, rollback safety/audit khi inhibit.
- Forbidden release sau claim/publish/ACK/uncertain/rejection; clock rollback và session/correlation mismatch.
- Persistent emergency/manual inhibit qua fake reconstruction/recovery; không clear stop hoặc rút ngắn override; block dispatch khi inhibited.
- Audit immutability/conflict, replay SKIP/BLOCK và key reuse với payload khác.
- Sáu SQL identity mismatch gates; actuator scope, lock-before-access và CAS qua protocol double.
- V2 SQL artifact target qualification/default ROLLBACK và production import/network boundary.

458 tests cũ đã chạy lại, bao gồm concurrency fake, duplicate/idempotency, quota exhaustion, ACK timeout/broker disconnect, recovery PUBLISHED, clock/day rollback, telemetry/presence/pump policy, SHADOW, live observation/trust và SOIL metadata. MQTT/ACK/OFF trong tests đều mô phỏng. Không coi regression offline là kiểm chứng telemetry phần cứng hiện tại.

| Nhóm | Kết quả |
| --- | --- |
| Offline domain/fake/protocol regression | PASS 500/500 |
| TypeScript backend / SOIL proposal | PASS |
| SQL transactions trên hai connections/processes ở phiên bản mới | NOT_VERIFIED |
| Crash/restart PostgreSQL thật với thay đổi mới | NOT_VERIFIED |
| SQL v2 constraints/trigger thực tế | NOT_VERIFIED |
| Production migration / deployment | NOT_PERFORMED |
| Firmware / hardware / browser regression mới | NOT_PERFORMED |

## 7. Runtime safety snapshot — không sửa dịch vụ

SELECT trong transaction READ ONLY lúc **2026-10-21T14:42:22.148Z (21:42:22 UTC+7)** xác minh đúng database `smart_agriculture`, schema public, port5432. Đây là diagnostic riêng, không phải persistence adapter fallback.

- DeviceCommand PENDING=0.
- Device đang được DB ghi **OFFLINE**, lastSeenAt `2026-10-21T12:06:15.174Z`.
- PUMP_01 lưu OFF, lastStateChangedAt `2026-10-21T12:06:14.500Z`: **lịch sử, không phải fresh OFF/current physical proof**.
- Cổng5000 không listener cả trước và sau; không gọi API control/login hay khởi động backend.
- Broker LAN1883 PID21012, loopback brokerPID4572; production PostgreSQLPID7848 giữ nguyên trong các snapshot. Không restart hoặc sửa cấu hình.
- Ba flag không có override trong backend/.env; theo defaults của env.ts: Commands=false, Automation=false, TestMode=true. **Runtime process flags NOT_VERIFIED vì API5000 không chạy**; shell/process override khi một process khác khởi động không được suy ra từ .env.
- Không chạm phần cứng/COM/nguồn. Adapter bơm phải tiếp tục rút điện theo yêu cầu; phase này không đo được trạng thái nguồn vật lý.

Không xử lý MQTT/runtime outage trong phase persistence này. Cần phục hồi/kiểm chứng runtime riêng trước mọi nghiệm thu live, không lấy OFF cũ hoặc kết quả offline để vượt safety gates.

## 8. Còn thiếu trước production / giai đoạn sau

1. Nghiệm thu thay đổi mới trên test cluster đã xác minh PGDATA/endpoint/role/server-start: hai connections/processes, SQL rollback, duplicate release/claim races, process crash/restart, audit privileges/triggers và versioned migration constraints.
2. Hoàn thiện/review production adapter và schema-qualified migration bằng approval riêng; không bỏ test guards hoặc dùng DATABASE_URL fallback. Safe initialization/rearm/cycle lifecycle và recovery policy production vẫn cần thiết kế/approval; hiện không có API tự clear latch.
3. Coordination với manual commands/outbox/dispatcher production chưa triển khai; phase này không tạo DeviceCommand. Một actuator lock chỉ bảo vệ các writer tuân thủ cùng protocol.
4. Publisher/device identity/session anti-replay, fresh OFF provenance, clock-health và approved SOIL calibration/quality/live adapter còn chưa đủ. Không nâng trust từ fixture/historical evidence.
5. Production ledger deployment, durable safety/budget/idempotency vận hành thực và VERIFIED_LIVE gates chưa nghiệm thu. ACTIVE automation không được bật.
6. Cloud/custom-backup scope của staging vẫn NOT_VERIFIED; không đặt credentials/artifacts chứa secrets vào staging. Không rotation/flash, không sửa Windows Time.

Dừng tại Phase13.5A. Không tự chuyển Phase13.5B, production migration hoặc thử máy bơm.
