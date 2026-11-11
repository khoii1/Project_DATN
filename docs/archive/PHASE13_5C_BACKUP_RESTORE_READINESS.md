# Phase 13.5C — Database backup & restore readiness

Ngày22/10/2026, UTC+7. Đã thực hiện backup/restore **dữ liệu synthetic test**, không dump/restore/migration production.

## 1. Kết luận

```text
ISOLATED_BACKUP_RESTORE_REHEARSAL_PASS — 33/33 real PostgreSQL cases
RELATED_REGRESSION_PASS — 43/43 offline/PowerShell plan tests
BACKEND_TYPECHECK_PASS
PRODUCTION_BACKUP_PLAN_PARTIAL — scripts/runbook prepared; actual storage/data-handling approval pending
PRODUCTION_BACKUP_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_REPOSITORY_NOT_WIRED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
TEST_CLUSTER_STOPPED_GRACEFULLY — DATA/DUMPS/LOGS RETAINED
```

PARTIAL áp dụng cho **operational production backup readiness**, không phủ nhận restore rehearsal PASS. Thư mục production mới chưa tạo/chưa nghiệm thu ACL thực tế; custom sync/backup scope và encryption chưa xác minh, chưa có approval backup production. Script production chỉ được parse và chạy PLAN_ONLY, chưa nghiệm thu nhánh Execute trên production và không được coi production backup đã tồn tại.

## 2. Production inventory — chỉ đọc

Nguồn: `backend/scripts/phase13-5b-inventory.cjs --phase13-5c`, SELECT trong transaction READ ONLY; thêm nhánh capacity khi dùng flag13.5C. Không import startup/gateway, không POST login, không chạy migration/backup từ diagnostic.

Snapshot trước health **2026-10-22T07:32:00.882Z**, sau **07:45:10.156Z**:

| Thuộc tính | Kết quả |
| --- | --- |
|Endpoint/database/schema|127.0.0.1:5432 / smart_agriculture / public|
|System identifier|7472695863566132416|
|PGDATA|C:/Program Files/PostgreSQL/17/data|
|Server/version/start|17.2;2026-10-16 12:13:43.656514+07|
|Migrations|11applied, localchecksums khớp, không pending/unfinished|
|Six production irrigation tables|Chưa có|
|DeviceCommand|43→43;PENDING0→0|
|AutomationRule|1;không sửa|
|Backend5000|PID22400, health databaseconnected/MQTTconnected|
|Broker|LAN3592 và loopback4572 giữ nguyên|
|Production PostgreSQL|PID7848 giữ nguyên|

`report/phase13-5c-summary.json` so sánh identity/migrations/relations/columns/constraints/indexes/enums/functions/roles/memberships/schema ACL/fingerprints trước/sau: **không thay đổi**. Backend ingestion tiếp tục ghi readings/presence bình thường; không kỳ vọng business data bất biến trong khi telemetry chạy.

Startup attestation khớp PID listener hiện hành: Commands=false, Automation=false, TestMode=true, effective cap1. Không đổi env/config hoặc process; không login protected API để tạo activity record. Đây là attestation cùng serving process + source config, không giả vờ đã truy vấn protected runtime endpoint mới.

ESP32ONLINE, lastSeen07:45:04.955Z; stored relayOFF/stateAt07:44:56.039Z. BatchMQTT recordedAt07:45:04.591Z/receivedAt07:45:04.958Z: TEMP24.8, HUM46.7, SOIL5.42, LIGHT0. Giá trị0 hợp lệ, không missing. Snapshot DB/health không tự chứng minh publisher identity, SNTP refresh hoặc motor/nước.

### Capacity / recovery requirements

- Database khoảng **20,860,051bytes (~20MB)** ở snapshot đầu; kích thước có thể tăng khi ingestion chạy. `sensor_readings` total relation size10,084,352bytes, lớn nhất. `n_live_tup` là estimate, không thay count thực tế DeviceCommand43.
- ỔC NTFS, tổng511,054,254,080bytes, trống **105,842,552,832bytes (~98.57GiB)** tại security snapshot07:41:51UTC. Dung lượng hiện tại đủ cho rehearsal/backup dự kiến; phải refresh ngay trước production backup. Script đề xuất gate free space ≥max(1GiB,5×database size), không hứa kích thước custom dump bằng kích thước DB vật lý.
- Recovery settings read-only: archive_mode=off, wal_level=replica, full_page_writes=on. **Chưa có WAL archiving/PITR được nghiệm thu**; không coi logical dump là zero-data-loss recovery.
- Role backup hiện tại postgres có quyền rất rộng; script tương lai dùng credential hiện có qua nhập cục bộ, không tạo role mới5432. Dedicated least-privilege backup identity là thay đổi provisioning cần review/approval riêng, không tự cấp pg_read_all_data/BYPASSRLS.

## 3. Backup location / NTFS proposal

Đề xuất **mới, chưa tạo**:

```text
%LOCALAPPDATA%\SmartAgriculturePostgresBackups\production
C:\Users\Acer Swift3\AppData\Local\SmartAgriculturePostgresBackups\production
```

- Không thuộc repository, không dùng credential-rotation staging; ngoài OneDrive đã biết. Parent LocalAppData được đọc, không đổi ACL.
- `C:\DATN\backups` hiện inheritance mở, Users Read/Execute và Authenticated Users Modify: **không chọn, không sửa ACL cũ**.
- Script storage dự kiến tạo đúng2directory mới (container và production), owner operatorSID `S-1-5-21-1432835263-483988321-3159128977-1001`, protected DACL không kế thừa, chỉ operator+SYSTEM FullControl, OI/CI. Không cấp Users/Authenticated Users/Everyone/sandbox group. Tạo atomic với security descriptor và nghiệm thu owner/rules/inheritance; existing directory hoặc reparse bất thường =>STOP, không repair rộng.
- Mỗi lần backup sau approval tạo run directory mới với cùng DACL; không overwrite file/run cũ. Dump/role metadata/native logs/manifests nằm trong private run directory, **không copy dump vào Git/log/report**. Báo cáo chỉ metadata path/size/hash/exit status, không nội dung dump.

**Cloud/encryption:** KnownSyncOverlap=false, nhưng custom backup/sync scope **NOT_VERIFIED**, không kiểm kê mọi công cụ backup. BitLocker provider/access hiện không cho kết quả đáng tin cậy: **ENCRYPTION_NOT_VERIFIED**, không kết luận encryption đang tắt hoặc bật. NTFS không phải encryption và không chống local admin/đánh cắp ổ đĩa. pg_dump custom format có compression, **không tự mã hóa**.

Trước lưu production data, người dùng cần duyệt đường dẫn/data-handling: loại trừ sync không được duyệt hoặc chấp thuận biện pháp bảo vệ; ưu tiên encryption-at-rest có recovery key được quản lý và một bản sao encrypted độc lập/off-device. Nếu dùng EFS/BitLocker phải kiểm tra khả năng khôi phục key; không tự bật encryption, di chuyển file, đổi chương trình backup hoặc coi custom scope đã VERIFIED. Có thể chốt chính sách/rủi ro có giới hạn với chủ sở hữu, không yêu cầu chứng minh không tồn tại mọi công cụ backup trên máy.

Test dumps thực tế nằm trong test instance cũ đã có protected ACL chỉ operator FullControl; kiểm tra ACL file dump final chỉ kế thừa quyền operator từ root này. Không sửa NTFS test root hoặc production/parent ACL trong phase.

## 4. PostgreSQL backup/restore rehearsal thực tế

### Identity / topology

- Existing cluster127.0.0.1:55433, PGDATA `C:/DATN/test-instances/phase13-3b/data`, systemID **7698826681383327460**.
- Trước start: PG_VERSION17/control state shut down, fixed bind/port, no listener, no unexpected reparse/canonical path redirect. Sau start/trước DDL/native dump/restore: SQL exact db/role/host/port/system/PGDATA/server-start. Không initdb/fallback production.
- Source: **smart_agriculture_rehearsal_0704174deb58_main** của Phase13.5B.1, chỉ synthetic fixtures; DeviceCommand0/AutomationRule0/MQTT-source-readings0, device SYNTHETIC-13-5B1. Không copy dữ liệu production.
- Final restore DB **mới**: `smart_agriculture_restore_13_5c_20261022074504_334f3f`; tên chưa tồn tại, tạo TEMPLATEtemplate0, ownerphase13_test_admin, public0tables trước restore.
- Final run **20261022074504_334f3f**,07:45:04.686Z→07:45:09.141Z; server start2026-10-22 14:45:04.921482+07. Dừng graceful đúng cluster sau test, không listener55433; giữ source/dest/dumps/logs.

### Native operations / archive evidence

PostgreSQL native tools version17.2 đã xác minh từ `--version`.

| Operation | Native exit / thời gian final run |
| --- | --- |
|pg_dump -Fc test source|0 /343ms|
|pg_restore --list|0 /37ms|
|pg_dumpall --roles-only --no-role-passwords TEST|0 /165ms|
|pg_restore --exit-on-error --single-transaction vào DB mới|0 /648ms|
|Corrupt-header archive --list negative test|1 /46ms, đúng kỳ vọng; không kết nối DB|

Final synthetic custom dump: **105,354bytes**, SHA256:

```text
0b2273e1cf3d983b87de96a13e21949b2a121298aaa629c7e7904624790f1b41
```

Test role/globals SQL không role passwords:3,177bytes, SHA256:

```text
ba0ad99769a8b5a4f0445e13664a33c475f97d967ed00234d3fe026de059b6db
```

Cả hai ở `C:\DATN\test-instances\phase13-3b\backup-restore-13-5c-20261022074504_334f3f`, ngoài Git. Không đưa bytes/nội dung dump vào báo cáo. SHA256/PGDMP header/list chỉ là kiểm tra sơ bộ; **PASS dựa thêm actual restore và so sánh**, không chỉ --list.

Không `--clean`, `--create`, `--no-owner` hoặc `--no-acl`. Không DROP/TRUNCATE/reset target cũ. `pg_restore` dùng explicit-new-db, không cho phép target trùng source/production. File mới/test target mới được dùng ở mỗi attempt, không overwrite evidence.

### Ownership / database-level ACL / role mapping

- Table/function/type owners và grants được restore từ custom archive. Database target có tên mới nên không dùng `pg_restore --create` để vô tình tạo lại tên source.
- **DB-level owner/CONNECT/TEMP/CREATE ACL được ánh xạ tường minh** từ source sang target mới sau identity/emptiness gates, không thay source hoặc DB hiện hữu. Owner phase13_test_admin và grantees đã tồn tại trên cùng test cluster; giữ grantability/privilege type.
- Roles mapping là **IDENTITY trên cùng test cluster**: source DBA/migrator/app roles đã có. Có capture sanitized role attributes/memberships và test pg_dumpall globals SQL không password, nhưng **không import globals tạo roles trên cluster khác** (sẽ trùng roles). Bare-cluster/disaster role reconstruction vẫn NOT_VERIFIED.
- Tạo fresh app LOGIN test, random password chỉ RAM, member app group đã restore; current_user=session_user, không superuser/owner/migrator membership/CREATE. Sau probes chuyển fresh LOGIN thành NOLOGIN; không đổi credential existing roles hoặc lưu plaintext password/pgpass file.

## 5. Restore comparison / 33 PostgreSQL tests

Đối chiếu source snapshot READ ONLY/REPEATABLE READ với restored snapshot, timezoneUTC để serializer nhất quán:

- **21tables**, tổng24synthetic rows (gồm11migration-history rows); từng table count và deterministic data digest khớp.
- Columns/defaults/nullability/types; **109indexes**, **76constraints**, enums/labels/owners/ACL; **2audit triggers** enabled; function source/owner/ACL khớp.
- **14validated irrigation RESTRICT FK**; v1/v2 settlement/dispatch ordering và deployment fences còn nguyên.
- Ownership, table/type/function/schema và **database ACL semantics** khớp;11migration names/checksums/timestamps/synthetic history data khớp.
- Source đọc lại sau test không đổi; restored data/catalogs sau rejected probes cũng không đổi. Không sửa legacy business rows để làm restore PASS.

Probe thực tế trên database restored:

| Probe | Kết quả |
| --- | --- |
|App UPDATE/DELETE/TRUNCATE audit|42501, không có quyền|
|App INSERT/UPDATE DeviceCommand|42501|
|App CREATE public table|42501|
|Budget modeACTIVE|23514/shadow_fence|
|CHARGED thiếu settled_at|23514/irrigation_v2_settlement|
|Publish thiếu dispatch claim|23514/irrigation_v2_dispatch_order|
|Owner role UPDATE audit qua transaction|P0001/IRRIGATION_AUDIT_APPEND_ONLY|
|Source/dest data sau probes|Không đổi|

Đây là test SQL thật, không mock pg_restore hoặc fake repository. MD5 per-table digest dùng để so sánh dữ liệu synthetic không đối kháng, không tuyên bố cryptographic audit sealing; archive integrity được SHA256 riêng. Không import dispatcher/MQTT/DeviceCommand writer/engine ACTIVE.

### Lượt đầu / các attempts được giữ

- `20261022073201_c65dc2`: dump/list/restore đều exit0, assertion raw table ACL fail vì source `_prisma_migrations` có explicit owner-default ACL còn restore trả NULL/default.
- Sửa **comparator**, không sửa data/grants để làm test qua: expand `aclexplode(coalesce(acl,acldefault(...)))`, so grantor/grantee/privilege/grantable canonical. Đồng thời kiểm tra owners và actual effective app permissions. Không dùng skip-owner/skip-ACL.
- `20261022073323_bb7a57`:30/30PASS. `20261022073922_ab68f0`:31/31PASS sau thêm actual globals dump test. Final run33/33 thêm explicit DB-level ACL/owner mapping và comparison. Giữ cả4restore DBs/dumps/logs, không cộng dồn attempts thành số test final.
- Các attempts đều dừng graceful test cluster. Không replay migration Phase13.5B.1 hoặc59oldSQL cases.

## 6. Production backup scripts — chuẩn bị, chưa Execute

| Script | Vai trò |
| --- | --- |
|scripts/phase13-5c-backup-security.ps1|Pure helper funcs: SID/path/no-reparse/known-sync/NTFS ACL create+acceptance|
|scripts/phase13-5c-prepare-backup-storage.ps1|Mặc định PLAN_ONLY; future tạo2directory mới sau storage/data-handling approval riêng|
|scripts/phase13-5c-production-backup.ps1|Mặc định PLAN_ONLY; future pg_dump production sau **backup approval riêng** + actual protected storage acceptance|

Đã chạy mặc định/parse các scripts; không chạy `-ExecuteApproved`, không tạo production folder hoặc nhập credential. Plan evidence: `report/phase13-5c-storage-plan.json`, `...production-backup-plan.json`.

Các gate future script:

1. OperatorSID/path cố định ngoài Git/known sync, không reparse; storage group/owner/inheritance thực tế phải đúng2ACE. Existing parent/production ACL không repair.
2. Storage approval attestation + BackupApprovalId/StorageApprovalId riêng, ShouldProcess confirmation; approval IDs là workflow guard, không phải security token thay quyền Windows/DB. Data-handling/encryption/sync policy phải được người dùng duyệt, không do Agent tự khai verified.
3. Source SQL manifest hashes/rehearsal evidence khớp; backend healthconnected, startup attestation khớp listenerPID, Commands/Automationfalse/TestModetrue/cap1. Không restart nếu không đạt.
4. Credential nhập cục bộ `Read-Host -AsSecureString`, không chat/CLI URL/pgpass plaintext. Native child-only PGPASSWORD trong RAM; không set environment toàn máy/parent. BSTR được zero/free, child env loại PG service overrides; không ghi credential vào logs/manifest. NTFS không ngăn privileged process đọc RAM, đây không phải cam kết memory-secrecy tuyệt đối.
5. psql SELECT identity:127.0.0.1:5432/smart_agriculture/public, rolepostgres, exact systemID/PGDATA, major17; PENDING0, chưa6ledgers,11migrations/checksums hợp lệ. Gate khác =>STOP trước dump.
6. DB size/free disk và PostgreSQL17 binary gate. New private run folder; không overwrite, không tự retry.
7. `pg_dump -Fc --lock-wait-timeout=3s` entire smart_agriculture; native stdout/stderr/exit riêng. `pg_dumpall --roles-only --no-role-passwords` capture role/global metadata, không hashes/passwords của PostgreSQL roles. **Dữ liệu users trong DB dump vẫn nhạy cảm**, không được coi dump đã sanitized.
8. pg_restore --list, hash/bytes; private manifest ghi identities, source DB properties (owner/encoding/collation/DBACL), migration baseline, time bounds, native exit codes. Fail/timeout giữ partial artifacts và failure marker, không coi backup success hoặc retry tự động.
9. Script không restore, migration, tạo production role/tables, đổi config/flags hoặc phát command. `RestoreVerified=false` cho tới nghiệm thu restore riêng.

Chỉ xem plan hiện tại bằng:

```powershell
& 'C:\DATN\Project_datn\scripts\phase13-5c-prepare-backup-storage.ps1'
& 'C:\DATN\Project_datn\scripts\phase13-5c-production-backup.ps1'
```

Không thêm Execute switch từ báo cáo này. Nhánh execute production chưa được chạy/test trên production và cần approval riêng; không coi AST/default-plan tests là production backup PASS.

## 7. Runbook production backup / restore tương lai

### Trước backup — cần approval riêng

1. Duyệt location/data-handling/encryption/recovery-key/copy-off-device/retention. Chỉ sau đó tạo2protected directories mới, nghiệm thu actualACL/owner/reparse; không dùng C:\DATN\backups ACL rộng.
2. Duyệt phiên production backup (khác storage approval), credentials input local, thời điểm và RPO/RTO; giữ telemetry chạy/Commandsfalse/Automationfalse. Capture fresh health/identity/manifest/PENDING.
3. Dùng script đã review/hash; reserve đủ free disk. Lock timeout/backup error thì dừng, giữ partial dump, không nới timeout hoặc retry mù.
4. Lưu custom dump, sanitized role/globals, DB properties/ACL, SHA256/private manifest/native exits. --list chỉ preliminary; không apply migration ngay nếu chưa có recoverability acceptance.

### Restore production dump sang target độc lập

Approval mới phải xác định cluster/PGDATA/port/systemID/database, **không5432 hoặc test DB hiện hữu**, và quyền chứa production data. Không tự copy production sang test cluster55433 trong phase này; test instance hiện tại chỉ approved cho synthetic fixtures.

- Tạo DB trống mới trên approved isolated recovery target bằng PostgreSQL17 compatible, encoding/collation/locale được đối chiếu; owner/database ACL explicit mapping. Không --clean/--create để overwrite tên source.
- Review role/global metadata trước provisioning, dùng role/password mới qua phương thức cục bộ bảo mật; không blind replay globals vào server có role names trùng. No-role-password dump không khôi phục được authentication secrets tự động.
- Restore --exit-on-error --single-transaction, giữ owners/ACL hoặc map tường minh được review. Không --no-owner/--no-acl rồi tuyên bố quyền được phục hồi.
- So catalog/FK/CHECK/indexes/triggers, role/effective privileges, Prisma baseline và data/row digests từ snapshot phù hợp. Dữ liệu production live sau dump tiếp tục tăng: không đối chiếu counts về sau như thể cùng snapshot hoặc tự restamp readings.
- Keep recovery backend/gateway disconnected/Commandsfalse/Automationfalse; không start server để tự phát command. Chưa có approval switch-over/restart application thì không chuyển kết nối khỏi production.

### RPO / RTO / telemetry sau snapshot

- Logical dump là consistent snapshot nhưng không backup các commits xảy ra sau snapshot. Exact snapshot instant chưa export; private manifest chỉ biết nằm trong dump start/end window, không tự gán thời điểm đo cảm biến.
- **RPO thực tế = dữ liệu sau snapshot cần phục hồi/đối soát**, không phải0. Với4readings/15s, khoảng16readings/phút có thể phát sinh trong cửa sổ mất dữ liệu nếu restore full DB cũ. Chưa đo workload mọi bảng nên đây chỉ là nhịp ESP32 hiện tại.
- Đề xuất lấy approved dump sát deployment, mục tiêu snapshot age trước DDL≤5phút nếu vận hành cho phép; **chưa được chấp thuận hoặc nghiệm thu RPO5phút**. Migration kéo dài hoặc switch-over muộn làm cửa sổ tăng; cần approval mới/review nếu muốn dump lại, không auto retry.
- RTO đề xuất trao đổi với người dùng (ví dụ≤15phút cho local recovery) **NOT_VERIFIED**. Synthetic105KB restore648ms không dự báo RTO20MBproduction, role/key provisioning hoặc xử lý sự cố.
- archive_modeoff nên không tuyên bố PITR/WAL continuity. Muốn RPO thấp hơn cần thiết kế/WAL/backup riêng được phê duyệt, không đổi PostgreSQL config trong phase này.
- Ưu tiên roll-forward additive khi migration lỗi để giữ telemetry mới; không restore đè production từ dump cũ mà chưa duyệt downtime/data-loss reconciliation.

## 8. Migration deployment preflight / recovery

Đã đối chiếu manifest hiện hành sau13.5B.1, hashes giữ nguyên:

```text
00 c96a200e4996cfbf86a274840abd7d4d0a02a9aec766395cfbdd5522a50e5a32
01 dac6a431a4598bea18cd0ff3290fb2009c36c30809247d258aea161d637a8b8a
02 20de4109c7d16925ef0d12b7fb1d26491507242124f21dfa26107765e513e499
```

- Thứ tự: DBA00prerequisites → dedicated migrator01ledgers → DBA02finalize/revoke temporary grants. Role provisioning/credentials/membership trên production chưa làm. App không owner/migrator/superuser; audit append/read only. Baseline PUBLIC EXECUTE control function không được nhầm direct temporary grant đã revoke.
- Prisma history: guard hiện yêu cầu đúng11rows; không dùng migrate deploy trực tiếp gây pending-row mismatch. Schema/migration promotion/checksum/history reconcile sau DDL cần approved lifecycle riêng; không giả history applied hoặc sửa11checksum cũ.
- Ba legacy composite unique indexes additive cần lock/scan; lock_timeout3s/statement_timeout60s. Rehearsal55P03 đã nghiệm thu, chưa có production DDL benchmark; không tăng timeouts để vượt lock.
-14RESTRICT FK bảo vệ audit/ledger và có thể chặn delete/retention legacy. Cần duyệt UI deletion/retention, không bỏ constraints để xóa.
-00commit/01fail: giữ prerequisites, không replay00; inspect checkpoint/hashes và resume có review.01commit/02pending: deploymentINCOMPLETE, giữ unwired và hoàn tất revocation bằng DBA.
-Unknown COMMIT outcome: SELECT catalog/log đối soát, không retry. Sau ledger commit không DROP/TRUNCATE audit/budget/intents; feature-disable/unwired và roll-forward version mới. Full DB restore chỉ sang target riêng + incident approval, không destructive down migration.

Backup readiness PASS của synthetic data không tự authorize production migration, least-privilege wiring, rearm, VERIFIED_LIVE hoặc ACTIVE.

## 9. Tests / files / evidence

Thực thi:

```powershell
node backend/scripts/phase13-5c-restore-rehearsal.cjs --approved-phase13-5c-test
node --test backend/scripts/backup-restore-readiness.test.cjs backend/scripts/production-irrigation-migration.test.cjs backend/scripts/production-irrigation-rehearsal.test.cjs
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
```

- Final PostgreSQL33/33PASS,31initial-extension/30previous attempts được ghi riêng, không gộp counts.
- Related regression **43/43PASS** =16backup/storage/identity/ACL tests +23migration static +4mapper tests. PowerShell AST/default plans PASS; default scripts không tạo directory/nhập password/dump production. Không chạy lại528domain suite vì không thay runtime/domain.
- Backend typecheck exit0. Core foundation/test repository/startup/main Prisma schema/MQTT/firmware không sửa.

Files added:

- `backend/scripts/phase13-5c-backup-contract.cjs`, `phase13-5c-restore-rehearsal.cjs`, `phase13-5c-export-evidence.cjs`.
- `backend/scripts/backup-restore-readiness.test.cjs`.
- Bốn PowerShell files security/storage/production-backup/security-readonly trong scripts.
- Báo cáo này, `report/phase13-5c-*`; actual synthetic dumps/logs **chỉ ngoài repo** trong test instance.

File updated: `backend/scripts/phase13-5b-inventory.cjs` thêm output prefix/capacity SELECT cho13.5C; không sửa SQL artifacts/manifest đã nghiệm thu13.5B.1.

Authoritative evidence:

- `report/phase13-5c-run-20261022074504_334f3f.json`:33cases, source/restored catalogs/data digests, native exits, archive/globals metadata, shutdown.
- `report/phase13-5c-summary.json`: before/after production comparison và source hashes.
- `report/phase13-5c-production-inventory.json`, `...-after.json`; `...security-readonly.json`.
- `report/phase13-5c-regression.tap`, `...typecheck.log`, `...storage-plan.json`, `...production-backup-plan.json`.

Bằng chứng chỉ là metadata/digests, không nhúng dump/role password vào report. Test source/dest/dumps/role metadata/logs được giữ, test cluster dừng; cleanup cần approval riêng.

## 10. Cần phê duyệt gì tiếp theo?

1. **Storage/data-handling approval:** đường dẫn mới,2directory/operator+SYSTEM ACL, encryption/recovery key/known/custom sync policy/retention; nghiệm thu actual folder trước chứa production data.
2. **Production backup approval riêng:** đúng PostgreSQL/DB/window, scripts đã review, local credential handling, space/RPO/RTO; không bao gồm migration.
3. **Restore-production-data rehearsal approval riêng:** target cluster mới/độc lập được định danh, role mapping/metadata/sensitive data controls; phase này chỉ synthetic same-cluster-role test, chưa full disaster recovery trên bare cluster.
4. **Migration approval riêng** sau backup/restore gates: current hashes00→01→02, roles, locks/delete impacts/Prisma history/checkpoint runbook; không tự tạo objects5432 hoặc wire repository.

**Dừng sau Phase13.5C. Không có backup production mới, không migration production, không restart services hoặc kích hoạt bơm.**
