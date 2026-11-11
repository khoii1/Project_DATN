# Phase 13.5B — Production irrigation persistence migration preparation

> Cập nhật kế thừa Phase13.5B.1: xem `PHASE13_5B1_SQL_MIGRATION_REHEARSAL.md`. Rehearsal đã phát hiện/sửa fingerprint phụ thuộc search_path, tạo hash mới cho00/01 và nghiệm thu bản test-mapped. Các hash/kết luận PARTIAL bên dưới là snapshot lịch sử trước sửa; không dùng hash cũ để phê duyệt execution. Manifest hiện tại chứa hash mới và liên kết evidence rehearsal. Production vẫn chưa migration.

Ngày 22/10/2026, UTC+7. Chỉ inventory SELECT và chuẩn bị artifact offline; **không thực hiện DDL/DML production từ công cụ phase này**. Backend đang chạy tiếp tục ghi telemetry/presence/operational metadata bình thường.

## 1. Kết luận

```text
PRODUCTION_MIGRATION_ARTIFACT_PARTIAL — versioned review artifacts generated, static checks PASS
PRODUCTION_SCHEMA_REVIEW_PASS — current catalog compatible with additive proposal
OFFLINE_REGRESSION_PASS=523/523 (501 existing + 22 new)
BACKEND_TYPECHECK_PASS
PRISMA_DATAMODEL_VALIDATE_AND_DIFF_PASS — file-only, no DB target
NEW_PRODUCTION_SQL_EXECUTION_NOT_VERIFIED
NEW_ROLE_PRIVILEGES_SQL_INTEGRATION_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_REPOSITORY_NOT_WIRED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

PARTIAL không có nghĩa đã deploy một phần: **không có thay đổi production nào được áp dụng**. Artifact review đã có, nhưng chưa nghiệm thu execution/permissions của chính bản SQL production mới, chưa có restore rehearsal/approval và chưa chốt integration Prisma history. Không dùng 59/59 SQL tests lịch sử để tuyên bố bản SQL/roles mới đã PASS PostgreSQL. Không tự chuyển phase tiếp theo.

## 2. Production inventory — read-only thực tế

Nguồn: `backend/scripts/phase13-5b-inventory.cjs`; đọc credential cục bộ trong RAM, không in URL/password. Kết nối diagnostic bị giới hạn hostname loopback/database/schema/port trước khi tạo client, ép IPv4 để đối chiếu target chính xác. Transaction READ ONLY; không import server/gateway, không API login POST, không chạy migration status/seed.

Inventory authoritative trước: **2026-10-22T06:09:50.689Z** (13:09:50 UTC+7). Snapshot cuối: **06:17:32.127Z**. Có các lượt đọc trung gian; không thay đổi production ở những lượt đó.

| Thuộc tính | Kết quả |
| --- | --- |
| Endpoint SQL thực tế |127.0.0.1:5432|
| Database / application schema |smart_agriculture / public|
| Server |PostgreSQL17.2|
| System identifier |7472695863566132416|
| PGDATA |C:/Program Files/PostgreSQL/17/data|
| Server start |2026-10-16 12:13:43.656514+07|
| Transaction read_only |on|
| Current DB role |postgres — superuser/CREATEDB/CREATEROLE/BYPASSRLS|
| Applied migrations |11; latest20261014090000_mqtt_pump_commands|
| Local/file checksum mismatch, unfinished, pending |0 / 0 / 0|
| Six irrigation relations |0; chưa có bảng ledger|
| Existing public indexes |75|
| Proposed named index / enum / function conflicts |Không phát hiện trong inventory hiện tại|
| DeviceCommand |43 total /0 PENDING|
| AutomationRule |1; không chỉnh rule hoặc evaluator|

Catalog được lưu đầy đủ trong `report/phase13-5b-production-inventory.json`: table/index owners, table ACL, columns/defaults/nullability, PK/FK/CHECK và validated flags, index definitions/validity/uniqueness, enums, function names, non-secret role attributes/memberships và schema privileges. Không đọc `pg_authid`, password hashes hoặc business user records.

`public` owner `pg_database_owner`; ACL hiện tại cho database owner USAGE/CREATE và PUBLIC USAGE, không PUBLIC CREATE. Chỉ có một non-system role `postgres`; **hai role đề xuất chưa tồn tại**. Role backend hiện tại rất rộng; deployment repository mới không được tái sử dụng role này làm app runtime.

Các bảng legacy `sensor_readings`, `device_commands`, `automation_rules` và phụ thuộc `devices`, `actuators` được kiểm tra columns/constraints/indexes. PK `id` đang có; FK legacy có CASCADE/SET NULL như hiện hữu, không sửa chúng. Column fingerprint `390c65cfe11f3b8695a6bc5ff21d94d4`; constraint fingerprint `2e5981464ef4017e1ad5a6854ba17cc2`.

Evidence `report/phase13-5b-schema-safety-comparison.json`: trước/sau identity, migrations, relations, columns, constraints, indexes, enums, functions, roles, memberships và schema ACL đều **không đổi**; command count43→43, PENDING0→0. Readings/presence vẫn được backend ghi tự nhiên, không kỳ vọng toàn bộ dữ liệu business đứng yên.

## 3. Artifact migration versioned đã tạo

Thư mục: `backend/prisma/proposals/production/20261022_irrigation_v1_v2/` — **không thuộc `prisma/migrations`**, không tự được Prisma deploy hoặc startup thực thi.

| File | Nội dung |
| --- | --- |
|00-prerequisites.review.sql|DBA guard, hai NOLOGIN group roles, REFERENCES/schema grants giới hạn, ba composite unique indexes legacy|
|01-ledgers.review.sql|Migrator guard, sáu enums/sáu tables, indexes/FKs/CHECK v1, hardening v2, audit triggers, deployment fences, grants/revokes trên objects do migrator sở hữu|
|02-finalize-dba.review.sql|DBA kiểm tra owners/audit triggers/app privileges; thu hồi quyền deployment tạm trên objects DBA sở hữu|
|manifest.json|Version, SHA256 từng SQL, main schema, source v2 và inventory; SQL executed=false|

Builder `backend/scripts/phase13-5b-prepare.cjs` compose main schema + fragment + inverse relations trong `build/phase13-5b-schema/schema.prisma`; chạy Prisma validate/datamodel diff bằng URL giả loopback port1. **Không mở database, generate client, install package hoặc sửa main schema**. SQL constraints v1 và v2 được giữ từ nguồn đã nghiệm thu. Không regenerate client production.

SHA256 hiện tại:

```text
00-prerequisites.review.sql
e31470e49bb9e3a3572119c18f51e8d340ce27e19fbf4f03842c4da2ef71181e
01-ledgers.review.sql
436e76003ea363eb012171c54fb50b6fb7c99f67f41f51695fec4ee173ca4ace
02-finalize-dba.review.sql
20de4109c7d16925ef0d12b7fb1d26491507242124f21dfa26107765e513e499
main production schema (unchanged)
a45a2b799ecd666328a911424a75d12986ef4248f15fc716455197cd62957b4d
v2 isolated source (unchanged)
33eb31404ccdac7ab5dd2cf778330cb3b6796128733938739c5170ecfd088e5d
```

Không chỉnh main Prisma schema, migration history folder, backend startup, runtime config, firmware hoặc MQTT wire contract. Generated composed schema chỉ dùng review; chưa phải production schema được promote.

### Preconditions và thứ tự

1. Cả ba SQL có BEGIN/COMMIT riêng, lock_timeout3s, statement_timeout60s; lỗi phải ON_ERROR_STOP và rollback transaction đang mở. Không CREATE IF NOT EXISTS che object conflict.
2. Cần session approval setting `smart_agriculture.migration_approval=20261022_irrigation_v1_v2` **sau approval riêng trong tương lai**, không setting nào đã được đổi hiện tại. Đây là guard vận hành, không thay thế authorization của DBA.
3. Kiểm tra exact database, IPv4/5432, system identifier, current role và public namespace. Search path bên trong transaction chỉ `pg_catalog`; vì vậy `current_schema()` phải là pg_catalog, **mọi application object vẫn explicit `public.*`**, không trỏ nhầm schema test. DBA gate kiểm tra PGDATA.
4. Kiểm tra đủ11 migration names/checksums/finished state, column/constraint fingerprints, ActuatorState enum labels; phát hiện drift thì STOP.
5. Phải chưa có sáu ledger relations, Irrigation enum types hoặc audit function. Index name conflict làm preparation dừng hoặc CREATE fail/rollback, không reuse index mù quáng.
6. File00 chạy bằng DBA hiện tại (`postgres`), không dùng app. Nó tạo unique indexes `(id,device_id)` ở actuators, `(id,actuator_id)` ở device_commands và automation_rules. **Đây là additive legacy metadata dự kiến, không phải sửa rows/columns**. PK id hiện có bảo đảm uniqueness; chưa chạy tạo index.
7. File01 chạy với `current_user=sa_irrigation_migrator` sau SET ROLE của principal quản trị được duyệt; không chạy bằng app/superuser. Kiểm tra cả ba indexes exact columns/order, unique, valid, ready, không partial/expression/include trước tạo FKs.
8. Sáu bảng được tạo trước mọi FK; referenced unique indexes đã tồn tại trước FK. Có14 FK, tất cả ON DELETE/UPDATE RESTRICT. Circular logical relationships không cần insert dữ liệu trong migration.
9. v1 quota/expiry/idempotency/open-cycle/open-intent/provenance constraints giữ nguyên; v2 settlement và dispatch ordering CHECK giữ nguyên. Trigger UPDATE/DELETE từng row và TRUNCATE từng statement chặn audit mutation.
10. File02 chạy bằng DBA/grantor để revoke CREATE schema, đọc migration metadata, execute control-info function và REFERENCES tạm khỏi migrator; verify CREATE không còn hiệu lực. Migrator không tự revoke quyền do DBA cấp trên objects không sở hữu, vì self-REVOKE không grant option có thể chỉ warning và để nguyên quyền. DBA cũng cấp SELECT legacy/USAGE ActuatorState cho app ở00, không giao thao tác này cho migrator. Migrator vẫn là owner objects mới, **không được cấp membership cho app**. Không quyền login/password nào được tạo trong artifact.

Ba transaction là ba checkpoint độc lập: nếu00 commit và01 fail, chỉ có prerequisites đã tồn tại; không chạy00 lần nữa vì role guard sẽ STOP. Đối soát manifest/catalog, khóa quyền CREATE tạm bằng thao tác DBA được duyệt nếu cần, sửa artifact roll-forward có version mới; không tự drop indexes/roles. Nếu01 commit nhưng02 chưa hoàn tất, deployment là INCOMPLETE, không bật repository; hoàn tất/review finalization thay vì coi ledger commit là xong.

### Compatibility / risks

- Bảng mới rỗng nên không backfill SensorReading/DeviceCommand/AutomationRule hoặc nâng trust lịch sử. TIMESTAMPTZ(3) ledger và DATE ngày ngân sách tách biệt timestamp UTC-naive legacy; adapter phải chuyển Date theo contract, không đổi storage legacy.
- Unique composite indexes legacy không thêm uniqueness ngoài PK id hiện có nhưng cần lock và scan; table size/lock contention/maintenance window phải đo lại trước deploy. Không tự dùng CONCURRENTLY ngoài transaction hoặc tăng timeout để vượt lỗi.
- RESTRICT FKs mới sẽ ngăn xóa device/reading/actuator/command/rule đã được ledger tham chiếu, kể cả legacy cascade. Đây là bảo vệ audit có chủ đích, **cần review UI delete/retention và chấp thuận vận hành** trước ghi ledger production.
- Có fence mới trên cả6bảng: mode chỉ DISABLED/SHADOW; audit source chỉ FIXTURE/MOCK. V1 enum ACTIVE/VERIFIED_LIVE được giữ cho schema compatibility nhưng không thể insert qua fence. Muốn mở live/ACTIVE cần migration/gates/approval riêng, không chỉ đổi flag.
- Không có seed, rearm, auto-dispatch, SQL trigger gửi lệnh, DeviceCommand insert hoặc auto replay ON. Audit append-only không chống DBA owner/superuser cố tình ALTER/DROP/disable trigger.

## 4. Role/permission strategy

- `sa_irrigation_migrator`: NOLOGIN group/owner role, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS; chỉ principal deploy được duyệt mới SET ROLE. Tạo ledger, không sở hữu legacy. CREATE public và control-info/migration SELECT/REFERENCES chỉ tạm trong deployment, do DBA thu hồi ở02.
- `sa_irrigation_app`: NOLOGIN permission group; future dedicated app login không superuser/owner/migrator membership và không quyền admin khác. Migration hiện không tạo login/password hoặc thay backend DATABASE_URL.
- App: SELECT/INSERT/UPDATE cho5mutable ledgers; audit chỉ SELECT/INSERT, không UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER; không DELETE/TRUNCATE trên các ledger khác. Không CREATE public, không execute audit trigger function trực tiếp. New tables/type/function không PUBLIC write/execute.
- Legacy: app chỉ SELECT trên5bảng liên quan; không INSERT/UPDATE DeviceCommand. Migrator chỉ REFERENCES column cần cho FK và SELECT `_prisma_migrations` tạm; DBA tạo composite indexes.
- Quyền app là SQL storage boundary, **không tự bảo đảm mọi budget/CAS/latch invariant nếu code cố ghi tùy tiện**. Future trusted repository phải thực hiện protocol transaction, không expose raw SQL/update API. Rà effective inherited privileges của login và PUBLIC sau khi provisioning; không chỉ xét group name.
- Backend hiện dùng postgres chưa thay. Cần connection riêng least-privilege cho ledger, không đổi datasource đang nhận telemetry trong phase này. Không hứa least-privilege production đã được thực thi.

## 5. Production repository adapter proposal — chưa implementation/wiring

Giữ nguyên `PostgresTestIrrigationRepository`: hardcoded test endpoint/schema/role/server-start proof vẫn tồn tại. Giữ nguyên Foundation chỉ nhận FAKE/ISOLATED_TEST, sourceFIXTURE/MOCK và SHADOW; **không chỉ đổi environment literal để bypass**.

Đề xuất module riêng sau approval:

- Client được inject từ connection factory riêng không fallback DATABASE_URL; boot attestation exact IPv4/5432/database/public/system identity, dedicated app principal/effective privileges, migration manifest/version và validated constraints/triggers. Không tạo client tại module import hoặc import vào server.ts hiện tại.
- Một transaction/actuator. Đề xuất coordinator `pg_catalog.pg_advisory_xact_lock` với namespace/key64-bit ổn định từ actuatorId (không mode), sau đó safety row FOR UPDATE. Không khóa FOR UPDATE trên legacy actuators vì app chỉ SELECT và row-lock này cần UPDATE privilege; không cấp thêm legacy UPDATE chỉ để khóa. Key collision chỉ được gây serialization dư, không được bỏ lock. Writer manual/automation tương lai phải dùng chung per-actuator protocol. Không có safety row => BLOCKED; initialization riêng mặc định UNKNOWN/emergency/fault-latched, không tự arm. Row không tồn tại không thể coi SELECT FOR UPDATE là đã khóa safety.
- Thứ tự: actuator advisory transaction lock → safety → cycle/open intents/idempotency → budget → reservation/intent → append audit → commit. Một actuator/transaction; multi-actuator phải có thiết kế ordering riêng, hiện cấm. Advisory lock là cooperative, chưa được triển khai/test ở phase này.
- CAS `WHERE actuator_id/mode/id/version=expected`, update-count1 và version+1. READ COMMITTED + shared row lock chỉ serialization cho writer tuân cùng protocol; unique constraints bảo vệ thêm. Không tự retry transaction/ON khi40001, timeout, unknown commit hoặc connection loss.
- Reserve budget/cycle/intent/reservation/decision/safety commit atomic. Idempotency key cùng fingerprint trả kết quả cũ, không tạo reservation/dispatch thứ hai; mismatch fail closed. Append audit collision chỉ chấp nhận nội dung giống hệt, không overwrite.
- UTC+7 day/high-water và lastAcceptedTime persisted; rollback clock latch fault, không reset quota ngày cũ. Release đúng một lần chỉ trước DISPATCH_CLAIMED; sau claim/publish/ACK_TIMEOUT/UNCERTAIN giữ quota, không resend ON.
- Restart: session/clock evidence cũ invalidated, open intents UNCERTAIN, state UNKNOWN/fault; giữ quota/cooldown/emergency/manual override. Fresh OFF chỉ là evidence, không tự clear durable latch hoặc authorize retry.
- Chưa có dispatcher/outbox/manual occupancy coordination/live trust/rearm API được nghiệm thu production. Adapter không có quyền tạo DeviceCommand, không MQTT import. Tách storage deployment khỏi engine/wiring/ACTIVE approvals.

## 6. SQL / Prisma migration history strategy

Đề xuất **DBA-reviewed manual SQL execution + Prisma history reconciliation sau kiểm chứng**, không chạy `prisma migrate deploy` với ba file này ngay.

1. Freeze/review manifest và promotion plan; refresh catalog baseline trước deploy. Nếu baseline đổi, regenerate/review version, không sửa guard tại chỗ để vượt drift.
2. Rehearse SQL/least-privilege trên test cluster độc lập bằng harness mapping target rõ ràng; production guard không được xóa trong bản production. Chưa thực hiện trong phase này.
3. Sau approval/backup/restore gates, DBA áp dụng00, principal deploy SET ROLE áp dụng01, RESET ROLE về DBA áp dụng02 theo checkpoint. Không nối startup. Xác minh catalogs/privileges/data/API trước ghi history.
4. Sau khi toàn bộ changes commit và catalog khớp manifest, promote composed Prisma models/inverse relations/composite uniques và snapshot SQL đã duyệt thành migration version mới trong change riêng. Xác định canonical migration.sql bao trùm ba checkpoint và checksum, đối chiếu file với manifest thực thi.
5. Chỉ sau approval metadata riêng mới `prisma migrate resolve --applied <approved_version>` để ghi history, không chạy DDL lần nữa. Không sửa/xóa11 rows/checksums cũ hoặc dùng db push. **Chưa chạy resolve ở phase này**.

Lý do không dùng trực tiếp migrate deploy: guard hiện yêu cầu đúng11 history rows và dedicated role; Prisma deploy thường tạo pending history row trước SQL, có thể làm guard fail. Cần thống nhất lifecycle trước promote, không nới guard hoặc giả history thành công. Custom CHECK/partial indexes/triggers/permissions/fences không được Prisma datamodel biểu diễn đầy đủ; phải giữ SQL/hash/catalog tests trong source of truth. Composed schema validation không chứng minh custom SQL parser/permissions đúng.

## 7. Backup / restore / failure runbook — CHƯA THỰC HIỆN

Đây là kế hoạch backup PostgreSQL, **không sao lưu ổ C**. Không tạo backup, thư mục backup hoặc restore DB trong phase này.

### Backup đề xuất sau approval riêng

- Chọn đường dẫn mới ngoài Git, ví dụ `C:\DATN\database-backups\<approved-timestamp>`, chỉ tạo sau duyệt NTFS/owner/retention/cloud-backup scope cho dữ liệu DB nhạy cảm. Không dùng secret staging đang cloud-scope NOT_VERIFIED. Không tuyên bố đường dẫn ví dụ đã được bảo vệ.
- Dùng PostgreSQL17 `pg_dump` custom format toàn database smart_agriculture để có schema/data/dependencies; `--no-password` không được dùng nếu cần prompt, không đưa password/URL lên command line. Dùng `-W` hoặc password store cục bộ được duyệt; không log secrets.
- Snapshot schema-only/manifest/catalog và globals roles không password (`pg_dumpall --roles-only --no-role-passwords`) để phục hồi ownership/privileges được review. Backup data vẫn nhạy cảm dù đã loại role passwords.

Các lệnh minh họa **chưa chạy**, `<approved-directory>` không phải đường dẫn đã tạo:

```powershell
$phase13PgBin = 'C:\Program Files\PostgreSQL\17\bin'
& "$phase13PgBin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -W -d smart_agriculture -Fc -f '<approved-directory>\smart_agriculture-before-irrigation.dump'
& "$phase13PgBin\pg_restore.exe" --list '<approved-directory>\smart_agriculture-before-irrigation.dump'
Get-FileHash -Algorithm SHA256 -LiteralPath '<approved-directory>\smart_agriculture-before-irrigation.dump'
```

Không thực hiện các lệnh này chỉ vì chúng có trong báo cáo. `pg_restore --list`/hash/file size chỉ integrity sơ bộ, **không phải restore rehearsal PASS**. pg_dump là consistent logical snapshot, không bảo đảm PITR cho telemetry phát sinh sau snapshot; downtime/RPO/RTO cần người dùng chấp thuận. Không tự tắt telemetry để đạt snapshot đứng yên.

### Restore rehearsal

- Chỉ trên target restore độc lập được phê duyệt và identity-guard, không5432, không production URL fallback. Không tạo cluster mới hoặc dùng lại schema test đang có để overwrite nếu chưa duyệt.
- `pg_restore --exit-on-error` vào DB trống riêng đã duyệt; review role mapping/owners/ACL, không coi `--no-owner --no-acl` là bằng chứng quyền được restore đúng. Kiểm tra row counts/PK/FK/CHECK/indexes, latest sensor/command references,11 migration checksums, read-only smoke và permissions với app role riêng. Ghi exit code/hash/catalog/results.
- Không restore đè production. Thử restore không cho phép migration production hay cleanup test cluster; cần giữ bằng chứng, chỉ graceful stop đúng target nếu được phép.

### Khi migration lỗi hoặc kết quả commit không chắc chắn

- Chưa COMMIT: rollback transaction hiện tại, lưu SQLSTATE/log đã redacted; dừng, không disable triggers, không sửa legacy data và không retry tự động.
- File00 commit/01 rollback: giữ prerequisites như checkpoint đã ghi; không DROP role/index. Review catalog và quyền CREATE tạm, chỉ resume file01 bằng approval/hashes đúng sau sửa lỗi.
- Mất connection tại COMMIT: kết quả UNKNOWN; đọc catalogs/session/log để xác định, không replay script hoặc lấy error client làm bằng chứng rollback.
- Sau ledger commit: **không DROP/TRUNCATE sáu bảng, không xóa audit/budget/UNCERTAIN**. Giữ repository unwired/features disabled; roll-forward additive version được review, giữ original rows/audit/hash. Không chạy destructive down migration.
- Nếu cần phục hồi database toàn phần: phê duyệt incident/downtime/RPO riêng, restore ra instance khác, đối soát telemetry sau backup/WAL nếu có, chuyển kết nối theo kế hoạch. Không rollback bằng restore production tùy tiện làm mất readings mới.

## 8. Tests thực tế / giới hạn

```powershell
node backend/scripts/phase13-5b-inventory.cjs
node backend/scripts/phase13-5b-prepare.cjs
node --test backend/scripts/device-presence.test.cjs backend/scripts/mqtt-pump.test.cjs backend/scripts/shadow-irrigation.test.cjs backend/scripts/shadow-preview.test.cjs backend/scripts/irrigation-persistence.test.cjs backend/scripts/live-provenance.test.cjs backend/scripts/live-readiness.test.cjs backend/scripts/soil-metadata-proposal.test.cjs backend/scripts/durable-irrigation.test.cjs backend/scripts/production-irrigation-migration.test.cjs
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
```

- **523/523 offline PASS**, fail0/skip0. Bằng chứng `report/phase13-5b-offline-tests.tap`. 22 tests mới gồm hashes/isolation, qualification, identity/drift/history gates, transaction boundaries,14RESTRICT FKs, v1/v2 constraints, audit immutability, role separation, DBA-grantor finalization, SQL deployment fences và builder fail-closed negative cases.
- Chạy riêng22/22 mới sau bổ sung finalization: `report/phase13-5b-migration-tests.tap`. Backend typecheck exit0. Prisma schema validate/diff file-only PASS, manifest có hashes. Tổng523 được chạy lại sau khi artifact cuối đã tạo, không cộng số test dự kiến.
- Lượt static đầu20/21 vì assertion nhầm PL/pgSQL `IF NOT EXISTS(SELECT...)` kiểm tra precondition với DDL `CREATE ... IF NOT EXISTS` che conflict. Đã sửa test để kiểm tra đúng CREATE pattern, không nới SQL guard. Generator ban đầu từ chối `ON UPDATE RESTRICT` vì regex destructive quá rộng; sửa chỉ phát hiện câu DML/DDL destructive đầu dòng, không sửa FK.
- Đây là **static structural checks, không phải PostgreSQL SQL grammar parser/execution**. Chưa chạy bản SQL mới trên PG, chưa kiểm chứng new roles/default privileges/lock contention/backup restore. Không chạy lại59 SQL cases; test55433 giữ dừng, không initdb/start instance mới.
- Phase13.5A.1 59/59 SQL integration là lịch sử cho foundation/test adapter/v1-v2 khác target/role. Không biến kết quả đó thành SQL integration PASS cho ba artifact mới.

## 9. Runtime safety

- Listener5000 vẫn **PID22400**, attestation cùng PID: commandsEnabled=false, automationEnabled=false, testMode=true, effectiveMaxRunSeconds1. Log startup không phải protected API attestation mới; đã đối chiếu PID listener và không có config/process thay đổi do Agent. Không API login/write chỉ để đọc flags.
- Health06:17:32.117Z: PostgreSQLconnected/MQTTconnected. ESP32ONLINE, lastSeen06:17:28.403Z; stored relayOFF/stateAt06:17:26.879Z. Bốn sensor cùng batchMQTT mới recordedAt06:17:19.564Z/receivedAt06:17:19.915Z: TEMP25.6, HUM50.3, SOIL6.97, LIGHT0. Không nhầm LIGHT0 với missing. Đây là safety snapshot duy trì runtime, không phải kiểm chứng artifact migration.
- Snapshot OFF hiện tại từ DB không tự chứng minh PERIODIC/non-retained/session ở phase này; nghiệm thu đầy đủ provenance3OFF đã có tại13.5A.3, không tự nâng trust bằng history. Không suy động cơ/nước từ OFF/GPIO.
- PostgreSQL PID7848 và brokerLAN3592/loopback4572 không restart. Test55433 không listener. Command count43, PENDING0; không command API/MQTT publish, frontend click, firmware/reset/COM hoặc Windows Time change.
- Adapter5V giữ rút theo xác nhận vận hành gần nhất13.5A.3; Agent không đo nguồn vật lý hoặc yêu cầu cấp nguồn. Commands/Automation không bật. VERIFIED_LIVE/ACTIVE không nâng.

## 10. Files added trong phase này

- `backend/scripts/phase13-5b-inventory.cjs` — SELECT catalog/read-only safety evidence.
- `backend/scripts/phase13-5b-prepare.cjs` — offline schema/SQL/version/manifest builder.
- `backend/scripts/production-irrigation-migration.test.cjs` —21 offline static/builder tests.
- Ba review SQL và manifest trong thư mục proposal production versioned ở trên.
- Báo cáo này và `report/phase13-5b-*` evidence; generated composed schema chỉ trong build.

Không thay đổi test adapter/foundation/source runtime/legacy schemas hoặc rollback các worktree edits có từ trước.

## 11. Approval và blockers trước migration thật

1. Duyệt artifact SQL/checksums, ba legacy indexes,14RESTRICT FKs/retention/delete impact và SHADOW/source deployment fences.
2. Duyệt rehearsal trên cluster test độc lập: target mapping/proof, SQL parser/execution/role grants, transaction fail/rollback/permission tests mới. Không cần lặp59case nếu không đổi domain.
3. Duyệt vị trí NTFS/data-handling, pg_dump database + globals không password, restore target/rehearsal/retention/RPO/RTO; **chưa có backup/restore mới**.
4. Chốt Prisma canonical migration/history promotion và approval metadata `migrate resolve`; main schema/client generation ở phase riêng. Không dùng migrate deploy trực tiếp với current11-row guard.
5. Duyệt provisioning principals/membership/credentials an toàn và ownership, maintenance window/lock timeouts, authority áp dụng00→01→02 và kế hoạch failure checkpoint. Không thay backend credential hiện tại như tác dụng phụ.
6. Refresh identity/baseline/PENDING/runtime trước deploy. Thay đổi catalog bất kỳ cần re-review, không sửa guard để bypass.
7. Production repository implementation/wiring và all-writers per-actuator coordination cần review/test/approval riêng. Storage deploy không cho phép dispatch.
8. Publisher/device session assurance, clock trust, SOIL calibration/quality, VERIFIED_LIVE adapter, persistent rearm và ACTIVE gates chưa đủ. Không mở fences hoặc automation dựa vào persistence tests.

**Dừng sau Phase13.5B. Backend được giữ chạy nguyên trạng; không migration, backup/restore, restart hoặc kích hoạt bơm.**
