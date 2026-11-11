# Phase 13.5B.1 — Isolated production migration rehearsal

Ngày22/10/2026, UTC+7. Phạm vi: PostgreSQL test cluster đã có, database rehearsal mới, synthetic fixtures; không deploy production.

## 1. Kết luận

```text
ISOLATED_MIGRATION_REHEARSAL_PASS — 35/35 real PostgreSQL cases
ROLE_PRIVILEGES_INTEGRATION_PASS — effective permissions and real non-admin logins
SQL_PRODUCTION_ARTIFACT_READY — SQL/permission review scope, TEST-MAPPED execution only
OFFLINE_REGRESSION_PASS — 528/528
BACKEND_TYPECHECK_PASS
TEST_CLUSTER_STOPPED_GRACEFULLY — retained all databases/data/logs
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_REPOSITORY_NOT_WIRED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

READY không phải permission để deploy: còn backup/restore rehearsal, deployment window, Prisma history/promotion và least-privilege production provisioning cần phê duyệt riêng. **Không chạy SQL production với target nguyên trạng**: đã chạy bản mapped sang target test, mapping đảo ngược được kiểm tra byte-for-byte. Không nâng ACTIVE/VERIFIED_LIVE hoặc thử bơm.

## 2. Test identity / môi trường và shutdown

| Thuộc tính | Kết quả thực tế |
| --- | --- |
| PostgreSQL |17.2 native, binary cài sẵn|
| Endpoint |127.0.0.1:55433|
| PGDATA |C:/DATN/test-instances/phase13-3b/data|
| System identifier |7698826681383327460|
| Production system ID bị loại khỏi test target |7472695863566132416|
| Maintenance DBA |phase13_test_admin, credential test có sẵn chỉ dùng RAM|
| Final run |20261022070417_4deb58|
| Final run begin/end UTC |07:04:17.724Z →07:04:32.476Z|
| Final server start |2026-10-22 14:04:17.960606+07|
| After tests |pg_ctl: no server running; control state shut down; không listener55433|

Trước start: PG_VERSION17, pg_controldata exact system ID/shut down; canonical path/no unexpected reparse ở C:\DATN/test-instances/instance/PGDATA, port55433 trống, postgresql.conf bind127.0.0.1/55433. Không initdb, Docker, Windows service hoặc fallback production. Sau start/trước DDL: SQL xác minh PGDATA/system ID, exact db/current role/address/port/server-start. Psql child environment bỏ PG* kế thừa rồi đặt endpoint cố định, không dùng DATABASE_URL.

Các database final-run mới, public schema riêng trong từng DB:

| DB | Mục đích / trạng thái giữ lại |
| --- | --- |
|smart_agriculture_rehearsal_0704174deb58_main|Đủ00→01→02 COMMIT,6ledgers, fixtures/permission probes|
|smart_agriculture_rehearsal_0704174deb58_rollback|00 COMMIT,01 lỗi injected và rollback; giữ prerequisites|
|smart_agriculture_rehearsal_0704174deb58_conflict|Index name conflict;00 rollback, giữ conflicting fixture index|
|smart_agriculture_rehearsal_0704174deb58_lock|Writer lock vs CREATE INDEX,55P03 và00 rollback|

Trước mỗi CREATE DATABASE kiểm tra tên chưa tồn tại; dùng TEMPLATE template0 và owner test admin. Replay11 local migration files vào DB mới, không copy production data/roles/credentials. `_prisma_migrations` trong DB rehearsal là **synthetic history dựng từ tên/checksum file local**, không copy rows production và không gọi Prisma migrate deploy. Schema baseline/fingerprints được đối chiếu trước test.

Các DB của attempts lỗi trước cũng được giữ nguyên; tổng phase tạo8DB mới (4main attempts trước +4DB của final run). Không DROP/reset/overwrite DB/schema/ledger/log cũ. Inspection-only attempt không tạo DB.

### Bảo toàn Phase13.5A.1

Chỉ SELECT database cũ `smart_agriculture_test_phase13_3b`, schema `phase13_test_phase13_3b`; không archive fixture, không grant roles mới cho các principal cũ, không xóa dữ liệu. Trước/sau final run:

```text
cycles291 / decision_logs232 / daily_budgets235
reservations148 / command_intents148 / safety_states1
audit aggregate MD5 f4dc02962bdfd5c5a96262403eb2c537
table names/owners, all six counts and audit digest unchanged
```

Đây là counts/audit-digest evidence, không tuyên bố đã byte-hash toàn bộ PGDATA hoặc mọi legacy business row. Không backup/reset/xóa bằng chứng. Cluster chỉ được start/stop theo phạm vi rehearsal; production PostgreSQL không restart.

## 3. Lỗi thật tìm thấy / sửa đúng source artifact

### 3.1 Fingerprint phụ thuộc search_path — FIXED

Attempt `20261022070154_b63572` replay baseline thành công nhưng00 báo **P0001 / LEGACY_COLUMN_DRIFT**, trước mọi CREATE ROLE/index/ledger. Inventory dùng search_path public; SQL guard dùng pg_catalog-only. PostgreSQL `format_type()` thêm `public.` vào tên enum; `pg_get_constraintdef()` cũng có thể thêm public qualification cho FK. Schema tương đương nhưng fingerprint khác.

Sửa `backend/scripts/phase13-5b-inventory.cjs`:

- Canonical hóa **chỉ prefix public. của các known public legacy objects** trong kết quả deparser, dùng pg_catalog.replace.
- Qualify md5/string_agg/deparser functions bằng pg_catalog; không đổi search_path an toàn, không bỏ checks, không sửa kiểu/FK/schema thật.
- Constraint/column names/types/nullability/mapping vẫn tham gia fingerprint; target/database/schema/system/history guards giữ nguyên. Đây là fingerprint của baseline đã biết, không phải parser tổng quát để chuẩn hóa SQL bất kỳ.
- Generator dùng cùng query nên00/01 được regenerate với fix. Thêm regression offline và guard đã chạy PASS trên PostgreSQL với pg_catalog search_path.

Bản cũ chưa từng được deploy production. Giữ nguyên số version review `20261022_irrigation_v1_v2`, nhưng **hash00/01 đã đổi**, phải phê duyệt đúng hash mới. Bản gốc trước sửa được giữ tại `build/phase13-5b1-original-artifacts/`, các mapped attempts/logs cũng được giữ. Không sửa legacy rows để làm fingerprint match.

### 3.2 PUBLIC EXECUTE control-info — clarified, không sửa quyền hệ thống

Attempt `20261022070243_cb2a1e`:00/01/02 COMMIT thật. Assertion ban đầu đòi mọi effective temporary permission=false đã fail vì `pg_control_system()` có PUBLIC EXECUTE ngay từ baseline. Inspection-only run xác nhận ACL còn PUBLIC X, **không còn direct grant cho migrator**.

Final test kiểm tra hai phần riêng: schema CREATE/legacy REFERENCES/history SELECT phải false; direct function EXECUTE phải false; inherited PUBLIC EXECUTE phải bằng baseline. Không REVOKE PUBLIC trên pg_catalog function (sẽ thay chính sách hệ thống rộng hơn phạm vi). Không tăng quyền app hoặc bỏ kiểm tra legacy grants. Cần review baseline PUBLIC privileges tại production khi provisioning; không tuyên bố function bị deny effective hoàn toàn.

### 3.3 Lỗi harness đã giữ bằng chứng

- `20261022070133_afa7d0`: psql exit2 vì child env `PGSERVICEFILE=''` bị libpq hiểu là tên file rỗng. Chưa replay baseline; DB mới rỗng được giữ. Sửa child-env: bỏ các PG* kế thừa thay vì set service filename rỗng; endpoint/auth test được đặt tường minh.
- `20261022070340_09f858`: sau migration thành công, catalog assertion trích tên unquoted constraint bằng regex không nhận chữ số nên đọc `irrigation_v2_*` thành `irrigation_v`. Sửa extraction hỗ trợ digits; không sửa/nới CHECK SQL.
- Các attempts thất bại dừng graceful đúng test cluster, giữ logs/DBs, không che failures hoặc gọi chúng là PASS. Retry toàn phase dùng tên DB/roles/log mới, **không replay tự động checkpoint đã commit trên DB cũ**.

## 4. Source/mapped hashes và khác biệt

Artifact directory: `backend/prisma/proposals/production/20261022_irrigation_v1_v2/`.

| File | Source SHA256 hiện hành |
| --- | --- |
|00-prerequisites.review.sql|c96a200e4996cfbf86a274840abd7d4d0a02a9aec766395cfbdd5522a50e5a32|
|01-ledgers.review.sql|dac6a431a4598bea18cd0ff3290fb2009c36c30809247d258aea161d637a8b8a|
|02-finalize-dba.review.sql|20de4109c7d16925ef0d12b7fb1d26491507242124f21dfa26107765e513e499|

Final main mapped hashes tương ứng:

```text
00 b76ee031dacb2d078abceab79fc9e6cc52403700ad284c1197085baa016fb57a
01 8be9e64f3ba99d7758c780b3049b72f0e70281e26d209b7add1dd243587f4230
02 50607bbdf968627e936616e9548f1999b7198327e728f4d4840540b5c19cfd36
```

Mapping whitelist, lưu occurrence count/diff cho từng file/DB:

- production systemID→test systemID; PGDATA production→test PGDATA;
- target database name và ON DATABASE grant target→database rehearsal mới;
- port5432→55433;
- DBA role literal postgres→phase13_test_admin;
- sa_irrigation_migrator/app→NOLOGIN group roles mới riêng theo run/DB.

Giữ public schema vì DB mới độc lập. Không map history checksums, fingerprints, enum definitions, tables,14FK, CHECK, indexes, triggers, grant/revoke logic, timeouts, deployment fences hoặc approval version token. Mapping reverse phải trả **đúng toàn bộ source bytes**; source hash phải match manifest trước start. Không xóa guard.

Các fault-injection variants được ghi riêng: thêm `SELECT 1/0` trước COMMIT của01, tạo conflicting index trước00, hoặc giữ writer lock bằng connection khác. Không coi các variants này là mapped artifact nguyên trạng thành công.

Manifest giữ `sqlExecuted=false` cho production artifact, đồng thời thêm `isolatedRehearsal` và trạng thái `MAPPED_EQUIVALENT_PASS_ORIGINAL_PRODUCTION_TARGET_NOT_EXECUTED`. Không ghi production migration applied hoặc tự thay `_prisma_migrations` production.

## 5. PostgreSQL integration — 35/35 PASS

Evidence authoritative: `report/phase13-5b1-run-20261022070417_4deb58.json`; mỗi case có tên/status/elapsed/details, operations có native psql exit code/SQLSTATE/hash/log path. SQL thực thi bằng psql ON_ERROR_STOP với COMMIT, không script mặc định ROLLBACK rồi gọi durable.

| Nhóm | Bằng chứng thực tế |
| --- | --- |
|00 COMMIT|2NOLOGIN groups và3valid unique composite indexes được đọc bằng connection độc lập|
|01 COMMIT,02 chưa chạy|6tables owner=migrator; migrator CREATE public vẫn true ở checkpoint này; deployment chưa hoàn tất|
|02 COMMIT|CREATE public/history SELECT/legacy REFERENCES false; direct control EXECUTE false, PUBLIC baseline true|
|Catalog|6tables/6enums; đủ14validated RESTRICT FK;109indexes toàn DB synthetic, gồm toàn bộ index names cần từ artifact; constraints v1/v2 và2enabled audit triggers khớp|
|App privilege matrix|SELECT/INSERT trên6ledgers, UPDATE trên5mutable; audit UPDATE/DELETE/TRUNCATE false; app không owner hoặc migrator member, không schema CREATE|
|Actual denied statements|App CREATE public table, INSERT/UPDATE DeviceCommand, UPDATE/DELETE/TRUNCATE audit đều42501|
|Owner audit enforcement|Migrator-owner login thực hiện UPDATE/DELETE/TRUNCATE bịP0001/IRRIGATION_AUDIT_APPEND_ONLY; row audit giữ nguyên|
|Deployment fences|UPDATE budget modeACTIVE bị23514; sourceVERIFIED_LIVE dù có valid SensorReading fixture FK vẫn bị23514/unverified_source_fence|
|FK / retention|Missing cycle FK23503; DELETE synthetic legacy device bịRESTRICT23503, không cascade mất ledger|
|V2 / quota|CHARGED thiếu settled_at, publish thiếu claim, budget vượt policy đều23514, đúng tên CHECK|
|Atomic rollback|App transaction insert budget+audit rồi FK failure: cả budget/audit không commit|
|Default safety|New safety row mặc định emergency=true/fault=true/reported UNKNOWN; không tự arm hoặc DeviceCommand|
|Wrong identity/role|Mapped script trên maintenance DB postgres hoặc sai app role dừng trước DDL; không bỏ guard để chạy|
|00 commit,01 fail|Injected22012 sau DDL01 nhưng trướcCOMMIT: sáu enums/tables rollback;00 indexes/roles vẫn giữ|
|Duplicate checkpoint|Explicit negative00 replay bịP0001/ROLE_CONFLICT_STOP; không silent success hoặc tự retry|
|Index conflict|Duplicate named index42P07 khiến00 rollback cả newly created roles; conflicting fixture index được giữ|
|Lock timeout|Connection PID14152 giữ RowExclusiveLock; CREATE INDEX chờ và55P03 sau3134ms;00 rollback roles/indexes cùng transaction|
|No side effects|Cả4final rehearsal DB đều DeviceCommand0/AutomationRule0; không dispatcher/MQTT/network pump calls|

**Synthetic data:** main case có user/farm/zone/device/actuator/sensor và1SensorReading sourceSIMULATOR để kiểm tra FK/fences. Không dùng code của ESP32 thật; device `SYNTHETIC-13-5B1`, actuator `PUMP_SYNTHETIC`. Fixture inserts tách khỏi migration. Migrations không sửa legacy business rows; test DELETE bị từ chối/rollback. Không tạo DeviceCommand thật hoặc mô phỏng command gateway.

### Authenticated principals / effective grants

- DBA phase13_test_admin chạy00/02;01 chạy SET ROLE mapped migrator để kiểm chứng current_user/ownership đúng role NOSUPERUSER.
- Sau deployment, tạo2LOGIN test mới, mật khẩu random chỉ RAM, không reuse credential production hoặc cũ. Chạy actual independent connections cho app và owner; SQL xác nhận current_user=session_user, không phải chỉ mock role name/GRANT listing.
- App login chỉ member mapped app group, không member migrator; không superuser/CREATEDB/CREATEROLE/BYPASSRLS. Owner login kế thừa mapped migrator group để kiểm chứng trigger vẫn chặn owner mutation.
- Không sửa credentials existing roles. Không ghi password/query provisioning vào repo/log/manifest; server session provisioning tắt statement/error-statement logging. Hai LOGIN test đã chuyển NOLOGIN sau test; giữ roles/data để đối chiếu. Không lưu secrets vào staging.
- Effective finalization: schemaCREATE=false, migrationhistorySELECT=false, actuator/device-command/automation-rule/sensor-reading REFERENCES=false; control function direct EXECUTE=false, PUBLIC effectiveEXECUTE=true như baseline. Không suy mọi chức năng pg_catalog bị deny.

## 6. Locking / performance assessment

CREATE INDEX thường giữ ShareLock, tương khắc RowExclusiveLock của writer. Test đã giữ lock bằng connection thật, không giả lập timer; artifact timeout3s hoạt động và rollback partial transaction. CREATE INDEX ở00 không CONCURRENTLY, nằm trong transaction tạo3indexes: lock có thể được giữ đến COMMIT.

Các bảng legacy ở rehearsal index cases rỗng trước fixture setup; measured completion chỉ có ý nghĩa syntax/locking/checkpoint. **Không suy thời gian scan/index build production** từ test này. Cần production table-size/statistics SELECT và maintenance window trước deploy. Statement_timeout60s có trong source/mapped SQL, nhưng chưa cố chạy scan60s hoặc benchmark dữ liệu production lớn. Không DDL benchmark5432.

RESTRICT retention có tác động thực tế: xóa device/reading/actuator/rule/command đã tham chiếu có thể bị chặn, kể cả legacy cascade. Cần duyệt delete/retention UI và lưu audit; không bỏ FK/trigger để đáp ứng xóa dữ liệu. Không down migration DROP/TRUNCATE ledgers.

## 7. Regression và files

Đã chạy toàn bộ offline vì thay đổi fingerprint query, generated artifacts và harness:

```text
528 tests /528 PASS /0 FAIL /0 SKIP
=523 previous +1 canonical fingerprint regression +4 mapping/harness regressions
Backend tsc --noEmit: exit0
Prisma validate + datamodel-only diff: PASS (generator, no connection)
```

Không chạy lại59 SQL domain cases cũ; foundation/test repository/engine domain không đổi. Offline tests không thay thế35 real PostgreSQL cases; không có browser/hardware/ON test trong phase này.

Files added:

- `backend/scripts/phase13-5b1-rehearsal.cjs`: fixed-target/start/map/execute/catalog/failure/permission/stop harness; inspect-only mode đọc attempt cũ.
- `backend/scripts/production-irrigation-rehearsal.test.cjs`:4tests offline mapping/security boundaries.
- `backend/scripts/phase13-5b1-export-evidence.cjs`: offline before/after comparison, source hashes và manifest rehearsal annotation.
- Báo cáo này; `report/phase13-5b1-*`; mapped SQL/logs dưới protected existing test instance.

Files updated:

- `backend/scripts/phase13-5b-inventory.cjs`: prefix output riêng13.5B.1 + canonical deparser queries.
- `backend/scripts/production-irrigation-migration.test.cjs`:1new canonicalization regression.
- Generated00/01SQL và manifest;02SQL bytes/hash không đổi.
- Báo cáo13.5B: thêm chú thích historical hashes đã bị thay bởi13.5B.1; không xóa snapshot lịch sử.

Không chỉnh production startup, main Prisma schema/client, framework/dependencies, config/credentials, firmware hoặc MQTT wire contract. Main schema SHA256 vẫn a45a2b799ecd666328a911424a75d12986ef4248f15fc716455197cd62957b4d.

## 8. Production safety before/after

Read-only inventory trước **06:59:26.779Z**, sau **07:05:53.168Z**. `report/phase13-5b1-summary.json` đối chiếu identity/migrations/relations/columns/constraints/indexes/enums/functions/roles/memberships/schema ACL/fingerprints: **tất cả không đổi**.

- Production127.0.0.1:5432/systemID7472695863566132416/PGDATA17 nguyên trạng; server start không đổi. Chưa có6production ledger tables, migrations11checksum khớp.
- Command count43→43, PENDING0→0; AutomationRule1. Readings được backend tiếp tục ghi tự nhiên, không coi ingestion writes là migration.
- Backend listener5000 vẫn PID22400; PostgreSQL7848, brokerLAN3592 và loopback4572 giữ nguyên. Không restart/stop chúng. `pg_ctl status` test “no server running”; không listener55433.
- Backend health: databaseconnected/MQTTconnected. Serving process cùng startup attestation Commandsfalse/Automationfalse/TestModetrue/cap1; không thay config/flags. Không đăng nhập API/POST để tạo activity ngoài scope; protected runtime endpoint không được gọi mới.
- ESP32ONLINE, lastSeen07:05:50.882Z; stored OFF/stateAt07:05:50.612Z. Bốn MQTT readings cùng recordedAt07:05:49.582Z/receivedAt07:05:50.079Z: TEMP24.9, HUM46.9, SOIL6.47, LIGHT0. Không coi LIGHT0 là thiếu dữ liệu.
- Đây là DB/health snapshot duy trì runtime, **không nghiệm thu thêm publisher identity/SNTP/MQTT OFF provenance hoặc browser**. Không đánh đồng GPIO OFF với motor/nước.
- Adapter bơm giữ rút theo xác nhận vận hành gần nhất; không tác động phần cứng/nguồn/COM. Không gửi ON/OFF, cấp nguồn, flash/reset, migration5432 hoặc nâng trust.

## 9. Evidence và giới hạn trước production

Authoritative evidence:

- `report/phase13-5b1-run-20261022070417_4deb58.json`:35cases, native exits/SQLSTATE, target mappings, catalogs, preservation, shutdown.
- `report/phase13-5b1-summary.json`: production catalog comparison và source artifact hashes.
- `report/phase13-5b1-production-inventory.json`, `...-after.json`.
- `report/phase13-5b1-offline-tests.tap`, `...-typecheck.log`.
- `C:\DATN\test-instances\phase13-3b\rehearsal-13-5b1-20261022070417_4deb58`: mapped SQL/mapping manifests, native stdout/stderr, test server log. Không credentials trong các report này.
- Những attempt lỗi/inspection trước giữ riêng theo runId, không ghi đè hoặc xóa. Không cleanup database/roles/PGDATA.

Các điều kiện vẫn cần duyệt/nghiệm thu:

1. Chấp thuận **hash mới**00/01, ownership/role/membership provisioning, catalog baseline và deployment window. Các hash Phase13.5B cũ không còn dùng để execution.
2. Database backup vào vị trí NTFS/data-handling được duyệt, restore rehearsal độc lập/RPO/RTO; **chưa tạo backup hoặc restore production** trong phase này.
3. Quy trình promote Prisma schema/migration history và reconcile metadata sau SQL checkpoints; current guard11history rows không dùng migrate deploy trực tiếp. Không sửa history để che drift.
4. Production effective PUBLIC/inherited privileges, legacy table size/lock contention và delete/retention impact phải review sát deployment. Test synthetic không chứng minh production latency/large scan/failover/power-loss.
5. Adapter production/client least-privilege/shared actuator coordination/rearm/dispatch/live provenance/SOIL/clock trust vẫn chưa wired/đủ điều kiện. Rehearsal PASS không authorize ACTIVE, VERIFIED_LIVE hoặc gửi command.

**Dừng tại Phase13.5B.1. Test cluster đã dừng, backend telemetry production giữ chạy; không tự chuyển migration production hoặc automation.**
